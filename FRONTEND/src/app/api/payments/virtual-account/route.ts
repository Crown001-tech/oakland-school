import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';
import { PaystackError, assignDedicatedAccount, createCustomer, paystackFromEnv } from '@/lib/payments/paystack';
import { payerEmail } from '@/lib/payments/online-payments';
import { normalizeNgPhone } from '@/lib/messaging/phone';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/**
 * Gives a student a bank account number of their own, so a transfer to it is matched to that student with no
 * reference to type. This depends on Paystack offering the service to the school's account and has not been
 * confirmed against Paystack's live service: try it in Paystack's test mode first. If Paystack refuses, the
 * parent can still pay online or at the bursary.
 */
export async function POST(request: NextRequest) {
  try {
    const cfg = paystackFromEnv();
    if (!cfg) return fail('Paystack is not connected to Eductive yet.', 503);
    const body = await request.json().catch(() => ({}));
    const studentId = typeof body.studentId === 'string' ? body.studentId : '';
    if (!studentId) return fail('Choose a student.', 400);

    const sb = await getSchoolDb();
    const { data: existing } = await sb.from('student_virtual_accounts').select('account_number, bank_name, account_name').eq('student_id', studentId).maybeSingle();
    if (existing) return NextResponse.json({ success: true, data: { accountNumber: existing.account_number, bankName: existing.bank_name, accountName: existing.account_name, existing: true } });

    const { data: student } = await sb.from('students').select('id, first_name, last_name').eq('id', studentId).maybeSingle();
    if (!student) return fail('Student not found.', 404);
    const { data: link } = await sb.from('student_guardians').select('guardian_id, guardians ( id, email, phone )').eq('student_id', studentId).limit(1).maybeSingle();
    const g = Array.isArray(link?.guardians) ? link.guardians[0] : link?.guardians;

    const customer = await createCustomer(cfg, {
      email: payerEmail(g?.email, g?.id ?? studentId, sb.studentEmailDomain),
      firstName: student.first_name,
      lastName: student.last_name,
      phone: normalizeNgPhone(g?.phone) ? `+${normalizeNgPhone(g?.phone)}` : undefined,
    });
    const account = await assignDedicatedAccount(cfg, { customerCode: customer.customerCode });

    const { error } = await sb.from('student_virtual_accounts').insert({
      student_id: studentId,
      provider: 'paystack',
      provider_customer_code: customer.customerCode,
      account_number: account.accountNumber,
      bank_name: account.bankName,
      account_name: account.accountName,
      raw: account.raw,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, data: { accountNumber: account.accountNumber, bankName: account.bankName, accountName: account.accountName, existing: false } });
  } catch (err) {
    if (err instanceof PaystackError) return fail(`${err.message} The student can still pay online or at the bursary.`, err.status);
    return fail(err instanceof Error ? err.message : 'Could not create the account number.', 500);
  }
}
