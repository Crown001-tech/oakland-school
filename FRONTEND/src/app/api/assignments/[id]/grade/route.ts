import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getVerifiedRole } from '@/lib/caller';

export async function POST(
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

    // Resolve teacher staff profile
    const { data: staff } = await adminClient
      .from('staff_profiles')
      .select('id')
      .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
      .maybeSingle();

    const body = await request.json();
    const { submissionId, marksAwarded, teacherFeedback } = body;

    if (!submissionId) {
      return NextResponse.json({ success: false, message: 'Submission ID is required.' }, { status: 400 });
    }

    // Verify assignment total marks
    const { data: assignment } = await adminClient
      .from('assignments')
      .select('id, title, school_id, total_marks')
      .eq('id', assignmentId)
      .single();

    if (!assignment) {
      return NextResponse.json({ success: false, message: 'Assignment not found.' }, { status: 404 });
    }

    const numericMarks = Number(marksAwarded);
    if (isNaN(numericMarks) || numericMarks < 0 || numericMarks > Number(assignment.total_marks)) {
      return NextResponse.json(
        { success: false, message: `Marks awarded must be between 0 and ${assignment.total_marks}.` },
        { status: 400 }
      );
    }

    const { data: updated, error: updateErr } = await adminClient
      .from('assignment_submissions')
      .update({
        marks_awarded: numericMarks,
        teacher_feedback: teacherFeedback?.trim() || null,
        graded_by: staff?.id || null,
        graded_at: new Date().toISOString(),
        status: 'graded',
      })
      .eq('id', submissionId)
      .eq('assignment_id', assignmentId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Trigger notification for student
    try {
      await adminClient.from('notifications').insert({
        school_id: assignment.school_id || 'a0000000-0000-0000-0000-000000000001',
        recipient_name: 'Student',
        recipient_email: `student:${updated.student_id}`,
        notification_type: 'assignment_graded',
        subject: `Graded: ${assignment.title} (${numericMarks}/${assignment.total_marks})`,
        content_html: `Your coursework for <strong>"${assignment.title}"</strong> has been graded: <strong>${numericMarks}/${assignment.total_marks} points</strong>.${teacherFeedback ? ` Feedback: <em>"${teacherFeedback.trim()}"</em>` : ''}`,
        status: 'sent',
        attempts_count: 0,
        idempotency_key: `notif-grd-${submissionId}-${Date.now()}`,
      });
    } catch (notifErr) {
      console.warn('Student grade notification notice:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Grade and feedback recorded successfully.',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Grading failed' }, { status: 500 });
  }
}
