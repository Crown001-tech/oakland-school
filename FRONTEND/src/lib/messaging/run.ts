import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyDeliveryReport, drainOutbox } from '@/lib/messaging/drain';
import { providersFromEnv, verifyTermiiSignature } from '@/lib/messaging/providers';
import { queueFeeReminders } from '@/lib/reminders';

/**
 * The scheduled jobs and the delivery-report webhook, with the unrestricted client held here and not in the
 * routes. Each of these works across schools by design: a job sends every school's waiting messages, and a
 * delivery report names a message without naming its school.
 */

/** Sends the waiting messages. */
export async function runOutbox() {
  return drainOutbox({ admin: getSupabaseAdmin(), providers: providersFromEnv() });
}

/** Queues today's fee reminders (today in Lagos). */
export async function runFeeReminders(now: Date = new Date()) {
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
  return queueFeeReminders(getSupabaseAdmin(), today);
}

/** Handles a delivery report from Termii. Refused unless it is signed with the secret set for it. */
export async function handleTermiiWebhook(rawBody: string, signature: string | null): Promise<{ status: number; body: Record<string, unknown> }> {
  const secret = (process.env.TERMII_WEBHOOK_SECRET || '').trim();
  if (!secret) return { status: 503, body: { success: false, message: 'Delivery reports are not set up.' } };
  if (!verifyTermiiSignature(rawBody, signature, secret)) return { status: 401, body: { success: false, message: 'Invalid signature.' } };
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { success: false, message: 'Unreadable body.' } };
  }
  const result = await applyDeliveryReport(getSupabaseAdmin(), payload);
  return { status: 200, body: { success: true, applied: result.applied } };
}
