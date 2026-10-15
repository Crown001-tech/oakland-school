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

export async function GET(request: NextRequest) {
  try {
    const sb = getAdminClient();
    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get('class');
    const search = searchParams.get('search');

    let query = sb
      .from('students')
      .select(`
        id,
        admission_number,
        first_name,
        last_name,
        gender,
        dob,
        blood_group,
        address,
        status,
        created_at,
        class_enrollments (
          id,
          class_id,
          classes:class_id ( id, name )
        ),
        student_guardians (
          id,
          relationship,
          guardians:guardian_id (
            id,
            first_name,
            last_name,
            phone,
            email,
            occupation,
            address
          )
        )
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((s: any) => {
      const enrollment = s.class_enrollments?.[0];
      const className = enrollment?.classes?.name || 'Unassigned';
      const guardianRel = s.student_guardians?.[0];
      const guardian = guardianRel?.guardians;
      const guardianName = guardian ? `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim() : '—';
      const guardianPhone = guardian?.phone || '—';

      return {
        id: s.id,
        admissionNo: s.admission_number,
        fullName: `${s.first_name} ${s.last_name}`.trim(),
        firstName: s.first_name,
        lastName: s.last_name,
        class: className,
        gender: s.gender === 'female' ? 'Female' : 'Male',
        dob: s.dob || '—',
        bloodGroup: s.blood_group || '—',
        address: s.address || '—',
        guardianName: guardianName || 'Guardian',
        guardianPhone: guardianPhone,
        guardianEmail: guardian?.email || '—',
        guardianOccupation: guardian?.occupation || 'Guardian',
        guardianRelationship: guardianRel?.relationship || guardian?.relationship || 'Guardian',
        attendanceRate: null,
        status: s.status === 'graduated' ? 'Graduated' : s.status === 'withdrawn' ? 'Withdrawn' : 'Active',
      };
    });

    const filtered = formatted.filter((s: any) => {
      const matchClass = !classFilter || classFilter === 'All' || s.class === classFilter;
      const matchSearch = !search || 
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
        s.guardianName.toLowerCase().includes(search.toLowerCase());
      return matchClass && matchSearch;
    });

    return NextResponse.json({ success: true, data: filtered });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getAdminClient();

    const studentList = Array.isArray(body)
      ? body
      : body.students && Array.isArray(body.students)
      ? body.students
      : [body];

    // Fetch classes and current academic session for enrollment
    const { data: classes } = await sb.from('classes').select('id, name');
    const classMap = new Map((classes || []).map((c: any) => [c.name.toLowerCase(), c.id]));

    const { data: session } = await sb.from('academic_sessions').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const sessionId = session?.id;

    // Fetch existing students for the school to guarantee deduplication
    const { data: initialStudents } = await sb
      .from('students')
      .select('id, admission_number, first_name, last_name, status, dob, gender')
      .eq('school_id', DEFAULT_SCHOOL_ID);

    const existingStudents: any[] = [...(initialStudents || [])];

    const results = [];
    let lastError: string | null = null;

    for (const item of studentList) {
      if (!item) continue;

      let firstName = (item.firstName || item.first_name || '').trim();
      let lastName = (item.lastName || item.last_name || '').trim();
      const rawFull = (item.fullName || item.name || `${firstName} ${lastName}`).trim();

      if (!firstName || !lastName) {
        if (rawFull) {
          const parts = rawFull.split(/\s+/);
          if (!firstName) firstName = parts[0] || 'Student';
          if (!lastName) lastName = parts.slice(1).join(' ') || 'Pupil';
        }
      }

      if (!firstName && !lastName) continue;

      const explicitAdmNo = (item.admissionNo || item.admission_number || '').trim();
      const gender = (item.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
      const targetClass = (item.class || item.className || 'JSS 1').trim();
      const classId = classMap.get(targetClass.toLowerCase()) || classes?.[0]?.id;

      // PostgreSQL students table enforces `dob DATE NOT NULL`
      let rawDob = item.dob || item.dateOfBirth;
      let studentDob = '2012-05-15';
      if (rawDob && rawDob !== '—' && !isNaN(Date.parse(rawDob))) {
        studentDob = new Date(rawDob).toISOString().split('T')[0];
      }

      // Deduplication check: Match on explicit admission number OR first & last name (case-insensitive)
      const cleanFirst = firstName.toLowerCase();
      const cleanLast = lastName.toLowerCase();
      const cleanFull = `${cleanFirst} ${cleanLast}`.replace(/\s+/g, ' ');
      const cleanAdm = explicitAdmNo.toLowerCase();

      let existingMatch = existingStudents.find((s) => {
        if (cleanAdm && s.admission_number && s.admission_number.trim().toLowerCase() === cleanAdm) {
          return true;
        }
        const sFirst = (s.first_name || '').trim().toLowerCase();
        const sLast = (s.last_name || '').trim().toLowerCase();
        if (sFirst === cleanFirst && sLast === cleanLast) {
          return true;
        }
        const sFull = `${sFirst} ${sLast}`.replace(/\s+/g, ' ');
        if (sFull === cleanFull) {
          return true;
        }
        return false;
      });

      let student = existingMatch;

      if (student) {
        // Student exists: do not insert duplicate, preserve existing record
        if (student.status !== 'active') {
          await sb
            .from('students')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', student.id);
          student.status = 'active';
        }
      } else {
        // New student: generate admission number if not explicitly provided
        let finalAdmNo = explicitAdmNo;
        if (!finalAdmNo) {
          let candidate = `OAK-2026-${Math.floor(100 + Math.random() * 900)}`;
          let attempts = 0;
          while (existingStudents.some((s) => s.admission_number === candidate) && attempts < 50) {
            candidate = `OAK-2026-${Math.floor(100 + Math.random() * 900)}`;
            attempts++;
          }
          finalAdmNo = candidate;
        }

        const { data: newStu, error: stuError } = await sb
          .from('students')
          .insert({
            school_id: DEFAULT_SCHOOL_ID,
            admission_number: finalAdmNo,
            first_name: firstName,
            last_name: lastName,
            gender: gender,
            dob: studentDob,
            status: 'active',
          })
          .select()
          .single();

        if (stuError || !newStu) {
          console.error('Error inserting student:', stuError);
          lastError = stuError?.message || 'Database constraint violation';
          continue;
        }

        student = newStu;
        // Register in memory to prevent duplicate insertions within the same batch
        existingStudents.push(student);
      }

      // Ensure Class enrollment
      if (classId && sessionId && student?.id) {
        try {
          await sb
            .from('class_enrollments')
            .upsert({
              student_id: student.id,
              class_id: classId,
              session_id: sessionId,
              status: 'active',
            }, { onConflict: 'student_id,session_id' });
        } catch (enrollErr) {
          console.error('Error inserting class_enrollment:', enrollErr);
        }
      }

      // Ensure Guardian record
      const rawGuardianName = (item.guardianName || '').trim();
      if (rawGuardianName && rawGuardianName !== 'Guardian' && rawGuardianName !== 'Parent / Guardian' && student?.id) {
        const gParts = rawGuardianName.split(/\s+/);
        const gFirst = gParts[0] || 'Guardian';
        const gLast = gParts.slice(1).join(' ') || 'Parent';
        const gEmail = item.guardianEmail && item.guardianEmail !== '—'
          ? item.guardianEmail
          : `parent.${Date.now()}.${Math.floor(Math.random() * 1000)}@oakland.ng`;

        try {
          let guardianId: string | null = null;
          if (item.guardianPhone && item.guardianPhone !== '—') {
            const { data: existingG } = await sb
              .from('guardians')
              .select('id')
              .eq('school_id', DEFAULT_SCHOOL_ID)
              .eq('phone', item.guardianPhone)
              .maybeSingle();
            if (existingG) guardianId = existingG.id;
          }

          if (!guardianId) {
            const { data: gRecord } = await sb
              .from('guardians')
              .insert({
                school_id: DEFAULT_SCHOOL_ID,
                first_name: gFirst,
                last_name: gLast,
                email: gEmail,
                phone: item.guardianPhone || '—',
                relationship: 'Guardian',
              })
              .select()
              .maybeSingle();
            if (gRecord?.id) guardianId = gRecord.id;
          }

          if (guardianId) {
            await sb
              .from('student_guardians')
              .upsert({
                student_id: student.id,
                guardian_id: guardianId,
                relationship: 'Guardian',
                is_primary: true,
              }, { onConflict: 'student_id,guardian_id' });
          }
        } catch {}
      }

      // Ensure Financial Account
      if (student?.id) {
        try {
          await sb
            .from('student_financial_accounts')
            .upsert({
              school_id: DEFAULT_SCHOOL_ID,
              student_id: student.id,
              total_billed: 0,
              total_paid: 0,
              outstanding_balance: 0,
            }, { onConflict: 'school_id,student_id' });
        } catch {}
      }

      results.push(student);
    }

    if (studentList.length > 0 && results.length === 0) {
      return NextResponse.json({
        success: false,
        error: lastError || 'Failed to enroll student into PostgreSQL database.',
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: results.length, data: results });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const admissionNo = searchParams.get('admissionNo');
    const all = searchParams.get('all') === 'true';
    const permanent = searchParams.get('permanent') === 'true';

    const sb = getAdminClient();

    if (all) {
      // Cascade delete all student dependent records and students
      await sb.from('class_enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await sb.from('student_guardians').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await sb.from('student_financial_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await sb.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await sb.from('report_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: delErr } = await sb.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) throw delErr;
      return NextResponse.json({ success: true, message: 'All students cleared successfully.' });
    }

    if (!id && !admissionNo) {
      return NextResponse.json({ success: false, message: 'Student ID or Admission Number required' }, { status: 400 });
    }

    if (permanent && id) {
      await sb.from('class_enrollments').delete().eq('student_id', id);
      await sb.from('student_guardians').delete().eq('student_id', id);
      await sb.from('student_financial_accounts').delete().eq('student_id', id);
      await sb.from('attendance_records').delete().eq('student_id', id);
      await sb.from('report_cards').delete().eq('student_id', id);
      const { error } = await sb.from('students').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Student deleted permanently.' });
    }

    let query = sb.from('students').update({ status: 'withdrawn', updated_at: new Date().toISOString() });

    if (id) query = query.eq('id', id);
    else if (admissionNo) query = query.eq('admission_number', admissionNo);

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Student withdrawn successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
