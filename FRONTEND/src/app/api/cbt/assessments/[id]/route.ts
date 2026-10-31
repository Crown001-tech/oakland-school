import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getVerifiedRole } from '@/lib/caller';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    // Strict Parent Isolation
    if (effectiveRole === 'parent') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Examinations are confidential to students and academic faculty.' },
        { status: 403 }
      );
    }

    const { data: assessment, error: aErr } = await adminClient
      .from('cbt_assessments')
      .select(`
        id,
        title,
        code,
        assessment_type,
        assessment_category,
        duration_minutes,
        total_marks,
        pass_percentage,
        shuffle_questions,
        shuffle_options,
        instructions,
        review_policy,
        status,
        scheduled_start,
        scheduled_end,
        created_at,
        class_id,
        subject_id,
        class:classes ( id, name ),
        subject:subjects ( id, name, code )
      `)
      .eq('id', assessmentId)
      .single();

    if (aErr || !assessment) {
      return NextResponse.json({ success: false, message: 'Assessment not found' }, { status: 404 });
    }

    // Fetch question snapshots
    const { data: questionSnapshots } = await adminClient
      .from('cbt_assessment_questions')
      .select('id, question_id, marks, order_index, snapshot_question')
      .eq('assessment_id', assessmentId)
      .order('order_index', { ascending: true });

    if (effectiveRole === 'student') {
      if (!['published', 'active', 'closed'].includes(assessment.status)) {
        return NextResponse.json({ success: false, message: 'Assessment not found or not published' }, { status: 404 });
      }

      const admMeta = user.user_metadata?.admission_number;
      const { data: student } = await adminClient
        .from('students')
        .select(`
          id,
          admission_number,
          class_enrollments (
            id,
            status,
            class_id
          )
        `)
        .or(`user_id.eq.${user.id}${admMeta ? `,admission_number.ilike.${admMeta}` : ''}`)
        .maybeSingle();

      const activeEnrolment = (student?.class_enrollments || []).find((e: any) => e.status === 'active') || (student?.class_enrollments || [])[0];
      if (assessment.class_id && activeEnrolment?.class_id && activeEnrolment.class_id !== assessment.class_id) {
        return NextResponse.json({ success: false, message: 'Access denied. Assessment belongs to another class.' }, { status: 403 });
      }

      let studentAttempt: any = null;
      let reviewBreakdown: any[] = [];
      if (student) {
        const { data: att } = await adminClient
          .from('cbt_sessions')
          .select('*')
          .eq('assessment_id', assessmentId)
          .eq('student_id', student.id)
          .maybeSingle();
        if (att) {
          studentAttempt = {
            ...att,
            total_score: att.score_obtained,
          };

          if (att.status === 'submitted' && (assessment.assessment_type === 'practice_cbt' || assessment.review_policy === 'immediate')) {
            const { data: answers } = await adminClient
              .from('cbt_session_answers')
              .select('*')
              .eq('session_id', att.id);

            const answerMap = new Map((answers || []).map((ans: any) => [ans.question_id, ans]));
            reviewBreakdown = (questionSnapshots || []).map((qSnap: any) => {
              const snap = qSnap.snapshot_question || {};
              const ansRecord = answerMap.get(qSnap.question_id);
              return {
                questionText: snap.question_text,
                questionType: snap.question_type,
                options: snap.options,
                studentAnswer: ansRecord?.student_answer || '',
                correctAnswer: snap.correct_answer,
                isCorrect: Boolean(ansRecord?.is_correct),
                marksAwarded: ansRecord?.marks_awarded ?? 0,
                maxMarks: qSnap.marks,
                explanation: snap.explanation,
              };
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          ...assessment,
          totalQuestions: (questionSnapshots || []).length,
          attempt: studentAttempt,
          attemptStatus: studentAttempt?.status || 'not_started',
          reviewBreakdown: reviewBreakdown.length > 0 ? reviewBreakdown : undefined,
        },
      });
    }

    // Teacher/Admin Perspective: Return assessment + questions + student attempts roster
    const { data: attempts } = await adminClient
      .from('cbt_sessions')
      .select(`
        id,
        student_id,
        started_at,
        submitted_at,
        duration_seconds,
        score_obtained,
        percentage,
        passed,
        status,
        student:students ( id, first_name, last_name, admission_number )
      `)
      .eq('assessment_id', assessmentId)
      .order('submitted_at', { ascending: false });

    const questionsPayload = (questionSnapshots || []).map((q: any) => ({
      id: q.question_id,
      marks: q.marks,
      order_index: q.order_index,
      ...(q.snapshot_question || {}),
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...assessment,
        assessment, // Backward compatibility for consumers expecting data.data.assessment
        totalQuestions: (questionSnapshots || []).length,
        questions: questionsPayload,
        attempts: (attempts || []).map((att: any) => ({
          ...att,
          total_score: att.score_obtained,
          time_spent_seconds: att.duration_seconds,
          studentName: att.student ? `${att.student.first_name} ${att.student.last_name}` : 'Student',
          admissionNumber: att.student?.admission_number || '—',
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to fetch assessment' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    if (effectiveRole === 'student' || effectiveRole === 'parent') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only faculty can edit assessments.' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.status) updates.status = body.status;
    if (body.title) updates.title = body.title.trim();
    if (body.durationMinutes) updates.duration_minutes = Number(body.durationMinutes);
    if (body.instructions !== undefined) updates.instructions = body.instructions;

    const { data: updated, error } = await adminClient
      .from('cbt_assessments')
      .update(updates)
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to update assessment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    if (effectiveRole === 'student' || effectiveRole === 'parent') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only faculty can delete assessments.' }, { status: 403 });
    }

    const { error } = await adminClient
      .from('cbt_assessments')
      .delete()
      .eq('id', assessmentId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Assessment deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to delete assessment' }, { status: 500 });
  }
}
