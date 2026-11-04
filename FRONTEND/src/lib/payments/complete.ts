import type { SupabaseClient } from '@supabase/supabase-js';
import { scopeClient } from '@/lib/school-scope';
import { idPrefixFor, studentEmailDomainFor } from '@/lib/school-config';
import { notifyPaymentReceived } from '@/lib/messaging/events';
import { PaystackError, paystackFromEnv, verifyTransaction, verifyWebhookSignature, type PaystackConfig, type VerifiedTransaction } from '@/lib/payments/paystack';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { judgeConfirmation, type CompletionOutcome } from '@/lib/payments/online-payments';

/**
 * Turning a confirmed online payment into a record in the ledger. This is the only place an online payment
 * becomes money in a student's account, and it happens only when Paystack itself says the payment succeeded for
 * the amount that was asked for.
 *
 * It starts from a reference, so it can be reached from three directions (Paystack's webhook, the parent coming
 * back to the school's page, and a bursar pressing "check again") and always gives the same result: the ledger
 * records the payment once, because it is written with the reference as its idempotency key.
 *
 * It uses the unrestricted database client because it must find a payment by its reference without knowing the
 * school yet. Everything after that runs through the school's own client.
 */

export interface Completion {
  outcome: CompletionOutcome;
  receipt?: string;
  reason?: string;
}

interface AttemptRow {
  id: string;
  school_id: string;
  student_id: string;
  guardian_id: string | null;
  reference: string;
  amount: number | string;
  status: string;
  fee_transaction_id: string | null;
}

async function schoolInfo(admin: SupabaseClient, schoolId: string) {
  const { data } = await admin.from('schools').select('code, subdomain, settings').eq('id', schoolId).maybeSingle();
  return { idPrefix: idPrefixFor(data ?? {}), studentEmailDomain: studentEmailDomainFor(data ?? {}) };
}

