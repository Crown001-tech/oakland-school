'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  StudentFeeLedgerItem,
  PaymentTransaction,
  ClassFinancial,
} from '@/types/finance';
import { formatNaira } from '@/lib/finance-data';
import { ReceiptModal } from '@/components/finance/ReceiptModal';
import { RecordFeePaymentModal } from '@/components/finance/RecordFeePaymentModal';

export default function BursarFeesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<StudentFeeLedgerItem[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [classFinancials, setClassFinancials] = useState<ClassFinancial[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<PaymentTransaction | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadFeeData = async () => {
    try {
      const res = await fetch('/api/finances');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.data) {
          const d = json.data;
          setStudents(d.studentLedger || []);
          setPayments(d.payments || []);
          setClassFinancials(d.classBreakdowns || []);
          if (d.institutionalBankAccounts) setBankAccounts(d.institutionalBankAccounts);
        }
      }
    } catch {
      // Keep empty state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeeData();
  }, []);

  const totalCollected = classFinancials.reduce((a, b) => a + (b.collected || 0), 0);

  const handlePaymentRecorded = (newPay: PaymentTransaction, updatedStudent: StudentFeeLedgerItem) => {
    setPayments((prev) => [newPay, ...prev]);
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
    setIsRecordPaymentOpen(false);
    setActiveReceiptPayment(newPay);
    showToast(`Payment of ${formatNaira(newPay.amount)} recorded for ${updatedStudent.studentName}. Official receipt generated.`);
  };

  const filteredStudents = students.filter((stu) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      stu.studentName.toLowerCase().includes(query) ||
      stu.admissionNo.toLowerCase().includes(query) ||
      stu.parentName.toLowerCase().includes(query);
    const matchesClass = classFilter === 'All' || stu.class === classFilter;
    const matchesStatus = statusFilter === 'All' || stu.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  if (isLoading) {
    return <BrandLoader fullScreen size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fees and Receipts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Student tuition accounts, payment tracking, and official stamped receipts.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsRecordPaymentOpen(true)}
          variant="primary"
          size="md"
          className="text-xs font-semibold gap-2"
        >
          <Receipt className="w-4 h-4" />
          <span>Record Fee Payment</span>
        </Button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-2.5 shadow-xs text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Class Fee Summary Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Class Fee Collection Summary
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {students.length} enrolled {students.length === 1 ? 'student' : 'students'} across secondary classes
            </CardDescription>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded">
            Total Collected: {formatNaira(totalCollected)}
          </span>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0f3a3e] text-white font-bold">
              <tr>
                <th className="py-2.5 px-4">Class</th>
                <th className="py-2.5 px-3 text-center">Fee per Student</th>
                <th className="py-2.5 px-3 text-center">Enrolled</th>
                <th className="py-2.5 px-4 text-right">Expected</th>
                <th className="py-2.5 px-4 text-right">Collected</th>
                <th className="py-2.5 px-4 text-right">Outstanding</th>
                <th className="py-2.5 px-3 text-center">Rate (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {classFinancials.map((row) => (
                <tr key={row.class} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-black text-slate-900">{row.class}</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-700">
                    {formatNaira(row.feePerStudent)}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800">
                    {row.students ?? 0} {row.students === 1 ? 'Pupil' : 'Pupils'}
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
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {row.pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Search students by name, admission number, or guardian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 cursor-pointer"
        >
          <option value="All">All Classes</option>
          <option value="JSS 1">JSS 1</option>
          <option value="JSS 2">JSS 2</option>
          <option value="JSS 3">JSS 3</option>
          <option value="SS 1">SS 1</option>
          <option value="SS 2">SS 2</option>
          <option value="SS 3">SS 3</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 cursor-pointer"
        >
          <option value="All">All Payment Statuses</option>
          <option value="Fully Paid">Fully Paid</option>
          <option value="Partial Payment">Partial Payment</option>
          <option value="Defaulter">Defaulter</option>
        </select>
      </div>

      {/* Student Billing Register */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">
            Student Fee Register ({filteredStudents.length} {filteredStudents.length === 1 ? 'Pupil' : 'Pupils'})
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Official pupil accounts and verifiable payment receipts
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0f3a3e] text-white font-bold">
              <tr>
                <th className="py-2.5 px-4">Student and ID</th>
                <th className="py-2.5 px-3 text-center">Class</th>
                <th className="py-2.5 px-4">Guardian</th>
                <th className="py-2.5 px-3 text-right">Term Bill</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Balance Due</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No Student Fee Records Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery || classFilter !== 'All' || statusFilter !== 'All'
                        ? 'Try adjusting your search criteria or active filters.'
                        : 'Once students are enrolled, their fee accounts will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => {
                  const matchedPayment = payments.find((p) => p.admissionNo === stu.admissionNo || p.studentName === stu.studentName);

                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{stu.studentName}</p>
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
                            className="h-7 px-2.5 text-[10px] font-bold text-teal-800 border-teal-300 hover:bg-teal-50"
                          >
                            <Receipt className="w-3 h-3 mr-1" />
                            View Receipt
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No payments yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

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

      {isRecordPaymentOpen && (
        <RecordFeePaymentModal
          students={students}
          accounts={bankAccounts}
          onPaymentRecorded={handlePaymentRecorded}
          onClose={() => setIsRecordPaymentOpen(false)}
        />
      )}
    </div>
  );
}
