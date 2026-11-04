import { describe, expect, it } from 'vitest';
import { formatNgPhone, normalizeNgPhone } from '@/lib/messaging/phone';
import { CATEGORY_OF, buildMessage, smsParts, type MessageEvent } from '@/lib/messaging/templates';

describe('Nigerian phone numbers', () => {
  it.each([
    ['08031234567', '2348031234567'],
    ['0803 123 4567', '2348031234567'],
    ['+234 803 123 4567', '2348031234567'],
    ['+2348031234567', '2348031234567'],
    ['2348031234567', '2348031234567'],
    ['803-123-4567', '2348031234567'],
    ['(0803) 123.4567', '2348031234567'],
    ['07031234567', '2347031234567'],
    ['09031234567', '2349031234567'],
    [8031234567, '2348031234567'],
  ])('reads %s as %s', (raw, expected) => {
    expect(normalizeNgPhone(raw)).toBe(expected);
  });

  it.each(['', ' ', '—', 'none', '0803123456', '080312345678', '01234567890', '+44 7911 123456', '234803123456', '2348031234567890', 'abc', null, undefined, {}])(
    'refuses %s rather than guess',
    (raw) => {
      expect(normalizeNgPhone(raw)).toBeNull();
    }
  );

  it('formats a number for people, and can hide the middle', () => {
    expect(formatNgPhone('2348031234567')).toBe('+234 803 123 4567');
    expect(formatNgPhone('2348031234567', true)).toBe('+234 803 *** 4567');
  });
});

describe('Message wording', () => {
  const base = { school: 'Greenfield College', student: 'Ada Obi' };

  it('says who it is from and states only what it was given', () => {
    const m = buildMessage('payment_received', { ...base, amount: 40000, receipt: 'REC-2026-0001', balance: 60000 });
    expect(m.body).toBe('Greenfield College: We received ₦40,000.00 for Ada Obi. Receipt REC-2026-0001. Balance: ₦60,000.00.');
  });

  it('says fees are fully paid when nothing is left, never "balance: 0"', () => {
    expect(buildMessage('payment_received', { ...base, amount: 10000, receipt: 'R1', balance: 0 }).body).toContain('fully paid');
  });

  it('writes each event from its own facts', () => {
    expect(buildMessage('absent', { ...base, date: '4 Nov 2026' }).body).toContain('marked absent on 4 Nov 2026');
    expect(buildMessage('late', { ...base, date: '4 Nov 2026' }).body).toContain('arrived late');
    expect(buildMessage('gate_release', { ...base, time: '2:15 pm', collectedBy: 'Mrs Obi' }).body).toBe('Greenfield College: Ada Obi was released at the gate at 2:15 pm to Mrs Obi.');
    expect(buildMessage('results_released', { ...base, term: 'First Term' }).body).toContain('First Term results are now available');
    expect(buildMessage('fee_reminder_upcoming', { ...base, amount: 50000, dueDate: '15 Nov 2026' }).body).toContain('is due on 15 Nov 2026');
    expect(buildMessage('fee_reminder_overdue', { ...base, amount: 50000, dueDate: '15 Nov 2026' }).body).toContain('is still unpaid');
    expect(buildMessage('parent_invite', { school: 'Greenfield College', link: 'https://g.example.com/activate/parent?token=abc' }).body).toContain('works for 7 days');
    expect(buildMessage('broadcast', { school: 'Greenfield College', subject: 'Resumption', text: 'School resumes Monday.' }).body).toBe('Greenfield College: Resumption. School resumes Monday.');
  });

  it('refuses to send a message with a missing fact, and names it', () => {
    expect(() => buildMessage('payment_received', { ...base, amount: 10000, balance: 0 })).toThrow('needs receipt');
    expect(() => buildMessage('gate_release', { ...base, time: '2 pm' })).toThrow('needs collectedBy');
    expect(() => buildMessage('absent', { school: 'X', student: ' ', date: 'today' })).toThrow('needs student');
    expect(() => buildMessage('broadcast', { school: 'X', text: ' ' })).toThrow('needs text');
  });

  it('keeps the values a WhatsApp template is filled from', () => {
    const m = buildMessage('payment_received', { ...base, amount: 40000, receipt: 'R1', balance: 0 });
    expect(m.fields).toMatchObject({ school: 'Greenfield College', student: 'Ada Obi', amount: '₦40,000.00', receipt: 'R1' });
  });

  it('puts every event in a category an opt-out can name', () => {
    const events: MessageEvent[] = ['payment_received', 'absent', 'late', 'gate_release', 'results_released', 'broadcast', 'fee_reminder_upcoming', 'fee_reminder_overdue', 'parent_invite'];
    for (const e of events) expect(CATEGORY_OF[e]).toBeTruthy();
    expect(CATEGORY_OF.late).toBe('attendance');
    expect(CATEGORY_OF.fee_reminder_overdue).toBe('reminder');
  });
});

describe('SMS length', () => {
  it('counts parts the way providers charge', () => {
    expect(smsParts('a'.repeat(160))).toBe(1);
    expect(smsParts('a'.repeat(161))).toBe(2);
    expect(smsParts('a'.repeat(306))).toBe(2);
    expect(smsParts('a'.repeat(307))).toBe(3);
  });

  it('counts 70 to a part once a letter outside the basic set appears', () => {
    expect(smsParts('₦' + 'a'.repeat(69))).toBe(1);
    expect(smsParts('₦' + 'a'.repeat(70))).toBe(2);
  });
});
