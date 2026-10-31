import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(
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

    const admMeta = user.user_metadata?.admission_number;
    const { data: student } = await adminClient
      .from('students')
      .select('id, first_name, last_name, admission_number')
      .or(`user_id.eq.${user.id}${admMeta ? `,admission_number.ilike.${admMeta}` : ''}`)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ success: false, message: 'Student record not found.' }, { status: 403 });
    }

    const body = await request.json();
    const { attemptId, answers, timeSpentSeconds } = body;

    if (!attemptId) {
      return NextResponse.json({ success: false, message: 'Attempt ID is required.' }, { status: 400 });
    }

    // Verify attempt belongs to student
    const { data: attempt, error: attErr } = await adminClient
      .from('cbt_sessions')
      .select('*')
      .eq('id', attemptId)
      .eq('student_id', student.id)
      .single();

    if (attErr || !attempt) {
      return NextResponse.json({ success: false, message: 'Session not found or unauthorized.' }, { status: 404 });
    }

    // Fetch assessment and question snapshots
    const { data: assessment } = await adminClient
      .from('cbt_assessments')
      .select('id, title, created_by, assessment_type, total_marks, pass_percentage')
      .eq('id', assessmentId)
      .single();

    const { data: snapshots } = await adminClient
      .from('cbt_assessment_questions')
      .select('*')
      .eq('assessment_id', assessmentId);

    const answersRecord = answers || {};
    let totalScore = 0;
    let maxPossibleScore = 0;
    const studentAnswerRows: any[] = [];
    const reviewBreakdown: any[] = [];

    (snapshots || []).forEach((snapItem: any) => {
      const snap = snapItem.snapshot_question || {};
      const qMarks = Number(snapItem.marks) || 1;
      maxPossibleScore += qMarks;

      const studentAns = answersRecord[snapItem.id] || answersRecord[snapItem.question_id] || '';
      // DEF-062: Check session-specific correct answer (re-mapped when options were shuffled)
      const sessionQuestionData = attempt.session_questions?.[snapItem.id] || attempt.session_questions?.[snapItem.question_id];
      const correctAns = String(sessionQuestionData?.correct_answer || snap.correct_answer || '').trim();

      // Check correctness
      let isCorrect = false;
      if (snap.question_type === 'mcq') {
        isCorrect = String(studentAns).trim().toUpperCase() === correctAns.toUpperCase();
      } else if (snap.question_type === 'true_false') {
        isCorrect = String(studentAns).trim().toLowerCase() === correctAns.toLowerCase();
      } else {
        // Short answer case-insensitive match
        isCorrect = String(studentAns).trim().toLowerCase() === correctAns.toLowerCase();
      }

      const awarded = isCorrect ? qMarks : 0;
      totalScore += awarded;

      studentAnswerRows.push({
        session_id: attemptId,
        question_id: snapItem.question_id,
        student_answer: String(studentAns),
        is_correct: isCorrect,
        marks_awarded: awarded,
      });

      reviewBreakdown.push({
        questionText: snap.question_text,
        questionType: snap.question_type,
        options: snap.options,
        studentAnswer: studentAns,
        correctAnswer: correctAns,
        isCorrect,
        marksAwarded: awarded,
        maxMarks: qMarks,
        explanation: snap.explanation,
      });
    });

    const percentage = maxPossibleScore > 0 ? Number(((totalScore / maxPossibleScore) * 100).toFixed(1)) : 0;
    const passed = percentage >= (assessment?.pass_percentage || 50);

    // Record answers
    if (studentAnswerRows.length > 0) {
      await adminClient.from('cbt_session_answers').insert(studentAnswerRows);
    }

    // Update session
    const { data: updatedAttempt, error: updateErr } = await adminClient
      .from('cbt_sessions')
      .update({
        score_obtained: totalScore,
        percentage,
        passed,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        duration_seconds: Number(timeSpentSeconds) || 0,
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Trigger notification for the teacher who created this assessment
    if (assessment?.created_by) {
      try {
        const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Candidate';
        await adminClient.from('notifications').insert({
          school_id: 'a0000000-0000-0000-0000-000000000001',
          recipient_name: 'Academic Faculty',
          recipient_email: `teacher:${assessment.created_by}`,
          notification_type: 'cbt_session',
          subject: `CBT Submission: ${studentName} - ${assessment.title}`,
          content_html: `${studentName} completed CBT assessment <strong>"${assessment.title}"</strong>. Score: <strong>${totalScore}/${maxPossibleScore} (${percentage}%)</strong>. Status: ${passed ? 'Passed' : 'Needs Improvement'}.`,
          status: 'sent',
          attempts_count: 0,
          idempotency_key: `notif-cbt-sub-${attemptId}-${Date.now()}`,
        });
      } catch (notifErr) {
        console.warn('CBT submission notification notice:', notifErr);
      }
    }

    const isPractice = assessment?.assessment_type === 'practice_cbt';

    return NextResponse.json({
      success: true,
      message: 'Examination successfully completed and submitted.',
      data: {
        attemptId,
        assessmentTitle: assessment?.title,
        assessmentType: assessment?.assessment_type,
        totalScore,
        maxPossibleScore,
        percentage,
        passed,
        isPractice,
        reviewBreakdown: isPractice ? reviewBreakdown : undefined,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Submission failed' }, { status: 500 });
  }
}
