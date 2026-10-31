import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

function getAdminClient() {
  return getSupabaseAdmin();
}

// Junior-only subjects (strictly for JSS 1 - JSS 3)
const JUNIOR_ONLY_SUBJECTS = new Set([
  'Basic Science',
  'Basic Technology',
  'Social Studies',
  'Cultural & Creative Arts (CCA)',
  'Business Studies',
  'Physical & Health Education (PHE)',
]);

// Senior-only subjects (strictly for SS 1 - SS 3)
const SENIOR_ONLY_SUBJECTS = new Set([
  'Physics',
  'Chemistry',
  'Biology',
  'Further Mathematics',
  'Technical Drawing',
  'Financial Accounting',
  'Economics',
  'Commerce',
  'Business Management',
  'Literature in English',
  'Government',
  'Christian Religious Studies (CRS)',
  'Islamic Religious Studies (IRS)',
  'Geography',
  'History',
]);

export async function GET(request: NextRequest) {
  try {
    const sb = getAdminClient();
    const { searchParams } = new URL(request.url);
    const filterClassId = searchParams.get('classId');
    const filterClassName = searchParams.get('class') || searchParams.get('className');
    const filterDepartment = searchParams.get('department') || searchParams.get('dept') || searchParams.get('stream');

    let targetClass: { id: string; name: string; grade_level?: number } | null = null;
    if (filterClassId) {
      const { data: c } = await sb
        .from('classes')
        .select('id, name, grade_level')
        .eq('id', filterClassId)
        .maybeSingle();
      if (c) targetClass = c;
    }
    if (!targetClass && filterClassName) {
      const trimmed = filterClassName.trim();
      const { data: exactClass } = await sb
        .from('classes')
        .select('id, name, grade_level')
        .ilike('name', trimmed)
        .maybeSingle();

      if (exactClass) {
        targetClass = exactClass;
      } else {
        const { data: prefixRows } = await sb
          .from('classes')
          .select('id, name, grade_level')
          .ilike('name', `${trimmed}%`)
          .limit(1);
        if (prefixRows && prefixRows.length > 0) {
          targetClass = prefixRows[0];
        }
      }
    }

    const { data: subjects, error } = await sb
      .from('subjects')
      .select(`
        id,
        name,
        code,
        category,
        is_active,
        created_at,
        teacher_assignments (
          id,
          class_id,
          classes:class_id ( id, name ),
          staff_profiles:staff_id ( id, first_name, last_name )
        )
      `)
      .order('name', { ascending: true });

    if (error) throw error;

    let filtered = subjects || [];

    // If a class is specified, scope subjects to what that class offers
    if (targetClass) {
      // 1. Check if explicit teacher_assignments with subject_id exist for this class
      const { data: directAssignments } = await sb
        .from('teacher_assignments')
        .select('subject_id')
        .eq('class_id', targetClass.id)
        .not('subject_id', 'is', null);

      if (directAssignments && directAssignments.length > 0) {
        const assignedIds = new Set(directAssignments.map((a: any) => a.subject_id).filter(Boolean));
        filtered = filtered.filter((s: any) => assignedIds.has(s.id));
      } else {
        // 2. Fallback to curriculum class-level scoping (Junior vs Senior)
        const classNameUpper = targetClass.name.toUpperCase();
        const gradeLevel = targetClass.grade_level;
        const isJunior = (gradeLevel && gradeLevel <= 3) || classNameUpper.includes('JSS') || classNameUpper.includes('JS');
        const isSenior = (gradeLevel && gradeLevel >= 4) || classNameUpper.includes('SS');

        if (isJunior) {
          filtered = filtered.filter((s: any) => !SENIOR_ONLY_SUBJECTS.has(s.name));
        } else if (isSenior) {
          filtered = filtered.filter((s: any) => !JUNIOR_ONLY_SUBJECTS.has(s.name));

          // 3. If a specific department track is provided for Senior Secondary, filter to Core + Department electives
          if (filterDepartment) {
            const dLower = filterDepartment.trim().toLowerCase();
            const SENIOR_CORE_CODES = new Set(['MTH', 'ENG', 'CVE', 'CMP']);

            filtered = filtered.filter((s: any) => {
              if (SENIOR_CORE_CODES.has(s.code)) return true;

              if (dLower === 'sciences' || dLower === 'science') {
                return s.category === 'Sciences';
              }
              if (dLower === 'commercial') {
                return s.category === 'Commercial';
              }
              if (dLower === 'humanities' || dLower === 'arts') {
                return s.category === 'Humanities' || s.code === 'ECO';
              }
              return true;
            });
          }
        }
      }
    }

    const formatted = filtered.map((s: any) => {
      const assignments = (s.teacher_assignments || []).map((ta: any) => ({
        id: ta.id,
        classId: ta.class_id,
        className: ta.classes?.name,
        teacherName: ta.staff_profiles
          ? `${ta.staff_profiles.first_name} ${ta.staff_profiles.last_name}`.trim()
          : 'Unassigned',
      }));

      const classAssignment = targetClass
        ? assignments.find((a: any) => a.classId === targetClass!.id || (targetClass!.name && a.className === targetClass!.name))
        : null;

      return {
        id: s.id,
        name: s.name,
        code: s.code,
        category: s.category || 'General',
        isActive: s.is_active,
        assignments: assignments,
        assignedTeacher: classAssignment?.teacherName || 'Unassigned',
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

    const { name, code, category, isActive = true } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Subject name is required' }, { status: 400 });
    }

    const generatedCode = code || name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

    const { data, error } = await sb
      .from('subjects')
      .upsert(
        {
          school_id: DEFAULT_SCHOOL_ID,
          name: name.trim(),
          code: generatedCode,
          category: category || 'General',
          is_active: isActive,
        },
        { onConflict: 'school_id,code' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Subject ID is required' }, { status: 400 });
    }

    const sb = getAdminClient();
    const { error } = await sb.from('subjects').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Subject deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
