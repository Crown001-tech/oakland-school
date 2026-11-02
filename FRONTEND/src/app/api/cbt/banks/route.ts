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
      return NextResponse.json({ success: false, message: 'Access denied.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const classLevel = searchParams.get('classLevel');

    let query = adminClient
      .from('cbt_question_banks')
      .select(`
        id,
        title,
        class_level,
        questions_count,
        created_at,
        subject:subjects ( id, name, code ),
        creator:staff_profiles ( id, first_name, last_name )
      `)
      .order('created_at', { ascending: false });

    if (subjectId) query = query.eq('subject_id', subjectId);
    if (classLevel) query = query.eq('class_level', classLevel);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to fetch question banks' }, { status: 500 });
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
      return NextResponse.json({ success: false, message: 'Forbidden. Only faculty can create question banks.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, subjectId, classLevel } = body;

    if (!title?.trim() || !subjectId) {
      return NextResponse.json(
        { success: false, message: 'Question bank title and subject are required.' },
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

    const newBank = {
      school_id: schoolId,
      title: title.trim(),
      subject_id: subjectId,
      class_level: classLevel || 'All Levels',
      created_by: staff?.id || null,
      questions_count: 0,
    };

    const { data, error } = await adminClient
      .from('cbt_question_banks')
      .insert(newBank)
      .select(`
        id,
        title,
        class_level,
        questions_count,
        subject:subjects ( id, name, code )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Question bank created successfully',
      data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to create question bank' }, { status: 500 });
  }
}
