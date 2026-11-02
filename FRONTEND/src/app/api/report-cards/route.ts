import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor, isAdminRole } from '@/lib/caller';
import { resolveGradingConfig } from '@/lib/grading-config';
import { buildClassReportCards, buildDescriptiveCards, cleanTraits, type ClassStudent } from '@/lib/report-cards';
import { getSchoolDb } from '@/lib/school-db';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/**
 * Report card step 1: the class teacher saves a card for every student with locked scores.
 * Cards are built on the server from the locked scores, so the page cannot change a mark.
 * Step 2 (principal approves) and step 3 (proprietor endorses) are in /api/results.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    const isAdmin = isAdminRole(actor.role);
    if (!actor.hasSession) return fail('Authentication is required.', 401);
    if (!isAdmin && actor.role !== 'teacher') return fail('Access denied for this role.', 403);

    const body = await request.json().catch(() => ({}));
    const className = typeof body.className === 'string' ? body.className.trim() : '';
    if (body.action !== 'compile' || !className) return fail('Choose a class to compile.', 400);
    const remarks: Record<string, unknown> = body.remarks && typeof body.remarks === 'object' ? body.remarks : {};
    // Ratings per student (skills and behaviour), kept with the card. Marks cards and remark cards can both carry them.
    const traitsByStudent: Record<string, unknown> = body.traits && typeof body.traits === 'object' ? body.traits : {};
    const descriptive = body.mode === 'descriptive';

    const sb = await getSchoolDb();

    // A teacher may compile only the class they are class teacher of
    if (!isAdmin) {
      const filters = [`user_id.eq.${actor.userId}`];
      if (actor.email) filters.push(`email.eq.${actor.email}`);
      const { data: staff } = await sb.from('staff_profiles').select('assigned_class').or(filters.join(',')).maybeSingle();
      if (!staff?.assigned_class || staff.assigned_class !== className) {
        return fail('Only the class teacher can compile this class’s report cards.', 403);
      }
    }

    const { data: school } = await sb.from('schools').select('id, settings').limit(1).maybeSingle();
    if (!school) return fail('School record not found.', 404);

    const { data: term } = await sb.from('academic_terms').select('id').eq('is_current', true).maybeSingle();
    if (!term) return fail('No current term is set, so report cards cannot be compiled.', 409);

    const { data: cls } = await sb.from('classes').select('id').eq('school_id', school.id).eq('name', className).maybeSingle();
    if (!cls) return fail(`Class ${className} was not found.`, 404);

    const { data: enrollments } = await sb
      .from('class_enrollments')
      .select('id, student_id, students ( id, admission_number, first_name, last_name )')
      .eq('class_id', cls.id)
      .eq('status', 'active');

    const students: ClassStudent[] = (enrollments || []).map((e: any) => {
      const s = Array.isArray(e.students) ? e.students[0] : e.students;
      return {
        id: e.student_id,
        enrollmentId: e.id,
        admissionNo: s?.admission_number || '',
        name: `${s?.first_name || ''} ${s?.last_name || ''}`.trim(),
      };
    });
    if (students.length === 0) return fail(`${className} has no enrolled students.`, 422);

    // Once the principal has approved the class, the cards are final
    const { data: existing } = await sb
      .from('report_cards')
      .select('enrollment_id, principal_approved, teacher_comment, traits')
      .in('enrollment_id', students.map((s) => s.enrollmentId))
      .eq('term_id', term.id);
    if ((existing || []).some((c: any) => c.principal_approved === true)) {
      return fail(`${className} report cards have already been approved by the principal and cannot be changed.`, 409);
    }
    const existingComment = new Map<string, string | null>((existing || []).map((c: any) => [c.enrollment_id, c.teacher_comment]));
    const existingTraits = new Map<string, unknown>((existing || []).map((c: any) => [c.enrollment_id, c.traits]));

    // Remark cards: the class teacher writes a remark for each subject and rates skills and behaviour. No marks.
    if (descriptive) {
      const { data: subjectRows } = await sb.from('subjects').select('name').eq('is_active', true);
      const registered = (subjectRows || []).map((r: { name: string }) => r.name);
      const input = body.cards && typeof body.cards === 'object' ? body.cards : {};
      const made = buildDescriptiveCards(students, input, registered);
      if (made.cards.length === 0) {
        return fail(made.errors[0] || `Write a remark or a rating for at least one student in ${className}.`, 422);
      }
      const descriptiveRows = made.cards.map((card) => ({
        enrollment_id: card.enrollmentId,
        term_id: term.id,
        class_name: className,
        style: 'descriptive',
        subjects: card.subjects,
        traits: card.traits,
        total_score: null,
        average_score: null,
        rank: null,
        teacher_comment: card.comment || existingComment.get(card.enrollmentId) || null,
        status: 'submitted',
        principal_approved: false,
        proprietor_endorsed: false,
        published_at: null,
      }));
      const { error: descriptiveError } = await sb.from('report_cards').upsert(descriptiveRows, { onConflict: 'enrollment_id,term_id' });
      if (descriptiveError) throw descriptiveError;
      return NextResponse.json({ success: true, data: { saved: descriptiveRows.length, skipped: made.errors } });
    }

    const built = buildClassReportCards(className, students, school.settings?.subject_scores, resolveGradingConfig(school.settings));
    if (built.cards.length === 0) {
      return fail(
        built.unlockedSubjects.length > 0
          ? `No scores are locked for ${className} yet. Teachers must submit and lock: ${built.unlockedSubjects.join(', ')}.`
          : `No examination scores have been recorded for ${className} yet.`,
        422
      );
    }

    const { data: attendance } = await sb
      .from('attendance_records')
      .select('student_id, status')
      .eq('term_id', term.id)
      .in('student_id', students.map((s) => s.id));
    const attended = new Map<string, { present: number; total: number }>();
    for (const row of attendance || []) {
      const entry = attended.get(row.student_id) || { present: 0, total: 0 };
      entry.total += 1;
      if (row.status === 'present' || row.status === 'late') entry.present += 1;
      attended.set(row.student_id, entry);
    }

    // Ratings sent with a marks card are checked before anything is saved
    for (const card of built.cards) {
      const checked = cleanTraits(traitsByStudent[card.studentId]);
      if (checked.error) return fail(checked.error, 400);
    }

    const rows = built.cards.map((card) => {
      const sentTraits = traitsByStudent[card.studentId] === undefined ? undefined : cleanTraits(traitsByStudent[card.studentId]).traits;
      const remark = typeof remarks[card.studentId] === 'string' ? (remarks[card.studentId] as string).trim() : '';
      return {
        enrollment_id: card.enrollmentId,
        term_id: term.id,
        class_name: className,
        subjects: card.subjects,
        total_score: card.totalScore,
        average_score: card.averageScore,
        rank: card.rank,
        attendance_present: attended.get(card.studentId)?.present ?? 0,
        attendance_total: attended.get(card.studentId)?.total ?? 0,
        teacher_comment: remark || existingComment.get(card.enrollmentId) || null,
        style: 'scored',
        traits: sentTraits ?? existingTraits.get(card.enrollmentId) ?? [],
        status: 'submitted',
        principal_approved: false,
        proprietor_endorsed: false,
        published_at: null,
      };
    });

    const { error: saveError } = await sb.from('report_cards').upsert(rows, { onConflict: 'enrollment_id,term_id' });
    if (saveError) throw saveError;

    try {
      await sb.from('audit_logs').insert({
        school_id: school.id,
        actor_id: actor.userId,
        actor_name: actor.actorName,
        actor_role: actor.actorRoleLabel,
        action: 'results.report_cards_compiled',
        resource_type: 'report_cards',
        metadata: {
          actorName: actor.actorName,
          actorRole: actor.actorRoleLabel,
          className,
          cards: rows.length,
          summary: `${actor.actorName} compiled ${rows.length} report cards for ${className}`,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `${rows.length} report cards for ${className} were submitted to the principal.`,
      compiled: rows.length,
      studentsWithoutScores: built.studentsWithoutScores,
      unlockedSubjects: built.unlockedSubjects,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Could not compile report cards.' },
      { status: 500 }
    );
  }
}
