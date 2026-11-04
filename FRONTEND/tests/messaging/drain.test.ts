import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb, type Row } from '../helpers/fake-db';
import { MAX_ATTEMPTS, applyDeliveryReport, backoffMinutes, drainOutbox, planChannels, type OutboxRow } from '@/lib/messaging/drain';
import type { ProviderEnv } from '@/lib/messaging/providers';

const NOW = new Date('2026-11-04T10:00:00.000Z');
const TERMII = { apiKey: 'k', baseUrl: 'https://t.test', defaultSenderId: 'Greenfield' };
const EMAIL = { apiKey: 'r', from: 'School <o@s.test>' };

let tables: Record<string, Row[]>;
const admin = () => createFakeDb(tables) as any;

const queued = (over: Partial<Row> = {}): Row => ({
  id: 'm1',
  school_id: 'school-1',
  event: 'payment_received',
  preferred_channel: 'whatsapp',
  recipient_phone: '2348031234567',
  recipient_email: null,
  subject: 'S',
  body: 'Greenfield: We received ₦40,000.00.',
  fields: { student: 'Ada', amount: '₦40,000.00' },
  status: 'queued',
  attempts: 0,
  next_attempt_at: '2026-11-04T09:00:00.000Z',
  ...over,
});

/** Answers by URL, so a test can make WhatsApp fail and SMS work. */
const service = (answers: Record<string, { status: number; json: unknown }>) => {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (url: string) => {
    calls.push(url);
    const key = Object.keys(answers).find((k) => url.includes(k));
    const a = key ? answers[key] : { status: 500, json: { message: 'nothing set' } };
    return new Response(JSON.stringify(a.json), { status: a.status });
  });
  return { calls, net: { fetchImpl: fetchImpl as unknown as typeof fetch } };
};

beforeEach(() => {
  tables = {
    schools: [{ id: 'school-1', name: 'Greenfield College', settings: { messaging: { whatsappDeviceId: 'dev1', whatsappTemplates: { payment_received: { templateId: 'tpl1', fields: ['student', 'amount'] } }, smsUnitCost: 4 } } }],
    message_outbox: [queued()],
  };
});

const run = (providers: ProviderEnv, net?: any, limit?: number) => drainOutbox({ admin: admin(), providers, net, now: NOW, limit });
const row = () => tables.message_outbox[0];

describe('Sending', () => {
  it('sends by WhatsApp when the school has an approved template for the event', async () => {
    const { calls, net } = service({ '/api/send/template': { status: 200, json: { code: 'ok', message_id: 'w1' } } });
    const s = await run({ termii: TERMII }, net);
    expect(s).toMatchObject({ processed: 1, sent: 1, failed: 0 });
    expect(row()).toMatchObject({ status: 'sent', channel_used: 'whatsapp', provider_message_id: 'w1', attempts: 1, last_error: null });
    expect(calls).toEqual(['https://t.test/api/send/template']);
  });

  it('falls back to SMS when WhatsApp refuses for good, and records which channel carried it', async () => {
    const { calls, net } = service({
      '/api/send/template': { status: 400, json: { message: 'Template not approved' } },
      '/api/sms/send': { status: 200, json: { code: 'ok', message_id: 's1' } },
    });
    await run({ termii: TERMII }, net);
    expect(calls).toEqual(['https://t.test/api/send/template', 'https://t.test/api/sms/send']);
    expect(row()).toMatchObject({ status: 'sent', channel_used: 'sms', provider_message_id: 's1' });
  });

  it('goes straight to SMS when the school has no template for this event', async () => {
    tables.message_outbox = [queued({ event: 'absent' })];
    const { calls, net } = service({ '/api/sms/send': { status: 200, json: { code: 'ok', message_id: 's2' } } });
    await run({ termii: TERMII }, net);
    expect(calls).toEqual(['https://t.test/api/sms/send']);
  });

  it('estimates the cost of an SMS from the school\'s rate and the length, until the provider reports the real one', async () => {
    tables.message_outbox = [queued({ event: 'absent', body: 'a'.repeat(200) })];
    const { net } = service({ '/api/sms/send': { status: 200, json: { code: 'ok', message_id: 's3' } } });
    await run({ termii: TERMII }, net);
    expect(row().cost).toBe(8); // two parts at 4
  });

  it('uses email when there is no phone', async () => {
    tables.message_outbox = [queued({ recipient_phone: null, recipient_email: 'a@b.test', preferred_channel: 'email' })];
    const { calls, net } = service({ 'resend.com': { status: 200, json: { id: 'e1' } } });
    await run({ email: EMAIL }, net);
    expect(calls).toEqual(['https://api.resend.com/emails']);
    expect(row()).toMatchObject({ status: 'sent', channel_used: 'email' });
  });

  it('sends only what is due', async () => {
    tables.message_outbox = [queued({ next_attempt_at: '2026-11-04T11:00:00.000Z' })];
    const { calls, net } = service({});
    const s = await run({ termii: TERMII }, net);
    expect(s.processed).toBe(0);
    expect(calls).toEqual([]);
  });

  it('does nothing to a message that is not waiting', async () => {
    tables.message_outbox = [queued({ status: 'sent' }), queued({ id: 'm2', status: 'skipped' })];
    expect((await run({ termii: TERMII }, service({}).net)).processed).toBe(0);
  });

  it('works through no more than the limit in one run', async () => {
    tables.message_outbox = [queued({ id: 'a', event: 'absent' }), queued({ id: 'b', event: 'absent' }), queued({ id: 'c', event: 'absent' })];
    const { net } = service({ '/api/sms/send': { status: 200, json: { code: 'ok', message_id: 'x' } } });
    expect((await run({ termii: TERMII }, net, 2)).processed).toBe(2);
  });
});

