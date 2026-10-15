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

    // 1. Fetch School & Settings JSON
    const { data: school, error: schoolErr } = await sb
      .from('schools')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (schoolErr) throw schoolErr;

    // 2. Fetch Classes Capacity from PostgreSQL
    const { data: classesData } = await sb
      .from('classes')
      .select('capacity')
      .order('grade_level', { ascending: true })
      .limit(1);

    const standardCapacity = classesData?.[0]?.capacity || 50;

    // 3. Fetch Tuition from fee_structures in PostgreSQL
    const { data: feesData } = await sb
      .from('fee_structures')
      .select('class_name, total_amount');

    const jssFee = feesData?.find((f: any) => f.class_name === 'JSS 1')?.total_amount || 185000;
    const ss12Fee = feesData?.find((f: any) => f.class_name === 'SS 1')?.total_amount || 220000;
    const ss3Fee = feesData?.find((f: any) => f.class_name === 'SS 3')?.total_amount || 240000;

    // 4. Fetch Session & Term
    const [sessionRes, termRes] = await Promise.all([
      sb.from('academic_sessions').select('*').eq('is_current', true).maybeSingle(),
      sb.from('academic_terms').select('*').eq('is_current', true).maybeSingle(),
    ]);

    const persisted = school?.settings || {};

    const settingsData = {
      // General & Session
      schoolName: school?.name || 'Oakland International College',
      motto: school?.motto || 'Knowledge, Integrity and Excellence',
      address: school?.address || '14 Academic Crescent, Victoria Island, Lagos',
      academicSession: sessionRes.data?.name || persisted.academicSession || '2026/2027',
      currentTerm: termRes.data?.name || persisted.currentTerm || 'Term 1',
      termStartDate: termRes.data?.start_date || persisted.termStartDate || '2026-09-14',
      termEndDate: termRes.data?.end_date || persisted.termEndDate || '2026-12-18',
      classCapacity: standardCapacity,

      // Academic & Grading
      ca1Weight: persisted.ca1Weight ?? 20,
      ca2Weight: persisted.ca2Weight ?? 20,
      examWeight: persisted.examWeight ?? 60,
      passMark: persisted.passMark ?? 50,
      minAttendanceRate: persisted.minAttendanceRate ?? 75,

      // Attendance Rules
      rollCallCutoff: persisted.rollCallCutoff || '08:15',
      submissionDeadline: persisted.submissionDeadline || '08:30',
      autoNotifyAbsent: persisted.autoNotifyAbsent ?? true,
      autoNotifyLate: persisted.autoNotifyLate ?? true,

      // Tuition & Fees
      tuitionJSS: Number(jssFee),
      tuitionSS12: Number(ss12Fee),
      tuitionSS3: Number(ss3Fee),
      restrictExamSlipIfDebtor: persisted.restrictExamSlipIfDebtor ?? true,
      debtorThresholdPct: persisted.debtorThresholdPct ?? 50,

      // Communication Alerts
      smsReceipts: persisted.smsReceipts ?? true,
      smsResults: persisted.smsResults ?? true,
      alertLargeTransactions: persisted.alertLargeTransactions ?? true,

      // Staff Compensation Scales (Master Institutional Configuration)
      salaryPrincipal: Number(persisted.salaryPrincipal ?? 450000),
      salaryBursar: Number(persisted.salaryBursar ?? 400000),
      salaryClassTeacher: Number(persisted.salaryClassTeacher ?? 280000),
      salarySubjectTeacher: Number(persisted.salarySubjectTeacher ?? 240000),
      salarySupportStaff: Number(persisted.salarySupportStaff ?? 180000),
      allowanceClassTeacher: Number(persisted.allowanceClassTeacher ?? 35000),

      // Entrance Exam Schedule Windows
      entranceExamWindows: Array.isArray(persisted.entranceExamWindows)
        ? persisted.entranceExamWindows
        : [],

      // Principal Delegated Administrative Powers
      principalDelegations: persisted.principalDelegations || {
        canOnboardStaff: true,
        canSetCalendarEvents: true,
        canApproveAdmissions: true,
        canEndorseResults: true,
      },
    };

    return NextResponse.json({ success: true, data: settingsData });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getAdminClient();

    // 1. Fetch current school
    const { data: school } = await sb
      .from('schools')
      .select('id, settings')
      .limit(1)
      .maybeSingle();

    const schoolId = school?.id || DEFAULT_SCHOOL_ID;
    const currentSettings = school?.settings || {};

    const updatedSettings = {
      ...currentSettings,
      ...body,
    };

    // 2. Persist to schools table
    await sb
      .from('schools')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schoolId);

    // 3. Update Seat Capacity across all classes in PostgreSQL
    if (typeof body.classCapacity === 'number' && body.classCapacity > 0) {
      await sb
        .from('classes')
        .update({ capacity: body.classCapacity })
        .eq('school_id', schoolId);
    }

    // 4. Update Tuition in fee_structures in PostgreSQL
    if (typeof body.tuitionJSS === 'number' && body.tuitionJSS > 0) {
      await sb
        .from('fee_structures')
        .update({ tuition_fee: body.tuitionJSS, total_amount: body.tuitionJSS })
        .in('class_name', ['JSS 1', 'JSS 2', 'JSS 3']);
    }

    if (typeof body.tuitionSS12 === 'number' && body.tuitionSS12 > 0) {
      await sb
        .from('fee_structures')
        .update({ tuition_fee: body.tuitionSS12, total_amount: body.tuitionSS12 })
        .in('class_name', ['SS 1', 'SS 2']);
    }

    if (typeof body.tuitionSS3 === 'number' && body.tuitionSS3 > 0) {
      await sb
        .from('fee_structures')
        .update({ tuition_fee: body.tuitionSS3, total_amount: body.tuitionSS3 })
        .eq('class_name', 'SS 3');
    }

    // Log to audit_logs
    try {
      await sb.from('audit_logs').insert({
        school_id: schoolId,
        actor_role: 'Proprietor',
        action: 'settings.updated',
        resource_type: 'schools',
        resource_id: schoolId,
        metadata: {
          summary: 'Master institutional settings updated by Proprietor',
          updatedKeys: Object.keys(body),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'School settings saved and synced across classes and fee structures.',
      data: updatedSettings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Save error' },
      { status: 500 }
    );
  }
}

export const PUT = POST;

