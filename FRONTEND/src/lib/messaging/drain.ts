import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, sendTermiiWhatsappTemplate, parseTermiiReport, type DeliveryReport, type ProviderEnv, type SendResult } from '@/lib/messaging/providers';
import type { Channel } from '@/lib/messaging/outbox';

/**
 * Sends what is waiting in message_outbox, across every school. It runs on a schedule (see /api/cron/messages),
 * never inside a page request.
 *
 * For each message it tries the channels the school has set up, in order: the one asked for first, then the
 * others. A message that fails for good on one channel (a bad number, a template that is not approved) moves to
 * the next; one that fails for a reason that may pass (a busy service, no balance) waits and tries again later,
 * up to MAX_ATTEMPTS. If no messaging service is set up at all the message simply waits, untouched.
 */

export const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 15, 60, 240];

/** Minutes to wait before the next try, by how many tries have been made. */
export const backoffMinutes = (attempts: number) => BACKOFF_MINUTES[Math.min(Math.max(attempts, 1), BACKOFF_MINUTES.length) - 1];

export interface SchoolMessaging {
  enabled?: boolean;
  whatsappDeviceId?: string;
  /** event -> the approved template's id, and the names of the values it is filled with */
  whatsappTemplates?: Record<string, { templateId: string; fields?: string[] }>;
}

export function readMessagingSettings(settings: unknown): SchoolMessaging {
  const m = ((settings as { messaging?: unknown } | null)?.messaging ?? {}) as SchoolMessaging;
  return typeof m === 'object' && m ? m : {};
}

export interface OutboxRow {
  id: string;
  school_id: string;
  event: string;
  preferred_channel: Channel;
  recipient_phone: string | null;
  recipient_email: string | null;
  subject: string | null;
  body: string;
  fields: Record<string, string> | null;
  attempts: number;
}

interface PlannedChannel {
  channel: Channel;
  send: () => Promise<SendResult>;
}

type Net = { fetchImpl?: typeof fetch };

/** The channels this message can go by, in the order to try them. Pure apart from the sends it builds. */
export function planChannels(row: OutboxRow, schoolName: string, messaging: SchoolMessaging, providers: ProviderEnv, net: Net = {}): PlannedChannel[] {
  const plans: Record<Channel, PlannedChannel | null> = { whatsapp: null, email: null };
  const t = providers.termii;

  const deviceId = messaging.whatsappDeviceId || t?.whatsappDeviceId;
  const template = messaging.whatsappTemplates?.[row.event];
  if (t && row.recipient_phone && deviceId && template?.templateId) {
    const names = template.fields && template.fields.length > 0 ? template.fields : Object.keys(row.fields ?? {});
    const data: Record<string, string> = {};
    for (const n of names) data[n] = String((row.fields ?? {})[n] ?? '');
    plans.whatsapp = { channel: 'whatsapp', send: () => sendTermiiWhatsappTemplate(t, { to: row.recipient_phone!, deviceId, templateId: template.templateId, data }, net) };
  }

  if (providers.email && row.recipient_email) {
    const e = providers.email;
    plans.email = { channel: 'email', send: () => sendEmail(e, { to: row.recipient_email!, subject: row.subject || `Message from ${schoolName}`, text: row.body }, net) };
  }

  const order: Channel[] = [row.preferred_channel, ...(['whatsapp', 'email'] as Channel[]).filter((c) => c !== row.preferred_channel)];
  return order.map((c) => plans[c]).filter((p): p is PlannedChannel => p !== null);
}

export interface DrainSummary {
  processed: number;
  sent: number;
  failed: number;
  requeued: number;
  waiting: number;
}

export interface DrainOptions {
  admin: SupabaseClient;
  providers: ProviderEnv;
  net?: Net;
  now?: Date;
  limit?: number;
}

