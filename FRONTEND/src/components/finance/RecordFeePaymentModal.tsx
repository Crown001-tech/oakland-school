'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StudentFeeLedgerItem, PaymentTransaction } from '@/types/finance';
import { formatNaira } from '@/lib/finance-data';
import { X, Check, Receipt, CreditCard } from 'lucide-react';

interface RecordFeePaymentModalProps {
  students: StudentFeeLedgerItem[];
  accounts?: Array<{ id: string; name: string; bank: string; accountNumber: string; displayName?: string }>;
  onPaymentRecorded: (payment: PaymentTransaction, updatedStudent: StudentFeeLedgerItem) => void;
  onClose: () => void;
}

export function RecordFeePaymentModal({ students, accounts, onPaymentRecorded, onClose }: RecordFeePaymentModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  const defaultAccount = accounts && accounts.length > 0 ? `${accounts[0].bank} (${accounts[0].accountNumber})` : 'Zenith Bank (1019283741)';
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentTransaction['method']>('Bank Transfer');
  const [bankRef, setBankRef] = useState<string>('');
  const [receivingAccount, setReceivingAccount] = useState<string>(defaultAccount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
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

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_payment',
          studentId: selectedStudent.id,
          amount: paidAmt,
          method,
          bankRef: bankRef.trim(),
          receivingAccount,
          payerName: selectedStudent.parentName || selectedStudent.studentName,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.message || 'Failed to save payment to database.');
      }

      const tx = resData.data;
      const receiptNo = tx.receipt_number;

      const newPaidTotal = selectedStudent.amountPaid + paidAmt;
      const newBalance = Math.max(0, selectedStudent.totalBilled - newPaidTotal);
      const newStatus: StudentFeeLedgerItem['status'] =
        newBalance === 0 ? 'Fully Paid' : 'Partial Payment';

      const newPayment: PaymentTransaction = {
        id: tx.id,
        receiptNo,
        admissionNo: selectedStudent.admissionNo,
        studentName: selectedStudent.studentName,
        class: selectedStudent.class,
        amount: paidAmt,
        method,
        bankRef: bankRef.trim(),
        receivingAccount,
        timestamp: new Date().toLocaleDateString('en-GB'),
        status: 'Confirmed',
      };

      const updatedStudent: StudentFeeLedgerItem = {
        ...selectedStudent,
        amountPaid: newPaidTotal,
        balance: newBalance,
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#0f3a3e] text-teal-300 flex items-center justify-center">
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
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Select Enrolled Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                required
              >
                {students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.studentName} ({stu.class}) &bull; Due: {formatNaira(stu.balance)}
                  </option>
                ))}
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
                className="font-mono font-bold text-base h-10 text-emerald-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentTransaction['method'])}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800"
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
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  {accounts && accounts.length > 0 ? (
                    accounts.map((acc) => (
                      <option key={acc.id} value={`${acc.bank} (${acc.accountNumber})`}>
                        {acc.bank} ({acc.accountNumber}) - {acc.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Zenith Bank (1019283741)">Zenith Bank (Tuition - 1019283741)</option>
                      <option value="Guaranty Trust Bank (0123984712)">Guaranty Trust Bank (0123984712)</option>
                    </>
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
                className="font-mono text-xs h-9"
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
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-bold gap-1.5"
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
