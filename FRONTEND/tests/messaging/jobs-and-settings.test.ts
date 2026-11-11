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
  it('accepts a device and a template for an event', () => {
    const r = cleanMessagingSettings({
      enabled: true,
      whatsappDeviceId: 'device-1',
      whatsappTemplates: { payment_received: { templateId: 'tpl_1', fields: ['student', 'amount', 'bad name!'] } },
    });
    expect(r.error).toBeUndefined();
    expect(r.settings).toEqual({
      enabled: true,
      whatsappDeviceId: 'device-1',
      whatsappTemplates: { payment_received: { templateId: 'tpl_1', fields: ['student', 'amount'] } },
    });
  });

  it('has no text message settings: a sender name, a rate or a DND route is not kept', () => {
    expect(cleanMessagingSettings({ senderId: 'Greenfield', smsUnitCost: 4, useDndRoute: true }).settings).toEqual({});
  });

  it('clears a template when sent empty', () => {
    expect(cleanMessagingSettings({ whatsappTemplates: { absent: { templateId: '  ' } } }).settings).toEqual({ whatsappTemplates: {} });
  });

  it.each([
    ['a template for an event that does not exist', { whatsappTemplates: { made_up: { templateId: 't' } } }],
    ['templates that are not a list', { whatsappTemplates: 'x' }],
    ['messaging switched with a word', { enabled: 'yes' }],
  ])('refuses %s', (_label, input) => {
    expect(cleanMessagingSettings(input).error).toBeTruthy();
  });
});
