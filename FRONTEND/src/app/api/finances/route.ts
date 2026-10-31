import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor, getCaller, getLinkedStudentIds, isAdminRole } from '@/lib/caller';
import { computeStaffPay, isOnPayroll, resolveSalaryScales } from '@/lib/payroll';
import { isExpenditureCategory, isPettyCashCategory } from '@/types/finance';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

const STANDARD_CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'] as const;

function getAdminClient() {
  return getSupabaseAdmin();
}

export async function GET() {
  try {
    // Full ledger for finance and administration; parents see only their own children; everyone else is refused.
    const caller = await getCaller();
    const isFullAccess = isAdminRole(caller.role) || caller.role === 'bursar';
    const isGuardian = caller.role === 'parent';
    if (!isFullAccess && !isGuardian) {
      return NextResponse.json({ success: false, message: 'Access denied for this role.' }, { status: 403 });
    }
    const linkedStudentIds = isGuardian ? await getLinkedStudentIds(caller.email) : [];

    const sb = getAdminClient();

    // 1. Fetch School Settings
    const { data: school } = await sb
      .from('schools')
      .select('*')
      .limit(1)
      .maybeSingle();

    const schoolId = school?.id || DEFAULT_SCHOOL_ID;
    const settings = school?.settings || {};

    const salaryScales = resolveSalaryScales(settings);

    const tuitionJSS = Number(settings.tuitionJSS || 0);
    const tuitionSS12 = Number(settings.tuitionSS12 || 0);
    const tuitionSS3 = Number(settings.tuitionSS3 || 0);

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

    // Sum confirmed fee_transactions per student to guarantee zero discrepancy with student_financial_accounts
    const txPaidMap = new Map<string, number>();
    (paymentsRes.data || []).forEach((tx: any) => {
      if (tx.status === 'successful') {
        txPaidMap.set(tx.student_id, (txPaidMap.get(tx.student_id) || 0) + (Number(tx.amount) || 0));
      }
    });

    const studentMap = new Map<string, any>();
    (studentsData || []).forEach((s: any) => {
      const enrollment = s.class_enrollments?.find((e: any) => e.status === 'active') || s.class_enrollments?.[0];
      studentMap.set(s.id, {
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        admissionNo: s.admission_number || '—',
        className: enrollment?.classes?.name || '—',
      });
    });

    const paymentsList = (paymentsRes.data || []).map((p: any) => {
      const studentInfo = studentMap.get(p.student_id);
      return {
        id: p.id,
        studentId: p.student_id,
        receiptNo: p.receipt_number || `REC-${p.id.slice(0, 8).toUpperCase()}`,
        admissionNo: studentInfo?.admissionNo || p.student_id || '—',
        studentName: studentInfo?.name || p.payer_name || '—',
        class: studentInfo?.className || '—',
        amount: Number(p.amount) || 0,
        method: p.payment_method || 'Bank Transfer',
        bankRef: p.reference || `REF-${p.id.slice(0, 8)}`,
        receivingAccount: p.receiving_account || '—',
        recordedBy: p.recorded_by || '—',
        timestamp: new Date(p.created_at || Date.now()).toLocaleDateString('en-GB'),
        status: p.status === 'successful' ? 'Confirmed' : 'Reconciled',
      };
    });

    // 5. Build Student Ledger
    const studentLedger = (studentsData || []).map((s: any) => {
      const enrollment = s.class_enrollments?.find((e: any) => e.status === 'active') || s.class_enrollments?.[0];
      const clsName: string = enrollment?.classes?.name || '—';
      const guardianRel = s.student_guardians?.[0];
      const guardian = guardianRel?.guardians;
      const guardianName = guardian ? `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim() : 'Guardian';
      const guardianPhone = guardian?.phone || '—';

      // Rate from fee_structures or settings (0 if no class assigned)
      let rate = 0;
      if (clsName.startsWith('JSS')) {
        rate = tuitionJSS;
      } else if (clsName === 'SS 3') {
        rate = tuitionSS3;
      } else if (clsName.startsWith('SS')) {
        rate = tuitionSS12;
      }

      const matchedStructure = (feeStructures || []).find((f: any) => f.class_name === clsName);
      if (matchedStructure && Number(matchedStructure.total_amount) > 0) {
        rate = Number(matchedStructure.total_amount);
      }

      const financialAccount = accountsMap.get(s.id);
      const txPaid = txPaidMap.get(s.id) || 0;
      const accPaid = financialAccount ? Number(financialAccount.total_paid || 0) : 0;
      const paid = Math.max(txPaid, accPaid);
      const balance = Math.max(0, rate - paid);
      const creditBalance = Math.max(0, paid - rate, Number(financialAccount?.credit_balance || 0));

      const status = balance === 0 ? 'Fully Paid' : paid > 0 ? 'Partial Payment' : 'Defaulter';

      return {
        id: s.id,
        admissionNo: s.admission_number || '—',
        studentName: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        class: clsName,
        gender: s.gender === 'female' ? ('Female' as const) : ('Male' as const),
        parentName: guardianName,
        parentPhone: guardianPhone,
        totalBilled: rate,
        amountPaid: paid,
        balance,
        creditBalance,
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

    // 7. Fetch Staff Profiles & Persistent Payroll Runs (DEF-111)
    const currentTermName = settings.currentTerm || 'First Term';
    const academicSessionName = settings.academicSession || '2026/2027';
    const currentPayPeriod = `${currentTermName} ${academicSessionName}`;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [staffRes, payrollRunsRes] = await Promise.all([
      sb
        .from('staff_profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      sb
        .from('payroll_runs')
        .select('*, payroll_run_items(*)')
        .eq('school_id', schoolId)
        .order('authorized_at', { ascending: false })
        .limit(12),
    ]);

    const staffData = staffRes.data || [];
    const payrollRuns = payrollRunsRes.data || [];
    const currentRun = payrollRuns.find(
      (r: any) =>
        (r.pay_period === currentPayPeriod && r.month === currentMonth && r.year === currentYear) ||
        r.pay_period === currentPayPeriod
    );
    const runItemsByStaffId = new Map<string, any>();
    if (currentRun && Array.isArray(currentRun.payroll_run_items)) {
      currentRun.payroll_run_items.forEach((item: any) => {
        runItemsByStaffId.set(item.staff_id, item);
      });
    }

    const staffBankMap = (settings.staffBankAccounts as Record<string, any>) || {};
    const staffDeductionsMap = (settings.staffDeductions as Record<string, any>) || {};

    const payrollRecords = staffData.filter(isOnPayroll).map((st: any, idx: number) => {
      const pay = computeStaffPay(st, salaryScales, staffDeductionsMap[st.id]);

      const staffBank = staffBankMap[st.id] || null;
      const persistedRunItem = runItemsByStaffId.get(st.id);
      const isDisbursed = Boolean(currentRun && currentRun.status === 'Approved & Disbursed');

      return {
        id: st.id || `st-pay-${idx}`,
        employeeId: st.employee_id || '—',
        name: `${st.first_name || ''} ${st.last_name || ''}`.trim(),
        role: pay.roleName,
        department: pay.department,
        basicSalary: pay.basicSalary,
        responsibilityAllowance: pay.responsibilityAllowance,
        otherAllowances: pay.otherAllowances,
        taxDeduction: pay.taxDeduction,
        cooperativeDeduction: pay.cooperativeDeduction,
        netSalary: pay.netSalary,
        status: (persistedRunItem?.status || (isDisbursed ? 'Approved & Disbursed' : 'Pending Approval')) as
          | 'Approved & Disbursed'
          | 'Pending Approval'
          | 'Processing',
        bankName: staffBank?.bankName || st.bank_name || '—',
        bankAccount: staffBank?.accountNumber || st.bank_account || '—',
        payPeriod: currentPayPeriod,
      };
    });

    // 8. Fetch Expenditures, Petty Cash & Institutional Bank Accounts from DB
    const [expRes, pettyRes, bankAccRes] = await Promise.all([
      sb
        .from('expenditures')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      sb
        .from('petty_cash')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true }),
      sb.from('bank_accounts').select('*').order('created_at', { ascending: true }),
    ]);

    const bankAccountsMap = new Map<string, any>();
    (bankAccRes.data || []).forEach((b: any) => {
      bankAccountsMap.set(b.id, b);
    });

    const expenditures = (expRes.data || []).map((e: any, idx: number) => {
      const matchedBank = e.bank_account_id ? bankAccountsMap.get(e.bank_account_id) : null;
      const paymentAccountDisplay =
        e.payment_account ||
        (matchedBank ? `${matchedBank.bank_name} (${matchedBank.account_number})` : '—');

      return {
        id: e.id,
        voucherNo: e.voucher_number || `VCH-${new Date(e.date).getFullYear()}-0${idx + 1}`,
        category: e.category,
        description: e.description,
        amount: Number(e.amount) || 0,
        beneficiary: e.vendor || '—',
        invoiceNo: `INV-${e.id.slice(0, 6).toUpperCase()}`,
        approvedBy: e.approved_by || e.recorded_by || '—',
        paymentAccount: paymentAccountDisplay,
        date: new Date(e.date).toLocaleDateString('en-GB'),
        status: e.status === 'approved' ? ('Approved & Paid' as const) : ('Pending Approval' as const),
      };
    });

    // Compute petty cash running float in chronological order (oldest -> newest), then reverse for newest-first display (DEF-117)
    let runningFloat = 0;
    const chronologicalPettyCash = (pettyRes.data || []).map((p: any, idx: number) => {
      const amt = Number(p.amount) || 0;
      if (p.type === 'replenishment') runningFloat += amt;
      else runningFloat -= amt;

      return {
        id: p.id,
        receiptNo: p.receipt_number || `PC-${idx + 101}`,
        date: new Date(p.date).toLocaleDateString('en-GB'),
        item: p.description,
        category: p.category,
        amount: amt,
        type: (p.type === 'replenishment' ? 'Inflow' : 'Outflow') as 'Inflow' | 'Outflow',
        balanceAfter: Math.max(0, runningFloat),
        requestedBy: p.requested_by || '—',
        approvedBy: p.approved_by || '—',
      };
    });
    const pettyCash = chronologicalPettyCash.reverse();

    if (isGuardian) {
      const ownIds = new Set(linkedStudentIds);
      return NextResponse.json({
        success: true,
        data: {
          studentLedger: studentLedger.filter((s: any) => ownIds.has(s.id)),
          payments: (paymentsRes.data || [])
            .filter((p: any) => ownIds.has(p.student_id))
            .map((p: any) => paymentsList.find((x: any) => x.id === p.id)),
          tuitionRates: { jss: tuitionJSS, ss12: tuitionSS12, ss3: tuitionSS3 },
          academicSession: academicSessionName,
          currentTerm: currentTermName,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        studentLedger,
        classBreakdowns,
        payrollRecords,
        payrollRuns: payrollRuns.map((r: any) => ({
          id: r.id,
          payPeriod: r.pay_period,
          month: r.month,
          year: r.year,
          totalGross: Number(r.total_gross || 0),
          totalDeductions: Number(r.total_deductions || 0),
          totalNet: Number(r.total_net || 0),
          staffCount: Number(r.staff_count || 0),
          status: r.status,
          authorizedByName: r.authorized_by_name,
          authorizedByRole: r.authorized_by_role,
          authorizedAt: r.authorized_at,
        })),
        expenditures,
        pettyCash,
        payments: paymentsList,
        tuitionRates: {
          jss: tuitionJSS,
          ss12: tuitionSS12,
          ss3: tuitionSS3,
        },
        academicSession: academicSessionName,
        currentTerm: currentTermName,
        institutionalBankAccounts: (bankAccRes.data || []).map((b: any) => ({
          id: b.id,
          name: b.account_name,
          bank: b.bank_name,
          accountNumber: b.account_number,
          accountType: b.account_type,
          currency: b.currency || 'NGN',
          balance: Number(b.balance || 0),
          isActive: Boolean(b.is_active),
          displayName: `${b.bank_name} (${b.account_number}) - ${b.account_name}`,
        })),
        salaryRates: {
          principal: salaryScales.salaryPrincipal,
          bursar: salaryScales.salaryBursar,
          classTeacher: salaryScales.salaryClassTeacher,
          subjectTeacher: salaryScales.salarySubjectTeacher,
          supportStaff: salaryScales.salarySupportStaff,
          classTeacherAllowance: salaryScales.allowanceClassTeacher,
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
    // Authenticate the real signed-in user for all money actions and audit logs (DEF-112, DEF-120)
    const actor = await getAuthenticatedActor();
    if (!actor.hasSession || (!isAdminRole(actor.role) && actor.role !== 'bursar')) {
      return NextResponse.json(
        { success: false, message: 'Access denied. Bursar or Administrative authorization required.' },
        { status: actor.hasSession ? 403 : 401 }
      );
    }

    const body = await request.json();
    const sb = getAdminClient();
    const schoolId = actor.schoolId || DEFAULT_SCHOOL_ID;

    const { action } = body;

    if (action === 'create_voucher') {
      const { category, description, amount, vendor, paymentAccount } = body;
      if (!description || !amount) {
        return NextResponse.json({ success: false, message: 'Description and amount required' }, { status: 400 });
      }
      if (!isExpenditureCategory(category)) {
        return NextResponse.json({ success: false, message: 'Choose an expenditure category' }, { status: 400 });
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ success: false, message: 'Valid expenditure amount required' }, { status: 400 });
      }

      // Sequential voucher number per school per year (DEF-119); never an improvised one
      const currentYear = new Date().getFullYear();
      const { data: voucherNumber, error: seqErr } = await sb.rpc('next_school_document_number', {
        p_school_id: schoolId,
        p_doc_type: 'VCH',
        p_year: currentYear,
      });
      if (seqErr || typeof voucherNumber !== 'string') {
        throw seqErr || new Error('Could not issue a voucher number');
      }

      // Match institutional bank account by id or exact account number, never by bank name (DEF-121)
      let matchedBankId: string | null = null;
      if (paymentAccount) {
        const { data: bankAccounts } = await sb
          .from('bank_accounts')
          .select('id, bank_name, account_number, balance')
          .eq('school_id', schoolId);

        const accountText = String(paymentAccount);
        const containsAccountNumber = (accountNumber: string) =>
          new RegExp(`(^|\\D)${accountNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\D|$)`).test(accountText);
        const matched = (bankAccounts || []).find(
          (b: any) => b.id === accountText || (Boolean(b.account_number) && containsAccountNumber(String(b.account_number)))
        );
        if (matched) {
          matchedBankId = matched.id;
          await sb
            .from('bank_accounts')
            .update({
              balance: Math.max(0, Number(matched.balance || 0) - numAmount),
              updated_at: new Date().toISOString(),
            })
            .eq('id', matched.id);
        }
      }

      const { data: inserted, error: insErr } = await sb
        .from('expenditures')
        .insert({
          school_id: schoolId,
          voucher_number: voucherNumber,
          category,
          amount: numAmount,
          description: String(description).trim(),
          vendor: vendor ? String(vendor).trim() : null,
          payment_method: 'bank_transfer',
          bank_account_id: matchedBankId,
          payment_account: paymentAccount ? String(paymentAccount).trim() : null,
          recorded_by: actor.actorName,
          recorded_by_id: actor.userId,
          recorded_by_role: actor.actorRoleLabel,
          approved_by: actor.actorName,
          status: 'approved',
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (insErr) throw insErr;

      // Log to audit_logs with real signed-in user (DEF-120)
      try {
        await sb.from('audit_logs').insert({
          school_id: schoolId,
          actor_id: actor.userId,
          actor_name: actor.actorName,
          actor_role: actor.actorRoleLabel,
          action: 'finance.expenditure_created',
          resource_type: 'expenditures',
          resource_id: inserted.id,
          metadata: {
            actorName: actor.actorName,
            actorRole: actor.actorRoleLabel,
            voucherNumber,
            category,
            amount: numAmount,
            description,
            vendor,
            paymentAccount,
            summary: `Payment voucher ${voucherNumber} (NGN ${numAmount.toLocaleString()}) recorded by ${actor.actorName} (${actor.actorRoleLabel})`,
          },
        });
      } catch {}

      return NextResponse.json({ success: true, data: inserted });
    }

    if (action === 'create_petty_cash') {
      const { description, amount, type, category, requestedBy } = body;
      if (!description || !amount) {
        return NextResponse.json({ success: false, message: 'Description and amount required' }, { status: 400 });
      }
      if (!isPettyCashCategory(category)) {
        return NextResponse.json({ success: false, message: 'Choose a petty cash category' }, { status: 400 });
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ success: false, message: 'Valid petty cash amount required' }, { status: 400 });
      }

      // Sequential petty cash receipt number per school per year (DEF-119); never an improvised one
      const currentYear = new Date().getFullYear();
      const { data: receiptNumber, error: seqErr } = await sb.rpc('next_school_document_number', {
        p_school_id: schoolId,
        p_doc_type: 'PC',
        p_year: currentYear,
      });
      if (seqErr || typeof receiptNumber !== 'string') {
        throw seqErr || new Error('Could not issue a petty cash receipt number');
      }

      const requester = requestedBy ? String(requestedBy).trim() : null;

      const { data: inserted, error: pcErr } = await sb
        .from('petty_cash')
        .insert({
          school_id: schoolId,
          receipt_number: receiptNumber,
          category,
          amount: numAmount,
          type: type === 'Inflow' ? 'replenishment' : 'disbursement',
          description: String(description).trim(),
          recipient: requester,
          requested_by: requester,
          approved_by: actor.actorName,
          recorded_by_id: actor.userId,
          recorded_by_role: actor.actorRoleLabel,
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (pcErr) throw pcErr;

      try {
        await sb.from('audit_logs').insert({
          school_id: schoolId,
          actor_id: actor.userId,
          actor_name: actor.actorName,
          actor_role: actor.actorRoleLabel,
          action: 'finance.petty_cash_logged',
          resource_type: 'petty_cash',
          resource_id: inserted.id,
          metadata: {
            actorName: actor.actorName,
            actorRole: actor.actorRoleLabel,
            receiptNumber,
            category,
            amount: numAmount,
            type,
            description,
            summary: `Petty cash ${type === 'Inflow' ? 'replenishment' : 'disbursement'} ${receiptNumber} (NGN ${numAmount.toLocaleString()}) logged by ${actor.actorName}`,
          },
        });
      } catch {}

      return NextResponse.json({ success: true, data: inserted });
    }

    if (action === 'approve_payroll') {
      // Persist payroll disbursement to payroll_runs and payroll_run_items so it survives reloads (DEF-111, DEF-112)
      const [schoolRes, staffRes] = await Promise.all([
        sb.from('schools').select('id, settings').eq('id', schoolId).maybeSingle(),
        sb.from('staff_profiles').select('*').eq('is_active', true).order('created_at', { ascending: true }),
      ]);

      const settings = schoolRes.data?.settings || {};
      const salaryScales = resolveSalaryScales(settings);

      const currentTermName = settings.currentTerm || 'First Term';
      const academicSessionName = settings.academicSession || '2026/2027';
      const payPeriod = body.payPeriod || `${currentTermName} ${academicSessionName}`;
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const staffBankMap = (settings.staffBankAccounts as Record<string, any>) || {};
      const staffDeductionsMap = (settings.staffDeductions as Record<string, any>) || {};

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      const computedItems = (staffRes.data || []).filter(isOnPayroll).map((st: any) => {
        const pay = computeStaffPay(st, salaryScales, staffDeductionsMap[st.id]);

        totalGross += pay.grossSalary;
        totalDeductions += pay.taxDeduction + pay.cooperativeDeduction;
        totalNet += pay.netSalary;

        const staffBank = staffBankMap[st.id] || null;

        return {
          school_id: schoolId,
          staff_id: st.id,
          employee_id: st.employee_id || '—',
          staff_name: `${st.first_name || ''} ${st.last_name || ''}`.trim(),
          role: pay.roleName,
          basic_salary: pay.basicSalary,
          responsibility_allowance: pay.responsibilityAllowance,
          other_allowances: pay.otherAllowances,
          tax_deduction: pay.taxDeduction,
          cooperative_deduction: pay.cooperativeDeduction,
          net_salary: pay.netSalary,
          bank_name: staffBank?.bankName || st.bank_name || '—',
          bank_account: staffBank?.accountNumber || st.bank_account || '—',
          status: 'Approved & Disbursed',
        };
      });

      // Totals come only from the server's own calculation, never from the request body
      if (computedItems.length === 0) {
        return NextResponse.json(
          { success: false, message: 'No active staff on the payroll to approve.' },
          { status: 422 }
        );
      }
      const finalTotalNet = totalNet;
      const finalStaffCount = computedItems.length;

      const { data: runRow, error: runErr } = await sb
        .from('payroll_runs')
        .upsert(
          {
            school_id: schoolId,
            pay_period: payPeriod,
            month: currentMonth,
            year: currentYear,
            total_gross: totalGross,
            total_deductions: totalDeductions,
            total_net: finalTotalNet,
            staff_count: finalStaffCount,
            status: 'Approved & Disbursed',
            authorized_by_id: actor.userId,
            authorized_by_name: actor.actorName,
            authorized_by_role: actor.actorRoleLabel,
            authorized_at: new Date().toISOString(),
          },
          { onConflict: 'school_id,pay_period,month,year' }
        )
        .select()
        .single();

      if (runErr) throw runErr;

      if (runRow && computedItems.length > 0) {
        const itemsWithRunId = computedItems.map((item: any) => ({
          ...item,
          payroll_run_id: runRow.id,
        }));
        const { error: itemsErr } = await sb
          .from('payroll_run_items')
          .upsert(itemsWithRunId, { onConflict: 'payroll_run_id,staff_id' });
        if (itemsErr) throw itemsErr;
      }

      try {
        await sb.from('audit_logs').insert({
          school_id: schoolId,
          actor_id: actor.userId,
          actor_name: actor.actorName,
          actor_role: actor.actorRoleLabel,
          action: 'finance.payroll_authorized',
          resource_type: 'payroll',
          resource_id: runRow?.id || null,
          metadata: {
            actorName: actor.actorName,
            actorRole: actor.actorRoleLabel,
            payPeriod,
            totalGross,
            totalDeductions,
            totalAmount: finalTotalNet,
            staffCount: finalStaffCount,
            summary: `Monthly payroll (${payPeriod}) of NGN ${finalTotalNet.toLocaleString()} across ${finalStaffCount} staff members authorized by ${actor.actorName} (${actor.actorRoleLabel})`,
          },
        });
      } catch {}

      return NextResponse.json({
        success: true,
        message: 'Payroll disbursement persisted and logged to institutional audit trail',
        data: runRow,
      });
    }

    if (action === 'record_payment') {
      const {
        studentId,
        amount,
        method,
        bankRef,
        idempotencyKey,
        receivingAccount,
        payerName,
        allowOverpayment,
      } = body;

      if (!studentId || !amount) {
        return NextResponse.json({ success: false, message: 'Student ID and amount required' }, { status: 400 });
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ success: false, message: 'Valid payment amount required' }, { status: 400 });
      }

      const headerIdempotencyKey =
        request.headers.get('idempotency-key') ||
        request.headers.get('x-idempotency-key') ||
        idempotencyKey ||
        null;

      if (!headerIdempotencyKey || !String(headerIdempotencyKey).trim()) {
        return NextResponse.json(
          { success: false, message: 'Idempotency key is required for payment processing.' },
          { status: 400 }
        );
      }

      // Execute single atomic PostgreSQL transaction function (`record_fee_payment_tx`)
      const { data: rpcResult, error: rpcErr } = await sb.rpc('record_fee_payment_tx', {
        p_school_id: schoolId,
        p_student_id: studentId,
        p_amount: numAmount,
        p_payment_method: method || 'Bank Transfer',
        p_reference: bankRef ? String(bankRef).trim() : null,
        p_idempotency_key: String(headerIdempotencyKey).trim(),
        p_payer_name: payerName ? String(payerName).trim() : 'Guardian',
        p_receiving_account: receivingAccount ? String(receivingAccount).trim() : null,
        p_actor_id: actor.userId,
        p_actor_name: actor.actorName,
        p_actor_role: actor.actorRoleLabel,
        p_allow_overpayment: Boolean(allowOverpayment),
      });

      if (rpcErr) {
        const msg = rpcErr.message || '';
        if (msg.includes('DUPLICATE_REFERENCE')) {
          const cleanMsg = msg.replace(/^.*DUPLICATE_REFERENCE:\s*/, '');
          return NextResponse.json(
            { success: false, code: 'DUPLICATE_REFERENCE', message: cleanMsg },
            { status: 409 }
          );
        }
        if (msg.includes('IDEMPOTENCY_CONFLICT')) {
          const cleanMsg = msg.replace(/^.*IDEMPOTENCY_CONFLICT:\s*/, '');
          return NextResponse.json(
            { success: false, code: 'IDEMPOTENCY_CONFLICT', message: cleanMsg },
            { status: 409 }
          );
        }
        if (msg.includes('OVERPAYMENT_REJECTED')) {
          const cleanMsg = msg.replace(/^.*OVERPAYMENT_REJECTED:\s*/, '');
          return NextResponse.json(
            {
              success: false,
              code: 'OVERPAYMENT_REJECTED',
              message: cleanMsg,
            },
            { status: 422 }
          );
        }
        if (msg.includes('STUDENT_NOT_FOUND')) {
          return NextResponse.json(
            { success: false, code: 'STUDENT_NOT_FOUND', message: 'Student record not found for this school.' },
            { status: 404 }
          );
        }
        if (msg.includes('INVALID_AMOUNT')) {
          return NextResponse.json(
            { success: false, code: 'INVALID_AMOUNT', message: 'Valid payment amount required.' },
            { status: 400 }
          );
        }
        throw rpcErr;
      }

      return NextResponse.json({
        success: true,
        idempotentReplay: Boolean(rpcResult?.idempotent_replay),
        data: rpcResult?.transaction,
        account: rpcResult?.account,
      });
    }

    if (action === 'update_staff_bank') {
      const { staffId, bankName, accountNumber } = body;
      if (!staffId || !bankName || !accountNumber) {
        return NextResponse.json(
          { success: false, message: 'Missing staff ID, bank name, or account number' },
          { status: 400 }
        );
      }

      const patch = {
        staffBankAccounts: {
          [staffId]: {
            bankName: String(bankName).trim(),
            accountNumber: String(accountNumber).trim(),
            updatedAt: new Date().toISOString(),
          },
        },
      };

      const { error: rpcErr } = await sb.rpc('merge_school_settings', {
        p_school_id: schoolId,
        p_patch: patch,
      });

      if (rpcErr) {
        const { data: schoolData } = await sb
          .from('schools')
          .select('settings')
          .eq('id', schoolId)
          .single();
        const currentSettings = schoolData?.settings || {};
        const currentBankMap = { ...(currentSettings.staffBankAccounts || {}) };
        currentBankMap[staffId] = patch.staffBankAccounts[staffId];
        await sb
          .from('schools')
          .update({
            settings: { ...currentSettings, staffBankAccounts: currentBankMap },
            updated_at: new Date().toISOString(),
          })
          .eq('id', schoolId);
      }

      try {
        await sb.from('audit_logs').insert({
          school_id: schoolId,
          actor_id: actor.userId,
          actor_name: actor.actorName,
          actor_role: actor.actorRoleLabel,
          action: 'finance.staff_bank_updated',
          resource_type: 'staff_profiles',
          resource_id: staffId,
          metadata: {
            actorName: actor.actorName,
            actorRole: actor.actorRoleLabel,
            staffId,
            bankName,
            accountNumber,
            summary: `Staff bank account (${bankName} - ${accountNumber}) updated by ${actor.actorName}`,
          },
        });
      } catch {}

      return NextResponse.json({ success: true, message: 'Staff bank details updated successfully' });
    }

    if (action === 'update_staff_deductions') {
      const { staffId, taxDeduction, cooperativeDeduction } = body;
      if (!staffId) {
        return NextResponse.json({ success: false, message: 'Missing staffId' }, { status: 400 });
      }

      const patch = {
        staffDeductions: {
          [staffId]: {
            taxDeduction: Number(taxDeduction) || 0,
            cooperativeDeduction: Number(cooperativeDeduction) || 0,
            updatedAt: new Date().toISOString(),
          },
        },
      };

      const { error: rpcErr } = await sb.rpc('merge_school_settings', {
        p_school_id: schoolId,
        p_patch: patch,
      });

      if (rpcErr) {
        const { data: schoolData } = await sb
          .from('schools')
          .select('settings')
          .eq('id', schoolId)
          .single();
        const currentSettings = schoolData?.settings || {};
        const currentDeductionsMap = { ...(currentSettings.staffDeductions || {}) };
        currentDeductionsMap[staffId] = patch.staffDeductions[staffId];
        await sb
          .from('schools')
          .update({
            settings: { ...currentSettings, staffDeductions: currentDeductionsMap },
            updated_at: new Date().toISOString(),
          })
          .eq('id', schoolId);
      }

      try {
        await sb.from('audit_logs').insert({
          school_id: schoolId,
          actor_id: actor.userId,
          actor_name: actor.actorName,
          actor_role: actor.actorRoleLabel,
          action: 'finance.staff_deductions_updated',
          resource_type: 'staff_profiles',
          resource_id: staffId,
          metadata: {
            actorName: actor.actorName,
            actorRole: actor.actorRoleLabel,
            staffId,
            taxDeduction,
            cooperativeDeduction,
            summary: `Payroll deductions updated for staff member by ${actor.actorName}`,
          },
        });
      } catch {}

      return NextResponse.json({ success: true, message: 'Staff deductions updated successfully' });
    }

    if (action === 'create_bank_account') {
      const { bankName, accountNumber, accountName, accountType, balance } = body;
      if (!bankName || !accountNumber || !accountName) {
        return NextResponse.json(
          { success: false, message: 'Bank name, account number, and account name are required' },
          { status: 400 }
        );
      }

      const { data: insertedBank, error: bankErr } = await sb
        .from('bank_accounts')
        .insert({
          school_id: schoolId,
          bank_name: String(bankName).trim(),
          account_number: String(accountNumber).trim(),
          account_name: String(accountName).trim(),
          account_type: accountType || 'Current Account',
          currency: 'NGN',
          balance: Number(balance || 0),
          is_active: true,
        })
        .select()
        .single();

      if (bankErr) throw bankErr;

      try {
        await sb.from('audit_logs').insert({
          school_id: schoolId,
          actor_id: actor.userId,
          actor_name: actor.actorName,
          actor_role: actor.actorRoleLabel,
          action: 'finance.bank_account_created',
          resource_type: 'bank_accounts',
          resource_id: insertedBank.id,
          metadata: {
            actorName: actor.actorName,
            actorRole: actor.actorRoleLabel,
            bankName,
            accountNumber,
            accountName,
            accountType,
            summary: `Institutional bank account ${bankName} (${accountNumber}) added by ${actor.actorName}`,
          },
        });
      } catch {}

      return NextResponse.json({ success: true, data: insertedBank });
    }

    return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Finance processing error' },
      { status: 500 }
    );
  }
}
