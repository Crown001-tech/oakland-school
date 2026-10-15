import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  try {
    const sb = getAdminClient();
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('class') || searchParams.get('className');
    const subject = searchParams.get('subject');

    const { data: school, error: schoolErr } = await sb
      .from('schools')
      .select('id, settings')
      .limit(1)
      .maybeSingle();

    if (schoolErr) throw schoolErr;

    const subjectScoresMap: Record<string, any> = school?.settings?.subject_scores || {};

    if (className && subject) {
      const scoreKey = `${className}_${subject}`;
      const entry = subjectScoresMap[scoreKey];
      const scores = Array.isArray(entry) ? entry : (entry?.scores || []);
      const isLocked = !Array.isArray(entry) ? Boolean(entry?.isLocked) : Boolean(scores.some((s: any) => s?.isLocked));
      const submittedAt = !Array.isArray(entry) ? entry?.submittedAt || null : null;
      const submittedBy = !Array.isArray(entry) ? entry?.submittedBy || null : null;

      return NextResponse.json({
        success: true,
        data: scores,
        isLocked,
        submittedAt,
        submittedBy,
        class: className,
        subject,
      });
    }

    if (className) {
      const classScores: Record<string, any[]> = {};
      const classLocks: Record<string, boolean> = {};
      Object.keys(subjectScoresMap).forEach((key) => {
        if (key.startsWith(`${className}_`)) {
          const sub = key.replace(`${className}_`, '');
          const entry = subjectScoresMap[key];
          classScores[sub] = Array.isArray(entry) ? entry : (entry?.scores || []);
          classLocks[sub] = !Array.isArray(entry) ? Boolean(entry?.isLocked) : Boolean(classScores[sub].some((s: any) => s?.isLocked));
        }
      });
      return NextResponse.json({
        success: true,
        data: classScores,
        locks: classLocks,
        class: className,
      });
    }

    return NextResponse.json({ success: true, data: subjectScoresMap });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sb = getAdminClient();
    const body = await request.json();

    const className = body.class || body.className;
    const subject = body.subject;
    const scores = Array.isArray(body.scores) ? body.scores : [];
    const isLocked = Boolean(body.isLocked);
    const submittedBy = body.submittedBy || null;
    const submittedAt = body.submittedAt || (isLocked ? new Date().toISOString() : null);

    if (!className || !subject) {
      return NextResponse.json(
        { success: false, message: 'Class name and subject are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch current school record
    const { data: school, error: schoolErr } = await sb
      .from('schools')
      .select('id, settings')
      .limit(1)
      .maybeSingle();

    if (schoolErr || !school) {
      return NextResponse.json(
        { success: false, message: 'School record not found.' },
        { status: 404 }
      );
    }

    const existingSettings = school.settings || {};
    const existingScoresMap: Record<string, any> = existingSettings.subject_scores || {};
    const scoreKey = `${className}_${subject}`;
    const currentEntry = existingScoresMap[scoreKey];

    // If already locked in DB and incoming request attempts to modify without isLocked, reject edit
    const isAlreadyLocked = !Array.isArray(currentEntry) ? Boolean(currentEntry?.isLocked) : false;
    if (isAlreadyLocked && !isLocked) {
      return NextResponse.json(
        {
          success: false,
          message: `Results for ${className} ${subject} have been synchronized and locked. They cannot be edited again.`,
          isLocked: true,
        },
        { status: 423 } // Locked
      );
    }

    // 2. Update map with new scores & lock metadata
    const updatedScoresMap = {
      ...existingScoresMap,
      [scoreKey]: {
        scores,
        isLocked,
        submittedBy: submittedBy || (!Array.isArray(currentEntry) ? currentEntry?.submittedBy : null),
        submittedAt: submittedAt || (!Array.isArray(currentEntry) ? currentEntry?.submittedAt : null),
      },
    };

    // 3. Persist back to schools.settings in PostgreSQL
    const { error: updateErr } = await sb
      .from('schools')
      .update({
        settings: {
          ...existingSettings,
          subject_scores: updatedScoresMap,
        },
      })
      .eq('id', school.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: `Scores for ${className} ${subject} saved successfully.${isLocked ? ' Results are now locked against further edits.' : ''}`,
      count: scores.length,
      class: className,
      subject: subject,
      isLocked,
      submittedAt,
      submittedBy,
    });
  } catch (err: any) {
    console.error('[ScoresPOST] Error:', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}