export async function drainOutbox(o: DrainOptions): Promise<DrainSummary> {
  const now = o.now ?? new Date();
  const summary: DrainSummary = { processed: 0, sent: 0, failed: 0, requeued: 0, waiting: 0 };
  const { admin } = o;

  const { data: due } = await admin
    .from('message_outbox')
    .select('id, school_id, event, preferred_channel, recipient_phone, recipient_email, subject, body, fields, attempts')
    .eq('status', 'queued')
    .lte('next_attempt_at', now.toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(o.limit ?? 50);
  const rows = (due || []) as OutboxRow[];
  if (rows.length === 0) return summary;

  const schoolIds = [...new Set(rows.map((r) => r.school_id))];
  const { data: schools } = await admin.from('schools').select('id, name, settings').in('id', schoolIds);
  const schoolById = new Map<string, { name: string; messaging: SchoolMessaging }>((schools || []).map((s: any) => [s.id, { name: s.name || '', messaging: readMessagingSettings(s.settings) }]));

  for (const row of rows) {
    // Claim it, so two runs at once never send it twice
    const { data: claimed } = await admin.from('message_outbox').update({ status: 'sending', attempts: row.attempts + 1 }).eq('id', row.id).eq('status', 'queued').select('id');
    if (!claimed || claimed.length === 0) continue;
    summary.processed += 1;

    const school = schoolById.get(row.school_id) ?? { name: '', messaging: {} };
    const attempts = row.attempts + 1;

    if (school.messaging.enabled === false) {
      await admin.from('message_outbox').update({ status: 'skipped', skipped_reason: 'messaging_off' }).eq('id', row.id);
      continue;
    }

    const plan = planChannels(row, school.name, school.messaging, o.providers, o.net);
    if (plan.length === 0) {
      const anyService = Boolean(o.providers.termii || o.providers.email);
      if (!anyService) {
        // Nothing is connected: wait, untouched, until something is
        await admin.from('message_outbox').update({ status: 'queued', attempts: row.attempts, next_attempt_at: new Date(now.getTime() + 60 * 60000).toISOString(), last_error: 'No messaging service is set up yet.' }).eq('id', row.id);
        summary.waiting += 1;
      } else {
        await admin.from('message_outbox').update({ status: 'failed', last_error: 'No channel can reach this person: the school has not set one up for them.' }).eq('id', row.id);
        summary.failed += 1;
      }
      continue;
    }

    let lastError = '';
    let retryable = false;
    let delivered: { channel: Channel; id?: string } | null = null;
    for (const step of plan) {
      const r = await step.send();
      if (r.ok) {
        delivered = { channel: step.channel, id: r.providerMessageId };
        break;
      }
      lastError = `${step.channel}: ${r.error ?? 'failed'}`;
      if (r.retryable) {
        retryable = true;
        break;
      }
    }

    if (delivered) {
      await admin
        .from('message_outbox')
        .update({ status: 'sent', channel_used: delivered.channel, provider_message_id: delivered.id ?? null, sent_at: now.toISOString(), last_error: null })
        .eq('id', row.id);
      summary.sent += 1;
    } else if (retryable && attempts < MAX_ATTEMPTS) {
      await admin.from('message_outbox').update({ status: 'queued', last_error: lastError, next_attempt_at: new Date(now.getTime() + backoffMinutes(attempts) * 60000).toISOString() }).eq('id', row.id);
      summary.requeued += 1;
    } else {
      await admin.from('message_outbox').update({ status: 'failed', last_error: lastError || 'Failed.' }).eq('id', row.id);
      summary.failed += 1;
    }
  }
  return summary;
}

/** Applies a delivery report from Termii to the message it is about. Reports for unknown messages are ignored. */
export async function applyDeliveryReport(admin: SupabaseClient, payload: unknown, now: Date = new Date()): Promise<{ applied: boolean }> {
  const report: DeliveryReport | null = parseTermiiReport(payload);
  if (!report || report.state === 'other') return { applied: false };
  const patch: Record<string, unknown> =
    report.state === 'delivered'
      ? { status: 'delivered', delivered_at: now.toISOString(), last_error: null }
      : { status: 'failed', last_error: report.reason ?? 'Failed' };
  if (report.cost != null) patch.cost = report.cost;
  const { data } = await admin.from('message_outbox').update(patch).eq('provider_message_id', report.messageId).in('status', ['sent', 'delivered', 'sending']).select('id');
  return { applied: Boolean(data && data.length > 0) };
}
