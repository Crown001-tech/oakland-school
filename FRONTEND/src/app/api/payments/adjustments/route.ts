import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';
import { adjustmentTotal, childrenForSiblingDiscount, cleanAdjustment } from '@/lib/fee-adjustments';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

async function grossFor(sb: Awaited<ReturnType<typeof getSchoolDb>>, studentId: string): Promise<number> {
  const { data } = await sb.rpc('resolve_student_billed_tuition', { p_school_id: sb.schoolId, p_student_id: studentId });
  return Number(data ?? 0);
}

/** A student's adjustments (scholarships, discounts, sibling discounts, waivers) and what they come to. */
export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const studentId = params.get('studentId') || '';
    const sb = await getSchoolDb();

    // Families with more than one child at the school, for giving the sibling discount
    if (params.get('families') === '1') {
      const { data: links } = await sb.from('student_guardians').select('guardian_id, student_id');
      const byGuardian = new Map<string, string[]>();
      for (const l of links || []) byGuardian.set(l.guardian_id, [...(byGuardian.get(l.guardian_id) ?? []), l.student_id]);
      const families = [...byGuardian.entries()].filter(([, kids]) => kids.length >= 2);
      const guardianIds = families.map(([id]) => id);
      const childIds = [...new Set(families.flatMap(([, kids]) => kids))];
      const [{ data: guardians }, { data: kids }, { data: given }] = await Promise.all([
        guardianIds.length ? sb.from('guardians').select('id, first_name, last_name').in('id', guardianIds) : { data: [] },
        childIds.length ? sb.from('students').select('id, first_name, last_name').in('id', childIds) : { data: [] },
        childIds.length ? sb.from('fee_adjustments').select('student_id').eq('kind', 'sibling').eq('is_active', true).in('student_id', childIds) : { data: [] },
      ]);
      const gName = new Map<string, string>((guardians || []).map((g: any) => [g.id, `${g.first_name} ${g.last_name}`.trim()]));
      const kName = new Map<string, string>((kids || []).map((k: any) => [k.id, `${k.first_name} ${k.last_name}`.trim()]));
      const hasDiscount = new Set((given || []).map((g: { student_id: string }) => g.student_id));
      return NextResponse.json({
        success: true,
        data: {
          families: families.map(([id, ids]) => ({ guardianId: id, guardianName: gName.get(id) ?? '—', children: ids.map((k) => ({ id: k, name: kName.get(k) ?? '—', hasSiblingDiscount: hasDiscount.has(k) })) })),
        },
      });
    }

    if (!studentId) return fail('Choose a student.', 400);
    const { data, error } = await sb.from('fee_adjustments').select('id, kind, amount, percent, reason, is_active, created_by_name, created_at').eq('student_id', studentId).order('created_at', { ascending: false });
    if (error) throw error;
    const gross = await grossFor(sb, studentId);
    const list = (data || []).map((a: any) => ({ ...a, amount: a.amount != null ? Number(a.amount) : null, percent: a.percent != null ? Number(a.percent) : null }));
    return NextResponse.json({ success: true, data: { gross, off: adjustmentTotal(gross, list), adjustments: list } });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not load the adjustments.', 500);
  }
}

/**
 * Adds an adjustment to one student, or (action "sibling") gives the sibling discount to every later child of the
 * family. Each one keeps its reason and who gave it, and changes what the student is billed from now on.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    const body = await request.json().catch(() => ({}));
    const sb = await getSchoolDb();
    const who = actor.actorName || 'Staff';

    if (body.action === 'sibling') {
      const guardianId = typeof body.guardianId === 'string' ? body.guardianId : '';
      const percent = Number(body.percent);
      if (!guardianId) return fail('Choose the family.', 400);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return fail('The percentage must be above 0 and at most 100.', 400);

      const { data: links } = await sb.from('student_guardians').select('student_id').eq('guardian_id', guardianId);
      const ids = (links || []).map((l: { student_id: string }) => l.student_id);
      if (ids.length < 2) return fail('This family has only one child at the school.', 409);
      const { data: kids } = await sb.from('students').select('id, created_at').in('id', ids);
      const { data: existing } = await sb.from('fee_adjustments').select('student_id').eq('kind', 'sibling').eq('is_active', true).in('student_id', ids);
      const has = new Set((existing || []).map((e: { student_id: string }) => e.student_id));
      const targets = childrenForSiblingDiscount((kids || []).map((k: any) => ({ id: k.id, admittedAt: String(k.created_at), hasSiblingDiscount: has.has(k.id) })));
      if (targets.length === 0) return NextResponse.json({ success: true, data: { given: 0 }, message: 'Every later child already has the sibling discount.' });

      const { error } = await sb.from('fee_adjustments').insert(targets.map((id) => ({ student_id: id, kind: 'sibling', percent, reason: 'Sibling discount', created_by_name: who })));
      if (error) throw error;
      return NextResponse.json({ success: true, data: { given: targets.length } });
    }

    const studentId = typeof body.studentId === 'string' ? body.studentId : '';
    if (!studentId) return fail('Choose a student.', 400);
    const { data: student } = await sb.from('students').select('id').eq('id', studentId).maybeSingle();
    if (!student) return fail('Student not found.', 404);

    const checked = cleanAdjustment(body, await grossFor(sb, studentId));
    if (checked.error || !checked.adjustment) return fail(checked.error || 'Check the adjustment.', 400);
    const { error } = await sb.from('fee_adjustments').insert({ student_id: studentId, ...checked.adjustment, created_by_name: who });
    if (error) throw error;
    await sb.from('audit_logs').insert({ actor_id: actor.userId, actor_name: who, actor_role: actor.actorRoleLabel, action: 'finance.fee_adjustment_added', resource_type: 'fee_adjustments', resource_id: studentId, metadata: { summary: `${checked.adjustment.kind} added: ${checked.adjustment.reason}`, amount: checked.adjustment.amount, percent: checked.adjustment.percent } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not add the adjustment.', 500);
  }
}

/** Switches an adjustment off. It stays on the record, and no longer lowers the bill. */
export async function DELETE(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!id) return fail('Choose an adjustment.', 400);
    const sb = await getSchoolDb();
    const { data } = await sb.from('fee_adjustments').update({ is_active: false }).eq('id', id).select('id, student_id');
    if (!data || data.length === 0) return fail('Adjustment not found.', 404);
    await sb.from('audit_logs').insert({ actor_id: actor.userId, actor_name: actor.actorName, actor_role: actor.actorRoleLabel, action: 'finance.fee_adjustment_removed', resource_type: 'fee_adjustments', resource_id: id, metadata: { summary: 'An adjustment was switched off' } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not remove the adjustment.', 500);
  }
}