describe('When sending fails', () => {
  it('puts a message back to try later, with a longer wait each time', async () => {
    tables.message_outbox = [queued({ event: 'absent' })];
    const { net } = service({ '/api/sms/send': { status: 503, json: { message: 'Unavailable' } } });
    const s = await run({ termii: TERMII }, net);
    expect(s).toMatchObject({ requeued: 1, sent: 0 });
    expect(row()).toMatchObject({ status: 'queued', attempts: 1 });
    expect(row().last_error).toContain('Unavailable');
    expect(row().next_attempt_at).toBe(new Date(NOW.getTime() + backoffMinutes(1) * 60000).toISOString());
    expect(backoffMinutes(1)).toBeLessThan(backoffMinutes(3));
    expect(backoffMinutes(99)).toBe(backoffMinutes(5));
  });

  it('gives up after the last attempt and says why', async () => {
    tables.message_outbox = [queued({ event: 'absent', attempts: MAX_ATTEMPTS - 1 })];
    const { net } = service({ '/api/sms/send': { status: 503, json: { message: 'Unavailable' } } });
    const s = await run({ termii: TERMII }, net);
    expect(s.failed).toBe(1);
    expect(row()).toMatchObject({ status: 'failed', attempts: MAX_ATTEMPTS });
  });

  it('fails at once for a reason that will never pass, such as a bad number', async () => {
    tables.message_outbox = [queued({ event: 'absent' })];
    const { net } = service({ '/api/sms/send': { status: 400, json: { message: 'Invalid number' } } });
    await run({ termii: TERMII }, net);
    expect(row()).toMatchObject({ status: 'failed', attempts: 1 });
  });

  it('waits for a topped-up balance rather than failing', async () => {
    tables.message_outbox = [queued({ event: 'absent' })];
    const { net } = service({ '/api/sms/send': { status: 400, json: { message: 'Insufficient balance' } } });
    await run({ termii: TERMII }, net);
    expect(row().status).toBe('queued');
  });
});

describe('When nothing is connected', () => {
  it('leaves the message waiting, uncounted, rather than failing it or pretending it was sent', async () => {
    const s = await run({});
    expect(s).toMatchObject({ waiting: 1, sent: 0, failed: 0 });
    expect(row()).toMatchObject({ status: 'queued', attempts: 0 });
    expect(row().last_error).toContain('No messaging service');
    expect(row().next_attempt_at > NOW.toISOString()).toBe(true);
  });

  it('fails a message whose person cannot be reached by anything the school has set up', async () => {
    tables.message_outbox = [queued({ event: 'absent', recipient_phone: null, recipient_email: null })];
    const s = await run({ termii: TERMII });
    expect(s.failed).toBe(1);
  });

  it('skips the messages of a school that has switched messaging off', async () => {
    tables.schools[0].settings.messaging.enabled = false;
    const { calls, net } = service({});
    await run({ termii: TERMII }, net);
    expect(row()).toMatchObject({ status: 'skipped', skipped_reason: 'messaging_off' });
    expect(calls).toEqual([]);
  });
});

describe('Channel plan', () => {
  const r: OutboxRow = { ...(queued() as unknown as OutboxRow), attempts: 0 };

  it('puts the asked-for channel first, then the others the school can use', () => {
    const plan = planChannels({ ...r, recipient_email: 'a@b.test' }, 'G', { whatsappDeviceId: 'd', whatsappTemplates: { payment_received: { templateId: 't' } } }, { termii: TERMII, email: EMAIL });
    expect(plan.map((p) => p.channel)).toEqual(['whatsapp', 'sms', 'email']);
    expect(planChannels({ ...r, preferred_channel: 'sms', recipient_email: 'a@b.test' }, 'G', { whatsappDeviceId: 'd', whatsappTemplates: { payment_received: { templateId: 't' } } }, { termii: TERMII, email: EMAIL }).map((p) => p.channel)).toEqual(['sms', 'whatsapp', 'email']);
  });

  it('offers a channel only when everything it needs is set up', () => {
    expect(planChannels(r, 'G', {}, { termii: { apiKey: 'k', baseUrl: 'https://t.test' } })).toEqual([]);
    expect(planChannels(r, 'G', { senderId: 'Greenfield' }, { termii: { apiKey: 'k', baseUrl: 'https://t.test' } }).map((p) => p.channel)).toEqual(['sms']);
  });
});

describe('Delivery reports', () => {
  beforeEach(() => {
    tables.message_outbox = [queued({ status: 'sent', provider_message_id: 'm-100', channel_used: 'sms' })];
  });

  it('marks a message delivered and records the real cost', async () => {
    expect(await applyDeliveryReport(admin(), { message_id: 'm-100', status: 'DELIVERED', cost: '4.2' }, NOW)).toEqual({ applied: true });
    expect(row()).toMatchObject({ status: 'delivered', cost: 4.2, delivered_at: NOW.toISOString() });
  });

  it('marks a message failed with the reason', async () => {
    await applyDeliveryReport(admin(), { message_id: 'm-100', status: 'DND Active on Phone Number' }, NOW);
    expect(row()).toMatchObject({ status: 'failed', last_error: 'DND Active on Phone Number' });
  });

  it('ignores a report for a message it does not know, one with no id, and one that says nothing final', async () => {
    expect((await applyDeliveryReport(admin(), { message_id: 'unknown', status: 'DELIVERED' }, NOW)).applied).toBe(false);
    expect((await applyDeliveryReport(admin(), { status: 'DELIVERED' }, NOW)).applied).toBe(false);
    expect((await applyDeliveryReport(admin(), { message_id: 'm-100', status: 'Message Sent' }, NOW)).applied).toBe(false);
    expect(row().status).toBe('sent');
  });
});
