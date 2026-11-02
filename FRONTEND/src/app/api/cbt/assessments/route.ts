import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedRole } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = await getSchoolDb();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    if (effectiveRole === 'parent') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Examinations are confidential to students and academic faculty.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filterClassId = searchParams.get('classId');
    const filterSubjectId = searchParams.get('subjectId');
    const filterType = searchParams.get('type');

    if (effectiveRole === 'student') {
      const admMeta = user.user_metadata?.admission_number;
      const { data: student } = await adminClient
        .from('students')
        .select(`
          id,
          admission_number,
          class_enrollments (
            id,
            status,
            class_id,
            classes:class_id ( id, name )
          )
        `)
        .or(`user_id.eq.${user.id}${admMeta ? `,admission_number.ilike.${admMeta}` : ''}`)
        .maybeSingle();

      if (!student) {
        return NextResponse.json({ success: false, message: 'Student profile not found' }, { status: 404 });
      }

      const activeEnrolment = (student.class_enrollments || []).find((e: any) => e.status === 'active') || (student.class_enrollments || [])[0];
      const studentClassId = activeEnrolment?.class_id;

      if (!studentClassId) {
        return NextResponse.json({ success: true, data: [] });
      }

      let query = adminClient
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
          instructions,
          status,
          scheduled_start,
          scheduled_end,
          created_at,
          class:classes ( id, name ),
          subject:subjects ( id, name, code ),
          creator:staff_profiles ( id, first_name, last_name )
        `)
        .eq('class_id', studentClassId)
        .in('status', ['published', 'active', 'closed'])
        .order('created_at', { ascending: false });

      if (filterType) query = query.eq('assessment_type', filterType);

      const { data: assessments, error: aErr } = await query;
      if (aErr) throw aErr;

      // Fetch student's attempts from cbt_sessions
      const assessmentIds = (assessments || []).map((a: any) => a.id);
      let attempts: any[] = [];
      if (assessmentIds.length > 0) {
        const { data: att } = await adminClient
          .from('cbt_sessions')
          .select('*')
          .eq('student_id', student.id)
          .in('assessment_id', assessmentIds);
        attempts = att || [];
      }

      const enriched = (assessments || []).map((a: any) => {
        const studentAttempt = attempts.find((at: any) => at.assessment_id === a.id);
        const mappedAttempt = studentAttempt
          ? {
              ...studentAttempt,
              total_score: studentAttempt.score_obtained,
            }
          : null;
        return {
          ...a,
          attempt: mappedAttempt,
          hasAttempted: Boolean(studentAttempt && studentAttempt.status === 'submitted'),
          attemptStatus: studentAttempt?.status || 'not_started',
        };
      });

      return NextResponse.json({ success: true, data: enriched });
    }

    // Teacher Perspective
    let query = adminClient
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
        instructions,
        status,
        scheduled_start,
        scheduled_end,
        created_at,
        class:classes ( id, name ),
        subject:subjects ( id, name, code )
      `)
      .order('created_at', { ascending: false });

    if (filterClassId) query = query.eq('class_id', filterClassId);
    if (filterSubjectId) query = query.eq('subject_id', filterSubjectId);
    if (filterType) query = query.eq('assessment_type', filterType);

    const { data: assessments, error: aErr } = await query;
    if (aErr) throw aErr;

    // Fetch attempts count and questions count for each
    const assessmentIds = (assessments || []).map((a: any) => a.id);
    let attemptsCountMap: Record<string, number> = {};
    let questionsCountMap: Record<string, number> = {};

    if (assessmentIds.length > 0) {
      const { data: att } = await adminClient
        .from('cbt_sessions')
        .select('id, assessment_id, status')
        .in('assessment_id', assessmentIds);

      (att || []).forEach((item: any) => {
        attemptsCountMap[item.assessment_id] = (attemptsCountMap[item.assessment_id] || 0) + 1;
      });

      const { data: qSnap } = await adminClient
        .from('cbt_assessment_questions')
        .select('id, assessment_id')
        .in('assessment_id', assessmentIds);

      (qSnap || []).forEach((item: any) => {
        questionsCountMap[item.assessment_id] = (questionsCountMap[item.assessment_id] || 0) + 1;
      });
    }

    const enriched = (assessments || []).map((a: any) => ({
      ...a,
      totalAttempts: attemptsCountMap[a.id] || 0,
      totalQuestions: questionsCountMap[a.id] || 0,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to fetch assessments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = await getSchoolDb();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    if (effectiveRole === 'student' || effectiveRole === 'parent') {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Only faculty and administrators can create assessments.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      subjectId,
      classId,
      assessmentType,
      assessmentCategory,
      durationMinutes,
      totalMarks,
      passPercentage,
      shuffleQuestions,
      shuffleOptions,
      instructions,
      questionIds,
      status,
    } = body;

    if (!title?.trim() || !subjectId || !classId) {
      return NextResponse.json(
        { success: false, message: 'Assessment Title, Subject, and Class are required.' },
        { status: 400 }
      );
    }

    // Resolve teacher staff profile
    const { data: staff } = await adminClient
      .from('staff_profiles')
      .select('id, school_id')
      .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
      .maybeSingle();

    let schoolId = staff?.school_id;
    if (!schoolId) {
      const { data: school } = await adminClient.from('schools').select('id').limit(1).maybeSingle();
      schoolId = school?.id;
    }

    const assessmentCode = `CBT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newAssessment = {
      school_id: schoolId,
      title: title.trim(),
      code: assessmentCode,
      subject_id: subjectId,
      class_id: classId,
      assessment_type: assessmentType || 'practice_cbt',
      assessment_category: assessmentCategory || (assessmentType === 'formal_assessment' ? 'exam' : 'practice'),
      duration_minutes: Number(durationMinutes) || 45,
      total_marks: Number(totalMarks) || 50,
      pass_percentage: Number(passPercentage) || 50,
      shuffle_questions: Boolean(shuffleQuestions),
      shuffle_options: Boolean(shuffleOptions),
      instructions: instructions?.trim() || null,
      status: status || 'published',
      created_by: staff?.id || null,
    };

    const { data: created, error: createErr } = await adminClient
      .from('cbt_assessments')
      .insert(newAssessment)
      .select()
      .single();

    if (createErr) throw createErr;

    // Snapshot questions into cbt_assessment_questions
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      const { data: questions } = await adminClient
        .from('cbt_questions')
        .select('*')
        .in('id', questionIds);

      if (questions && questions.length > 0) {
        const snapshots = questions.map((q: any, idx: number) => ({
          assessment_id: created.id,
          question_id: q.id,
          snapshot_question: {
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            difficulty: q.difficulty,
          },
          marks: q.marks || 1,
          order_index: idx + 1,
        }));

        await adminClient.from('cbt_assessment_questions').insert(snapshots);
      }
    }

    // Trigger in-app notification for class students
    if (created && created.status === 'published') {
      try {
        const { data: cls } = await adminClient.from('classes').select('name').eq('id', classId).maybeSingle();
        const className = cls?.name || 'Class';
        await adminClient.from('notifications').insert({
          school_id: adminClient.schoolId,
          recipient_name: `Students of ${className}`,
          recipient_email: `class:${className}`,
          notification_type: 'cbt',
          subject: `CBT Examination: ${created.title}`,
          content_html: `A new CBT assessment <strong>"${created.title}"</strong> has been scheduled for ${className}. Duration: ${created.duration_minutes} minutes (${created.total_marks} marks). Access via the Examinations tab.`,
          status: 'sent',
          attempts_count: 0,
          idempotency_key: `notif-cbt-${created.id}-${Date.now()}`,
        });
      } catch (notifErr) {
        console.warn('CBT notification notice:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Assessment created successfully',
      data: created,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to create assessment' }, { status: 500 });
  }
}
