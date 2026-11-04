import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor, getLinkedStudentIds } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';
import { toKobo } from '@/lib/money';
import { PaystackError, initializeTransaction, paystackFromEnv } from '@/lib/payments/paystack';
import { callbackUrl, checkOnlineAmount, newReference, onlinePaymentsReady, outstandingOf, payerEmail, readPaymentSettings } from '@/lib/payments/online-payments';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/**
 * A parent starts an online payment for their own child. The amount is checked against what is still owed
 * (never more), an attempt is recorded, and the parent is sent to Paystack's page. Nothing is added to the
 * student's account here: that happens only when Paystack confirms the payment (see lib/payments/complete.ts).
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor.hasSession) return fail('Sign in to pay fees.', 401);
    if (actor.role !== 'parent') return fail('Only a parent can pay a child’s fees online.', 403);

    const body = await request.json().catch(() => ({}));
    const studentId = typeof body.studentId === 'string' ? body.studentId : '';
    if (!studentId) return fail('Choose which child you are paying for.', 400);

    const linked = await getLinkedStudentIds(actor.email);
    if (!linked.includes(studentId)) return fail('You can pay only for your own children.', 403);

    const cfg = paystackFromEnv();
    const sb = await getSchoolDb();
    const { data: school } = await sb.from('schools').select('settings').maybeSingle();
    if (!cfg || !onlinePaymentsReady(readPaymentSettings(school?.settings))) {
      return fail('Online payment is not set up for this school yet. Please pay at the bursary.', 503);
    }

    const { data: student } = await sb.from('students').select('id, first_name, last_name').eq('id', studentId).maybeSingle();
    if (!student) return fail('Student not found.', 404);

    // What is owed: the net bill less every successful payment
    const { data: net, error: netError } = await sb.rpc('resolve_student_net_billed', { p_school_id: sb.schoolId, p_student_id: studentId });
    if (netError) throw netError;
    const { data: paidRows } = await sb.from('fee_transactions').select('amount').eq('student_id', studentId).eq('status', 'successful');
    const paid = (paidRows || []).reduce((sum: number, r: { amount: number | string }) => sum + Number(r.amount), 0);
    const outstanding = outstandingOf(Number(net ?? 0), paid);

    const checked = checkOnlineAmount(body.amount, outstanding);
    if (checked.error || !checked.amount) return fail(checked.error || 'Enter the amount you want to pay.', 400);

    // A few attempts at a time is plenty; a stuck button should not create dozens of open payments
    const since = new Date(Date.now() - 10 * 60000).toISOString();
    const { data: recent } = await sb.from('online_payments').select('id').eq('student_id', studentId).eq('status', 'initiated').gte('created_at', since);
    if ((recent || []).length >= 5) return fail('Several payments were just started for this child. Please wait a few minutes.', 429);

    const { data: guardian } = await sb.from('guardians').select('id, email').eq('email', actor.email).maybeSingle();
    const reference = newReference(sb.idPrefix);
    const { error: insertError } = await sb.from('online_payments').insert({
      student_id: studentId,
      guardian_id: guardian?.id ?? null,
      reference,
      amount: checked.amount,
      status: 'initiated',
      created_by: actor.userId,
    });
    if (insertError) throw insertError;

    try {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
      const started = await initializeTransaction(cfg, {
        email: payerEmail(guardian?.email, guardian?.id ?? studentId, sb.studentEmailDomain),
        amountKobo: toKobo(checked.amount),
        reference,
        callbackUrl: callbackUrl(host),
        subaccount: readPaymentSettings(school?.settings).subaccountCode,
        bearer: readPaymentSettings(school?.settings).feeBearer ?? 'subaccount',
        metadata: { school_id: sb.schoolId, student_id: studentId, student_name: `${student.first_name} ${student.last_name}`.trim() },
      });
      await sb.from('online_payments').update({ authorization_url: started.authorizationUrl, access_code: started.accessCode }).eq('reference', reference);
      return NextResponse.json({ success: true, data: { authorizationUrl: started.authorizationUrl, reference } });
    } catch (err) {
      const message = err instanceof PaystackError ? err.message : 'Could not start the payment.';
      await sb.from('online_payments').update({ status: 'failed', failure_reason: message }).eq('reference', reference);
      return fail(`${message} Nothing was charged.`, err instanceof PaystackError ? 502 : 500);
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not start the payment.', 500);
  }
}
