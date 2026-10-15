import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getAdminClient();

    // Fetch classes
    const { data: classes, error: classError } = await sb
      .from('classes')
      .select(`
        id,
        name,
        grade_level,
        capacity,
        class_enrollments ( id, status ),
        teacher_assignments (
          id,
          is_class_teacher,
          staff_profiles:staff_id ( id, first_name, last_name, email )
        )
      `)
      .order('grade_level', { ascending: true });

    if (classError) throw classError;

    // Also fetch staff profiles to ensure any directly assigned class teachers are resolved
    const { data: staffList } = await sb
      .from('staff_profiles')
      .select('id, first_name, last_name, assigned_class')
      .not('assigned_class', 'is', null);

    const formatted = (classes || []).map((c: any) => {
      const activeEnrollments = (c.class_enrollments || []).filter(
        (e: any) => e.status === 'active'
      ).length;

      const teacherAssn = (c.teacher_assignments || []).find(
        (t: any) => t.is_class_teacher === true
      );

      const teacher = teacherAssn?.staff_profiles;
      const fallbackStaff = (staffList || []).find((s: any) => s.assigned_class === c.name);

      let teacherName = 'Unassigned';
      let teacherId = null;

      if (teacher) {
        teacherName = `${teacher.first_name} ${teacher.last_name}`.trim();
        teacherId = teacher.id;
      } else if (fallbackStaff) {
        teacherName = `${fallbackStaff.first_name} ${fallbackStaff.last_name}`.trim();
        teacherId = fallbackStaff.id;
      }

      return {
        id: c.id,
        name: c.name,
        gradeLevel: c.grade_level,
        capacity: c.capacity || 50,
        enrolledCount: activeEnrollments,
        classTeacher: teacherName,
        class_teacher: teacherName,
        teacherId: teacher?.id || null,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getAdminClient();

    const { classId, teacherId, capacity } = body;

    if (!classId) {
      return NextResponse.json({ success: false, error: 'classId is required' }, { status: 400 });
    }

    if (capacity !== undefined) {
      await sb
        .from('classes')
        .update({ capacity })
        .eq('id', classId);
    }

    if (teacherId) {
      // Get current session
      const { data: session } = await sb
        .from('academic_sessions')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const sessionId = session?.id;

      if (sessionId) {
        // Clear previous class teacher for this class
        await sb
          .from('teacher_assignments')
          .delete()
          .eq('class_id', classId)
          .eq('is_class_teacher', true);

        // Assign new class teacher
        await sb
          .from('teacher_assignments')
          .insert({
            school_id: DEFAULT_SCHOOL_ID,
            staff_id: teacherId,
            class_id: classId,
            session_id: sessionId,
            is_class_teacher: true,
          });
      }
    }

    return NextResponse.json({ success: true, message: 'Class updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
