import { beforeEach, describe, expect, it } from 'vitest';
import { createFakeDb, type Row } from '../helpers/fake-db';
import { enqueueForGuardians, enqueueMessage, removeOptOut, setOptOut, summariseUsage, type EnqueueInput } from '@/lib/messaging/outbox';

let tables: Record<string, Row[]>;
let db: ReturnType<typeof createFakeDb> & { schoolId: string };

const make = () => {
  tables = {
    message_outbox: [],
    message_opt_outs: [],
    student_guardians: [
      { student_id: 's1', guardian_id: 'g1' },
      { student_id: 's1', guardian_id: 'g2' },
    ],
    guardians: [
      { id: 'g1', first_name: 'Ada', last_name: 'Obi', phone: '0803 123 4567', email: 'ada@example.test' },
      { id: 'g2', first_name: 'Ben', last_name: 'Obi', phone: '—', email: null },
    ],
  };
  db = Object.assign(
    createFakeDb(tables, {
      unique: { message_outbox: ['school_id', 'event_key'], message_opt_outs: ['school_id', 'phone', 'category'] },
      embeds: { student_guardians: { guardians: { table: 'guardians', from: 'guardian_id', to: 'id' } } },
    }),
    { schoolId: 'school-1' }
  );
  // The school client stamps its school on every insert; the stand-in does the same
  const raw = db.from;
  db.from = (t: string) => {
    const b = raw(t);
    const upsert = b.upsert;
    b.upsert = (p: any, o: any) => upsert(Array.isArray(p) ? p.map((r) => ({ school_id: 'school-1', ...r })) : { school_id: 'school-1', ...p }, o);
    return b;
  };
};

beforeEach(make);

const input = (over: Partial<EnqueueInput> = {}): EnqueueInput => ({
  event: 'gate_release',
  eventKey: 'gate:log-1',
  studentId: 's1',
  phone: '08031234567',
  params: { school: 'Greenfield College', student: 'Ada Obi', time: '2:15 pm', collectedBy: 'Mrs Obi' },
  ...over,
});

describe('Queuing a message', () => {
  it('queues it with the number in international form, the wording, and the facts it was made from', async () => {
    expect(await enqueueMessage(db, input())).toEqual({ status: 'queued' });
    expect(tables.message_outbox).toHaveLength(1);
    expect(tables.message_outbox[0]).toMatchObject({
      school_id: 'school-1',
      event: 'gate_release',
      category: 'gate',
      recipient_phone: '2348031234567',
      preferred_channel: 'whatsapp',
      status: 'queued',
      body: 'Greenfield College: Ada Obi was released at the gate at 2:15 pm to Mrs Obi.',
    });
    expect(tables.message_outbox[0].fields).toMatchObject({ student: 'Ada Obi', collectedBy: 'Mrs Obi' });
  });

  it('sends the same event once however many times it is raised', async () => {
    expect((await enqueueMessage(db, input())).status).toBe('queued');
    expect((await enqueueMessage(db, input())).status).toBe('duplicate');
    expect((await enqueueMessage(db, input())).status).toBe('duplicate');
    expect(tables.message_outbox).toHaveLength(1);
  });

  it('queues a different event for the same child separately', async () => {
    await enqueueMessage(db, input());
    await enqueueMessage(db, input({ eventKey: 'gate:log-2' }));
    expect(tables.message_outbox).toHaveLength(2);
  });

  it('keeps a record, as skipped, when there is nobody to send to', async () => {
    expect(await enqueueMessage(db, input({ phone: '—', email: null }))).toEqual({ status: 'skipped', reason: 'no_contact' });
    expect(tables.message_outbox[0]).toMatchObject({ status: 'skipped', skipped_reason: 'no_contact' });
  });

  it('prefers email when there is no phone, and refuses a bad email', async () => {
    await enqueueMessage(db, input({ phone: null, email: 'ada@example.test' }));
    expect(tables.message_outbox[0]).toMatchObject({ status: 'queued', preferred_channel: 'email', recipient_email: 'ada@example.test' });
    expect((await enqueueMessage(db, input({ eventKey: 'k2', phone: null, email: 'not-an-email' }))).reason).toBe('no_contact');
  });

  it('refuses to queue a message that is missing a fact', async () => {
    await expect(enqueueMessage(db, input({ params: { school: 'X', student: 'Ada' } }))).rejects.toThrow('needs time');
    expect(tables.message_outbox).toHaveLength(0);
  });
});

