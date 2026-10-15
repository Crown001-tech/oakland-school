import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const STANDARD_CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'] as const;

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  try {
    const sb = getAdminClient();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // 1. Fetch Classes with teacher assignments
    const { data: dbClasses, error: clsErr } = await sb
      .from('classes')
      .select(`
        id,
        name,
        teacher_assignments (
          id,
          is_class_teacher,
          staff_profiles:staff_id ( id, first_name, last_name )
        )
      `)
      .order('grade_level', { ascending: true });

    if (clsErr) throw clsErr;

    // Fetch staff profiles for fallback class teacher matching
    const { data: homeroomStaff } = await sb
      .from('staff_profiles')
      .select('id, first_name, last_name, assigned_class')
      .not('assigned_class', 'is', null);

    // 2. Fetch Active Students and Enrollments
    const { data: students, error: stuErr } = await sb
      .from('students')
      .select(`
        id,
        class_enrollments (
          id,
          class_id,
          status
        )
      `)
      .eq('status', 'active');

    if (stuErr) throw stuErr;

    // 3. Fetch Attendance Records for the specific date
    const { data: attRecords, error: attErr } = await sb
      .from('attendance_records')
      .select('id, class_id, student_id, status, check_in_time, date')
      .eq('date', dateParam);

    if (attErr && attErr.code !== '42P01') throw attErr;

    const records = attRecords || [];

    // 4. Compute summaries per standard class
    const classSummaries = STANDARD_CLASSES.map((className) => {
      const clsObj = (dbClasses || []).find((c: any) => c.name === className);
      const classId = clsObj?.id;

      // Find teacher
      const teacherAssn = (clsObj?.teacher_assignments || []).find(
        (t: any) => t.is_class_teacher === true
      );
      const teacherRaw: any = teacherAssn?.staff_profiles;
      const teacher = Array.isArray(teacherRaw) ? teacherRaw[0] : teacherRaw;
      const fallbackStaff = (homeroomStaff || []).find((s: any) => s.assigned_class === className);
      const teacherName = teacher
        ? `${teacher.first_name} ${teacher.last_name}`.trim()
        : fallbackStaff
        ? `${fallbackStaff.first_name} ${fallbackStaff.last_name}`.trim()
        : 'Unassigned';

      // Enrolled students in this class
      const enrolledStudents = (students || []).filter((s: any) =>
        (s.class_enrollments || []).some(
          (e: any) => classId && e.class_id === classId && e.status === 'active'
        )
      );
      const enrolledCount = enrolledStudents.length;

      // Attendance records for this class
      const classRecords = records.filter((r: any) => r.class_id === classId);
      const submitted = classRecords.length > 0;
      const presentCount = classRecords.filter((r: any) => r.status === 'present').length;
      const absentCount = classRecords.filter((r: any) => r.status === 'absent').length;

      return {
        class: className,
        classTeacher: teacherName,
        class_teacher: teacherName,
        enrolled: enrolledCount,
        present: presentCount,
        absent: absentCount,
        status: submitted ? ('Submitted' as const) : ('Pending' as const),
        attendanceRate: submitted && enrolledCount > 0 ? Math.round((presentCount / enrolledCount) * 100) : null,
      };
    });

    const totalEnrolled = classSummaries.reduce((sum, c) => sum + c.enrolled, 0);
    const totalPresent = classSummaries.reduce((sum, c) => sum + c.present, 0);
    const totalAbsent = classSummaries.reduce((sum, c) => sum + c.absent, 0);
    const totalSubmitted = records.length;
    const overallRate = totalSubmitted > 0 && totalEnrolled > 0
      ? Math.round((totalPresent / totalEnrolled) * 100)
      : null;

    // 5. Fetch Staff for check-in status
    const { data: staffList, error: stfErr } = await sb
      .from('staff_profiles')
      .select('id, employee_id, first_name, last_name, role, department, status')
      .order('created_at', { ascending: true });

    if (stfErr) throw stfErr;

    const staffRecords = (staffList || []).map((st: any) => ({
      id: st.id,
      employeeId: st.employee_id || 'OAK-STF',
      name: `${st.first_name || ''} ${st.last_name || ''}`.trim(),
      role: st.role || 'Personnel',
      department: st.department || 'Academics',
      checkInTime: null,
      status: 'No check-in recorded',
    }));

    return NextResponse.json({
      success: true,
      data: {
        date: dateParam,
        classes: classSummaries,
        staff: staffRecords,
        records: records,
        metrics: {
          totalEnrolled,
          totalPresent,
          totalAbsent,
          totalSubmitted,
          overallRate,
          isPending: totalSubmitted === 0,
        },
      },
    });
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
    const date = body.date || new Date().toISOString().split('T')[0];
    const records = Array.isArray(body.records) ? body.records : [];

    if (!className || records.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Class name and student records are required.' },
        { status: 400 }
      );
    }

    // 1. Resolve Class ID
    const { data: classObj, error: clsErr } = await sb
      .from('classes')
      .select('id, school_id')
      .eq('name', className)
      .maybeSingle();

    if (clsErr || !classObj) {
      return NextResponse.json(
        { success: false, message: `Class ${className} not found in database.` },
        { status: 404 }
      );
    }

    const classId = classObj.id;
    const schoolId = classObj.school_id || 'a0000000-0000-0000-0000-000000000001';

    // 2. Resolve Active Academic Session and Term
    const { data: sessionObj } = await sb
      .from('academic_sessions')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    const { data: termObj } = await sb
      .from('academic_terms')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    const sessionId = sessionObj?.id || 'b0000000-0000-0000-0000-000000000001';
    const termId = termObj?.id || 'c0000000-0000-0000-0000-000000000001';

    // 3. Fetch active students to map admissions/ids
    const { data: dbStudents } = await sb
      .from('students')
      .select('id, admission_number')
      .eq('status', 'active');

    const studentMap = new Map<string, string>();
    (dbStudents || []).forEach((s: any) => {
      studentMap.set(s.id, s.id);
      if (s.admission_number) {
        studentMap.set(s.admission_number, s.id);
      }
    });

    const isUUID = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

    // 4. Build upsert records
    const toUpsert = [];
    for (const item of records) {
      let resolvedStudentId = studentMap.get(item.id) || (isUUID(item.id) ? item.id : null);
      if (!resolvedStudentId && item.admissionNo) {
        resolvedStudentId = studentMap.get(item.admissionNo);
      }

      if (!resolvedStudentId) continue;

      const validStatus = ['present', 'late', 'absent', 'excused'].includes(item.status)
        ? item.status
        : 'present';

      toUpsert.push({
        school_id: schoolId,
        class_id: classId,
        student_id: resolvedStudentId,
        session_id: sessionId,
        term_id: termId,
        date: date,
        status: validStatus,
        check_in_time: validStatus === 'absent' ? null : (item.arrivalTime || '08:00:00'),
        late_reason: item.reason || null,
        updated_at: new Date().toISOString(),
      });
    }

    if (toUpsert.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid student records could be resolved.' },
        { status: 400 }
      );
    }

    const { error: upsertErr } = await sb
      .from('attendance_records')
      .upsert(toUpsert, { onConflict: 'student_id,date' });

    if (upsertErr) {
      console.error('[AttendancePOST] Upsert error:', upsertErr);
      return NextResponse.json(
        { success: false, message: upsertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully recorded attendance for ${toUpsert.length} students.`,
      count: toUpsert.length,
      class: className,
      date: date,
    });
  } catch (err: any) {
    console.error('[AttendancePOST] Server exception:', err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

