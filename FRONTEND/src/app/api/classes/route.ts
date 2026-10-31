import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

function getAdminClient() {
  return getSupabaseAdmin();
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

    // DEF-139: Resolve master class capacity dynamically from schools.settings (zero hardcoded 50)
    const { data: school } = await sb
      .from('schools')
      .select('settings')
      .limit(1)
      .maybeSingle();

    const masterCapacity = Number(school?.settings?.classCapacity) || 0;

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
        capacity: typeof c.capacity === 'number' && c.capacity > 0 ? c.capacity : masterCapacity,
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

        // Also sync staff_profiles assigned_class
        const { data: classObj } = await sb.from('classes').select('name').eq('id', classId).single();
        if (classObj) {
          await sb.from('staff_profiles').update({ assigned_class: null }).eq('assigned_class', classObj.name);
          await sb.from('staff_profiles').update({ assigned_class: classObj.name }).eq('id', teacherId);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Class updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}
