import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor, getLinkedStudentIds, isAdminRole } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';
import { PaystackError } from '@/lib/payments/paystack';
import { verifyAndComplete } from '@/lib/payments/complete';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/**
 * Where Paystack sends the parent after paying, and what a bursar presses to check a payment again. It asks
 * Paystack what happened and records the payment if it succeeded. Safe to call as often as you like: the ledger
 * records a payment once.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor.hasSession) return fail('Sign in to check a payment.', 401);

    const reference = new URL(request.url).searchParams.get('reference') || '';
    if (!reference) return fail('No payment reference was given.', 400);

    const sb = await getSchoolDb();
    const { data: attempt } = await sb.from('online_payments').select('id, student_id, amount, status, fee_transaction_id').eq('reference', reference).maybeSingle();
    if (!attempt) return fail('That payment was not found.', 404);

    // A parent may look only at a payment for their own child
    if (actor.role === 'parent') {
      const linked = await getLinkedStudentIds(actor.email);
      if (!linked.includes(attempt.student_id)) return fail('That payment was not found.', 404);
    } else if (!isAdminRole(actor.role) && actor.role !== 'bursar') {
      return fail('Access denied for this role.', 403);
    }

    let outcome: string = attempt.status === 'success' ? 'already_recorded' : 'pending';
    let reason: string | undefined;
    if (attempt.status !== 'success') {
      try {
        const done = await verifyAndComplete(reference);
        if (!done) return fail('Online payment is not set up.', 503);
        outcome = done.outcome;
        reason = done.reason;
      } catch (err) {
        if (err instanceof PaystackError) return fail(`${err.message} If you were charged, the payment will be recorded once Paystack confirms it.`, 502);
        throw err;
      }
    }

    const { data: after } = await sb.from('online_payments').select('status, amount, fee_transaction_id, failure_reason').eq('reference', reference).maybeSingle();
    let receipt: string | null = null;
    if (after?.fee_transaction_id) {
      const { data: tx } = await sb.from('fee_transactions').select('receipt_number').eq('id', after.fee_transaction_id).maybeSingle();
      receipt = tx?.receipt_number ?? null;
    }
    return NextResponse.json({ success: true, data: { status: after?.status ?? attempt.status, outcome, reason: reason ?? after?.failure_reason ?? null, amount: Number(after?.amount ?? attempt.amount), receipt } });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not check the payment.', 500);
  }
}
