import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const sb = getAdminClient();

    // 1. Fetch Student Record
    let query = sb.from('students').select('*');
    if (id.includes('-') && id.length === 36) {
      query = query.eq('id', id);
    } else {
      query = query.eq('admission_number', id);
    }

    const { data: student, error: studentErr } = await query.maybeSingle();

    if (studentErr) throw studentErr;
    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found in database' },
        { status: 404 }
      );
    }

    // 2. Fetch Class Enrollment
    const { data: enrollment } = await sb
      .from('class_enrollments')
      .select('id, class_id, status, classes(name, grade_level)')
      .eq('student_id', student.id)
      .eq('status', 'active')
      .maybeSingle();

    const currentClass = (enrollment?.classes as any)?.name || 'Unassigned';

    // 3. Fetch Guardians & Real Pickup PIN from DB
    const { data: guardianLinks } = await sb
      .from('student_guardians')
      .select('id, relationship, is_primary, authorized_pickup, pickup_pin, guardians(*)')
      .eq('student_id', student.id);

    const guardians = (guardianLinks || []).map((link: any) => {
      const g = link.guardians || {};
      return {
        id: link.id,
        guardianId: g.id,
        name: `${g.first_name || ''} ${g.last_name || ''}`.trim() || 'Guardian',
        relationship: link.relationship || 'Guardian',
        phone: g.phone || '—',
        email: g.email || '—',
        isPrimary: link.is_primary ?? true,
        authorizedPickup: link.authorized_pickup ?? true,
        pickupPin: link.pickup_pin || null,
      };
    });

    // 4. Real Academic Records from PostgreSQL
    let averageScore: number | null = null;
    let classRank: string | null = null;
    let totalAssessments = 0;

    if (enrollment?.id) {
      const { data: scoresData } = await sb
        .from('scores')
        .select('score, assessments(title, max_score, subjects(name))')
        .eq('enrollment_id', enrollment.id);

      if (scoresData && scoresData.length > 0) {
        totalAssessments = scoresData.length;
        const totalScore = scoresData.reduce((acc: number, s: any) => acc + (Number(s.score) || 0), 0);
        const maxScore = scoresData.reduce((acc: number, s: any) => acc + (Number(s.assessments?.max_score) || 100), 0);
        averageScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : null;
      }
    }

    // 5. Real Attendance Records from PostgreSQL
    const { data: attRecords } = await sb
      .from('attendance_records')
      .select('status, date')
      .eq('student_id', student.id);

    const totalDays = attRecords?.length || 0;
    const daysPresent = (attRecords || []).filter((r: any) => r.status === 'present').length;
    const daysAbsent = (attRecords || []).filter((r: any) => r.status === 'absent').length;
    const ratePercentage = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : null;

    // 6. Real Fee Structure & Payment Ledger from PostgreSQL
    let termFee = 0;
    let totalPaid = 0;

    if (currentClass && currentClass !== 'Unassigned') {
      const { data: feeStructure } = await sb
        .from('fee_structures')
        .select('total_amount')
        .eq('class_name', currentClass)
        .maybeSingle();

      if (feeStructure?.total_amount) {
        termFee = Number(feeStructure.total_amount);
      }
    }

    if (enrollment?.id) {
      const { data: paymentsData } = await sb
        .from('fee_payments')
        .select('amount_paid')
        .eq('enrollment_id', enrollment.id)
        .eq('status', 'confirmed');

      totalPaid = (paymentsData || []).reduce((acc: number, p: any) => acc + (Number(p.amount_paid) || 0), 0);
    }

    const balance = Math.max(0, termFee - totalPaid);
    const financeStatus =
      termFee === 0
        ? 'Unbilled'
        : totalPaid >= termFee
        ? 'Cleared'
        : totalPaid > 0
        ? 'Partial'
        : 'Pending Payment';

    // 7. Return verified 360 profile
    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          admissionNumber: student.admission_number,
          firstName: student.first_name,
          middleName: student.middle_name,
          lastName: student.last_name,
          fullName: `${student.first_name} ${student.last_name}`.trim(),
          gender: student.gender,
          dob: student.dob || '—',
          bloodGroup: student.blood_group || '—',
          address: student.address || '—',
          status: student.status || 'Active',
          createdAt: student.created_at,
        },
        currentClass,
        guardians,
        academics: {
          averageScore,
          classRank,
          totalAssessments,
        },
        attendance: {
          totalDays,
          daysPresent,
          daysAbsent,
          ratePercentage,
        },
        finance: {
          termFee,
          totalPaid,
          balance,
          status: financeStatus,
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const sb = getAdminClient();

    // If updating guardian pickup PIN
    if (body.guardianLinkId && body.pickupPin) {
      const { data, error } = await sb
        .from('student_guardians')
        .update({ pickup_pin: body.pickupPin, authorized_pickup: true })
        .eq('id', body.guardianLinkId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Pickup PIN updated successfully', data });
    }

    return NextResponse.json({ success: false, message: 'No valid update field provided' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Update error' },
      { status: 500 }
    );
  }
}
