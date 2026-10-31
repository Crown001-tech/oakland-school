import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getVerifiedRole } from '@/lib/caller';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    // Strict parent isolation invariant
    if (effectiveRole === 'parent') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Assignments are confidential to faculty and enrolled students.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filterClassId = searchParams.get('classId');
    const filterSubjectId = searchParams.get('subjectId');
    const filterStatus = searchParams.get('status');

    if (effectiveRole === 'student') {
      // 1. Resolve student profile
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

      // Fetch published assignments for the student's enrolled class
      let query = adminClient
        .from('assignments')
        .select(`
          id,
          title,
          description,
          instructions,
          total_marks,
          due_date,
          publish_date,
          status,
          submission_type,
          allowed_formats,
          max_file_size_mb,
          late_policy,
          resubmission_policy,
          attachments,
          created_at,
          class:classes ( id, name ),
          subject:subjects ( id, name, code ),
          teacher:staff_profiles ( id, first_name, last_name )
        `)
        .eq('class_id', studentClassId)
        .in('status', ['published', 'closed'])
        .order('due_date', { ascending: true });

      const { data: assignments, error: assignErr } = await query;
      if (assignErr) throw assignErr;

      // Fetch this student's submissions for these assignments
      const assignmentIds = (assignments || []).map((a: any) => a.id);
      let submissions: any[] = [];
      if (assignmentIds.length > 0) {
        const { data: subs } = await adminClient
          .from('assignment_submissions')
          .select('*')
          .eq('student_id', student.id)
          .in('assignment_id', assignmentIds);
        submissions = subs || [];
      }

      const enriched = (assignments || []).map((a: any) => {
        const sub = submissions.find((s: any) => s.assignment_id === a.id);
        const isPastDue = new Date() > new Date(a.due_date);
        let studentStatus = 'pending';
        if (sub) {
          studentStatus = sub.status; // 'submitted', 'graded', 'late', 'returned'
        } else if (isPastDue) {
          studentStatus = 'overdue';
        }

        return {
          ...a,
          submission: sub || null,
          studentStatus,
          isSubmitted: Boolean(sub),
          isPastDue,
        };
      });

      return NextResponse.json({ success: true, data: enriched });
    }

    // Teacher / Faculty / Admin perspective
    // Resolve teacher profile if teacher
    let teacherProfileId: string | null = null;
    if (effectiveRole === 'teacher') {
      const { data: profile } = await adminClient
        .from('staff_profiles')
        .select('id, school_id')
        .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
        .maybeSingle();
      if (profile) {
        teacherProfileId = profile.id;
      }
    }

    let query = adminClient
      .from('assignments')
      .select(`
        id,
        title,
        description,
        instructions,
        total_marks,
        due_date,
        publish_date,
        status,
        submission_type,
        allowed_formats,
        max_file_size_mb,
        late_policy,
        resubmission_policy,
        attachments,
        created_at,
        class:classes ( id, name, capacity ),
        subject:subjects ( id, name, code ),
        teacher:staff_profiles ( id, first_name, last_name )
      `)
      .order('created_at', { ascending: false });

    if (filterClassId) query = query.eq('class_id', filterClassId);
    if (filterSubjectId) query = query.eq('subject_id', filterSubjectId);
    if (filterStatus) query = query.eq('status', filterStatus);

    const { data: assignments, error: assignErr } = await query;
    if (assignErr) throw assignErr;

    // Fetch submission statistics for each assignment
    const assignmentIds = (assignments || []).map((a: any) => a.id);
    let allSubmissions: any[] = [];
    if (assignmentIds.length > 0) {
      const { data: subs } = await adminClient
        .from('assignment_submissions')
        .select('id, assignment_id, status, marks_awarded')
        .in('assignment_id', assignmentIds);
      allSubmissions = subs || [];
    }

    const enriched = (assignments || []).map((a: any) => {
      const assignmentSubs = allSubmissions.filter((s: any) => s.assignment_id === a.id);
      const submittedCount = assignmentSubs.length;
      const gradedCount = assignmentSubs.filter((s: any) => s.status === 'graded').length;
      const classCapacity = a.class?.capacity || 30;

      return {
        ...a,
        totalSubmissions: submittedCount,
        gradedSubmissions: gradedCount,
        pendingGrading: submittedCount - gradedCount,
        classCapacity,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    if (effectiveRole === 'student' || effectiveRole === 'parent') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only faculty can create assignments.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      instructions,
      classId,
      subjectId,
      totalMarks,
      dueDate,
      status,
      submissionType,
      allowedFormats,
      maxFileSizeMb,
      latePolicy,
      resubmissionPolicy,
      attachments,
    } = body;

    if (!title?.trim() || !classId || !subjectId || !dueDate) {
      return NextResponse.json(
        { success: false, message: 'Title, Class, Subject, and Due Date are strictly required.' },
        { status: 400 }
      );
    }

    // Resolve staff profile
    const { data: staff } = await adminClient
      .from('staff_profiles')
      .select('id, school_id')
      .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
      .maybeSingle();

    let teacherId = staff?.id;
    let schoolId = staff?.school_id;

    if (!schoolId) {
      const { data: school } = await adminClient.from('schools').select('id').limit(1).maybeSingle();
      schoolId = school?.id;
    }

    if (!teacherId) {
      // Find default faculty or first staff profile
      const { data: anyStaff } = await adminClient.from('staff_profiles').select('id').limit(1).maybeSingle();
      teacherId = anyStaff?.id;
    }

    if (!teacherId || !schoolId) {
      return NextResponse.json({ success: false, message: 'Faculty record could not be resolved.' }, { status: 400 });
    }

    const newAssignment = {
      school_id: schoolId,
      teacher_id: teacherId,
      class_id: classId,
      subject_id: subjectId,
      title: title.trim(),
      description: (description || instructions || title).trim(),
      instructions: (instructions || description || '').trim(),
      total_marks: Number(totalMarks) || 100,
      due_date: new Date(dueDate).toISOString(),
      publish_date: status === 'published' ? new Date().toISOString() : null,
      status: status || 'published',
      submission_type: submissionType || 'both',
      allowed_formats: Array.isArray(allowedFormats) && allowedFormats.length > 0 ? allowedFormats : ['pdf', 'docx', 'jpg', 'png'],
      max_file_size_mb: Number(maxFileSizeMb) || 10,
      late_policy: latePolicy || 'allow_with_flag',
      resubmission_policy: resubmissionPolicy || 'single',
      attachments: Array.isArray(attachments) ? attachments : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error: insertErr } = await adminClient
      .from('assignments')
      .insert(newAssignment)
      .select(`
        id,
        title,
        total_marks,
        due_date,
        status,
        class:classes ( id, name ),
        subject:subjects ( id, name, code )
      `)
      .single();

    if (insertErr) throw insertErr;

    // Trigger in-app notification for students of this class
    if (created && created.status === 'published') {
      try {
        const clsName = (created as any).class?.name || (Array.isArray((created as any).class) ? (created as any).class[0]?.name : 'Class');
        const subName = (created as any).subject?.name || (Array.isArray((created as any).subject) ? (created as any).subject[0]?.name : 'General');
        await adminClient.from('notifications').insert({
          school_id: schoolId,
          recipient_name: `Students of ${clsName}`,
          recipient_email: `class:${clsName}`,
          notification_type: 'assignment',
          subject: `New Assignment: ${created.title} (${subName})`,
          content_html: `A new assignment "${created.title}" has been published for ${subName}. Due date: ${new Date(created.due_date).toLocaleDateString('en-GB')}. Total Marks: ${created.total_marks}.`,
          status: 'sent',
          attempts_count: 0,
          idempotency_key: `notif-asgn-${created.id}-${Date.now()}`,
        });
      } catch (notifErr) {
        console.warn('Assignment notification notice:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment created successfully',
      data: created,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to create assignment' }, { status: 500 });
  }
}