/** Records a payment Paystack has confirmed, then updates the attempt and queues the receipt. */
async function recordConfirmed(admin: SupabaseClient, attempt: AttemptRow, confirmed: VerifiedTransaction): Promise<Completion> {
  const db = scopeClient(admin, attempt.school_id, await schoolInfo(admin, attempt.school_id));

  let payerName = 'Guardian';
  if (attempt.guardian_id) {
    const { data: g } = await db.from('guardians').select('first_name, last_name').eq('id', attempt.guardian_id).maybeSingle();
    payerName = `${g?.first_name ?? ''} ${g?.last_name ?? ''}`.trim() || payerName;
  }

  const record = (allowOverpayment: boolean) =>
    admin.rpc('record_fee_payment_tx', {
      p_school_id: attempt.school_id,
      p_student_id: attempt.student_id,
      p_amount: Number(attempt.amount),
      p_payment_method: `Paystack${confirmed.channel ? ` (${confirmed.channel})` : ''}`,
      p_reference: attempt.reference,
      p_idempotency_key: `paystack:${attempt.reference}`,
      p_payer_name: payerName,
      p_actor_name: 'Paystack (online payment)',
      p_actor_role: 'System',
      p_allow_overpayment: allowOverpayment,
    });

  let { data, error } = await record(false);
  // The money has been taken. If the bill fell in the meantime (a bursar recorded a cash payment, a scholarship
  // was added), the difference is carried forward as credit; the payment is never dropped.
  if (error && String(error.message).includes('OVERPAYMENT_REJECTED')) ({ data, error } = await record(true));
  if (error) throw new Error(`The ledger refused the payment: ${error.message}`);

  const tx = data?.transaction;
  const account = data?.account;
  await admin
    .from('online_payments')
    .update({
      status: 'success',
      channel: confirmed.channel,
      provider_fee: confirmed.feesKobo != null ? confirmed.feesKobo / 100 : null,
      paid_at: confirmed.paidAt,
      verified_at: new Date().toISOString(),
      fee_transaction_id: tx?.id ?? null,
      failure_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', attempt.id);

  // Queued once, on the first recording only: a replay of the same payment queues nothing new
  if (!data?.idempotent_replay && tx?.receipt_number) {
    await notifyPaymentReceived(db, { studentId: attempt.student_id, amount: Number(attempt.amount), receipt: String(tx.receipt_number), balance: Number(account?.outstanding_balance ?? 0) });
  }
  return { outcome: data?.idempotent_replay ? 'already_recorded' : 'recorded', receipt: tx?.receipt_number ? String(tx.receipt_number) : undefined };
}

/** A transfer to a student's own account number has no attempt behind it, so one is made from what Paystack reports. */
async function attemptFromTransfer(admin: SupabaseClient, confirmed: VerifiedTransaction): Promise<AttemptRow | null> {
  if (confirmed.status !== 'success' || !confirmed.receiverAccountNumber) return null;
  const { data: account } = await admin.from('student_virtual_accounts').select('school_id, student_id').eq('account_number', confirmed.receiverAccountNumber).eq('provider', 'paystack').maybeSingle();
  if (!account) return null;
  const { data: link } = await admin.from('student_guardians').select('guardian_id').eq('student_id', account.student_id).limit(1).maybeSingle();
  const row = {
    school_id: account.school_id,
    student_id: account.student_id,
    guardian_id: link?.guardian_id ?? null,
    provider: 'paystack',
    reference: confirmed.reference,
    amount: confirmed.amountKobo / 100,
    currency: confirmed.currency,
    status: 'initiated',
    channel: confirmed.channel,
  };
  const { error } = await admin.from('online_payments').insert(row);
  // A second notice of the same transfer finds the row already there
  if (error && error.code !== '23505') throw new Error(error.message);
  const { data } = await admin.from('online_payments').select('id, school_id, student_id, guardian_id, reference, amount, status, fee_transaction_id').eq('provider', 'paystack').eq('reference', confirmed.reference).maybeSingle();
  return (data as AttemptRow) ?? null;
}

export async function completeOnlinePayment(admin: SupabaseClient, cfg: PaystackConfig, reference: string): Promise<Completion> {
  const { data: existing } = await admin
    .from('online_payments')
    .select('id, school_id, student_id, guardian_id, reference, amount, status, fee_transaction_id')
    .eq('provider', 'paystack')
    .eq('reference', reference)
    .maybeSingle();
  let attempt = existing as AttemptRow | null;

  if (attempt?.status === 'success' && attempt.fee_transaction_id) return { outcome: 'already_recorded' };

  // Ask Paystack what really happened. Neither the browser nor the webhook body is trusted on its own.
  const confirmed = await verifyTransaction(cfg, reference);
  if (!attempt) attempt = await attemptFromTransfer(admin, confirmed);
  if (!attempt) return { outcome: 'unknown_reference' };

  const verdict = judgeConfirmation(attempt, confirmed);
  const touch = (patch: Record<string, unknown>) => admin.from('online_payments').update({ ...patch, verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', attempt!.id);

  if (verdict.outcome === 'mismatch') {
    await touch({ status: 'mismatch', failure_reason: verdict.reason, raw: { status: confirmed.status, amountKobo: confirmed.amountKobo, currency: confirmed.currency } });
    return { outcome: 'mismatch', reason: verdict.reason };
  }
  if (verdict.outcome === 'not_successful') {
    if (confirmed.status === 'failed' || confirmed.status === 'abandoned') await touch({ status: confirmed.status === 'failed' ? 'failed' : 'abandoned', failure_reason: verdict.reason });
    return { outcome: 'not_successful', reason: verdict.reason };
  }
  if (verdict.outcome === 'already') {
    // The row says success but the ledger link is missing: record it now (the ledger replays safely)
    return recordConfirmed(admin, attempt, confirmed);
  }
  return recordConfirmed(admin, attempt, confirmed);
}

/** Paystack's webhook. Always answers quickly: 200 once handled or deliberately ignored, an error only when a retry would help. */
export async function handlePaystackWebhook(
  admin: SupabaseClient,
  cfg: PaystackConfig,
  rawBody: string,
  signature: string | null
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!verifyWebhookSignature(rawBody, signature, cfg.secretKey)) return { status: 401, body: { success: false, message: 'Invalid signature.' } };

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { success: false, message: 'Unreadable body.' } };
  }
  if (event?.event !== 'charge.success') return { status: 200, body: { success: true, ignored: String(event?.event ?? '') } };
  const reference = event?.data?.reference;
  if (typeof reference !== 'string' || !reference) return { status: 200, body: { success: true, ignored: 'no reference' } };

  try {
    const result = await completeOnlinePayment(admin, cfg, reference);
    return { status: 200, body: { success: true, outcome: result.outcome } };
  } catch (err) {
    // Paystack tries again later when it hears an error
    const status = err instanceof PaystackError && err.status < 500 ? 200 : 500;
    console.error('Paystack webhook not completed:', err instanceof Error ? err.message : err);
    return { status, body: { success: status === 200, message: 'Not completed.' } };
  }
}

// ---------------------------------------------------------------------------------------------
// Entry points for the routes, which never hold the unrestricted client themselves
// ---------------------------------------------------------------------------------------------

/** Checks a payment with Paystack and records it if it succeeded. Null when Paystack is not set up. */
export async function verifyAndComplete(reference: string): Promise<Completion | null> {
  const cfg = paystackFromEnv();
  if (!cfg) return null;
  return completeOnlinePayment(getSupabaseAdmin(), cfg, reference);
}

/** Handles a webhook request from Paystack. Null when Paystack is not set up. */
export async function handlePaystackWebhookRequest(rawBody: string, signature: string | null) {
  const cfg = paystackFromEnv();
  if (!cfg) return null;
  return handlePaystackWebhook(getSupabaseAdmin(), cfg, rawBody, signature);
}
