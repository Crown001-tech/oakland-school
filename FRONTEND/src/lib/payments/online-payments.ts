import crypto from 'node:crypto';
import { roundNaira } from '@/lib/money';

/**
 * The rules for a parent paying fees online. Pure, so they are tested without a database or Paystack.
 */

/** The least an online payment can be, in naira. Smaller payments cost more in fees than they are worth. */
export const MIN_ONLINE_PAYMENT = 100;

export interface PaymentSettings {
  provider?: string;
  subaccountCode?: string;
  accountLast4?: string;
  feeBearer?: 'account' | 'subaccount';
  enabled?: boolean;
}

export function readPaymentSettings(settings: unknown): PaymentSettings {
  const p = ((settings as { payments?: unknown } | null)?.payments ?? {}) as PaymentSettings;
  return typeof p === 'object' && p ? p : {};
}

/** A school can take online payments only when it has its own sub-account and has not switched them off. */
export function onlinePaymentsReady(p: PaymentSettings): boolean {
  return Boolean(p.subaccountCode) && p.enabled !== false;
}

/** An unguessable reference of our own, so a payment can always be traced back to its attempt. */
export function newReference(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
}

export interface AmountCheck {
  amount?: number;
  error?: string;
}

/**
 * A parent may pay any amount from the minimum up to what is still owed: a part payment or the whole balance.
 * Paying more than is owed is refused, so money is never taken that the school would have to give back.
 */
export function checkOnlineAmount(input: unknown, outstanding: number): AmountCheck {
  const n = typeof input === 'string' ? Number(input.trim()) : typeof input === 'number' ? input : NaN;
  if (!Number.isFinite(n) || n <= 0) return { error: 'Enter the amount you want to pay.' };
  const amount = roundNaira(n);
  if (outstanding <= 0) return { error: 'Nothing is owed for this student.' };
  const floor = Math.min(MIN_ONLINE_PAYMENT, outstanding);
  if (amount < floor) return { error: `The smallest online payment is ₦${floor.toLocaleString('en-NG')}.` };
  if (amount > outstanding) return { error: `That is more than the ₦${outstanding.toLocaleString('en-NG')} still owed.` };
  return { amount };
}

/** What a student still owes: the net bill less every successful payment. */
export function outstandingOf(netBilledAmount: number, paid: number): number {
  return Math.max(0, roundNaira(netBilledAmount - paid));
}

/**
 * The email Paystack needs for the payer: the guardian's own, or a made-up address on the school's student
 * domain (never delivered to) when the guardian has none.
 */
export function payerEmail(guardianEmail: unknown, guardianId: string, studentEmailDomain: string): string {
  const e = typeof guardianEmail === 'string' ? guardianEmail.trim() : '';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return e.toLowerCase();
  return `parent-${guardianId.replace(/[^a-z0-9]/gi, '').slice(0, 12)}@${studentEmailDomain}`.toLowerCase();
}

/** The page Paystack sends the parent back to. Always the school's own address, over https unless on localhost. */
export function callbackUrl(host: string | null | undefined): string {
  const h = (host || '').trim().toLowerCase();
  const local = h === '' || /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(h);
  return `${local ? 'http' : 'https'}://${h || 'localhost:3000'}/parent/fees/verify`;
}

export type CompletionOutcome = 'recorded' | 'already_recorded' | 'not_successful' | 'mismatch' | 'unknown_reference';

/**
 * Decides what a confirmed Paystack payment means for the attempt it belongs to. A payment is recorded only
 * when Paystack says it succeeded, for the same amount in naira that the attempt asked for.
 */
export function judgeConfirmation(
  attempt: { amount: number | string; status: string },
  confirmed: { status: string; amountKobo: number; currency: string }
): { outcome: 'record' | 'already' | 'not_successful' | 'mismatch'; reason?: string } {
  if (attempt.status === 'success') return { outcome: 'already' };
  if (confirmed.status !== 'success') return { outcome: 'not_successful', reason: `Paystack reports the payment as ${confirmed.status || 'unknown'}.` };
  if (confirmed.currency !== 'NGN') return { outcome: 'mismatch', reason: `The payment was in ${confirmed.currency}, not naira.` };
  const expectedKobo = Math.round(Number(attempt.amount) * 100);
  if (confirmed.amountKobo !== expectedKobo) {
    return { outcome: 'mismatch', reason: `Paystack received ${confirmed.amountKobo / 100} but ${expectedKobo / 100} was asked for.` };
  }
  return { outcome: 'record' };
}
