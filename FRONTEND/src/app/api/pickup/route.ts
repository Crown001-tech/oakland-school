import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// GET /api/pickup - Fetch logs and authorized escorts from PostgreSQL
export async function GET(req: NextRequest) {
  try {
    const sb = getAdminClient();
    const { searchParams } = new URL(req.url);
    const lookupQuery = searchParams.get('query')?.trim().toUpperCase();

    // 1. Fetch recent pickup logs
    const { data: logsData, error: logsErr } = await sb
      .from('pickup_logs')
      .select('*')
      .order('pickup_time', { ascending: false })
      .limit(50);

    if (logsErr) throw logsErr;

    // 2. Fetch authorized pickup persons
    const { data: personsData, error: personsErr } = await sb
      .from('authorized_pickup_persons')
      .select('*')
      .order('created_at', { ascending: false });

    if (personsErr) throw personsErr;

    // 3. Fetch registered guardians with 4-digit pickup pins
    const { data: sgData, error: sgErr } = await sb
      .from('student_guardians')
      .select(`
        id,
        student_id,
        guardian_id,
        relationship,
        pickup_pin,
        authorized_pickup,
        guardians (
          id,
          first_name,
          last_name,
          phone
        ),
        students (
          id,
          admission_number,
          first_name,
          last_name,
          class_enrollments (
            classes:class_id (
              name
            )
          )
        )
      `);

    if (sgErr) throw sgErr;

    // Compile primary guardians into authorized escorts list
    const guardianEscorts: any[] = [];
    (sgData || []).forEach((sg: any) => {
      const g = sg.guardians;
      const s = sg.students;
      if (g && s) {
        guardianEscorts.push({
          id: `guard-${sg.id}`,
          studentId: sg.student_id,
          studentName: `${s.first_name} ${s.last_name}`.trim(),
          studentClass: s.classes?.name || 'Enrolled',
          admissionNo: s.admission_number,
          fullName: `${g.first_name} ${g.last_name}`.trim(),
          relationship: sg.relationship || 'Guardian',
          phone: g.phone || '—',
          qrToken: sg.pickup_pin ? `OAK-PK-${sg.pickup_pin}` : '—',
          pickupPin: sg.pickup_pin || '—',
          isActive: sg.authorized_pickup !== false,
          isGuardian: true,
        });
      }
    });

    const registeredEscorts = (personsData || []).map((p: any) => ({
      id: p.id,
      studentId: p.student_id,
      fullName: p.full_name,
      relationship: p.relationship,
      phone: p.phone,
      qrToken: p.qr_token,
      pickupPin: p.qr_token ? (p.qr_token.replace(/\D/g, '').slice(-4) || '—') : '—',
      isActive: p.is_active,
      isGuardian: false,
    }));

    const allEscorts = [...guardianEscorts, ...registeredEscorts];

    const formattedLogs = (logsData || []).map((l: any) => ({
      id: l.id,
      studentId: l.student_id,
      studentName: l.student_name,
      studentClass: l.student_class,
      pickedUpByName: l.picked_up_by_name,
      relationship: l.relationship,
      verifiedByName: l.verified_by_name,
      verificationMethod: l.verification_method,
      status: l.status,
      notes: l.notes || '',
      pickupTime: l.pickup_time,
    }));

    // If lookupQuery is provided, perform authoritative lookup
    if (lookupQuery) {
      // Check by 4-digit PIN or QR token
      const escortMatch = allEscorts.find(
        (e) =>
          e.pickupPin === lookupQuery ||
          e.qrToken.toUpperCase() === lookupQuery ||
          e.fullName.toUpperCase().includes(lookupQuery)
      );

      if (escortMatch) {
        // Fetch student details
        const { data: studentRow } = await sb
          .from('students')
          .select('id, admission_number, first_name, last_name, class_enrollments(classes:class_id(name))')
          .eq('id', escortMatch.studentId)
          .single();

        const student = studentRow
          ? {
              id: studentRow.id,
              name: `${studentRow.first_name} ${studentRow.last_name}`.trim(),
              class: (studentRow.class_enrollments as any)?.[0]?.classes?.name || 'Enrolled',
              admissionNo: studentRow.admission_number,
            }
          : {
              id: escortMatch.studentId,
              name: escortMatch.studentName || 'Student',
              class: escortMatch.studentClass || 'Enrolled',
              admissionNo: escortMatch.admissionNo || '—',
            };

        const studentEscorts = allEscorts.filter((e) => e.studentId === student.id);

        return NextResponse.json({
          success: true,
          match: {
            student,
            escort: escortMatch,
            authorizedEscorts: studentEscorts,
          },
        });
      }

      // Check by Admission Number or Student Name
      const { data: studentRows } = await sb
        .from('students')
        .select('id, admission_number, first_name, last_name, class_enrollments(classes:class_id(name))')
        .or(`admission_number.ilike.%${lookupQuery}%,first_name.ilike.%${lookupQuery}%,last_name.ilike.%${lookupQuery}%`)
        .limit(1);

      if (studentRows && studentRows.length > 0) {
        const s = studentRows[0];
        const student = {
          id: s.id,
          name: `${s.first_name} ${s.last_name}`.trim(),
          class: (s.class_enrollments as any)?.[0]?.classes?.name || 'Enrolled',
          admissionNo: s.admission_number,
        };

        const studentEscorts = allEscorts.filter((e) => e.studentId === s.id);
        const primaryEscort = studentEscorts[0] || null;

        return NextResponse.json({
          success: true,
          match: {
            student,
            escort: primaryEscort,
            authorizedEscorts: studentEscorts,
          },
        });
      }

      return NextResponse.json({
        success: false,
        message: `No student or authorized escort found matching "${lookupQuery}".`,
      });
    }

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      escorts: allEscorts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to load pickup records' },
      { status: 500 }
    );
  }
}

