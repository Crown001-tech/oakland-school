'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardTitle, CardDescription, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Wallet,
  TrendingUp,
  Receipt,
  Users,
  CheckCircle2,
  FileText,
  ShoppingBag,
  ChevronRight,
  AlertCircle,
  CreditCard,
  Plus,
  Megaphone,
} from 'lucide-react';
import {
  PayrollRecord,
  ExpenditureRecord,
  PettyCashTransaction,
  ClassFinancial,
  StudentFeeLedgerItem,
  PaymentTransaction,
} from '@/types/finance';
import { formatNaira } from '@/lib/finance-data';
import { ReceiptModal } from '@/components/finance/ReceiptModal';
import { VoucherModal } from '@/components/finance/VoucherModal';
import { RecordFeePaymentModal } from '@/components/finance/RecordFeePaymentModal';
import { PettyCashModal } from '@/components/finance/PettyCashModal';

export default function BursarDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [bursarName, setBursarName] = useState('Mrs Folake Esther');
  const [employeeId, setEmployeeId] = useState('OAK-BUR-001');

  // Real Database Financial State
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [expenditures, setExpenditures] = useState<ExpenditureRecord[]>([]);
  const [pettyCash, setPettyCash] = useState<PettyCashTransaction[]>([]);
  const [students, setStudents] = useState<StudentFeeLedgerItem[]>([]);
  const [classBreakdowns, setClassBreakdowns] = useState<ClassFinancial[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [staffBroadcasts, setStaffBroadcasts] = useState<any[]>([]);

  // Modals
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<PaymentTransaction | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<ExpenditureRecord | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isPettyCashModalOpen, setIsPettyCashModalOpen] = useState(false);

  // Fetch Live Finances from Database
  const loadFinances = async () => {
    try {
      const [authRes, finRes, bcRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/finances'),
        fetch('/api/staff/broadcasts'),
      ]);

      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData?.authenticated && authData.profile?.name) {
          setBursarName(authData.profile.name);
          if (authData.profile.employeeId) setEmployeeId(authData.profile.employeeId);
        }
      }

      if (finRes.ok) {
        const finData = await finRes.json();
        if (finData?.success && finData.data) {
          const d = finData.data;
          setPayments(d.payments || []);
          setExpenditures(d.expenditures || []);
          setPettyCash(d.pettyCash || []);
          setStudents(d.studentLedger || []);
          setClassBreakdowns(d.classBreakdowns || []);
          setPayrollRecords(d.payrollRecords || []);
          if (d.institutionalBankAccounts) setBankAccounts(d.institutionalBankAccounts);
        }
      }

      if (bcRes.ok) {
        const bcData = await bcRes.json();
        if (bcData?.success && Array.isArray(bcData.data)) {
          const relevant = bcData.data.filter(
            (b: any) =>
              b.audience === 'All Staff' ||
              b.audience === 'Administration' ||
              b.audience === 'Support Staff'
          );
          setStaffBroadcasts(relevant);
        }
      }
    } catch {
      // Clean fallback: state remains empty arrays
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinances();
  }, []);

  // Dynamic KPI Calculations from Live Database Records
  const totalExpected = classBreakdowns.reduce((acc, c) => acc + (c.expected || 0), 0);
  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const unpaidStudents = students.filter((s) => s.balance > 0);
  const totalOutstanding = unpaidStudents.reduce((acc, s) => acc + s.balance, 0);
  const collectionRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0.0';

  const monthlyPayrollTotal = payrollRecords.reduce((acc, r) => acc + (r.basicSalary + r.responsibilityAllowance), 0);
  const activeStaffCount = payrollRecords.length;

  // Running Float from Live Petty Cash
  const currentFloatBalance = pettyCash.length > 0 ? pettyCash[0].balanceAfter : 0;

  const handlePaymentRecorded = (newPay: PaymentTransaction, updatedStudent: StudentFeeLedgerItem) => {
    setPayments((prev) => [newPay, ...prev]);
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
    setIsRecordPaymentOpen(false);
    setActiveReceiptPayment(newPay);
  };

  const handleRecordPettyCash = (tx: PettyCashTransaction) => {
    setPettyCash((prev) => [tx, ...prev]);
    setIsPettyCashModalOpen(false);
  };

  if (isLoading) {
    return <BrandLoader fullScreen size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Executive Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-white via-slate-50/70 to-teal-50/30 border border-slate-200/80 p-6 sm:p-8 shadow-xs overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200">
                Staff ID: {employeeId}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome, {bursarName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              School financial records, fee tracking, staff salaries, and expense management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="text-xs font-bold gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>Record Fee Payment</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsPettyCashModalOpen(true)}
              className="text-xs font-semibold gap-1.5"
            >
              <Wallet className="w-4 h-4 text-slate-600" />
              <span>Record Petty Cash</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Dynamic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fees Collected */}
        <Card className="p-4 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Fees Collected
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight mt-2">
            {formatNaira(totalCollected)}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            {collectionRate}% collection rate
          </p>
        </Card>

        {/* Outstanding Fees */}
        <Card className="p-4 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Outstanding Fees
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-700 tracking-tight mt-2">
            {formatNaira(totalOutstanding)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {unpaidStudents.length} {unpaidStudents.length === 1 ? 'student' : 'students'} with unpaid balance
          </p>
        </Card>

        {/* Monthly Salaries */}
        <Card className="p-4 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Monthly Salaries
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight mt-2">
            {formatNaira(monthlyPayrollTotal)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {activeStaffCount} active staff members
          </p>
        </Card>

        {/* Petty Cash Float */}
        <Card className="p-4 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Cash Float
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight mt-2">
            {formatNaira(currentFloatBalance)}
          </p>
          <p className="text-[11px] text-teal-700 font-semibold mt-1">
            {pettyCash.length > 0 ? 'Active float balance in safe' : 'No cash float entries'}
          </p>
        </Card>
      </div>

      {/* Class Fee Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Class Fee Summary
            </h2>
            <p className="text-xs text-slate-500">
              Term tuition expectations and collections across classes
            </p>
          </div>
          <Link
            href="/bursar/fees"
            className="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1"
          >
            <span>Manage All Fees</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {classBreakdowns.map((cls) => {
            const classStudents = students.filter((s) => s.class === cls.class);
            const classCollected = payments
              .filter((p) => classStudents.some((s) => s.admissionNo === p.admissionNo))
              .reduce((sum, p) => sum + p.amount, 0);
            const pct = cls.expected > 0 ? Math.min(100, Math.round((classCollected / cls.expected) * 100)) : 0;

            return (
              <Card key={cls.class} className="p-3 border-slate-200 shadow-xs bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{cls.class}</span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {classStudents.length} {classStudents.length === 1 ? 'student' : 'students'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-slate-800">
                    {formatNaira(cls.feePerStudent)}
                  </p>
                  <p className="text-[9px] text-slate-400">per student</p>
                </div>
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Collected:</span>
                    <span className="font-semibold text-emerald-700">{formatNaira(classCollected)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>{pct}% paid</span>
                    <span>Bal: {formatNaira(Math.max(0, cls.expected - classCollected))}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Official Staff Broadcasts & Notices */}
      <Card className="border-teal-200/80 bg-teal-50/15 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-teal-100/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#0f3a3e]" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Official Staff Notices
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Directives and communications from the Office of the Proprietor
              </CardDescription>
            </div>
          </div>
          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
            {staffBroadcasts.length} {staffBroadcasts.length === 1 ? 'Notice' : 'Notices'}
          </span>
        </CardHeader>
        <CardContent className="pt-4">
          {staffBroadcasts.length === 0 ? (
            <div className="py-6 text-center text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-600">No New Staff Notices</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official executive directives and staff memos will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {staffBroadcasts.map((bc) => (
                <div
                  key={bc.id}
                  className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 line-clamp-1">{bc.title}</span>
                      <span className="text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {bc.priority || 'Notice'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                      {bc.message}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-teal-800">{bc.senderName}</span>
                    <span>{bc.dispatchedAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Column Layout: Recent Payments vs Recent Expense Vouchers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Fee Payments */}
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Recent Fee Payments
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Verified deposits and official receipts
              </CardDescription>
            </div>
            <Link
              href="/bursar/fees"
              className="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Student and Receipt</th>
                  <th className="py-2.5 px-2 text-center">Class</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      <Receipt className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                      <p className="font-semibold text-slate-600 text-xs">No Fee Payments Recorded Yet</p>
                      <p className="text-[10px] text-slate-400">
                        Click &quot;Record Fee Payment&quot; above to issue a student receipt.
                      </p>
                    </td>
                  </tr>
                ) : (
                  payments.slice(0, 5).map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{pay.studentName}</p>
                        <p className="text-[10px] text-teal-800 font-mono">{pay.receiptNo}</p>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                          {pay.class}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatNaira(pay.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveReceiptPayment(pay)}
                          className="h-6 px-2 text-[10px] font-bold text-teal-800 border-teal-300 hover:bg-teal-50"
                        >
                          <Receipt className="w-3 h-3 mr-1" />
                          Print
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Recent Expense Vouchers */}
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Recent Expense Vouchers
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Operating expenses and payment vouchers
              </CardDescription>
            </div>
            <Link
              href="/bursar/expenditures"
              className="text-xs font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Beneficiary and Voucher</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {expenditures.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      <CreditCard className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                      <p className="font-semibold text-slate-600 text-xs">No Expense Vouchers Recorded</p>
                      <p className="text-[10px] text-slate-400">
                        Disbursements and supplier vouchers will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  expenditures.slice(0, 5).map((vch) => (
                    <tr key={vch.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{vch.beneficiary}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{vch.voucherNo}</p>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {vch.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {formatNaira(vch.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveVoucher(vch)}
                          className="h-6 px-2 text-[10px] font-bold text-slate-800 border-slate-300 hover:bg-slate-100"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Print
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <ReceiptModal
        payment={activeReceiptPayment}
        studentItem={
          activeReceiptPayment
            ? students.find((s) => s.admissionNo === activeReceiptPayment.admissionNo)
            : null
        }
        onClose={() => setActiveReceiptPayment(null)}
      />

      <VoucherModal
        voucher={activeVoucher}
        onClose={() => setActiveVoucher(null)}
      />

      {isRecordPaymentOpen && (
        <RecordFeePaymentModal
          students={students}
          accounts={bankAccounts}
          onPaymentRecorded={handlePaymentRecorded}
          onClose={() => setIsRecordPaymentOpen(false)}
        />
      )}

      {isPettyCashModalOpen && (
        <PettyCashModal
          currentBalance={currentFloatBalance}
          onRecord={handleRecordPettyCash}
          onClose={() => setIsPettyCashModalOpen(false)}
        />
      )}
    </div>
  );
}
