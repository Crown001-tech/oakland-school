import { normalizeNgPhone } from '@/lib/messaging/phone';
import { CATEGORY_OF, buildMessage, type MessageEvent, type MessageParams } from '@/lib/messaging/templates';

/**
 * Queuing messages. Every message the school sends goes into message_outbox first. The outbox is keyed by the
 * event (school + event_key), so the same event can never send the same message twice, however many times the
 * code that raises it runs. A message is skipped, and the reason kept, when there is nobody to send it to or the
 * parent has opted out of that kind of message.
 *
 * Sending is done separately (drain.ts), so a slow or failing messaging service never delays the page that
 * raised the event.
 */

type Db = { from: (table: string) => any; schoolId: string };

export type Channel = 'whatsapp' | 'email';

export interface EnqueueInput {
  event: MessageEvent;
  /** Unique for what happened ("gate:<log id>"), so it can happen once only */
  eventKey: string;
  studentId?: string | null;
  guardianId?: string | null;
  phone?: unknown;
  email?: string | null;
  params: MessageParams;
  preferredChannel?: Channel;
}

export type EnqueueResult = { status: 'queued' | 'skipped' | 'duplicate'; reason?: string };

const validEmail = (e: unknown): e is string => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export async function enqueueMessage(db: Db, input: EnqueueInput): Promise<EnqueueResult> {
  const message = buildMessage(input.event, input.params); // refuses a message with a missing fact
  const category = CATEGORY_OF[input.event];
  const phone = normalizeNgPhone(input.phone);
  const email = validEmail(input.email) ? input.email.trim() : null;

  let status: 'queued' | 'skipped' = 'queued';
  let reason: string | null = null;

  if (!phone && !email) {
    status = 'skipped';
    reason = 'no_contact';
  } else if (phone) {
    // An opt-out is by phone number, for one kind of message or for all
    const { data: optOuts } = await db.from('message_opt_outs').select('category').eq('phone', phone);
    if ((optOuts || []).some((o: { category: string }) => o.category === 'all' || o.category === category)) {
      status = 'skipped';
      reason = 'opted_out';
    }
  }

  const { data: written, error } = await db.from('message_outbox').upsert(
    {
      event: input.event,
      category,
      event_key: input.eventKey,
      student_id: input.studentId ?? null,
      guardian_id: input.guardianId ?? null,
      recipient_phone: phone,
      recipient_email: email,
      preferred_channel: input.preferredChannel ?? (phone ? 'whatsapp' : 'email'),
      subject: message.subject,
      body: message.body,
      fields: message.fields,
      status,
      skipped_reason: reason,
    },
    { onConflict: 'school_id,event_key', ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message || 'Could not queue the message.');
  if (!written || written.length === 0) return { status: 'duplicate' };
  return reason ? { status, reason } : { status };
}

export interface GuardianContact {
  guardianId: string;
  name: string;
  phone: string | null;
  email: string | null;
}

/** The guardians of a student, with the contact details on their records. */
export async function guardiansOf(db: Db, studentId: string): Promise<GuardianContact[]> {
  const { data } = await db.from('student_guardians').select('guardian_id, guardians ( id, first_name, last_name, phone, email )').eq('student_id', studentId);
  const out: GuardianContact[] = [];
  for (const row of data || []) {
    const g = Array.isArray(row.guardians) ? row.guardians[0] : row.guardians;
    if (!g) continue;
    out.push({ guardianId: g.id ?? row.guardian_id, name: `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim(), phone: g.phone ?? null, email: g.email ?? null });
  }
  return out;
}

/** Queues one message for each guardian of a student. The event key is made unique per guardian. */
export async function enqueueForGuardians(
  db: Db,
  studentId: string,
  event: MessageEvent,
  eventKey: string,
  params: MessageParams,
  preferredChannel?: Channel
): Promise<EnqueueResult[]> {
  const guardians = await guardiansOf(db, studentId);
  const results: EnqueueResult[] = [];
  for (const g of guardians) {
    results.push(await enqueueMessage(db, { event, eventKey: `${eventKey}:${g.guardianId}`, studentId, guardianId: g.guardianId, phone: g.phone, email: g.email, params, preferredChannel }));
  }
  if (guardians.length === 0) {
    // Nobody to tell: keep a record, once, so the school can see it
    results.push(await enqueueMessage(db, { event, eventKey: `${eventKey}:none`, studentId, phone: null, email: null, params, preferredChannel }));
  }
  return results;
}

// ---------------------------------------------------------------------------------------------
// Opt-outs
// ---------------------------------------------------------------------------------------------

export const OPT_OUT_CATEGORIES = ['all', 'payment', 'attendance', 'gate', 'results', 'broadcast', 'reminder'] as const;
export type OptOutCategory = (typeof OPT_OUT_CATEGORIES)[number];

export async function setOptOut(db: Db, input: { phone: unknown; category: string; guardianId?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizeNgPhone(input.phone);
  if (!phone) return { ok: false, error: 'That is not a Nigerian mobile number.' };
  if (!OPT_OUT_CATEGORIES.includes(input.category as OptOutCategory)) return { ok: false, error: 'Choose which messages to stop.' };
  const { error } = await db.from('message_opt_outs').upsert({ phone, category: input.category, guardian_id: input.guardianId ?? null }, { onConflict: 'school_id,phone,category', ignoreDuplicates: true });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeOptOut(db: Db, input: { phone: unknown; category: string }): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizeNgPhone(input.phone);
  if (!phone) return { ok: false, error: 'That is not a Nigerian mobile number.' };
  const { error } = await db.from('message_opt_outs').delete().eq('phone', phone).eq('category', input.category);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Usage and cost
// ---------------------------------------------------------------------------------------------

export interface UsageRow {
  status: string;
  channel_used: string | null;
  cost: number | string | null;
}

export interface Usage {
  total: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, { count: number; cost: number }>;
  /** Spend we know. Messages with no cost yet are counted separately, never as zero spent. */
  knownCost: number;
  withoutCost: number;
}

export function summariseUsage(rows: UsageRow[]): Usage {
  const usage: Usage = { total: rows.length, byStatus: {}, byChannel: {}, knownCost: 0, withoutCost: 0 };
  for (const r of rows) {
    usage.byStatus[r.status] = (usage.byStatus[r.status] ?? 0) + 1;
    if (r.status === 'sent' || r.status === 'delivered') {
      const channel = r.channel_used ?? 'unknown';
      const entry = (usage.byChannel[channel] ??= { count: 0, cost: 0 });
      entry.count += 1;
      if (r.cost != null && r.cost !== '') {
        const c = Number(r.cost);
        if (Number.isFinite(c)) {
          entry.cost += c;
          usage.knownCost += c;
        }
      } else {
        usage.withoutCost += 1;
      }
    }
  }
  usage.knownCost = Math.round(usage.knownCost * 10000) / 10000;
  return usage;
}
