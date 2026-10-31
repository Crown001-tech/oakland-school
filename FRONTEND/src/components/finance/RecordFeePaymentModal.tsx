'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StudentFeeLedgerItem, PaymentTransaction } from '@/types/finance';
import { formatNaira } from '@/lib/finance-data';
import { X, Check, Receipt, Search, AlertTriangle } from 'lucide-react';

interface RecordFeePaymentModalProps {
  students: StudentFeeLedgerItem[];
  accounts?: Array<{ id: string; name: string; bank: string; accountNumber: string; displayName?: string }>;
  onPaymentRecorded: (payment: PaymentTransaction, updatedStudent: StudentFeeLedgerItem) => void;
  onClose: () => void;
}

export function RecordFeePaymentModal({ students, accounts, onPaymentRecorded, onClose }: RecordFeePaymentModalProps) {
  // Prioritize first student with an active balance (DEF-106)
  const initialStudentId = useMemo(() => {
    const firstWithBalance = students.find((s) => s.balance > 0);
    return firstWithBalance?.id || students[0]?.id || '';
  }, [students]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  const defaultAccount =
    accounts && accounts.length > 0
      ? `${accounts[0].bank} (${accounts[0].accountNumber})`
      : '';
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentTransaction['method']>('Bank Transfer');
  const [bankRef, setBankRef] = useState<string>('');
  const [receivingAccount, setReceivingAccount] = useState<string>(defaultAccount);
  const [allowOverpayment, setAllowOverpayment] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  // Regenerate idempotency key only when the logical payment parameters change
  useEffect(() => {
    setIdempotencyKey(
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
  }, [selectedStudentId, amount, bankRef, method]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredStudents = students.filter(
    (s) =>
      s.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNo?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.class?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const numericAmount = Number(amount) || 0;
  const currentBalance = selectedStudent ? selectedStudent.balance : 0;
  const overpaymentSurplus = Math.max(0, numericAmount - currentBalance);
  const isOverpaying = numericAmount > 0 && numericAmount > currentBalance;

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    setAllowOverpayment(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || isSubmitting) return;
    setErrorMsg(null);

    const paidAmt = Number(amount);
    if (!paidAmt || isNaN(paidAmt) || paidAmt <= 0) {
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }

    if (!bankRef.trim()) {
      setErrorMsg('Please enter the bank payment reference number.');
      return;
    }

    if (paidAmt > selectedStudent.balance && !allowOverpayment) {
      setErrorMsg(
        `Payment of ${formatNaira(paidAmt)} exceeds the student's outstanding balance of ${formatNaira(
          selectedStudent.balance
        )}. Check the box below if you wish to carry ${formatNaira(
          paidAmt - selectedStudent.balance
        )} forward as credit.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          action: 'record_payment',
          studentId: selectedStudent.id,
          amount: paidAmt,
          method,
          bankRef: bankRef.trim(),
          idempotencyKey,
          receivingAccount,
          payerName: selectedStudent.parentName || selectedStudent.studentName,
          allowOverpayment,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.message || 'Failed to save payment to database.');
      }

      const tx = resData.data;
      const acc = resData.account;
      const receiptNo = tx.receipt_number;

      const newPaidTotal =
        acc?.total_paid !== undefined ? Number(acc.total_paid) : selectedStudent.amountPaid + paidAmt;
      const newBalance =
        acc?.outstanding_balance !== undefined
          ? Number(acc.outstanding_balance)
          : Math.max(0, selectedStudent.totalBilled - newPaidTotal);
      const newCredit =
        acc?.credit_balance !== undefined
          ? Number(acc.credit_balance)
          : Math.max(0, newPaidTotal - selectedStudent.totalBilled);
      const newStatus: StudentFeeLedgerItem['status'] =
        newBalance === 0 ? 'Fully Paid' : 'Partial Payment';

      const newPayment: PaymentTransaction = {
        id: tx.id,
        studentId: selectedStudent.id,
        receiptNo,
        admissionNo: selectedStudent.admissionNo,
        studentName: selectedStudent.studentName,
        class: selectedStudent.class,
        amount: paidAmt,
        method,
        bankRef: bankRef.trim(),
        receivingAccount,
        recordedBy: tx.recorded_by,
        timestamp: new Date(tx.created_at || Date.now()).toLocaleDateString('en-GB'),
        status: 'Confirmed',
      };

      const updatedStudent: StudentFeeLedgerItem = {
        ...selectedStudent,
        amountPaid: newPaidTotal,
        balance: newBalance,
        creditBalance: newCredit,
        status: newStatus,
        lastPaymentDate: 'Today',
        lastReceiptNo: receiptNo,
      };

      onPaymentRecorded(newPayment, updatedStudent);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-brand-primary text-teal-300 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Record Student Fee Payment</h3>
              <p className="text-[10px] text-slate-400">Issue official verified bursary receipt</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Select Enrolled Student
                </label>
                {studentSearch && (
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {filteredStudents.length} of {students.length} match{filteredStudents.length === 1 ? '' : 'es'}
                  </span>
                )}
              </div>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Quick-search by student name, class, or admission no..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 min-h-[44px] sm:h-9 text-xs bg-slate-50 border-slate-300"
                />
              </div>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full min-h-[44px] sm:h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium text-xs"
                required
              >
                {filteredStudents.length === 0 ? (
                  <option value="" disabled>No students matching &ldquo;{studentSearch}&rdquo;</option>
                ) : (
                  filteredStudents.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.studentName} ({stu.class}) &bull; Due: {formatNaira(stu.balance)}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedStudent && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-slate-700">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Class</span>
                  <span className="font-extrabold text-slate-900">{selectedStudent.class}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Term Billed</span>
                  <span className="font-mono font-bold text-slate-900">{formatNaira(selectedStudent.totalBilled)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Current Balance</span>
                  <span className="font-mono font-bold text-rose-700">{formatNaira(selectedStudent.balance)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Amount Paid (₦)
              </label>
              <Input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono font-bold text-base min-h-[44px] text-emerald-800"
              />
            </div>

            {isOverpaying && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium leading-relaxed">
                    Entered amount exceeds the outstanding balance of{' '}
                    <strong>{formatNaira(currentBalance)}</strong> by{' '}
                    <strong>{formatNaira(overpaymentSurplus)}</strong>.
                  </p>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px] sm:min-h-[32px] pt-1">
                  <input
                    type="checkbox"
                    checked={allowOverpayment}
                    onChange={(e) => {
                      setAllowOverpayment(e.target.checked);
                      if (e.target.checked) setErrorMsg(null);
                    }}
                    className="w-4 h-4 rounded border-amber-400 text-brand-primary focus:ring-teal-600"
                  />
                  <span className="text-[11px] font-bold text-amber-900">
                    Carry excess {formatNaira(overpaymentSurplus)} forward as student credit
                  </span>
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentTransaction['method'])}
                  className="w-full min-h-[44px] sm:h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  <option value="Bank Transfer">Bank Direct Transfer</option>
                  <option value="POS">Campus POS Terminal</option>
                  <option value="Bank Teller">Bank Branch Teller Deposit</option>
                  <option value="Cash">Accounts Desk Cashier</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Receiving Bank Account
                </label>
                <select
                  value={receivingAccount}
                  onChange={(e) => setReceivingAccount(e.target.value)}
                  className="w-full min-h-[44px] sm:h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  {accounts && accounts.length > 0 ? (
                    accounts.map((acc) => (
                      <option key={acc.id} value={`${acc.bank} (${acc.accountNumber})`}>
                        {acc.bank} ({acc.accountNumber}) - {acc.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No active institutional bank account configured</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Payment Reference
              </label>
              <Input
                required
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                placeholder="e.g. Bank transfer reference or teller number"
                className="font-mono text-xs min-h-[44px] sm:h-10"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold gap-1.5 min-h-[44px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Record and Generate Official Receipt</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
