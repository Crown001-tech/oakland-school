import crypto from 'node:crypto';

/**
 * The messaging services, over HTTPS. Each call takes the fetch function as a setting, so tests never reach the
 * network, and nothing here logs a key.
 *
 * Termii (SMS and WhatsApp) follows its public documentation: JSON body with api_key, POST /api/sms/send for
 * SMS, POST /api/send/template for a WhatsApp template. Termii gives each account its own base URL, so
 * TERMII_BASE_URL has no default. A WhatsApp message the school starts must use a template WhatsApp has
 * approved; Termii's documentation does not describe how templates are created, so the school's template ids go
 * in its settings. Email uses Resend. The WhatsApp template send and the email send are UNVERIFIED against the live
 * services from here: try each once in the providers' test accounts before relying on it.
 */

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  /** True when trying again later can succeed (a busy service, no balance); false when it never will (a bad number). */
  retryable?: boolean;
}

export interface ProviderEnv {
  termii?: { apiKey: string; baseUrl: string; defaultSenderId?: string; whatsappDeviceId?: string };
  email?: { apiKey: string; from: string };
}

export function providersFromEnv(env: NodeJS.ProcessEnv = process.env): ProviderEnv {
  const out: ProviderEnv = {};
  const apiKey = (env.TERMII_API_KEY || '').trim();
  const baseUrl = (env.TERMII_BASE_URL || '').trim().replace(/\/+$/, '');
  if (apiKey && baseUrl.startsWith('https://')) {
    out.termii = { apiKey, baseUrl, defaultSenderId: (env.TERMII_SENDER_ID || '').trim() || undefined, whatsappDeviceId: (env.TERMII_WHATSAPP_DEVICE_ID || '').trim() || undefined };
  }
  const emailKey = (env.RESEND_API_KEY || '').trim();
  const from = (env.EMAIL_FROM || '').trim();
  if (emailKey && from) out.email = { apiKey: emailKey, from };
  return out;
}

interface Net {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

async function post(url: string, body: unknown, headers: Record<string, string>, net: Net): Promise<{ status: number; json: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), net.timeoutMs ?? 15000);
  try {
    const res = await (net.fetchImpl ?? fetch)(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: controller.signal });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

/** Decides from Termii's answer whether a failure is worth retrying. */
export function classifyTermiiFailure(status: number, message: string): { retryable: boolean } {
  const m = message.toLowerCase();
  if (status === 429 || status >= 500) return { retryable: true };
  // An empty balance is fixed by topping up, so the message waits
  if (m.includes('insufficient balance')) return { retryable: true };
  return { retryable: false };
}

export interface SmsInput {
  to: string;
  text: string;
  senderId: string;
  /** generic for ordinary numbers; dnd reaches numbers that block promotional messages (needs enabling on the account) */
  route?: 'generic' | 'dnd';
}

export async function sendTermiiSms(cfg: NonNullable<ProviderEnv['termii']>, input: SmsInput, net: Net = {}): Promise<SendResult> {
  if (!/^[A-Za-z0-9 ]{3,11}$/.test(input.senderId)) return { ok: false, error: 'The sender name must be 3 to 11 letters or digits.', retryable: false };
  try {
    const { status, json } = await post(
      `${cfg.baseUrl}/api/sms/send`,
      { api_key: cfg.apiKey, to: input.to, from: input.senderId, sms: input.text, type: 'plain', channel: input.route ?? 'generic' },
      {},
      net
    );
    const id = json?.message_id_str ?? json?.message_id;
    if (status === 200 && (json?.code === 'ok' || id)) return { ok: true, providerMessageId: id ? String(id) : undefined };
    const message = String(json?.message ?? `Termii answered ${status}`);
    return { ok: false, error: message, ...classifyTermiiFailure(status, message) };
  } catch {
    return { ok: false, error: 'Could not reach Termii.', retryable: true };
  }
}

export interface WhatsappTemplateInput {
  to: string;
  deviceId: string;
  templateId: string;
  data: Record<string, string>;
}

export async function sendTermiiWhatsappTemplate(cfg: NonNullable<ProviderEnv['termii']>, input: WhatsappTemplateInput, net: Net = {}): Promise<SendResult> {
  try {
    const { status, json } = await post(
      `${cfg.baseUrl}/api/send/template`,
      { api_key: cfg.apiKey, phone_number: input.to, device_id: input.deviceId, template_id: input.templateId, data: input.data },
      {},
      net
    );
    const id = json?.message_id_str ?? json?.message_id;
    if (status === 200 && (json?.code === 'ok' || id)) return { ok: true, providerMessageId: id ? String(id) : undefined };
    const message = String(json?.message ?? `Termii answered ${status}`);
    return { ok: false, error: message, ...classifyTermiiFailure(status, message) };
  } catch {
    return { ok: false, error: 'Could not reach Termii.', retryable: true };
  }
}

export async function sendEmail(cfg: NonNullable<ProviderEnv['email']>, input: { to: string; subject: string; text: string }, net: Net = {}): Promise<SendResult> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to)) return { ok: false, error: 'The email address is not valid.', retryable: false };
  try {
    const { status, json } = await post('https://api.resend.com/emails', { from: cfg.from, to: [input.to], subject: input.subject, text: input.text }, { Authorization: `Bearer ${cfg.apiKey}` }, net);
    if (status >= 200 && status < 300 && json?.id) return { ok: true, providerMessageId: String(json.id) };
    const message = String(json?.message ?? `The email service answered ${status}`);
    return { ok: false, error: message, retryable: status === 429 || status >= 500 };
  } catch {
    return { ok: false, error: 'Could not reach the email service.', retryable: true };
  }
}

// ---------------------------------------------------------------------------------------------
// Delivery reports
// ---------------------------------------------------------------------------------------------

/**
 * Termii signs a delivery report with HMAC SHA512 of the payload, in the X-Termii-Signature header. Its
 * documentation does not say where the signing key is found, so the key is a setting (TERMII_WEBHOOK_SECRET)
 * and a report is refused when it is not set.
 */
export function verifyTermiiSignature(rawBody: string, signature: string | null | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody, 'utf8').digest('hex');
  const given = signature.trim().toLowerCase();
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface DeliveryReport {
  messageId: string;
  state: 'delivered' | 'failed' | 'other';
  cost: number | null;
  reason: string | null;
}

/** Reads a Termii delivery report. A status that is neither delivered nor a failure leaves the message as it was. */
export function parseTermiiReport(payload: any): DeliveryReport | null {
  const id = payload?.message_id ?? payload?.message_id_str;
  if (!id) return null;
  const status = String(payload?.status ?? '').toLowerCase();
  const cost = payload?.cost != null && payload.cost !== '' && Number.isFinite(Number(payload.cost)) ? Number(payload.cost) : null;
  if (status.includes('deliver')) return { messageId: String(id), state: 'delivered', cost, reason: null };
  if (status.includes('fail') || status.includes('dnd') || status.includes('reject') || status.includes('expire')) {
    return { messageId: String(id), state: 'failed', cost, reason: String(payload?.status ?? 'Failed') };
  }
  return { messageId: String(id), state: 'other', cost, reason: null };
}
