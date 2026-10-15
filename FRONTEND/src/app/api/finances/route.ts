import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

const STANDARD_CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'] as const;

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getAdminClient();

    // 1. Fetch School Settings
    const { data: school } = await sb
      .from('schools')
      .select('*')
      .limit(1)
      .maybeSingle();

    const settings = school?.settings || {};

    const salaryPrincipal = Number(settings.salaryPrincipal ?? 450000);
    const salaryBursar = Number(settings.salaryBursar ?? 400000);
    const salaryClassTeacher = Number(settings.salaryClassTeacher ?? 280000);
    const salarySubjectTeacher = Number(settings.salarySubjectTeacher ?? 240000);
    const salarySupportStaff = Number(settings.salarySupportStaff ?? 180000);
    const allowanceClassTeacher = Number(settings.allowanceClassTeacher ?? 35000);

    const tuitionJSS = Number(settings.tuitionJSS ?? 185000);
    const tuitionSS12 = Number(settings.tuitionSS12 ?? 220000);
    const tuitionSS3 = Number(settings.tuitionSS3 ?? 240000);

    // 2. Fetch Fee Structures
    const { data: feeStructures } = await sb
      .from('fee_structures')
      .select('*')
      .order('class_name', { ascending: true });

    // 3. Fetch Enrolled Students with Class & Guardians
    const { data: studentsData, error: stuErr } = await sb
      .from('students')
      .select(`
        id,
        admission_number,
        first_name,
        last_name,
        gender,
        status,
        class_enrollments (
          id,
          class_id,
          status,
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
            email
          )
        )
      `)
      .order('admission_number', { ascending: true });

    if (stuErr) throw stuErr;

    // 4. Fetch Financial Accounts & Payments
    const [accountsRes, paymentsRes] = await Promise.all([
      sb.from('student_financial_accounts').select('*'),
      sb.from('fee_transactions').select('*').order('created_at', { ascending: false }),
    ]);

    const accountsMap = new Map<string, any>();
    (accountsRes.data || []).forEach((acc: any) => {
      accountsMap.set(acc.student_id, acc);
    });

    const paymentsList = (paymentsRes.data || []).map((p: any) => ({
      id: p.id,
      receiptNo: p.receipt_number || `REC-${p.id.slice(0, 8).toUpperCase()}`,
      admissionNo: p.student_id,
      studentName: p.payer_name || 'Student',
      class: 'Class',
      amount: Number(p.amount) || 0,
      method: p.payment_method || 'Bank Transfer',
      bankRef: p.reference || `REF-${p.id.slice(0, 8)}`,
      receivingAccount: 'GTBank Operations (0123984712)',
      timestamp: new Date(p.created_at || Date.now()).toLocaleDateString('en-GB'),
      status: p.status === 'successful' ? 'Confirmed' : 'Reconciled',
    }));

    // 5. Build Student Ledger
    const studentLedger = (studentsData || []).map((s: any, idx: number) => {
      const enrollment = s.class_enrollments?.find((e: any) => e.status === 'active') || s.class_enrollments?.[0];
      const clsName: string = enrollment?.classes?.name || 'JSS 1';
      const guardianRel = s.student_guardians?.[0];
      const guardian = guardianRel?.guardians;
      const guardianName = guardian ? `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim() : 'Guardian';
      const guardianPhone = guardian?.phone || '—';

      // Rate from fee_structures or settings
      let rate = clsName.startsWith('JSS')
        ? tuitionJSS
        : clsName === 'SS 3'
        ? tuitionSS3
        : tuitionSS12;

      const matchedStructure = (feeStructures || []).find((f: any) => f.class_name === clsName);
      if (matchedStructure && Number(matchedStructure.total_amount) > 0) {
        rate = Number(matchedStructure.total_amount);
      }

      const financialAccount = accountsMap.get(s.id);
      const paid = financialAccount ? Number(financialAccount.total_paid) : 0;
      const balance = Math.max(0, rate - paid);

      const status = balance === 0 ? 'Fully Paid' : paid > 0 ? 'Partial Payment' : 'Defaulter';

      return {
        id: s.id,
        admissionNo: s.admission_number || `OAK-2026-${100 + idx}`,
        studentName: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        class: clsName,
        gender: s.gender === 'female' ? ('Female' as const) : ('Male' as const),
        parentName: guardianName,
        parentPhone: guardianPhone,
        totalBilled: rate,
        amountPaid: paid,
        balance,
        status: status as 'Fully Paid' | 'Partial Payment' | 'Defaulter',
      };
    });

    // 6. Build Class Breakdowns
    const classBreakdowns = STANDARD_CLASSES.map((cls) => {
      let feePerStudent = cls.startsWith('JSS')
        ? tuitionJSS
        : cls === 'SS 3'
        ? tuitionSS3
        : tuitionSS12;

      const matchedStructure = (feeStructures || []).find((f: any) => f.class_name === cls);
      if (matchedStructure && Number(matchedStructure.total_amount) > 0) {
        feePerStudent = Number(matchedStructure.total_amount);
      }

      const classStudents = studentLedger.filter((s: any) => s.class === cls);
      const enrolled = classStudents.length;
      const expected = enrolled * feePerStudent;
      const collected = classStudents.reduce((acc: number, s: any) => acc + s.amountPaid, 0);
      const outstanding = Math.max(0, expected - collected);
      const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;

      return {
        class: cls,
        feePerStudent,
        enrolled,
        students: enrolled,
        expected,
        collected,
        outstanding,
        pct,
      };
    });

    // 7. Fetch Staff Profiles & Calculate Payroll
    const { data: staffData } = await sb
      .from('staff_profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    const currentTermName = settings.currentTerm || 'First Term';
    const academicSessionName = settings.academicSession || '2026/2027';
    const staffBankMap = (settings.staffBankAccounts as Record<string, any>) || {};

    const payrollRecords = (staffData || []).map((st: any, idx: number) => {
      const isPrincipal = st.role === 'admin' || (st.role || '').toLowerCase().includes('principal');
      const isBursar = st.role === 'bursar' || (st.role || '').toLowerCase().includes('bursar');
      const isHomeroom = !!st.assigned_class;

      let basicSalary = salarySubjectTeacher;
      let roleName = st.role === 'teacher' ? 'Subject Teacher' : (st.role || 'Staff');
      let dept: 'Academic' | 'Administration' | 'Accounts' | 'Operations & Support' | 'Medical' = 'Academic';

      if (isPrincipal) {
        basicSalary = salaryPrincipal;
        roleName = 'Principal';
        dept = 'Administration';
      } else if (isBursar) {
        basicSalary = salaryBursar;
        roleName = 'School Bursar';
        dept = 'Accounts';
      } else if (isHomeroom) {
        basicSalary = salaryClassTeacher;
        roleName = `Class Teacher (${st.assigned_class})`;
        dept = 'Academic';
      }

      const respAllowance = isHomeroom ? allowanceClassTeacher : 0;
      const otherAllowances = 0;
      const grossSalary = basicSalary + respAllowance + otherAllowances;

      // Deductions strictly 0 unless recorded
      const tax = 0;
      const pension = 0;
      const cooperative = 0;
      const netSalary = grossSalary - tax - pension - cooperative;

      const staffBank = staffBankMap[st.id] || null;

      return {
        id: st.id || `st-pay-${idx}`,
        employeeId: st.employee_id || '—',
        name: `${st.first_name || ''} ${st.last_name || ''}`.trim(),
        role: roleName,
        department: dept,
        basicSalary,
        responsibilityAllowance: respAllowance,
        otherAllowances,
        taxDeduction: tax,
        pensionDeduction: 0,
        cooperativeDeduction: cooperative,
        netSalary,
        status: 'Pending Approval' as const,
        bankName: staffBank?.bankName || st.bank_name || '—',
        bankAccount: staffBank?.accountNumber || st.bank_account || '—',
        payPeriod: `${currentTermName} ${academicSessionName}`,
      };
    });

    // 8. Fetch Expenditures, Petty Cash & Institutional Bank Accounts from DB
    const [expRes, pettyRes, bankAccRes] = await Promise.all([
      sb.from('expenditures').select('*').order('date', { ascending: false }),
      sb.from('petty_cash').select('*').order('date', { ascending: false }),
      sb.from('bank_accounts').select('*').eq('is_active', true),
    ]);

    const expenditures = (expRes.data || []).map((e: any, idx: number) => ({
      id: e.id,
      voucherNo: `VCH-${new Date(e.date).getFullYear()}-0${idx + 1}`,
      category: e.category,
      description: e.description,
      amount: Number(e.amount) || 0,
      beneficiary: e.vendor || 'Authorized Vendor',
      invoiceNo: `INV-${e.id.slice(0, 6).toUpperCase()}`,
      approvedBy: 'Office of the Proprietor',
      paymentAccount: 'GTBank Operations (0123984712)',
      date: new Date(e.date).toLocaleDateString('en-GB'),
      status: e.status === 'approved' ? ('Approved & Paid' as const) : ('Pending Approval' as const),
    }));

    let runningFloat = 0;
    const pettyCash = (pettyRes.data || []).map((p: any, idx: number) => {
      const amt = Number(p.amount) || 0;
      if (p.type === 'replenishment') runningFloat += amt;
      else runningFloat -= amt;

      return {
        id: p.id,
        receiptNo: `PC-${idx + 101}`,
        date: new Date(p.date).toLocaleDateString('en-GB'),
        item: p.description,
        category: 'Office Stationery' as const,
        amount: amt,
        type: (p.type === 'replenishment' ? 'Inflow' : 'Outflow') as 'Inflow' | 'Outflow',
        balanceAfter: Math.max(0, runningFloat),
        requestedBy: p.requested_by || 'Administrative Desk',
        approvedBy: p.approved_by || 'School Bursar',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        studentLedger,
        classBreakdowns,
        payrollRecords,
        expenditures,
        pettyCash,
        payments: paymentsList,
        tuitionRates: {
          jss: tuitionJSS,
          ss12: tuitionSS12,
          ss3: tuitionSS3,
        },
        institutionalBankAccounts: (bankAccRes.data || []).map((b: any) => ({
          id: b.id,
          name: b.account_name,
          bank: b.bank_name,
          accountNumber: b.account_number,
          accountType: b.account_type,
          displayName: `${b.bank_name} (${b.account_number}) - ${b.account_name}`,
        })),
        salaryRates: {
          principal: salaryPrincipal,
          bursar: salaryBursar,
          classTeacher: salaryClassTeacher,
          subjectTeacher: salarySubjectTeacher,
          supportStaff: salarySupportStaff,
          classTeacherAllowance: allowanceClassTeacher,
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
    const body = await request.json();
    const sb = getAdminClient();

    const { action } = body;

    if (action === 'create_voucher') {
      const { category, description, amount, vendor, paymentAccount } = body;
      if (!description || !amount) {
        return NextResponse.json({ success: false, message: 'Description and amount required' }, { status: 400 });
      }

      const { data: inserted, error: insErr } = await sb
        .from('expenditures')
        .insert({
          school_id: DEFAULT_SCHOOL_ID,
          category: category || 'Diesel & Power',
          amount: Number(amount),
          description,
          vendor: vendor || 'Authorized Vendor',
          payment_method: 'bank_transfer',
          recorded_by: 'Office of the Proprietor',
          status: 'approved',
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (insErr) throw insErr;

      // Log to audit_logs
      try {
        await sb.from('audit_logs').insert({
          school_id: DEFAULT_SCHOOL_ID,
          actor_role: 'Proprietor',
          action: 'finance.expenditure_created',
          resource_type: 'expenditures',
          resource_id: inserted.id,
          metadata: {
            category,
            amount,
            description,
            vendor,
          },
        });
      } catch {}

      return NextResponse.json({ success: true, data: inserted });
    }

    if (action === 'create_petty_cash') {
      const { description, amount, type, requestedBy } = body;
      if (!description || !amount) {
        return NextResponse.json({ success: false, message: 'Description and amount required' }, { status: 400 });
      }

      const { data: inserted, error: pcErr } = await sb
        .from('petty_cash')
        .insert({
          school_id: DEFAULT_SCHOOL_ID,
          amount: Number(amount),
          type: type === 'Inflow' ? 'replenishment' : 'disbursement',
          description,
          recipient: requestedBy || 'Cashier',
          requested_by: requestedBy || 'Campus Staff',
          approved_by: 'School Bursar',
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (pcErr) throw pcErr;

      try {
        await sb.from('audit_logs').insert({
          school_id: DEFAULT_SCHOOL_ID,
          actor_role: 'Proprietor',
          action: 'finance.petty_cash_logged',
          resource_type: 'petty_cash',
          resource_id: inserted.id,
          metadata: {
            amount,
            type,
            description,
          },
        });
      } catch {}

      return NextResponse.json({ success: true, data: inserted });
    }

    if (action === 'approve_payroll') {
      const { totalAmount, staffCount } = body;
      try {
        await sb.from('audit_logs').insert({
          school_id: DEFAULT_SCHOOL_ID,
          actor_role: 'Proprietor',
          action: 'finance.payroll_authorized',
          resource_type: 'payroll',
          metadata: {
            totalAmount,
            staffCount,
            summary: `Monthly payroll authorized across ${staffCount} staff members`,
          },
        });
      } catch {}

      return NextResponse.json({ success: true, message: 'Payroll authorization logged to institutional audit trail' });
    }

    if (action === 'record_payment') {
      const { studentId, amount, method, bankRef, receivingAccount, payerName } = body;
      if (!studentId || !amount) {
        return NextResponse.json({ success: false, message: 'Student ID and amount required' }, { status: 400 });
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ success: false, message: 'Valid payment amount required' }, { status: 400 });
      }

      const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      // 1. Insert fee transaction
      const { data: insertedTx, error: txErr } = await sb
        .from('fee_transactions')
        .insert({
          school_id: DEFAULT_SCHOOL_ID,
          student_id: studentId,
          amount: numAmount,
          receipt_number: receiptNumber,
          payment_method: method || 'Bank Transfer',
          reference: bankRef || `REF-${Date.now()}`,
          payer_name: payerName || 'Guardian',
          status: 'successful',
          recorded_by: 'Bursar',
        })
        .select()
        .single();

      if (txErr) throw txErr;

      // 2. Update or insert student_financial_accounts
      const { data: existingAcc } = await sb
        .from('student_financial_accounts')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingAcc) {
        const newPaid = Number(existingAcc.total_paid || 0) + numAmount;
        const newBal = Math.max(0, Number(existingAcc.total_billed || 0) - newPaid);
        await sb
          .from('student_financial_accounts')
          .update({
            total_paid: newPaid,
            outstanding_balance: newBal,
            last_payment_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAcc.id);
      } else {
        await sb
          .from('student_financial_accounts')
          .insert({
            school_id: DEFAULT_SCHOOL_ID,
            student_id: studentId,
            total_billed: numAmount,
            total_paid: numAmount,
            outstanding_balance: 0,
            last_payment_date: new Date().toISOString(),
          });
      }

      // 3. Log audit trail
      try {
        await sb.from('audit_logs').insert({
          school_id: DEFAULT_SCHOOL_ID,
          actor_role: 'Bursar',
          action: 'finance.fee_payment_recorded',
          resource_type: 'fee_transactions',
          resource_id: insertedTx.id,
          metadata: {
            studentId,
            amount: numAmount,
            receiptNumber,
            method,
            bankRef,
          },
        });
      } catch {}

      return NextResponse.json({ success: true, data: insertedTx });
    }

    if (action === 'update_staff_bank') {
      const { staffId, bankName, accountNumber } = body;
      if (!staffId || !bankName || !accountNumber) {
        return NextResponse.json({ success: false, message: 'Missing staff ID, bank name, or account number' }, { status: 400 });
      }

      const { data: schoolData, error: schoolErr } = await sb
        .from('schools')
        .select('id, settings')
        .eq('id', DEFAULT_SCHOOL_ID)
        .single();

      if (schoolErr || !schoolData) {
        return NextResponse.json({ success: false, message: 'School not found' }, { status: 404 });
      }

      const currentSettings = schoolData.settings || {};
      const currentBankMap = { ...(currentSettings.staffBankAccounts || {}) };

      currentBankMap[staffId] = {
        bankName: String(bankName).trim(),
        accountNumber: String(accountNumber).trim(),
        updatedAt: new Date().toISOString(),
      };

      const { error: updateErr } = await sb
        .from('schools')
        .update({
          settings: {
            ...currentSettings,
            staffBankAccounts: currentBankMap,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', DEFAULT_SCHOOL_ID);

      if (updateErr) {
        return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
      }

      try {
        await sb.from('audit_logs').insert({
          school_id: DEFAULT_SCHOOL_ID,
          action: 'finance.staff_bank_updated',
          entity_type: 'staff_profiles',
          entity_id: staffId,
          metadata: { staffId, bankName, accountNumber },
        });
      } catch {}

      return NextResponse.json({ success: true, message: 'Staff bank details updated successfully' });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Finance processing error' },
      { status: 500 }
    );
  }
}
