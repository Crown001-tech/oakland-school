import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSchoolDb } from '@/lib/school-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const supabase = await createClient();
    const adminClient = await getSchoolDb();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Resolve student record
    const admMeta = user.user_metadata?.admission_number;
    const { data: student } = await adminClient
      .from('students')
      .select('id, first_name, last_name, admission_number, status')
      .or(`user_id.eq.${user.id}${admMeta ? `,admission_number.ilike.${admMeta}` : ''}`)
      .maybeSingle();

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student account not found or unauthorized.' },
        { status: 403 }
      );
    }

    // Check assignment
    const { data: assignment, error: assignErr } = await adminClient
      .from('assignments')
      .select('id, title, school_id, teacher_id, status, due_date, late_policy, submission_type, total_marks')
      .eq('id', assignmentId)
      .single();

    if (assignErr || !assignment) {
      return NextResponse.json({ success: false, message: 'Assignment not found.' }, { status: 404 });
    }

    if (assignment.status !== 'published') {
      return NextResponse.json(
        { success: false, message: 'This assignment is not currently accepting submissions.' },
        { status: 400 }
      );
    }

    const isPastDue = new Date() > new Date(assignment.due_date);
    if (isPastDue && assignment.late_policy === 'disallow') {
      return NextResponse.json(
        { success: false, message: 'The submission deadline has expired. Late submissions are not permitted.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { submissionText, fileUrl, fileName, fileSizeBytes } = body;

    if (assignment.submission_type === 'text' && !submissionText?.trim()) {
      return NextResponse.json({ success: false, message: 'Written answer text is required.' }, { status: 400 });
    }

    if (assignment.submission_type === 'file' && !fileUrl) {
      return NextResponse.json({ success: false, message: 'Uploaded file attachment is required.' }, { status: 400 });
    }

    if (assignment.submission_type === 'both' && !submissionText?.trim() && !fileUrl) {
      return NextResponse.json(
        { success: false, message: 'Please provide either written text or an attached file.' },
        { status: 400 }
      );
    }

    const submissionStatus = isPastDue ? 'late' : 'submitted';

    // Upsert submission record
    const submissionData = {
      assignment_id: assignmentId,
      student_id: student.id,
      submission_text: submissionText?.trim() || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_size_bytes: fileSizeBytes || null,
      submitted_at: new Date().toISOString(),
      status: submissionStatus,
    };

    const { data: upserted, error: upsertErr } = await adminClient
      .from('assignment_submissions')
      .upsert(submissionData, { onConflict: 'assignment_id,student_id' })
      .select()
      .single();

    if (upsertErr) throw upsertErr;

    // Trigger teacher notification
    try {
      const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student';
      await adminClient.from('notifications').insert({
        school_id: assignment.school_id || adminClient.schoolId,
        recipient_name: 'Academic Faculty',
        recipient_email: `teacher:${assignment.teacher_id}`,
        notification_type: 'assignment_submission',
        subject: `Submission: ${studentName} - ${assignment.title}`,
        content_html: `${studentName} submitted coursework for <strong>"${assignment.title}"</strong>${isPastDue ? ' (Flagged Late)' : ''}.`,
        status: 'sent',
        attempts_count: 0,
        idempotency_key: `notif-sub-${upserted.id}-${Date.now()}`,
      });
    } catch (notifErr) {
      console.warn('Teacher submission notification notice:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: isPastDue ? 'Assignment submitted (Flagged as late)' : 'Assignment submitted successfully',
      data: upserted,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Submission failed' }, { status: 500 });
  }
}
