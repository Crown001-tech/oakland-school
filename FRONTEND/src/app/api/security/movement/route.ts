import { NextResponse, type NextRequest } from 'next/server';

import { getCaller, getLinkedStudentIds } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';

export async function GET(req: NextRequest) {
  try {
    const admin = await getSchoolDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim().toLowerCase();

    let query = admin
      .from('student_movements')
      .select('*')
      .order('departure_time', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const studentIdFilter = searchParams.get('studentId');

    const caller = await getCaller();
    if (caller.role === 'parent') {
      const linkedIds = await getLinkedStudentIds(caller.email);
      if (!studentIdFilter || !linkedIds.includes(studentIdFilter)) {
        return NextResponse.json(
          { success: false, message: 'You may only view passes for your own child.' },
          { status: 403 }
        );
      }
    }

    if (studentIdFilter) {
      query = query.eq('student_id', studentIdFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    const now = new Date().getTime();
    let movements = data || [];

    if (search) {
      movements = movements.filter((m: any) =>
        m.student_name?.toLowerCase().includes(search) ||
        m.pass_number?.toLowerCase().includes(search) ||
        m.student_class?.toLowerCase().includes(search) ||
        m.authorized_by_name?.toLowerCase().includes(search) ||
        m.escort_name?.toLowerCase().includes(search) ||
        m.reason?.toLowerCase().includes(search)
      );
    }

    const formatted = movements.map((m: any) => {
      // Check if overdue
      let isOverdue = false;
      if (m.status === 'departed' && m.expected_return_time) {
        if (new Date(m.expected_return_time).getTime() < now) {
          isOverdue = true;
        }
      }

      return {
        id: m.id,
        passNumber: m.pass_number,
        studentId: m.student_id,
        studentName: m.student_name,
        studentClass: m.student_class,
        reason: m.reason,
        authorizedById: m.authorized_by_id,
        authorizedByName: m.authorized_by_name,
        escortType: m.escort_type,
        escortName: m.escort_name,
        escortPhone: m.escort_phone || '—',
        departureTime: m.departure_time,
        expectedReturnTime: m.expected_return_time,
        actualReturnTime: m.actual_return_time,
        status: isOverdue ? 'overdue' : m.status,
        securityOfficerName: m.security_officer_name,
        notes: m.notes || '',
        createdAt: m.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      movements: formatted,
      totalCount: formatted.length,
      activeCount: formatted.filter((m: any) => m.status === 'departed' || m.status === 'overdue').length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch student movement records' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getSchoolDb();
    const body = await req.json();

    const {
      studentId,
      studentName,
      studentClass,
      reason,
      authorizedById = null,
      authorizedByName,
      escortType,
      escortName,
      escortPhone = '',
      expectedReturnTime = null,
      notes = '',
      securityOfficerName = 'Security Desk',
    } = body;

    if (!studentId || !studentName?.trim() || !reason?.trim() || !authorizedByName?.trim() || !escortName?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Student, reason, authorizing staff, and escort name are required.' },
        { status: 400 }
      );
    }

    // Normalize reason to check constraint: ('medical', 'official_errand', 'sports', 'competition', 'early_dismissal', 'other')
    const normalizeReason = (val: string): string => {
      const lower = (val || '').toLowerCase().trim();
      if (lower.includes('medic') || lower.includes('clinic')) return 'medical';
      if (lower.includes('errand')) return 'official_errand';
      if (lower.includes('sport')) return 'sports';
      if (lower.includes('compet')) return 'competition';
      if (lower.includes('early') || lower.includes('dismiss')) return 'early_dismissal';
      if (['medical', 'official_errand', 'sports', 'competition', 'early_dismissal', 'other'].includes(lower)) return lower;
      return 'other';
    };

    // Normalize escort_type to check constraint: ('guardian', 'staff', 'unaccompanied', 'driver')
    const normalizeEscortType = (val: string): string => {
      const lower = (val || '').toLowerCase().trim();
      if (lower.includes('staff') || lower.includes('teacher')) return 'staff';
      if (lower.includes('driver')) return 'driver';
      if (lower.includes('unaccomp') || lower.includes('self') || lower.includes('alone')) return 'unaccompanied';
      if (['guardian', 'staff', 'unaccompanied', 'driver'].includes(lower)) return lower;
      return 'guardian';
    };

    const validReason = normalizeReason(reason);
    const validEscortType = normalizeEscortType(escortType);

    // Generate unique Pass Number: OAK-MOV-XXXX (retry on the rare number collision)
    let data: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomPin = Math.floor(1000 + Math.random() * 9000);
      const passNumber = `${admin.idPrefix}-MOV-${randomPin}`;

      const result = await admin
        .from('student_movements')
        .insert({
          pass_number: passNumber,
          student_id: studentId,
          student_name: studentName.trim(),
          student_class: studentClass || 'Enrolled',
          reason: validReason,
          authorized_by_id: authorizedById || null,
          authorized_by_name: authorizedByName.trim(),
          escort_type: validEscortType,
          escort_name: escortName.trim(),
          escort_phone: escortPhone?.trim() || null,
          departure_time: new Date().toISOString(),
          expected_return_time: expectedReturnTime ? new Date(expectedReturnTime).toISOString() : null,
          status: 'departed',
          security_officer_name: securityOfficerName,
          notes: notes?.trim() || (validReason === 'other' && reason.trim() !== 'other' ? reason.trim() : null),
        })
        .select()
        .single();

      if (!result.error) {
        data = result.data;
        break;
      }

      const msg = result.error.message || '';
      if (msg.includes('uniq_active_movement_per_student')) {
        return NextResponse.json(
          { success: false, message: `${studentName} already has an active movement pass.` },
          { status: 409 }
        );
      }
      if (!(msg.includes('pass_number') && (result.error.code === '23505' || /duplicate key/i.test(msg)))) {
        throw result.error;
      }
    }

    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Could not allocate a unique pass number. Please try again.' },
        { status: 500 }
      );
    }

    const passNumber: string = data.pass_number;

    // Cross-portal dispatch: Notify Authorizing Faculty
    if (authorizedById) {
      try {
        const { data: staff } = await admin
          .from('staff_profiles')
          .select('email, first_name')
          .eq('id', authorizedById)
          .maybeSingle();

        if (staff?.email) {
          await admin.from('notifications').insert({
            school_id: admin.schoolId,
            recipient_email: staff.email.toLowerCase(),
            recipient_name: authorizedByName.trim(),
            subject: `Student Intra-day Departure: ${studentName.trim()}`,
            content_html: `${studentName.trim()} (${studentClass}) departed campus on pass ${passNumber}. Reason: ${reason}. Escort: ${escortName.trim()} (${escortType}).`,
            notification_type: 'broadcast',
            status: 'sent',
            attempts_count: 0,
            idempotency_key: `notif-mov-staff-${data.id}-${Date.now()}`,
          });
        }
      } catch (err) {
        console.warn('Movement faculty notification notice:', err);
      }
    }

    // Cross-portal dispatch: Notify Primary Guardian
    try {
      const { data: sgRows } = await admin
        .from('student_guardians')
        .select('guardians(email, first_name)')
        .eq('student_id', studentId)
        .eq('is_primary', true);

      const guardianEmail = (sgRows?.[0]?.guardians as any)?.email;
      if (guardianEmail) {
        await admin.from('notifications').insert({
          school_id: admin.schoolId,
          recipient_email: guardianEmail.toLowerCase(),
          recipient_name: (sgRows?.[0]?.guardians as any)?.first_name || 'Guardian',
          subject: 'Student Intra-day Gate Pass Issued',
          content_html: `${studentName.trim()} departed campus on authorized pass ${passNumber} with ${escortName.trim()} (${escortType}). Reason: ${reason}. Authorized by: ${authorizedByName.trim()}.`,
          notification_type: 'pickup',
          status: 'sent',
          attempts_count: 0,
          idempotency_key: `notif-mov-parent-${data.id}-${Date.now()}`,
        });
      }
    } catch (err) {
      console.warn('Movement guardian notification notice:', err);
    }

    return NextResponse.json({
      success: true,
      message: `Gate pass ${passNumber} issued for ${studentName.trim()}`,
      movement: {
        id: data.id,
        passNumber: data.pass_number,
        studentId: data.student_id,
        studentName: data.student_name,
        studentClass: data.student_class,
        reason: data.reason,
        authorizedByName: data.authorized_by_name,
        escortType: data.escort_type,
        escortName: data.escort_name,
        departureTime: data.departure_time,
        expectedReturnTime: data.expected_return_time,
        status: data.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to issue student movement pass' },
      { status: 500 }
    );
  }
}
