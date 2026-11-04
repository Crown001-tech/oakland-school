import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { parseTermiiReport, providersFromEnv, sendEmail, sendTermiiSms, sendTermiiWhatsappTemplate, verifyTermiiSignature } from '@/lib/messaging/providers';

const termii = { apiKey: 'tk_secret', baseUrl: 'https://api.example-termii.test' };
const answer = (status: number, json: unknown) => vi.fn(async () => new Response(JSON.stringify(json), { status }));
const net = (f: ReturnType<typeof vi.fn>) => ({ fetchImpl: f as unknown as typeof fetch });

describe('What is set up', () => {
  it('finds nothing when no key is set, so nothing pretends to send', () => {
    expect(providersFromEnv({} as NodeJS.ProcessEnv)).toEqual({});
  });

  it('needs the account\'s own https address for Termii, and a sender and key for email', () => {
    expect(providersFromEnv({ TERMII_API_KEY: 'k' } as unknown as NodeJS.ProcessEnv).termii).toBeUndefined();
    expect(providersFromEnv({ TERMII_API_KEY: 'k', TERMII_BASE_URL: 'http://plain.test' } as unknown as NodeJS.ProcessEnv).termii).toBeUndefined();
    expect(providersFromEnv({ TERMII_API_KEY: 'k', TERMII_BASE_URL: 'https://x.test/' } as unknown as NodeJS.ProcessEnv).termii).toMatchObject({ baseUrl: 'https://x.test' });
    expect(providersFromEnv({ RESEND_API_KEY: 'k' } as unknown as NodeJS.ProcessEnv).email).toBeUndefined();
    expect(providersFromEnv({ RESEND_API_KEY: 'k', EMAIL_FROM: 'School <office@school.test>' } as unknown as NodeJS.ProcessEnv).email).toMatchObject({ from: 'School <office@school.test>' });
  });
});

describe('Sending an SMS', () => {
  it('sends the fields Termii documents and reads the message id', async () => {
    const f = answer(200, { code: 'ok', balance: 1047.5, message_id: '301754', message: 'Successfully Sent', message_id_str: '301754' });
    const r = await sendTermiiSms(termii, { to: '2348031234567', text: 'Hello', senderId: 'Greenfield' }, net(f));
    expect(r).toEqual({ ok: true, providerMessageId: '301754' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example-termii.test/api/sms/send');
    expect(JSON.parse(String(init.body))).toEqual({ api_key: 'tk_secret', to: '2348031234567', from: 'Greenfield', sms: 'Hello', type: 'plain', channel: 'generic' });
  });

  it('uses the DND route when asked', async () => {
    const f = answer(200, { code: 'ok', message_id: '1' });
    await sendTermiiSms(termii, { to: '2348031234567', text: 'Hello', senderId: 'Greenfield', route: 'dnd' }, net(f));
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)).channel).toBe('dnd');
  });

  it('refuses a sender name Termii would reject, without calling it', async () => {
    const f = answer(200, {});
    expect((await sendTermiiSms(termii, { to: '2348031234567', text: 'x', senderId: 'AB' }, net(f))).retryable).toBe(false);
    expect((await sendTermiiSms(termii, { to: '2348031234567', text: 'x', senderId: 'Far Too Long Name' }, net(f))).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'Invalid Sender Id', false],
    [401, 'Unauthorized', false],
    [422, 'Bad number', false],
    [429, 'Too many requests', true],
    [503, 'Unavailable', true],
    [400, 'Insufficient balance', true],
  ])('treats %s "%s" as retryable: %s', async (status, message, retryable) => {
    const r = await sendTermiiSms(termii, { to: '2348031234567', text: 'x', senderId: 'Greenfield' }, net(answer(status, { message })));
    expect(r).toMatchObject({ ok: false, retryable, error: message });
  });

  it('retries a network failure, and never puts the key in the error', async () => {
    const f = vi.fn(async () => {
      throw new Error('boom tk_secret');
    });
    const r = await sendTermiiSms(termii, { to: '2348031234567', text: 'x', senderId: 'Greenfield' }, net(f));
    expect(r).toMatchObject({ ok: false, retryable: true });
    expect(r.error).not.toContain('tk_secret');
  });
});

describe('Sending a WhatsApp template', () => {
  it('sends the template and its values', async () => {
    const f = answer(200, { code: 'ok', message_id: 'w1' });
    const r = await sendTermiiWhatsappTemplate(termii, { to: '2348031234567', deviceId: 'dev1', templateId: 'tpl9', data: { student: 'Ada' } }, net(f));
    expect(r).toEqual({ ok: true, providerMessageId: 'w1' });
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({ api_key: 'tk_secret', phone_number: '2348031234567', device_id: 'dev1', template_id: 'tpl9', data: { student: 'Ada' } });
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('https://api.example-termii.test/api/send/template');
  });
});

describe('Sending an email', () => {
  const cfg = { apiKey: 'rk', from: 'School <office@school.test>' };

  it('sends and reads the id', async () => {
    const f = answer(200, { id: 'em1' });
    expect(await sendEmail(cfg, { to: 'parent@example.test', subject: 'Hi', text: 'Body' }, net(f))).toEqual({ ok: true, providerMessageId: 'em1' });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer rk');
    expect(JSON.parse(String(init.body))).toEqual({ from: cfg.from, to: ['parent@example.test'], subject: 'Hi', text: 'Body' });
  });

  it('refuses an address that is not an address, without calling the service', async () => {
    const f = answer(200, {});
    expect((await sendEmail(cfg, { to: '—', subject: 'x', text: 'y' }, net(f))).retryable).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});

describe('Delivery reports', () => {
  const body = JSON.stringify({ message_id: 'm1', status: 'DELIVERED', cost: '4.0' });
  const sign = (b: string, k = 'whsec') => crypto.createHmac('sha512', k).update(b).digest('hex');

  it('accepts a report signed with the secret and refuses anything else', () => {
    expect(verifyTermiiSignature(body, sign(body), 'whsec')).toBe(true);
    expect(verifyTermiiSignature(body, sign(body, 'other'), 'whsec')).toBe(false);
    expect(verifyTermiiSignature(body + ' ', sign(body), 'whsec')).toBe(false);
    expect(verifyTermiiSignature(body, null, 'whsec')).toBe(false);
    expect(verifyTermiiSignature(body, sign(body), '')).toBe(false);
  });

  it('reads delivered and failed reports with their cost', () => {
    expect(parseTermiiReport({ message_id: 'm1', status: 'DELIVERED', cost: '4.0' })).toEqual({ messageId: 'm1', state: 'delivered', cost: 4, reason: null });
    expect(parseTermiiReport({ message_id: 'm2', status: 'DND Active on Phone Number' })).toMatchObject({ state: 'failed', cost: null, reason: 'DND Active on Phone Number' });
    expect(parseTermiiReport({ message_id: 'm3', status: 'Message Failed', cost: 2 })).toMatchObject({ state: 'failed', cost: 2 });
  });

  it('leaves a message alone for any other status, and ignores a report with no id', () => {
    expect(parseTermiiReport({ message_id: 'm4', status: 'Message Sent' })?.state).toBe('other');
    expect(parseTermiiReport({ status: 'DELIVERED' })).toBeNull();
    expect(parseTermiiReport({ message_id: 'm5', status: 'DELIVERED', cost: 'abc' })?.cost).toBeNull();
  });
});