// POST /api/pickup - Verify and clear, flag, or register authorized escort
export async function POST(req: NextRequest) {
  try {
    const sb = getAdminClient();
    const body = await req.json();
    const { action } = body;

    if (action === 'verify') {
      const {
        studentId,
        studentName,
        studentClass,
        pickedUpByName,
        relationship,
        verifiedByName = 'Officer Yakubu (Gate 1)',
        verificationMethod = 'qr_scan',
        notes = 'Pass verified. Student released.',
      } = body;

      const { data, error } = await sb
        .from('pickup_logs')
        .insert({
          student_id: studentId,
          student_name: studentName,
          student_class: studentClass,
          picked_up_by_name: pickedUpByName,
          relationship: relationship,
          verified_by_name: verifiedByName,
          verification_method: verificationMethod,
          status: 'cleared',
          notes: notes,
          pickup_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Departure logged and cleared for ${studentName}`,
        log: {
          id: data.id,
          studentId: data.student_id,
          studentName: data.student_name,
          studentClass: data.student_class,
          pickedUpByName: data.picked_up_by_name,
          relationship: data.relationship,
          verifiedByName: data.verified_by_name,
          verificationMethod: data.verification_method,
          status: data.status,
          notes: data.notes,
          pickupTime: data.pickup_time,
        },
      });
    }

    if (action === 'flag') {
      const {
        studentId,
        studentName,
        studentClass,
        pickedUpByName,
        relationship,
        verifiedByName = 'Officer Yakubu (Gate 1)',
        reason = 'Security question raised at gate dismissal.',
      } = body;

      const { data, error } = await sb
        .from('pickup_logs')
        .insert({
          student_id: studentId,
          student_name: studentName,
          student_class: studentClass,
          picked_up_by_name: pickedUpByName,
          relationship: relationship,
          verified_by_name: verifiedByName,
          verification_method: 'manual_code',
          status: 'flagged_unauthorized',
          notes: `Security Alert: ${reason}`,
          pickup_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Security incident flagged for ${studentName}`,
        log: {
          id: data.id,
          studentId: data.student_id,
          studentName: data.student_name,
          studentClass: data.student_class,
          pickedUpByName: data.picked_up_by_name,
          relationship: data.relationship,
          verifiedByName: data.verified_by_name,
          verificationMethod: data.verification_method,
          status: data.status,
          notes: data.notes,
          pickupTime: data.pickup_time,
        },
      });
    }

    if (action === 'register_escort') {
      const { studentId, fullName, relationship, phone } = body;

      if (!studentId || !fullName || !phone) {
        return NextResponse.json(
          { success: false, message: 'Missing required escort details' },
          { status: 400 }
        );
      }

      // Generate 4-digit pickup PIN and QR token
      const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
      const qrToken = `OAK-PK-${randomPin}`;

      const { data, error } = await sb
        .from('authorized_pickup_persons')
        .insert({
          student_id: studentId,
          full_name: fullName.trim(),
          relationship: relationship || 'Relative',
          phone: phone.trim(),
          qr_token: qrToken,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Authorized escort ${fullName} registered with 4-digit PIN ${randomPin}`,
        escort: {
          id: data.id,
          studentId: data.student_id,
          fullName: data.full_name,
          relationship: data.relationship,
          phone: data.phone,
          qrToken: data.qr_token,
          pickupPin: randomPin,
          isActive: data.is_active,
        },
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Pickup operation failed' },
      { status: 500 }
    );
  }
}