describe('Opt-outs', () => {
  it('skips a message of a kind the parent has stopped, and still sends the other kinds', async () => {
    await setOptOut(db, { phone: '0803 123 4567', category: 'gate' });
    expect(await enqueueMessage(db, input())).toEqual({ status: 'skipped', reason: 'opted_out' });
    const payment = await enqueueMessage(db, { event: 'payment_received', eventKey: 'pay:1', phone: '08031234567', params: { school: 'G', student: 'Ada', amount: 1000, receipt: 'R1', balance: 0 } });
    expect(payment.status).toBe('queued');
  });

  it('skips everything for a parent who stopped all messages', async () => {
    await setOptOut(db, { phone: '08031234567', category: 'all' });
    expect((await enqueueMessage(db, input())).reason).toBe('opted_out');
  });

  it('matches the number however it is written, and applies to that number only', async () => {
    await setOptOut(db, { phone: '+234 803 123 4567', category: 'all' });
    expect((await enqueueMessage(db, input({ phone: '08031234567' }))).status).toBe('skipped');
    expect((await enqueueMessage(db, input({ eventKey: 'other', phone: '08039999999' }))).status).toBe('queued');
  });

  it('lets a parent turn messages back on', async () => {
    await setOptOut(db, { phone: '08031234567', category: 'gate' });
    await removeOptOut(db, { phone: '08031234567', category: 'gate' });
    expect((await enqueueMessage(db, input())).status).toBe('queued');
  });

  it('refuses a number that is not a number and a kind that does not exist', async () => {
    expect((await setOptOut(db, { phone: 'abc', category: 'all' })).ok).toBe(false);
    expect((await setOptOut(db, { phone: '08031234567', category: 'everything' })).ok).toBe(false);
  });

  it('records the same opt-out once', async () => {
    await setOptOut(db, { phone: '08031234567', category: 'all' });
    await setOptOut(db, { phone: '08031234567', category: 'all' });
    expect(tables.message_opt_outs).toHaveLength(1);
  });
});

describe('Telling every guardian of a child', () => {
  it('queues one message for each, and records the one with no contact as skipped', async () => {
    const results = await enqueueForGuardians(db, 's1', 'gate_release', 'gate:log-9', { school: 'G', student: 'Ada', time: '2 pm', collectedBy: 'Mrs Obi' });
    expect(results.map((r) => r.status)).toEqual(['queued', 'skipped']);
    expect(tables.message_outbox.map((m) => m.event_key)).toEqual(['gate:log-9:g1', 'gate:log-9:g2']);
  });

  it('does not send twice when raised again', async () => {
    const p = { school: 'G', student: 'Ada', time: '2 pm', collectedBy: 'Mrs Obi' };
    await enqueueForGuardians(db, 's1', 'gate_release', 'gate:log-9', p);
    const again = await enqueueForGuardians(db, 's1', 'gate_release', 'gate:log-9', p);
    expect(again.every((r) => r.status === 'duplicate')).toBe(true);
    expect(tables.message_outbox).toHaveLength(2);
  });

  it('keeps one record when a child has no guardian on file', async () => {
    const r = await enqueueForGuardians(db, 'no-guardians', 'absent', 'att:1', { school: 'G', student: 'Zed', date: 'today' });
    expect(r).toEqual([{ status: 'skipped', reason: 'no_contact' }]);
  });
});

describe('Usage and cost', () => {
  it('counts what was sent and adds only the cost that is known', () => {
    const u = summariseUsage([
      { status: 'delivered', channel_used: 'sms', cost: '4.0000' },
      { status: 'sent', channel_used: 'sms', cost: null },
      { status: 'delivered', channel_used: 'whatsapp', cost: 2.5 },
      { status: 'failed', channel_used: null, cost: null },
      { status: 'queued', channel_used: null, cost: null },
      { status: 'skipped', channel_used: null, cost: null },
    ]);
    expect(u.total).toBe(6);
    expect(u.byStatus).toMatchObject({ delivered: 2, sent: 1, failed: 1, queued: 1, skipped: 1 });
    expect(u.byChannel.sms).toEqual({ count: 2, cost: 4 });
    expect(u.byChannel.whatsapp).toEqual({ count: 1, cost: 2.5 });
    expect(u.knownCost).toBe(6.5);
    expect(u.withoutCost).toBe(1);
  });

  it('never reports an unknown cost as zero spent', () => {
    expect(summariseUsage([{ status: 'sent', channel_used: 'sms', cost: null }])).toMatchObject({ knownCost: 0, withoutCost: 1 });
  });
});
