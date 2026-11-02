import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor, getCaller, getLinkedStudentIds, getOwnStudentId, isAdminRole } from '@/lib/caller';
import { resolveGradingConfig } from '@/lib/grading-config';
import { getClassNames } from '@/lib/school-classes';
import { getSchoolDb } from '@/lib/school-db';


export async function GET(request: NextRequest) {
  try {
    // Administrators see the whole school; a parent or student sees only their own report card.
    const caller = await getCaller();
    const isAdmin = isAdminRole(caller.role);
    const isGuardian = caller.role === 'parent';
    const isStudent = caller.role === 'student';
    if (!isAdmin && !isGuardian && !isStudent) {
      return NextResponse.json({ success: false, error: 'Access denied for this role.' }, { status: 403 });
    }
    const permittedStudentIds: string[] = isAdmin
      ? []
      : isGuardian
      ? await getLinkedStudentIds(caller.email)
      : [(await getOwnStudentId(caller.userId ?? undefined)) || ''].filter(Boolean);

    const sb = await getSchoolDb();

    // 1. Fetch Classes with capacity and teacher
    const { data: dbClasses, error: classError } = await sb
      .from('classes')
      .select(`
        id,
        name,
        grade_level,
        capacity,
        teacher_assignments (
          id,
          is_class_teacher,
          staff_profiles:staff_id ( id, first_name, last_name, email )
        )
      `)
      .order('grade_level', { ascending: true });

    if (classError) throw classError;

    // 2. Fetch Active Students
    const { data: students, error: studentError } = await sb
      .from('students')
      .select(`
        id,
        first_name,
        last_name,
        admission_number,
        status,
        class_enrollments (
          id,
          class_id,
          status
        ),
        student_guardians (
          id,
          relationship,
          guardians:guardian_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .eq('status', 'active');

    if (studentError) throw studentError;

    // 3. Fetch School Settings for publication state
    const { data: schoolData } = await sb
      .from('schools')
      .select('id, settings')
      .limit(1)
      .maybeSingle();

    const schoolSettings = schoolData?.settings || {};
    const gradingConfig = resolveGradingConfig(schoolSettings);
    const endorsedClasses: string[] = schoolSettings.endorsed_results || [];
    const forwardedClasses: string[] = schoolSettings.forwarded_results || [];

    // 4. Fetch Report Cards
    const { data: reportCards } = await sb
      .from('report_cards')
      .select('*');

    // 5. Structure Class Result Summaries
    const classNames = await getClassNames(sb);
    const classesSummary = classNames.map((className) => {
      const classObj = (dbClasses || []).find((c: any) => c.name === className);
      const classId = classObj?.id;

      // Find students strictly enrolled in this class
      const classStudents = (students || []).filter((s: any) =>
        (s.class_enrollments || []).some(
          (e: any) => classId && e.class_id === classId && e.status === 'active'
        )
      );

      // Find teacher
      const teacherAssn = (classObj?.teacher_assignments || []).find(
        (t: any) => t.is_class_teacher === true
      );
      const teacherRaw: any = teacherAssn?.staff_profiles;
      const teacher = Array.isArray(teacherRaw) ? teacherRaw[0] : teacherRaw;
      const teacherName = teacher
        ? `${teacher.first_name} ${teacher.last_name}`.trim()
        : 'Unassigned';

      const studentCount = classStudents.length;

      // Compute real scores from report_cards table in PostgreSQL
      const classReportCards = (reportCards || []).filter((rc: any) =>
        classStudents.some((s: any) =>
          (s.class_enrollments || []).some((e: any) => e.id === rc.enrollment_id)
        )
      );

      const hasRecordedScores = classReportCards.length > 0;
      // A remark card has no marks, so it counts as recorded but never enters an average or a pass rate
      const scoredCards = classReportCards.filter((rc: any) => rc.style !== 'descriptive');
      // The saved cards are the record: principal approval and endorsement live on each card
      const isApproved = hasRecordedScores && classReportCards.every((rc: any) => rc.principal_approved === true);
      const isEndorsed = hasRecordedScores && classReportCards.every((rc: any) => rc.proprietor_endorsed === true);
      const averageScore = scoredCards.length > 0
        ? Number(
            (
              scoredCards.reduce((acc: number, r: any) => acc + Number(r.average_score || 0), 0) /
              scoredCards.length
            ).toFixed(1)
          )
        : 0;

      const passRate = scoredCards.length > 0
        ? Math.round(
            (scoredCards.filter((r: any) => Number(r.average_score || 0) >= gradingConfig.passMark).length /
              scoredCards.length) *
              100
          )
        : 0;

      let status: 'Dispatched to Parents' | 'Pending Proprietor Sign-off' | 'Scores Pending' = 'Scores Pending';
      if (studentCount > 0 && hasRecordedScores) {
        if (isEndorsed) {
          status = 'Dispatched to Parents';
        } else if (isApproved) {
          status = 'Pending Proprietor Sign-off';
        }
      } else {
        status = 'Scores Pending';
      }

      return {
        class: className,
        classTeacher: teacherName,
        totalStudents: studentCount,
        averageScore,
        passRate,
        topStudents: hasRecordedScores
          ? classStudents.slice(0, 3).map((s: any) => `${s.first_name} ${s.last_name}`.trim())
          : [],
        status,
        scoresSubmitted: classReportCards.length,
      };
    });

    // 6. Build Live Parent Email Dispatch Stream ONLY from classes with actual endorsed report cards
    const parentEmailDeliveries: any[] = [];
    (students || []).forEach((st: any, idx: number) => {
      const studentEnrollment = (st.class_enrollments || []).find((e: any) => e.status === 'active');
      const matchedClassObj = (dbClasses || []).find((c: any) => c.id === studentEnrollment?.class_id);
      const studentClass = matchedClassObj?.name;
      if (!studentClass) return;

      const studentRc = (reportCards || []).find((r: any) => r.enrollment_id === studentEnrollment?.id);
      
      // Only include cards the proprietor has endorsed. Nothing is emailed yet, so these are published, not delivered.
      if (studentRc?.proprietor_endorsed === true) {
        const guardianRel = (st.student_guardians || [])[0];
        const guardian = guardianRel?.guardians;
        const studentName = `${st.first_name} ${st.last_name}`.trim();
        const parentName = guardian ? `${guardian.first_name} ${guardian.last_name}`.trim() : '—';
        const parentEmail = guardian?.email || '—';

        parentEmailDeliveries.push({
          id: `disp-${st.id || idx}`,
          studentName,
          admissionNo: st.admission_number,
          class: studentClass,
          parentName,
          parentEmail,
          status: 'Published',
          sentTime: studentRc.published_at ? new Date(studentRc.published_at).toLocaleDateString('en-GB') : '—',
          totalScore: `${studentRc.average_score}% Terminal Average`,
        });
      }
    });

    let studentReportCard = null;
    let targetStudent = null;

    if (request) {
      const url = new URL(request.url);
      const studentId = url.searchParams.get('studentId');
      if (studentId) {
        if (!isAdmin && !permittedStudentIds.includes(studentId)) {
          return NextResponse.json({ success: false, error: 'Access denied for this student.' }, { status: 403 });
        }
        targetStudent = (students || []).find((s: any) => s.id === studentId);
      }
    }
    if (!targetStudent && isAdmin && (students || []).length > 0) {
      targetStudent = students[0];
    }
    if (!targetStudent && !isAdmin) {
      targetStudent = (students || []).find((s: any) => permittedStudentIds.includes(s.id)) || null;
    }

    if (targetStudent) {
      const activeEnrollment = (targetStudent.class_enrollments || []).find((e: any) => e.status === 'active');
      const studentClassObj = (dbClasses || []).find((c: any) => c.id === activeEnrollment?.class_id);
      const studentClassName = studentClassObj?.name || '';

      const studentRc = (reportCards || []).find((r: any) => r.enrollment_id === activeEnrollment?.id);
      // Families see a card only after the proprietor has endorsed it
      const isClassEndorsed = studentRc?.proprietor_endorsed === true;
      const classCardCount = (reportCards || []).filter(
        (r: any) => r.class_name === studentRc?.class_name && r.term_id === studentRc?.term_id
      ).length;

      studentReportCard = {
        studentId: targetStudent.id,
        studentName: `${targetStudent.first_name} ${targetStudent.last_name}`.trim(),
        admissionNo: targetStudent.admission_number,
        className: studentClassName,
        isEndorsed: isClassEndorsed,
        hasScores: Boolean(studentRc),
        passMark: gradingConfig.passMark,
        // Families see scores only after the Proprietor has endorsed the class
        averageScore: studentRc && (isAdmin || isClassEndorsed) ? Number(studentRc.average_score || 0) : null,
        position: (isAdmin || isClassEndorsed) && studentRc?.rank ? `${studentRc.rank} of ${classCardCount}` : null,
        subjects: (isAdmin || isClassEndorsed) && Array.isArray(studentRc?.subjects) ? studentRc.subjects : [],
        teacherRemark: isAdmin || isClassEndorsed ? studentRc?.teacher_comment || null : null,
        principalRemark: isAdmin || isClassEndorsed ? studentRc?.principal_comment || null : null,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        classes: isAdmin ? classesSummary : [],
        parentEmailDeliveries: isAdmin ? parentEmailDeliveries : [],
        endorsedClasses,
        forwardedClasses: isAdmin ? forwardedClasses : [],
        studentReportCard,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to fetch results' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = await getSchoolDb();
    const actor = await getAuthenticatedActor();

    const { action } = body;
    const classes: string[] = Array.isArray(body.classNames) ? body.classNames.filter((c: unknown) => typeof c === 'string') : [];

    if (action !== 'endorse' && action !== 'forward') {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
    // Only the proprietor publishes results to families
    if (action === 'endorse' && actor.role !== 'proprietor') {
      return NextResponse.json({ success: false, error: 'Only the proprietor can endorse results.' }, { status: 403 });
    }
    if (classes.length === 0) {
      return NextResponse.json(
        { success: false, error: `No classes specified for ${action === 'endorse' ? 'endorsement' : 'forwarding'}` },
        { status: 400 }
      );
    }

    const { data: school } = await sb.from('schools').select('id, settings').limit(1).maybeSingle();
    const { data: term } = await sb.from('academic_terms').select('id').eq('is_current', true).maybeSingle();
    if (!school || !term) {
      return NextResponse.json({ success: false, error: 'No current term is set.' }, { status: 409 });
    }

    // Step 2 (forward): the principal approves the class teacher's submitted cards.
    // Step 3 (endorse): the proprietor publishes the approved cards. Only that class's cards change.
    const isForward = action === 'forward';
    const processed: string[] = [];
    const skipped: { class: string; reason: string }[] = [];

    for (const className of classes) {
      const { data: cards } = await sb
        .from('report_cards')
        .select('id, principal_approved, proprietor_endorsed')
        .eq('class_name', className)
        .eq('term_id', term.id);

      const eligible = (cards || []).filter((c: any) =>
        isForward ? c.principal_approved !== true : c.principal_approved === true && c.proprietor_endorsed !== true
      );
      if (eligible.length === 0) {
        skipped.push({
          class: className,
          reason: isForward
            ? (cards || []).length === 0
              ? 'The class teacher has not submitted report cards yet.'
              : 'Already approved.'
            : (cards || []).length === 0
              ? 'No report cards have been submitted.'
              : 'The principal has not approved these report cards yet.',
        });
        continue;
      }

      const { error: updateError } = await sb
        .from('report_cards')
        .update(
          isForward
            ? { principal_approved: true, status: 'approved' }
            : { proprietor_endorsed: true, status: 'published', published_at: new Date().toISOString() }
        )
        .in('id', eligible.map((c: any) => c.id));
      if (updateError) throw updateError;
      processed.push(className);
    }

    if (processed.length === 0) {
      return NextResponse.json(
        { success: false, error: skipped.map((s) => `${s.class}: ${s.reason}`).join(' '), skipped },
        { status: 422 }
      );
    }

    // Keep the class lists in settings in step, saved atomically (DEF-113)
    const settingsKey = isForward ? 'forwarded_results' : 'endorsed_results';
    const current: string[] = Array.isArray(school.settings?.[settingsKey]) ? school.settings[settingsKey] : [];
    const updatedList = Array.from(new Set([...current, ...processed]));
    const { error: settingsError } = await sb.rpc('merge_school_settings', {
      p_school_id: school.id,
      p_patch: { [settingsKey]: updatedList },
    });
    if (settingsError) throw settingsError;

    try {
      await sb.from('audit_logs').insert({
        school_id: school.id,
        actor_id: actor.userId,
        actor_name: actor.actorName,
        actor_role: actor.actorRoleLabel,
        action: isForward ? 'results.approved_by_principal' : 'results.endorsed_by_proprietor',
        resource_type: 'report_cards',
        metadata: {
          actorName: actor.actorName,
          actorRole: actor.actorRoleLabel,
          classes: processed,
          summary: `${actor.actorName} ${isForward ? 'approved' : 'endorsed'} report cards for ${processed.join(', ')}`,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: isForward
        ? 'Class results approved and forwarded to the proprietor.'
        : 'Class results officially endorsed and published to parents.',
      skipped,
      ...(isForward ? { forwardedClasses: updatedList } : { endorsedClasses: updatedList }),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Results action failed' },
      { status: 500 }
    );
  }
}
