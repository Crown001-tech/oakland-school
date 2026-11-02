import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerAuthClient } from '@/lib/supabase/server';
import { getSchoolDb } from '@/lib/school-db';



export async function GET(req: NextRequest) {
  try {
    const sb = await getSchoolDb();
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const className = searchParams.get('class') || searchParams.get('className');
    const subjectId = searchParams.get('subjectId');

    let query = sb
      .from('learning_materials')
      .select(`
        id,
        title,
        description,
        file_url,
        file_type,
        file_size_bytes,
        external_link,
        created_at,
        class:classes ( id, name ),
        subject:subjects ( id, name, code ),
        teacher:staff_profiles ( id, first_name, last_name )
      `)
      .order('created_at', { ascending: false });

    if (classId) {
      query = query.eq('class_id', classId);
    }
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data: rows, error } = await query;

    if (error && error.code !== '42P01') throw error;

    // Filter by className if passed and classId wasn't known (DEF-057: Exact match to avoid SS 1 matching JSS 1)
    let materials = rows || [];
    if (className && !classId) {
      materials = materials.filter((m: any) =>
        m.class?.name?.trim().toLowerCase() === className.trim().toLowerCase()
      );
    }

    const formatted = materials.map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description || '',
      fileUrl: m.file_url,
      fileType: m.file_type || 'PDF',
      fileSizeBytes: m.file_size_bytes || 0,
      externalLink: m.external_link,
      createdAt: m.created_at,
      className: m.class?.name || 'All Classes',
      classId: m.class?.id || null,
      subjectName: m.subject?.name || 'General',
      subjectCode: m.subject?.code || '',
      subjectId: m.subject?.id || null,
      teacherName: m.teacher ? `${m.teacher.first_name} ${m.teacher.last_name}`.trim() : 'Faculty',
    }));

    return NextResponse.json({
      success: true,
      materials: formatted,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch learning materials' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = await getSchoolDb();
    const body = await req.json();

    const {
      title,
      description = '',
      classId,
      subjectId,
      fileUrl = '',
      fileType = 'PDF',
      fileSizeBytes = 0,
      externalLink = '',
    } = body;

    let teacherId = body.teacherId;

    if (!title || !classId || !subjectId) {
      return NextResponse.json(
        { success: false, message: 'Title, Class, and Subject are required.' },
        { status: 400 }
      );
    }

    // Resolve teacher ID if not explicitly provided
    if (!teacherId) {
      try {
        const authClient = await createServerAuthClient();
        const { data: { user } } = await authClient.auth.getUser();
        if (user) {
          const { data: staff } = await sb
            .from('staff_profiles')
            .select('id')
            .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
            .maybeSingle();
          if (staff?.id) teacherId = staff.id;
        }
      } catch {}
    }

    // DEF-058: Do not use arbitrary staff profile fallback
    if (!teacherId) {
      return NextResponse.json(
        { success: false, message: 'Teacher identity could not be resolved from authenticated session.' },
        { status: 401 }
      );
    }

    const { data, error } = await sb
      .from('learning_materials')
      .insert({
        school_id: sb.schoolId,
        title: title.trim(),
        description: description.trim(),
        class_id: classId,
        subject_id: subjectId,
        teacher_id: teacherId,
        file_url: fileUrl,
        file_type: fileType,
        file_size_bytes: fileSizeBytes,
        external_link: externalLink,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      material: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to upload material' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sb = await getSchoolDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Material ID is required.' },
        { status: 400 }
      );
    }

    const { error } = await sb
      .from('learning_materials')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Learning material removed successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to delete material' },
      { status: 500 }
    );
  }
}
