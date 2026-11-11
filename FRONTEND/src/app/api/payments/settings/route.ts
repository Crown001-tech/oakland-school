import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';
import { PaystackError, createSubaccount, isTestMode, listNigerianBanks, paystackFromEnv } from '@/lib/payments/paystack';
import { onlinePaymentsReady, readPaymentSettings } from '@/lib/payments/online-payments';
import { providersFromEnv } from '@/lib/messaging/providers';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/** What is set up for online payments, without any secret. Anyone who manages fees may look. */
export async function GET() {
  try {
    const sb = await getSchoolDb();
    const cfg = paystackFromEnv();
    const { data: school } = await sb.from('schools').select('settings').maybeSingle();
    const pay = readPaymentSettings(school?.settings);
    const providers = providersFromEnv();
    return NextResponse.json({
      success: true,
      data: {
        // Whether the platform has a Paystack account connected at all, and whether it is in test mode
        paystackConnected: Boolean(cfg),
        testMode: cfg ? isTestMode(cfg) : false,
        subaccountConfigured: Boolean(pay.subaccountCode),
        accountLast4: pay.accountLast4 ?? null,
        enabled: pay.enabled !== false,
        ready: Boolean(cfg) && onlinePaymentsReady(pay),
        feeBearer: pay.feeBearer ?? 'subaccount',
        messaging: { whatsapp: Boolean(providers.termii), email: Boolean(providers.email) },
      },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not read the payment settings.', 500);
  }
}

/**
 * The proprietor connects the school to Paystack: the school's own bank account becomes a Paystack sub-account,
 * so fees are paid straight to the school and Eductive never holds them. Only the last four digits of the account
 * number are kept here; the full number goes to Paystack and no further.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    if (actor.role !== 'proprietor') return fail('Only the proprietor can change how the school is paid.', 403);

    const cfg = paystackFromEnv();
    if (!cfg) return fail('Paystack is not connected to Eductive yet.', 503);

    const body = await request.json().catch(() => ({}));
    const sb = await getSchoolDb();
    const { data: school } = await sb.from('schools').select('name, settings').maybeSingle();
    const current = readPaymentSettings(school?.settings);

    const save = async (next: Record<string, unknown>) => {
      const { error } = await sb.rpc('merge_school_settings', { p_school_id: sb.schoolId, p_patch: { payments: { ...current, ...next } } });
      if (error) throw new Error(error.message);
    };
    const audit = (summary: string) =>
      sb.from('audit_logs').insert({ actor_id: actor.userId, actor_name: actor.actorName, actor_role: 'Proprietor', action: 'finance.payment_settings_changed', resource_type: 'schools', resource_id: sb.schoolId, metadata: { summary } });

    switch (body.action) {
      case 'banks': {
        return NextResponse.json({ success: true, data: await listNigerianBanks(cfg) });
      }
      case 'create_subaccount': {
        const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : '';
        const bankCode = typeof body.bankCode === 'string' ? body.bankCode.trim() : '';
        const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.replace(/\s+/g, '') : '';
        if (businessName.length < 2 || businessName.length > 100) return fail('Give the name the school’s bank account is held in.', 400);
        if (!/^\d{3,6}$/.test(bankCode)) return fail('Choose the school’s bank.', 400);
        if (!/^\d{10}$/.test(accountNumber)) return fail('A Nigerian bank account number has 10 digits.', 400);
        if (current.subaccountCode && body.replace !== true) return fail('The school already has a payment account. Confirm to replace it.', 409);

        const created = await createSubaccount(cfg, { businessName, settlementBankCode: bankCode, accountNumber, percentageCharge: 0 });
        await save({ provider: 'paystack', subaccountCode: created.subaccountCode, accountLast4: created.accountNumberLast4, feeBearer: current.feeBearer ?? 'subaccount', enabled: true });
        await audit(`School payment account set to one ending ${created.accountNumberLast4}`);
        return NextResponse.json({ success: true, data: { accountLast4: created.accountNumberLast4 } });
      }
      case 'set_enabled': {
        if (typeof body.enabled !== 'boolean') return fail('Choose on or off.', 400);
        if (!current.subaccountCode) return fail('Set up the school’s payment account first.', 409);
        await save({ enabled: body.enabled });
        await audit(`Online payments turned ${body.enabled ? 'on' : 'off'}`);
        return NextResponse.json({ success: true });
      }
      case 'set_fee_bearer': {
        if (body.feeBearer !== 'account' && body.feeBearer !== 'subaccount') return fail('Choose who pays Paystack’s fee.', 400);
        await save({ feeBearer: body.feeBearer });
        await audit(`Paystack’s fee is paid by ${body.feeBearer === 'subaccount' ? 'the school' : 'Eductive'}`);
        return NextResponse.json({ success: true });
      }
      default:
        return fail('Choose what to change.', 400);
    }
  } catch (err) {
    if (err instanceof PaystackError) return fail(err.message, err.status);
    return fail(err instanceof Error ? err.message : 'Could not change the payment settings.', 500);
  }
}
