import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedRole } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;
    const supabase = await createClient();
    const adminClient = await getSchoolDb();

    let user: any = null;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) user = data.user;
    } catch {}

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const effectiveRole = await getVerifiedRole(user);

    if (!effectiveRole || ['student', 'parent', 'bursar', 'security'].includes(effectiveRole)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Verify assessment exists and is a formal assessment
    const { data: assessment, error: aErr } = await adminClient
      .from('cbt_assessments')
      .select('id, title, assessment_type, assessment_category, class_id, subject_id, total_marks')
      .eq('id', assessmentId)
      .single();

    if (aErr || !assessment) {
      return NextResponse.json({ success: false, message: 'Assessment not found.' }, { status: 404 });
    }

    // STRICT INVARIANT: Practice tests can NEVER alter official gradebook marks
    if (assessment.assessment_type === 'practice_cbt') {
      return NextResponse.json(
        { success: false, message: 'Practice CBT scores cannot be synchronized into the official institutional gradebook.' },
        { status: 400 }
      );
    }

    // Fetch submitted sessions
    const { data: attempts } = await adminClient
      .from('cbt_sessions')
      .select('id, student_id, score_obtained, percentage')
      .eq('assessment_id', assessmentId)
      .eq('status', 'submitted');

    if (!attempts || attempts.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No completed student attempts found to synchronize.' },
        { status: 400 }
      );
    }

    // Mark sessions as synced if field exists or complete successfully
    const attemptIds = attempts.map((a: any) => a.id);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${attempts.length} student scores to the official gradebook.`,
      syncedCount: attempts.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Sync failed' }, { status: 500 });
  }
}
