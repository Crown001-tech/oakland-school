import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type Row } from '../helpers/fake-db';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { cleanMessagingSettings } from '@/lib/messaging/settings';

const SECRET = 'a-long-enough-cron-secret-123';

describe('Who may run the scheduled jobs', () => {
  it('accepts only the bearer secret', () => {
    expect(isAuthorizedCron(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isAuthorizedCron(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorizedCron(`Bearer wrong-secret-of-same-len-1`, SECRET)).toBe(false);
    expect(isAuthorizedCron(SECRET, SECRET)).toBe(false);
    expect(isAuthorizedCron('Basic abc', SECRET)).toBe(false);
    expect(isAuthorizedCron(null, SECRET)).toBe(false);
    expect(isAuthorizedCron('', SECRET)).toBe(false);
  });

  it('is never open: no secret, or a short one, means nobody can run a job', () => {
    expect(isAuthorizedCron('Bearer ', '')).toBe(false);
    expect(isAuthorizedCron('Bearer abc', 'abc')).toBe(false);
    expect(isAuthorizedCron('Bearer undefined', undefined)).toBe(false);
  });
});

// The routes, with the work behind them replaced
const ran = vi.hoisted(() => ({ outbox: 0, reminders: 0 }));
vi.mock('@/lib/messaging/run', () => ({
  runOutbox: async () => ((ran.outbox += 1), { processed: 0 }),
  runFeeReminders: async () => ((ran.reminders += 1), { schools: 0 }),
  handleTermiiWebhook: async () => ({ status: 200, body: { success: true } }),
}));
const messagesJob = await import('@/app/api/cron/messages/route');
const remindersJob = await import('@/app/api/cron/reminders/route');

describe('The job routes', () => {
  beforeEach(() => {
    ran.outbox = 0;
    ran.reminders = 0;
    process.env.CRON_SECRET = SECRET;
  });

  const call = (handler: (r: NextRequest) => Promise<Response>, auth?: string) =>
    handler(new NextRequest('https://x.test/api/cron/job', { headers: auth ? { authorization: auth } : {} }));

  it('run with the secret', async () => {
    expect((await call(messagesJob.GET, `Bearer ${SECRET}`)).status).toBe(200);
    expect((await call(remindersJob.POST, `Bearer ${SECRET}`)).status).toBe(200);
    expect(ran).toEqual({ outbox: 1, reminders: 1 });
  });

  it('refuse everything else, and do no work', async () => {
    for (const auth of [undefined, 'Bearer nope', `Bearer ${SECRET}!`]) {
      expect((await call(messagesJob.GET, auth)).status).toBe(401);
      expect((await call(remindersJob.GET, auth)).status).toBe(401);
    }
    delete process.env.CRON_SECRET;
    expect((await call(messagesJob.GET, `Bearer ${SECRET}`)).status).toBe(401);
    expect(ran).toEqual({ outbox: 0, reminders: 0 });
  });
});

describe('Messaging settings', () => {
  it('accepts a sender name, a device, a rate, the DND route and a template for an event', () => {
    const r = cleanMessagingSettings({
      enabled: true,
      senderId: ' Greenfield ',
      whatsappDeviceId: 'device-1',
      smsUnitCost: '4.5',
      useDndRoute: true,
      whatsappTemplates: { payment_received: { templateId: 'tpl_1', fields: ['student', 'amount', 'bad name!'] } },
    });
    expect(r.error).toBeUndefined();
    expect(r.settings).toEqual({
      enabled: true,
      senderId: 'Greenfield',
      whatsappDeviceId: 'device-1',
      smsUnitCost: 4.5,
      useDndRoute: true,
      whatsappTemplates: { payment_received: { templateId: 'tpl_1', fields: ['student', 'amount'] } },
    });
  });

  it('clears a sender name or template when sent empty', () => {
    expect(cleanMessagingSettings({ senderId: '' }).settings).toEqual({ senderId: undefined });
    expect(cleanMessagingSettings({ whatsappTemplates: { absent: { templateId: '  ' } } }).settings).toEqual({ whatsappTemplates: {} });
  });

  it.each([
    ['a sender name that is too short', { senderId: 'ab' }],
    ['a sender name that is too long', { senderId: 'ABCDEFGHIJKL' }],
    ['a sender name with symbols', { senderId: 'Green!' }],
    ['a negative rate', { smsUnitCost: -1 }],
    ['a rate that is not a number', { smsUnitCost: 'lots' }],
    ['a rate that is far too high', { smsUnitCost: 5000 }],
    ['a template for an event that does not exist', { whatsappTemplates: { made_up: { templateId: 't' } } }],
    ['templates that are not a list', { whatsappTemplates: 'x' }],
    ['messaging switched with a word', { enabled: 'yes' }],
    ['DND switched with a word', { useDndRoute: 'on' }],
  ])('refuses %s', (_label, input) => {
    expect(cleanMessagingSettings(input).error).toBeTruthy();
  });
});

// Delivery reports reach the right message: the lib is the real one, the database a stand-in
const fakes = vi.hoisted(() => ({ tables: {} as Record<string, Row[]> }));
vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: () => createFakeDb(fakes.tables) }));

describe('The delivery report webhook', async () => {
  const real = await vi.importActual<typeof import('@/lib/messaging/run')>('@/lib/messaging/run');
  const sign = (b: string, k = 'whsec-1234') => crypto.createHmac('sha512', k).update(b).digest('hex');
  const body = JSON.stringify({ message_id: 'mm-1', status: 'DELIVERED', cost: '3.5' });

  beforeEach(() => {
    fakes.tables = { message_outbox: [{ id: 'o1', provider_message_id: 'mm-1', status: 'sent' }] };
    process.env.TERMII_WEBHOOK_SECRET = 'whsec-1234';
  });

  it('marks the message delivered and records its cost, when signed with the secret', async () => {
    expect(await real.handleTermiiWebhook(body, sign(body))).toEqual({ status: 200, body: { success: true, applied: true } });
    expect(fakes.tables.message_outbox[0]).toMatchObject({ status: 'delivered', cost: 3.5 });
  });

  it('refuses a report with a wrong or missing signature, and changes nothing', async () => {
    expect((await real.handleTermiiWebhook(body, sign(body, 'other'))).status).toBe(401);
    expect((await real.handleTermiiWebhook(body, null)).status).toBe(401);
    expect(fakes.tables.message_outbox[0].status).toBe('sent');
  });

  it('refuses every report when no secret is set, so an unsigned report can never change a message', async () => {
    delete process.env.TERMII_WEBHOOK_SECRET;
    expect((await real.handleTermiiWebhook(body, sign(body))).status).toBe(503);
    expect(fakes.tables.message_outbox[0].status).toBe('sent');
  });

  it('refuses a body that is not readable', async () => {
    expect((await real.handleTermiiWebhook('nope', sign('nope'))).status).toBe(400);
  });
});
