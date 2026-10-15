'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardTitle, CardDescription, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Wallet,
  Download,
  AlertCircle,
  CheckCircle2,
  Receipt,
  FileText,
  TrendingUp,
  TrendingDown,
  Plus,
  Printer,
  Search,
  Users,
  Check,
  Fuel,
  Cpu,
  BookOpen,
  ShoppingBag,
} from 'lucide-react';
import {
  PayrollRecord,
  ExpenditureRecord,
  PettyCashTransaction,
  StudentFeeLedgerItem,
  PaymentTransaction,
} from '@/types/finance';
import { formatNaira } from '@/lib/finance-data';
import { PayslipModal } from '@/components/finance/PayslipModal';
import { ReceiptModal } from '@/components/finance/ReceiptModal';
import { VoucherModal } from '@/components/finance/VoucherModal';
import { SalaryAdjustmentModal } from '@/components/finance/SalaryAdjustmentModal';
import { PettyCashModal } from '@/components/finance/PettyCashModal';

const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'] as const;

export default function ProprietorFinancesPage() {
  const [activeTab, setActiveTab] = useState<'tuition' | 'payroll' | 'expenditures' | 'pettycash'>('tuition');
  const [loading, setLoading] = useState(true);

  // Master State
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [expenditures, setExpenditures] = useState<ExpenditureRecord[]>([]);
  const [pettyCash, setPettyCash] = useState<PettyCashTransaction[]>([]);
  const [studentLedger, setStudentLedger] = useState<StudentFeeLedgerItem[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [tuitionRates, setTuitionRates] = useState({
    jss: 185000,
    ss12: 220000,
    ss3: 240000,
  });

  // Search & Filter States
  const [payrollSearch, setPayrollSearch] = useState('');
  const [payrollDeptFilter, setPayrollDeptFilter] = useState<string>('All');
  const [studentClassFilter, setStudentClassFilter] = useState<string>('All');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('All');
  const [studentSearch, setStudentSearch] = useState('');

  // Modals State
  const [activePayslip, setActivePayslip] = useState<PayrollRecord | null>(null);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<PaymentTransaction | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<ExpenditureRecord | null>(null);
  const [adjustingStaff, setAdjustingStaff] = useState<PayrollRecord | null>(null);
  const [isPettyCashModalOpen, setIsPettyCashModalOpen] = useState(false);
  const [isNewVoucherModalOpen, setIsNewVoucherModalOpen] = useState(false);

  // New Voucher Form
  const [voucherCategory, setVoucherCategory] = useState<ExpenditureRecord['category']>('Diesel & Power');
  const [voucherDesc, setVoucherDesc] = useState('');
  const [voucherAmount, setVoucherAmount] = useState('');
  const [voucherBeneficiary, setVoucherBeneficiary] = useState('');
  const [voucherAccount, setVoucherAccount] = useState<ExpenditureRecord['paymentAccount']>('GTBank Operations (0123984712)');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadData = async () => {
    try {
      const res = await fetch('/api/finances');
      const json = await res.json();
      if (json.success && json.data) {
        setStudentLedger(json.data.studentLedger || []);
        setPayrollRecords(json.data.payrollRecords || []);
        setExpenditures(json.data.expenditures || []);
        setPettyCash(json.data.pettyCash || []);
        setPayments(json.data.payments || []);
        if (json.data.tuitionRates) setTuitionRates(json.data.tuitionRates);
      }
    } catch (err) {
      console.error('Failed to load finances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Class Breakdown Calculations
  const classBreakdowns = CLASSES.map((cls) => {
    const feePerStudent = cls.startsWith('JSS')
      ? tuitionRates.jss
      : cls === 'SS 3'
      ? tuitionRates.ss3
      : tuitionRates.ss12;

    const classStudents = studentLedger.filter((s) => s.class === cls);
    const enrolled = classStudents.length;
    const expected = enrolled * feePerStudent;
    const collected = classStudents.reduce((acc, s) => acc + s.amountPaid, 0);
    const outstanding = Math.max(0, expected - collected);
    const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    return {
      class: cls,
      feePerStudent,
      enrolled,
      expected,
      collected,
      outstanding,
      pct,
    };
  });

  // Overall Financial Totals
  const totalExpectedRevenue = classBreakdowns.reduce((a, b) => a + b.expected, 0);
  const totalCollectedRevenue = classBreakdowns.reduce((a, b) => a + b.collected, 0);
  const totalOutstandingTuition = classBreakdowns.reduce((a, b) => a + b.outstanding, 0);
  const collectionPct = totalExpectedRevenue > 0 ? Math.round((totalCollectedRevenue / totalExpectedRevenue) * 100) : 0;
  const defaulterCount = studentLedger.filter((s) => s.balance > 0).length;

  const monthlyPayrollTotal = payrollRecords.reduce((a, b) => a + b.netSalary, 0);
  const totalExpendituresLogged = expenditures.reduce((a, b) => a + b.amount, 0);

  // Category Totals for OpEx
  const dieselTotal = expenditures.filter((e) => e.category === 'Diesel & Power').reduce((a, b) => a + b.amount, 0);
  const scienceTotal = expenditures.filter((e) => e.category === 'Science & Laboratories').reduce((a, b) => a + b.amount, 0);
  const ictTotal = expenditures.filter((e) => e.category === 'ICT & Fiber Internet').reduce((a, b) => a + b.amount, 0);
  const stationeryTotal = expenditures.filter((e) => e.category === 'Stationery & Exam Booklets').reduce((a, b) => a + b.amount, 0);

  // Handlers
  const handleSaveSalaryAdjustment = (updated: PayrollRecord) => {
    setPayrollRecords(payrollRecords.map((r) => (r.id === updated.id ? updated : r)));
    setAdjustingStaff(null);
    showToast(`Compensation package updated for ${updated.name}. New Net Pay: ${formatNaira(updated.netSalary)}`);
  };

  const handleApprovePayroll = async () => {
    try {
      await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_payroll',
          totalAmount: monthlyPayrollTotal,
          staffCount: payrollRecords.length,
        }),
      });
      showToast(`Monthly Payroll (${formatNaira(monthlyPayrollTotal)}) authorized across ${payrollRecords.length} staff members.`);
    } catch {
      showToast(`Monthly Payroll authorized.`);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(voucherAmount) || 0;
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_voucher',
          category: voucherCategory,
          description: voucherDesc,
          amount: amt,
          vendor: voucherBeneficiary,
          paymentAccount: voucherAccount,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsNewVoucherModalOpen(false);
        setVoucherDesc('');
        setVoucherAmount('');
        setVoucherBeneficiary('');
        showToast(`Expenditure voucher (${formatNaira(amt)}) recorded successfully.`);
        await loadData();
      } else {
        alert(json.message || 'Failed to record voucher');
      }
    } catch {
      alert('Network error while saving expenditure voucher');
    }
  };

  const handleRecordPettyCash = async (tx: PettyCashTransaction) => {
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_petty_cash',
          description: tx.item,
          amount: tx.amount,
          type: tx.type,
          requestedBy: tx.requestedBy,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsPettyCashModalOpen(false);
        showToast(`Petty cash ${tx.type.toLowerCase()} of ${formatNaira(tx.amount)} recorded.`);
        await loadData();
      }
    } catch {
      alert('Network error while recording petty cash');
    }
  };

  const downloadBankSchedule = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Employee ID,Staff Name,Role,Bank Name,Account Number,Net Disbursed (NGN)\n' +
      payrollRecords
        .map(
          (r) =>
            `"${r.employeeId}","${r.name}","${r.role}","${r.bankName}","${r.bankAccount}",${r.netSalary}`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Oakland_Schools_NIP_Bank_Transfer_Schedule.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CBN NIP Bulk Bank Payment schedule downloaded.');
  };

  // Filtered Payroll
  const filteredPayroll = payrollRecords.filter((rec) => {
    const matchesSearch =
      rec.name.toLowerCase().includes(payrollSearch.toLowerCase()) ||
      rec.employeeId.toLowerCase().includes(payrollSearch.toLowerCase()) ||
      rec.role.toLowerCase().includes(payrollSearch.toLowerCase());
    const matchesDept = payrollDeptFilter === 'All' || rec.department === payrollDeptFilter;
    return matchesSearch && matchesDept;
  });

  // Filtered Students
  const filteredStudents = studentLedger.filter((stu) => {
    const matchesSearch =
      stu.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      stu.admissionNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
      stu.parentName.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass = studentClassFilter === 'All' || stu.class === studentClassFilter;
    const matchesStatus = studentStatusFilter === 'All' || stu.status === studentStatusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Finances & Fee Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional fee collection, class billing summaries, staff payroll roster, and operating expenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/proprietor/settings">
            <Button size="sm" variant="outline" className="text-xs font-semibold text-slate-700 hover:text-slate-900">
              Configure Tuition Fees
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-800 hover:text-emerald-950 font-bold text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Realistic Executive Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expected Tuition */}
        <Card className="p-5 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Expected Term Tuition
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0f3a3e] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            {formatNaira(totalExpectedRevenue)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Billed across {studentLedger.length} enrolled pupils
          </p>
        </Card>

        {/* Collected Tuition */}
        <Card className="p-5 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Collected Tuition
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 tracking-tight mt-2">
            {formatNaira(totalCollectedRevenue)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {collectionPct}% collection rate achieved
          </p>
        </Card>

        {/* Outstanding Balance */}
        <Card className="p-5 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Outstanding Fee Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#b3141f] flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#b3141f] tracking-tight mt-2">
            {formatNaira(totalOutstandingTuition)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {defaulterCount} pupils with pending balances
          </p>
        </Card>

        {/* Total Expenditures Logged */}
        <Card className="p-5 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              School Operating Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 tracking-tight mt-2">
            {formatNaira(totalExpendituresLogged)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {expenditures.length} approved expense vouchers
          </p>
        </Card>
      </div>

      {/* Clean Navigation Tabs */}
      <div className="flex flex-wrap items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('tuition')}
          className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'tuition'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-400" />
          <span>Tuition Fees</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'payroll'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>Staff Salaries & Payroll ({payrollRecords.length} Staff)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenditures')}
          className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'expenditures'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-rose-400" />
          <span>School Operating Expenditures</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pettycash')}
          className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'pettycash'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4 text-amber-400" />
          <span>Petty Cash Book</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: TUITION FEES                                                  */}
      {/* ==================================================================== */}
      {activeTab === 'tuition' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tuition Billing & Class Performance
              </h2>
              <p className="text-xs text-slate-500">
                Term tuition schedules across the 6 classes (JSS 1 to SS 3). Fee amounts are configurable in School Settings.
              </p>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Fee Recording Authority: <strong className="text-slate-800">School Bursar</strong>
            </div>
          </div>

          {/* Class Breakdown Grid */}
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Class-by-Class Revenue Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0f3a3e] text-white font-bold">
                  <tr>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4 text-center">Fee per Student</th>
                    <th className="py-3 px-4 text-center">Enrolled</th>
                    <th className="py-3 px-4 text-right">Expected Revenue</th>
                    <th className="py-3 px-4 text-right">Collected Revenue</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4 text-center">Collection %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {classBreakdowns.map((row) => (
                    <tr key={row.class} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-900 text-sm">{row.class}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        {formatNaira(row.feePerStudent)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800 font-mono">
                        {row.enrolled} Pupils
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                        {formatNaira(row.expected)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatNaira(row.collected)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#b3141f]">
                        {formatNaira(row.outstanding)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                          <span className="font-bold text-[11px] text-slate-700">{row.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Student Billing & Defaulter Ledger */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search students by name, admission number, or guardian..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <select
                value={studentClassFilter}
                onChange={(e) => setStudentClassFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 cursor-pointer"
              >
                <option value="All">All Classes</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={studentStatusFilter}
                onChange={(e) => setStudentStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 cursor-pointer"
              >
                <option value="All">All Payment Statuses</option>
                <option value="Fully Paid">Fully Paid</option>
                <option value="Partial Payment">Partial Payment</option>
                <option value="Defaulter">Defaulters (Zero Paid)</option>
              </select>
            </div>

            <Card className="border-slate-200 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Student Fee Status Register ({filteredStudents.length} Students)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Track individual fee compliance and inspect official Bursary payment receipts
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No student fee records match your search or filter criteria.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#0f3a3e] text-white font-bold">
                      <tr>
                        <th className="py-2.5 px-4">Student & ID</th>
                        <th className="py-2.5 px-3 text-center">Class</th>
                        <th className="py-2.5 px-4">Guardian</th>
                        <th className="py-2.5 px-3 text-right">Term Bill</th>
                        <th className="py-2.5 px-3 text-right">Amount Paid</th>
                        <th className="py-2.5 px-3 text-right">Balance Due</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-4 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredStudents.map((stu) => {
                        const matchedPayment = payments.find((p) => p.admissionNo === stu.admissionNo);

                        return (
                          <tr key={stu.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-extrabold text-slate-900">{stu.studentName}</p>
                              <p className="text-[10px] text-teal-800 font-mono">{stu.admissionNo}</p>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-800">
                              {stu.class}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-800">{stu.parentName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{stu.parentPhone}</p>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-700">
                              {formatNaira(stu.totalBilled)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatNaira(stu.amountPaid)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-[#b3141f]">
                              {formatNaira(stu.balance)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  stu.status === 'Fully Paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : stu.status === 'Partial Payment'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {stu.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {matchedPayment ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setActiveReceiptPayment(matchedPayment)}
                                  className="h-7 px-2 text-[10px] font-bold text-teal-800 border-teal-300 hover:bg-teal-50 cursor-pointer"
                                >
                                  <Receipt className="w-3 h-3 mr-1" />
                                  Receipt
                                </Button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No receipt</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: STAFF SALARIES & PAYROLL MANAGEMENT                            */}
      {/* ==================================================================== */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Staff Salaries & Compensation Management
              </h2>
              <p className="text-xs text-slate-500">
                Monthly Payroll &bull; Appointed Class Teachers receive <strong>+₦35,000 Monthly Responsibility Allowance</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadBankSchedule}
                disabled={payrollRecords.length === 0}
                className="text-xs border-slate-300 font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export CBN NIP Schedule
              </Button>
              <Button
                type="button"
                onClick={handleApprovePayroll}
                disabled={payrollRecords.length === 0}
                className="bg-[#0f3a3e] hover:bg-[#164e53] text-white shadow-xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Authorize & Disburse Monthly Payroll</span>
              </Button>
            </div>
          </div>

          {/* Search & Department Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search staff by name, ID (e.g. OAK-PRN-001), or role..."
                value={payrollSearch}
                onChange={(e) => setPayrollSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <select
              value={payrollDeptFilter}
              onChange={(e) => setPayrollDeptFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 cursor-pointer"
            >
              <option value="All">All Departments</option>
              <option value="Academic">Academic Faculty</option>
              <option value="Administration">Administration</option>
              <option value="Accounts">Accounts</option>
            </select>
          </div>

          {/* Payroll Table */}
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Faculty & Staff Compensation Roster ({filteredPayroll.length} Personnel)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Basic pay, responsibility allowances, statutory PAYE tax (5%), and net disbursement
                </CardDescription>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded">
                Monthly Net Total: {formatNaira(monthlyPayrollTotal)}
              </span>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {filteredPayroll.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No staff records found in the directory. Staff appointed in Staff Directory will appear here automatically.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0f3a3e] text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Staff Member & ID</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3 text-right">Basic Pay</th>
                      <th className="py-2.5 px-3 text-right">Allowances</th>
                      <th className="py-2.5 px-3 text-right">Deductions</th>
                      <th className="py-2.5 px-4 text-right bg-[#092528]">Net Disbursed</th>
                      <th className="py-2.5 px-4">Bank Details</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredPayroll.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-extrabold text-slate-900">{rec.name}</p>
                          <p className="text-[10px] text-teal-800 font-mono">{rec.employeeId}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-800">{rec.role}</p>
                          <p className="text-[10px] text-slate-400">{rec.department}</p>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatNaira(rec.basicSalary)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                          +{formatNaira(rec.responsibilityAllowance + rec.otherAllowances)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-600">
                          -{formatNaira(rec.taxDeduction + (rec.cooperativeDeduction || 0))}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-50">
                          {formatNaira(rec.netSalary)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{rec.bankName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{rec.bankAccount}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setActivePayslip(rec)}
                              className="h-7 px-2 text-[10px] font-bold text-teal-800 border-teal-300 hover:bg-teal-50 cursor-pointer"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Payslip
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setAdjustingStaff(rec)}
                              className="h-7 px-2 text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: SCHOOL OPERATING EXPENDITURES (OPEX)                           */}
      {/* ==================================================================== */}
      {activeTab === 'expenditures' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                School Operating Overhead & Expenditures
              </h2>
              <p className="text-xs text-slate-500">
                Diesel fuel, science laboratory reagents, ICT bandwidth, facility maintenance, and examination booklets.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setIsNewVoucherModalOpen(true)}
              className="bg-[#0f3a3e] hover:bg-[#164e53] text-white shadow-xs text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expenditure Voucher</span>
            </Button>
          </div>

          {/* Dynamic Expenditure Category Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Diesel & Power</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">{formatNaira(dieselTotal)}</p>
                <p className="text-[9px] text-slate-400">Campus Generators</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Fuel className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Science Labs</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">{formatNaira(scienceTotal)}</p>
                <p className="text-[9px] text-slate-400">Chemicals & Kits</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">ICT & Fiber</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">{formatNaira(ictTotal)}</p>
                <p className="text-[9px] text-slate-400">Network & Bandwidth</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Stationery & Exams</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">{formatNaira(stationeryTotal)}</p>
                <p className="text-[9px] text-slate-400">Assessment Materials</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Expenditures Ledger */}
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Approved Expenditure Vouchers Log ({expenditures.length} Vouchers)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Operational expense vouchers authorized and debited for school utilities
                </CardDescription>
              </div>
              <span className="text-xs font-bold text-slate-800 font-mono">
                Total: {formatNaira(totalExpendituresLogged)}
              </span>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {expenditures.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No expenditure vouchers recorded yet. Approved school expense vouchers will appear here.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0f3a3e] text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Voucher No & Date</th>
                      <th className="py-2.5 px-3">Expense Category</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-3">Beneficiary Vendor</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3">Debited Account</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-4 text-center">Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {expenditures.map((vch) => (
                      <tr key={vch.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-slate-800">{vch.voucherNo}</p>
                          <p className="text-[10px] text-slate-400">{vch.date}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            {vch.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                          {vch.description}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {vch.beneficiary}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-rose-700 text-sm">
                          {formatNaira(vch.amount)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[10px] text-slate-600">
                          {vch.paymentAccount}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {vch.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveVoucher(vch)}
                            className="h-7 px-2.5 text-[10px] font-bold text-slate-800 border-slate-300 hover:bg-slate-100 cursor-pointer"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: PETTY CASH BOOK                                                */}
      {/* ==================================================================== */}
      {activeTab === 'pettycash' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daily Petty Cash Book
              </h2>
              <p className="text-xs text-slate-500">
                Campus petty cash float for minor emergency repairs, local transport, and consumables.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setIsPettyCashModalOpen(true)}
              className="bg-[#0f3a3e] hover:bg-[#164e53] text-white shadow-xs text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Cash Transaction</span>
            </Button>
          </div>

          {/* Current Float Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Available Float</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatNaira(pettyCash.length > 0 ? pettyCash[0].balanceAfter : 0)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {pettyCash.length} transactions recorded in current term
              </p>
            </Card>

            <Card className="p-4 border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Custodian & Cashier</span>
              <p className="text-sm font-extrabold text-slate-900 mt-1.5">School Bursar</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Bursary Department</p>
            </Card>
          </div>

          {/* Petty Cash Table */}
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Petty Cash Journal Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {pettyCash.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No petty cash transactions recorded yet.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0f3a3e] text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Receipt No & Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-4">Item & Purpose</th>
                      <th className="py-2.5 px-3">Requested By</th>
                      <th className="py-2.5 px-3 text-right">Inflow (₦)</th>
                      <th className="py-2.5 px-3 text-right">Outflow (₦)</th>
                      <th className="py-2.5 px-4 text-right">Balance (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pettyCash.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-slate-900">{tx.receiptNo}</p>
                          <p className="text-[10px] text-slate-400">{tx.date}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-sm">
                          {tx.item}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {tx.requestedBy}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                          {tx.type === 'Inflow' ? `+${formatNaira(tx.amount)}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-700 font-bold">
                          {tx.type === 'Outflow' ? `-${formatNaira(tx.amount)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                          {formatNaira(tx.balanceAfter)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS                                                               */}
      {/* ==================================================================== */}

      {/* 1. Official Payslip Modal */}
      <PayslipModal
        record={activePayslip}
        onClose={() => setActivePayslip(null)}
      />

      {/* 2. Official Stamped Fee Receipt Modal */}
      <ReceiptModal
        payment={activeReceiptPayment}
        studentItem={
          activeReceiptPayment
            ? studentLedger.find((s) => s.admissionNo === activeReceiptPayment.admissionNo) || null
            : null
        }
        onClose={() => setActiveReceiptPayment(null)}
      />

      {/* 3. Official Payment Voucher Modal */}
      <VoucherModal
        voucher={activeVoucher}
        onClose={() => setActiveVoucher(null)}
      />

      {/* 4. Salary Adjustment Modal */}
      <SalaryAdjustmentModal
        record={adjustingStaff}
        onSave={handleSaveSalaryAdjustment}
        onClose={() => setAdjustingStaff(null)}
      />

      {/* 5. Petty Cash Transaction Modal */}
      {isPettyCashModalOpen && (
        <PettyCashModal
          currentBalance={pettyCash.length > 0 ? pettyCash[0].balanceAfter : 0}
          onRecord={handleRecordPettyCash}
          onClose={() => setIsPettyCashModalOpen(false)}
        />
      )}

      {/* 6. Create New Expenditure Voucher Modal */}
      {isNewVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-lg border-slate-200 shadow-2xl bg-white rounded-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-900 text-white flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white">
                  Record New School Operating Expenditure
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-300">
                  Log expense voucher for diesel, laboratories, ICT, or repairs
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setIsNewVoucherModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </CardHeader>

            <form onSubmit={handleCreateVoucher}>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Expenditure Category
                  </label>
                  <select
                    value={voucherCategory}
                    onChange={(e) => setVoucherCategory(e.target.value as ExpenditureRecord['category'])}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 cursor-pointer"
                    required
                  >
                    <option value="Diesel & Power">Diesel Fuel & Campus Generators</option>
                    <option value="Science & Laboratories">Science Laboratory Reagents & Kits</option>
                    <option value="ICT & Fiber Internet">ICT, Dedicated Fiber Link & Starlink</option>
                    <option value="Stationery & Exam Booklets">Continuous Assessment & Exam Booklets</option>
                    <option value="Facility Maintenance & HVAC">Facility Repairs, AC Servicing & Plumbing</option>
                    <option value="Clinic & Health Supplies">Campus Clinic & First Aid Restocking</option>
                    <option value="Security & Sanitation">Security Equipment & Campus Sanitation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Beneficiary Vendor
                  </label>
                  <Input
                    required
                    value={voucherBeneficiary}
                    onChange={(e) => setVoucherBeneficiary(e.target.value)}
                    placeholder="e.g. TotalEnergies Nigeria, May & Baker Lab Supplies..."
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Description & Operational Purpose
                  </label>
                  <Input
                    required
                    value={voucherDesc}
                    onChange={(e) => setVoucherDesc(e.target.value)}
                    placeholder="e.g. Purchase of 2,000L AGO Diesel for campus generators"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Amount (NGN)
                    </label>
                    <Input
                      required
                      type="number"
                      min="1000"
                      value={voucherAmount}
                      onChange={(e) => setVoucherAmount(e.target.value)}
                      placeholder="e.g. 1500000"
                      className="h-9 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Payment Account
                    </label>
                    <select
                      value={voucherAccount}
                      onChange={(e) => setVoucherAccount(e.target.value as ExpenditureRecord['paymentAccount'])}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 cursor-pointer"
                      required
                    >
                      <option value="GTBank Operations (0123984712)">GTBank Operations</option>
                      <option value="Petty Cash Desk">Campus Petty Cash Desk</option>
                      <option value="Zenith Bank (1019283741)">Zenith Bank</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsNewVoucherModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold cursor-pointer"
                  >
                    Authorize Voucher
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
