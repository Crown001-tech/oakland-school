import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';
import { cleanInstalments, instalmentStatus, suggestedPayment } from '@/lib/fee-adjustments';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });

async function paidBy(sb: Awaited<ReturnType<typeof getSchoolDb>>, studentId: string): Promise<number> {
  const { data } = await sb.from('fee_transactions').select('amount').eq('student_id', studentId).eq('status', 'successful');
  return (data || []).reduce((sum: number, r: { amount: number | string }) => sum + Number(r.amount), 0);
}

/** A student's instalment plan, how much of each is covered, and what to pay next. */
export async function GET(request: NextRequest) {
  try {
    const studentId = new URL(request.url).searchParams.get('studentId') || '';
    if (!studentId) return fail('Choose a student.', 400);
    const sb = await getSchoolDb();
    const { data } = await sb.from('fee_instalments').select('sequence, due_date, amount').eq('student_id', studentId).order('sequence', { ascending: true });
    const plan = (data || []).map((p: any) => ({ sequence: p.sequence, due_date: String(p.due_date).slice(0, 10), amount: Number(p.amount) }));
    const paid = await paidBy(sb, studentId);
    return NextResponse.json({ success: true, data: { plan: instalmentStatus(plan, paid, today()), next: suggestedPayment(plan, paid, today()) } });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not load the plan.', 500);
  }
}

/** Sets a student's instalment plan, replacing any earlier one. It must add up to exactly what the student is billed. */
export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    const body = await request.json().catch(() => ({}));
    const studentId = typeof body.studentId === 'string' ? body.studentId : '';
    if (!studentId) return fail('Choose a student.', 400);
    const sb = await getSchoolDb();
    const { data: student } = await sb.from('students').select('id').eq('id', studentId).maybeSingle();
    if (!student) return fail('Student not found.', 404);

    const { data: net } = await sb.rpc('resolve_student_net_billed', { p_school_id: sb.schoolId, p_student_id: studentId });
    const checked = cleanInstalments(body.instalments, Number(net ?? 0));
    if (checked.error || !checked.plan) return fail(checked.error || 'Check the plan.', 400);

    await sb.from('fee_instalments').delete().eq('student_id', studentId);
    const { error } = await sb.from('fee_instalments').insert(checked.plan.map((p) => ({ student_id: studentId, sequence: p.sequence, due_date: p.due_date, amount: p.amount })));
    if (error) throw error;
    await sb.from('audit_logs').insert({ actor_id: actor.userId, actor_name: actor.actorName, actor_role: actor.actorRoleLabel, action: 'finance.instalment_plan_set', resource_type: 'fee_instalments', resource_id: studentId, metadata: { summary: `Instalment plan of ${checked.plan.length} set`, instalments: checked.plan } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not set the plan.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    const studentId = new URL(request.url).searchParams.get('studentId') || '';
    if (!studentId) return fail('Choose a student.', 400);
    const sb = await getSchoolDb();
    await sb.from('fee_instalments').delete().eq('student_id', studentId);
    await sb.from('audit_logs').insert({ actor_id: actor.userId, actor_name: actor.actorName, actor_role: actor.actorRoleLabel, action: 'finance.instalment_plan_removed', resource_type: 'fee_instalments', resource_id: studentId, metadata: { summary: 'Instalment plan removed' } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not remove the plan.', 500);
  }
}
