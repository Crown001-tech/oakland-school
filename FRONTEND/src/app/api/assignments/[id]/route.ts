import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getVerifiedRole } from '@/lib/caller';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    if (effectiveRole === 'parent') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Assignments are confidential to faculty and enrolled students.' },
        { status: 403 }
      );
    }

    const { data: assignment, error: assignErr } = await adminClient
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
        class_id,
        subject_id,
        class:classes ( id, name ),
        subject:subjects ( id, name, code ),
        teacher:staff_profiles ( id, first_name, last_name, email )
      `)
      .eq('id', assignmentId)
      .single();

    if (assignErr || !assignment) {
      return NextResponse.json({ success: false, message: 'Assignment not found' }, { status: 404 });
    }

    if (effectiveRole === 'student') {
      const admMeta = user.user_metadata?.admission_number;
      const { data: student } = await adminClient
        .from('students')
        .select('id, admission_number')
        .or(`user_id.eq.${user.id}${admMeta ? `,admission_number.ilike.${admMeta}` : ''}`)
        .maybeSingle();

      let studentSubmission: any = null;
      if (student) {
        const { data: sub } = await adminClient
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', student.id)
          .maybeSingle();
        studentSubmission = sub;
      }

      const isPastDue = new Date() > new Date(assignment.due_date);

      return NextResponse.json({
        success: true,
        data: {
          ...assignment,
          submission: studentSubmission,
          isSubmitted: Boolean(studentSubmission),
          isPastDue,
        },
      });
    }

    // Teacher / Faculty perspective: Return assignment + roster of submissions
    // 1. Fetch all students enrolled in this class
    const { data: classEnrollments } = await adminClient
      .from('class_enrollments')
      .select(`
        id,
        student:students (
          id,
          first_name,
          last_name,
          admission_number,
          gender,
          photo_url
        )
      `)
      .eq('class_id', assignment.class_id)
      .eq('status', 'active');

    // 2. Fetch all submissions for this assignment
    const { data: submissions } = await adminClient
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId);

    const submissionsMap = new Map((submissions || []).map((s: any) => [s.student_id, s]));

    const roster = (classEnrollments || []).map((enr: any) => {
      const st = Array.isArray(enr.student) ? enr.student[0] : enr.student;
      const sub = st ? submissionsMap.get(st.id) : null;

      let status = 'pending';
      if (sub) {
        status = sub.status; // 'submitted', 'graded', 'late', 'returned'
      } else if (new Date() > new Date(assignment.due_date)) {
        status = 'missing';
      }

      return {
        studentId: st?.id,
        name: st ? `${st.first_name} ${st.last_name}` : 'Enrolled Student',
        admissionNumber: st?.admission_number || '—',
        photoUrl: st?.photo_url || null,
        status,
        submission: sub || null,
        marksAwarded: sub?.marks_awarded ?? null,
        submittedAt: sub?.submitted_at || null,
        teacherFeedback: sub?.teacher_feedback || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...assignment,
        roster,
        totalEnrolled: roster.length,
        totalSubmitted: roster.filter((r) => r.submission).length,
        totalGraded: roster.filter((r) => r.status === 'graded').length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to fetch assignment' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    if (effectiveRole === 'student' || effectiveRole === 'parent') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status) updates.status = body.status;
    if (body.dueDate) updates.due_date = new Date(body.dueDate).toISOString();
    if (body.instructions !== undefined) updates.instructions = body.instructions;
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.totalMarks !== undefined) updates.total_marks = Number(body.totalMarks);

    const { data: updated, error: updateErr } = await adminClient
      .from('assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to update assignment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    if (effectiveRole === 'student' || effectiveRole === 'parent') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { error: delErr } = await adminClient
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to delete assignment' }, { status: 500 });
  }
}
