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

    // Resolve student
    const admMeta = user.user_metadata?.admission_number;
    const { data: student } = await adminClient
      .from('students')
      .select('id, admission_number, status')
      .or(`user_id.eq.${user.id}${admMeta ? `,admission_number.ilike.${admMeta}` : ''}`)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ success: false, message: 'Only enrolled students can take examinations.' }, { status: 403 });
    }

    // Verify assessment exists and is open
    const { data: assessment, error: aErr } = await adminClient
      .from('cbt_assessments')
      .select('id, title, duration_minutes, total_marks, pass_percentage, status, shuffle_questions, shuffle_options')
      .eq('id', assessmentId)
      .single();

    if (aErr || !assessment) {
      return NextResponse.json({ success: false, message: 'Assessment not found.' }, { status: 404 });
    }

    if (assessment.status === 'draft') {
      return NextResponse.json({ success: false, message: 'This examination has not yet been published.' }, { status: 400 });
    }

    if (assessment.status === 'closed') {
      return NextResponse.json({ success: false, message: 'This examination session is closed.' }, { status: 400 });
    }

    // Check existing attempt/session
    let { data: attempt } = await adminClient
      .from('cbt_sessions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('student_id', student.id)
      .maybeSingle();

    if (attempt && attempt.status === 'submitted') {
      return NextResponse.json(
        { success: false, message: 'You have already completed and submitted this examination.', attempt },
        { status: 400 }
      );
    }

    if (!attempt) {
      const newAttempt = {
        assessment_id: assessmentId,
        student_id: student.id,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        duration_seconds: 0,
      };

      const { data: createdAttempt, error: attErr } = await adminClient
        .from('cbt_sessions')
        .insert(newAttempt)
        .select()
        .single();

      if (attErr) throw attErr;
      attempt = createdAttempt;
    }

    // Fetch question snapshots
    const { data: questionSnapshots } = await adminClient
      .from('cbt_assessment_questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('order_index', { ascending: true });

    const standardOptionKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
    const sessionQuestionsMap: Record<string, { correct_answer: string; question_id: string }> = {};

    let questions = (questionSnapshots || []).map((qSnap: any) => {
      const snap = qSnap.snapshot_question || {};
      const origOptions = Array.isArray(snap.options) ? snap.options : [];

      // Normalize options into { key, text } with fixed alphabetical keys A, B, C, D
      const normalized = origOptions.map((opt: any, idx: number) => {
        if (typeof opt === 'string') {
          return { key: standardOptionKeys[idx] || String(idx + 1), text: opt };
        }
        return {
          key: standardOptionKeys[idx] || opt.key || String(idx + 1),
          text: opt.text !== undefined ? String(opt.text) : String(opt),
        };
      });

      const origCorrectKey = String(snap.correct_answer || '').trim().toUpperCase();
      const origCorrectText = normalized.find(
        (o: any) => o.key.toUpperCase() === origCorrectKey
      )?.text;

      let finalOptions = normalized;
      let mappedCorrectKey = origCorrectKey;

      // DEF-062: Shuffle only text payloads while keeping keys A, B, C, D in place,
      // and re-point correct_answer to whichever letter received the correct text.
      if (assessment.shuffle_options && normalized.length > 1) {
        const texts = normalized.map((o: any) => o.text);
        // Fisher-Yates shuffle
        for (let i = texts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [texts[i], texts[j]] = [texts[j], texts[i]];
        }
        finalOptions = normalized.map((o: any, idx: number) => ({
          key: o.key,
          text: texts[idx],
        }));

        if (origCorrectText !== undefined) {
          const match = finalOptions.find((o: any) => o.text === origCorrectText);
          if (match) mappedCorrectKey = match.key;
        }
      }

      sessionQuestionsMap[qSnap.id] = {
        correct_answer: mappedCorrectKey,
        question_id: qSnap.question_id,
      };
      if (qSnap.question_id) {
        sessionQuestionsMap[qSnap.question_id] = {
          correct_answer: mappedCorrectKey,
          question_id: qSnap.question_id,
        };
      }

      return {
        id: qSnap.id,
        questionId: qSnap.question_id,
        questionText: snap.question_text,
        questionType: snap.question_type,
        options: finalOptions,
        marks: qSnap.marks || 1,
        difficulty: snap.difficulty,
        // Anti-cheat: correct_answer and explanation are deliberately omitted
      };
    });

    // Persist per-session question answer key into cbt_sessions
    if (attempt && Object.keys(sessionQuestionsMap).length > 0) {
      try {
        await adminClient
          .from('cbt_sessions')
          .update({ session_questions: sessionQuestionsMap })
          .eq('id', attempt.id);
      } catch (sessErr) {
        console.warn('Could not persist session_questions to cbt_sessions:', sessErr);
      }
    }

    if (assessment.shuffle_questions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        assessmentTitle: assessment.title,
        durationMinutes: assessment.duration_minutes,
        startedAt: attempt.started_at,
        questions,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to start examination' }, { status: 500 });
  }
}
