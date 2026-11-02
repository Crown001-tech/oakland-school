import { NextResponse, type NextRequest } from 'next/server';
import { getClassNames } from '@/lib/school-classes';
import { tuitionGroup, type TuitionGroup } from '@/lib/tuition';
import { getCaller, formatRoleLabel } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';



export async function GET() {
  try {
    const sb = await getSchoolDb();

    // 1. Fetch School & Settings JSON
    const { data: school, error: schoolErr } = await sb
      .from('schools')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (schoolErr) throw schoolErr;

    const persisted = school?.settings || {};

    // 2. Fetch Classes Capacity from PostgreSQL
    const { data: classesData } = await sb
      .from('classes')
      .select('capacity')
      .order('grade_level', { ascending: true })
      .limit(1);

    const standardCapacity = persisted.classCapacity || classesData?.[0]?.capacity || 0;

    // 3. Fetch Tuition from fee_structures in PostgreSQL
    const { data: feesData } = await sb
      .from('fee_structures')
      .select('class_name, total_amount');

    const jssFee = persisted.tuitionJSS || feesData?.find((f: any) => f.class_name === 'JSS 1')?.total_amount || 0;
    const ss12Fee = persisted.tuitionSS12 || feesData?.find((f: any) => f.class_name === 'SS 1')?.total_amount || 0;
    const ss3Fee = persisted.tuitionSS3 || feesData?.find((f: any) => f.class_name === 'SS 3')?.total_amount || 0;

    // 4. Fetch Session & Term
    const [sessionRes, termRes] = await Promise.all([
      sb.from('academic_sessions').select('*').eq('is_current', true).maybeSingle(),
      sb.from('academic_terms').select('*').eq('is_current', true).maybeSingle(),
    ]);

    const settingsData = {
      // General & Session
      schoolName: school?.name || '',
      motto: school?.motto || '',
      address: school?.address || '',
      academicSession: sessionRes.data?.name || persisted.academicSession || '',
      currentTerm: termRes.data?.name || persisted.currentTerm || '',
      termStartDate: termRes.data?.start_date || persisted.termStartDate || '',
      termEndDate: termRes.data?.end_date || persisted.termEndDate || '',
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
      salaryPrincipal: Number(persisted.salaryPrincipal || 0),
      salaryBursar: Number(persisted.salaryBursar || 0),
      salaryClassTeacher: Number(persisted.salaryClassTeacher || 0),
      salarySubjectTeacher: Number(persisted.salarySubjectTeacher || 0),
      salarySupportStaff: Number(persisted.salarySupportStaff || 0),
      allowanceClassTeacher: Number(persisted.allowanceClassTeacher || 0),

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
    const sb = await getSchoolDb();

    // Grading rules must be usable: weights add up to 100 so every total is out of 100
    const sentWeights = ['ca1Weight', 'ca2Weight', 'examWeight'].filter((k) => body[k] !== undefined);
    if (sentWeights.length > 0) {
      const [a, b, c] = [body.ca1Weight, body.ca2Weight, body.examWeight].map(Number);
      if (sentWeights.length !== 3 || [a, b, c].some((n) => !Number.isFinite(n) || n < 0) || !(c > 0) || Math.round((a + b + c) * 100) / 100 !== 100) {
        return NextResponse.json(
          { success: false, message: 'CA 1, CA 2 and exam marks must add up to 100, and the exam must be more than 0.' },
          { status: 400 }
        );
      }
    }
    if (body.passMark !== undefined && !(Number(body.passMark) > 0 && Number(body.passMark) <= 100)) {
      return NextResponse.json({ success: false, message: 'The pass mark must be between 1 and 100.' }, { status: 400 });
    }

    // 1. Fetch current school ID
    const { data: school } = await sb
      .from('schools')
      .select('id')
      .limit(1)
      .maybeSingle();

    const schoolId = school?.id || sb.schoolId;

    // 2. Persist atomically using merge_school_settings RPC (DEF-113)
    const { data: updatedSettings, error: rpcErr } = await sb.rpc('merge_school_settings', {
      p_school_id: schoolId,
      p_patch: body,
    });

    if (rpcErr) {
      console.error('merge_school_settings RPC failed:', rpcErr);
      return NextResponse.json(
        { success: false, message: `Failed to atomically persist school settings: ${rpcErr.message}` },
        { status: 500 }
      );
    }

    // 3. Update Seat Capacity across all classes in PostgreSQL
    if (typeof body.classCapacity === 'number' && body.classCapacity > 0) {
      await sb
        .from('classes')
        .update({ capacity: body.classCapacity })
        .eq('school_id', schoolId);
    }

    // 4. Keep each class’s fee structure in step with the tuition rates (the school’s own classes only)
    const classNames = await getClassNames(sb, schoolId);
    const syncTuition = async (group: TuitionGroup, rate: unknown) => {
      if (typeof rate !== 'number' || rate <= 0) return;
      const names = classNames.filter((n) => tuitionGroup(n) === group);
      if (names.length === 0) return;
      await sb
        .from('fee_structures')
        .update({ tuition_fee: rate, total_amount: rate })
        .eq('school_id', schoolId)
        .in('class_name', names);
    };
    await syncTuition('jss', body.tuitionJSS);
    await syncTuition('ss12', body.tuitionSS12);
    await syncTuition('ss3', body.tuitionSS3);

    // Log to audit_logs
    try {
      const caller = await getCaller();
      const actorRole = formatRoleLabel(caller.role);
      const actorName = caller.email || actorRole;

      await sb.from('audit_logs').insert({
        school_id: schoolId,
        actor_id: caller.userId,
        actor_name: actorName,
        actor_role: actorRole,
        action: 'settings.updated',
        resource_type: 'schools',
        resource_id: schoolId,
        metadata: {
          summary: `Master institutional settings updated by ${actorName}`,
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

