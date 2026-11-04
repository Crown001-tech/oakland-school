import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';

const STATUSES = ['initiated', 'success', 'failed', 'abandoned', 'mismatch'];

/**
 * The school's online payments, newest first, for the bursar to reconcile: what each parent paid, what Paystack
 * confirmed, and anything that did not match (money taken that was not recorded) so it can be looked into.
 */
export async function GET(request: NextRequest) {
  try {
    const sb = await getSchoolDb();
    const status = new URL(request.url).searchParams.get('status') || '';
    let query = sb
      .from('online_payments')
      .select('id, student_id, reference, amount, status, channel, provider_fee, paid_at, failure_reason, fee_transaction_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (STATUSES.includes(status)) query = query.eq('status', status);
    const { data: payments, error } = await query;
    if (error) throw error;

    const ids = [...new Set((payments || []).map((p: { student_id: string }) => p.student_id))];
    const { data: students } = ids.length ? await sb.from('students').select('id, first_name, last_name, admission_number').in('id', ids) : { data: [] };
    const byId = new Map<string, { name: string; admissionNo: string }>((students || []).map((s: any) => [s.id, { name: `${s.first_name} ${s.last_name}`.trim(), admissionNo: s.admission_number || '—' }]));

    const counts: Record<string, number> = {};
    for (const p of payments || []) counts[p.status] = (counts[p.status] ?? 0) + 1;

    return NextResponse.json({
      success: true,
      data: {
        counts,
        payments: (payments || []).map((p: any) => ({
          id: p.id,
          studentName: byId.get(p.student_id)?.name ?? '—',
          admissionNo: byId.get(p.student_id)?.admissionNo ?? '—',
          reference: p.reference,
          amount: Number(p.amount),
          status: p.status,
          channel: p.channel,
          providerFee: p.provider_fee != null ? Number(p.provider_fee) : null,
          paidAt: p.paid_at,
          reason: p.failure_reason,
          recorded: Boolean(p.fee_transaction_id),
          createdAt: p.created_at,
        })),
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Could not load online payments.' }, { status: 500 });
  }
}
