'use client';
import { SchoolName, PrincipalName } from '@/components/common/SchoolName';

import React, { useState, useEffect } from 'react';
import { useActiveChild } from '@/context/ParentContext';
import {
  CreditCard,
  Printer,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  Building,
  Info,
} from 'lucide-react';

export default function ParentFeesPage() {
  const { activeChild } = useActiveChild();
  const [finances, setFinances] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    fetch('/api/finances')
      .then((res) => res.json())
      .then((data) => {
        const finData = data?.data || data;
        if (finData) setFinances(finData);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedReceipt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReceipt(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReceipt]);

  // Compute fee details for active student
  const feeDetails = React.useMemo(() => {
    if (!finances || !activeChild) {
      return {
        tuition: 0,
        paid: 0,
        balance: 0,
        discount: 0,
        adjustments: [] as any[],
        transactions: [],
      };
    }

    // The amount billed comes from the server's ledger, which applies the school's own rule for each class
    let tuition = 0;

    // Look for real student payment records in finances
    const studentList = finances.studentLedger || finances.allStudents || [];
    const studentRecord = studentList.find(
      (s: any) =>
        s.id === activeChild.id ||
        (activeChild.admissionNumber && s.admissionNo === activeChild.admissionNumber) ||
        (s.studentName && activeChild.name && s.studentName.toLowerCase() === activeChild.name.toLowerCase())
    );

    if (studentRecord?.totalBilled && Number(studentRecord.totalBilled) > 0) {
      tuition = Number(studentRecord.totalBilled);
    }

    const paid = Number(studentRecord?.amountPaid ?? 0);
    const balance =
      studentRecord?.balance !== undefined
        ? Number(studentRecord.balance)
        : Math.max(0, tuition - paid);

    // Build real verified receipt list from bursary transactions
    const paymentsList = finances.payments || finances.recentTransactions || [];
    const transactions = paymentsList
      .filter(
        (t: any) =>
          t.studentId === activeChild.id ||
          (t.admissionNo && activeChild.admissionNumber && t.admissionNo === activeChild.admissionNumber) ||
          (t.studentName && activeChild.name && t.studentName.toLowerCase() === activeChild.name.toLowerCase())
      )
      .map((t: any) => ({
        id: t.id,
        receiptNumber: t.receiptNo || t.receiptNumber || '—',
        date: t.timestamp || t.date || '—',
        amount: Number(t.amount || 0),
        mode: t.method || t.paymentMode || 'Bank Transfer',
        status: 'Reconciled',
      }));

    const discount = Number(studentRecord?.discount ?? 0);
    const adjustments: any[] = Array.isArray(studentRecord?.adjustments) ? studentRecord.adjustments : [];

    return { tuition, paid, balance, discount, adjustments, transactions };
  }, [finances, activeChild]);

  const online = finances?.onlinePayments;
  const childId: string | undefined = activeChild?.id;
  const plan: any = childId ? finances?.instalments?.[childId] : undefined;
  const bankAccount: any = childId ? finances?.virtualAccounts?.[childId] : undefined;
  const attempts: any[] = (online?.recent || []).filter((o: any) => o.studentId === childId && o.status !== 'success');
  const canPayOnline = Boolean(online?.ready) && feeDetails.balance > 0;

  const startPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId) return;
    setPayError('');
    setIsPaying(true);
    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: childId, amount: payAmount }),
      });
      const data = await res.json();
      if (data.success && data.data?.authorizationUrl) {
        window.location.assign(data.data.authorizationUrl);
        return;
      }
      setPayError(data.message || 'Could not start the payment. Nothing was charged.');
    } catch {
      setPayError('Could not reach the payment service. Nothing was charged.');
    }
    setIsPaying(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          Tuition Statements
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Official Bursary reconciliation for {activeChild?.name || 'Selected Student'}
        </p>
      </div>

      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Assessed Tuition */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Term Tuition Assessed
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ₦{feeDetails.tuition.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {feeDetails.discount > 0
              ? `After ₦${feeDetails.discount.toLocaleString()} off: ${feeDetails.adjustments.map((a: any) => a.reason).filter(Boolean).join(', ')}`
              : `Standard rate for ${activeChild?.currentClass || '—'}`}
          </p>
        </div>

        {/* Payments Recorded */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Bursary Payments Recorded
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            ₦{feeDetails.paid.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Reconciled by Bursar
          </p>
        </div>

        {/* Balance Due */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Outstanding Balance
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {feeDetails.balance === 0 ? (
              <span className="text-emerald-700">₦0 &bull; Settled</span>
            ) : (
              <span className="text-rose-700">₦{feeDetails.balance.toLocaleString()}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {feeDetails.balance === 0
              ? 'Account fully in good standing'
              : finances?.academicSession
              ? `Due for ${finances?.currentTerm || ''} ${finances.academicSession}`
              : 'Current Term Arrears'}
          </p>
        </div>
      </div>

      {/* Pay online: a part payment or the whole balance */}
      {canPayOnline && (
        <form onSubmit={startPayment} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-900">Pay Online</h2>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Pay any amount up to the balance. You are taken to Paystack to pay by card, bank or transfer, and the school records the payment as soon as Paystack confirms it.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label htmlFor="pay-amount" className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Amount in naira
              </label>
              <input
                id="pay-amount"
                type="number"
                inputMode="numeric"
                min={1}
                max={feeDetails.balance}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full min-h-[44px] px-3.5 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isPaying || !payAmount}
              className="min-h-[44px] px-6 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isPaying ? 'Opening Paystack' : 'Pay Now'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPayAmount(String(feeDetails.balance))}
              className="min-h-[44px] px-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Full balance, ₦{feeDetails.balance.toLocaleString()}
            </button>
            {plan?.next ? (
              <button
                type="button"
                onClick={() => setPayAmount(String(Math.min(Number(plan.next), feeDetails.balance)))}
                className="min-h-[44px] px-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Next instalment, ₦{Number(plan.next).toLocaleString()}
              </button>
            ) : null}
          </div>
          {payError && (
            <p role="alert" className="text-xs font-semibold text-rose-700">
              {payError}
            </p>
          )}
        </form>
      )}

      {/* Payments that were started and not finished */}
      {attempts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-900">Payments Not Completed</h2>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            If you were charged and the payment is not shown below as received, check it again. It is only ever recorded once.
          </p>
          <ul className="divide-y divide-slate-100">
            {attempts.map((a: any) => (
              <li key={a.reference} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-xs">
                <span>
                  <span className="font-mono font-bold text-slate-900">₦{Number(a.amount).toLocaleString()}</span>
                  <span className="text-slate-500"> &middot; {new Date(a.createdAt).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} &middot; {a.status === 'mismatch' ? 'Held for the bursar to check' : a.status === 'failed' ? 'Failed' : a.status === 'abandoned' ? 'Not finished' : 'Waiting for confirmation'}</span>
                </span>
                {a.status !== 'mismatch' && (
                  <a
                    href={`/parent/fees/verify?reference=${encodeURIComponent(a.reference)}`}
                    className="min-h-[44px] sm:min-h-[32px] px-3.5 inline-flex items-center justify-center rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold border border-brand-primary/20"
                  >
                    Check Again
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Instalment schedule the school set for this student */}
      {Array.isArray(plan?.plan) && plan.plan.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Instalment Plan</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Instalment</th>
                  <th className="py-3 px-4">Due</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {plan.plan.map((i: any) => (
                  <tr key={i.sequence}>
                    <td className="py-3 px-4 font-bold text-slate-900">{i.sequence}</td>
                    <td className="py-3 px-4">{new Date(`${i.due_date}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="py-3 px-4 text-right font-mono">₦{Number(i.amount).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono">₦{Number(i.paid).toLocaleString()}</td>
                    <td className={`py-3 px-4 font-bold ${i.state === 'paid' ? 'text-emerald-700' : i.state === 'overdue' ? 'text-rose-700' : 'text-slate-600'}`}>
                      {i.state === 'paid' ? 'Paid' : i.state === 'overdue' ? 'Overdue' : i.state === 'partial' ? 'Part paid' : 'Upcoming'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* The student's own bank account for transfers, when the school has one for them */}
      {bankAccount && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-900">Pay by Bank Transfer</h2>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Transfer any amount to this account from your bank app. It belongs to {activeChild?.name || 'this student'} alone, so the school records your transfer against the right child automatically.
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div>
              <dt className="text-slate-400">Bank</dt>
              <dd className="font-bold text-slate-900">{bankAccount.bankName}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Account number</dt>
              <dd className="font-mono font-bold text-slate-900">{bankAccount.accountNumber}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Account name</dt>
              <dd className="font-bold text-slate-900">{bankAccount.accountName}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Official Reconciled Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-900">
              Official Payment Receipts
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {feeDetails.transactions.length} Recorded Receipt(s)
          </span>
        </div>

        {feeDetails.transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 rounded-xl bg-slate-50">
            No payments recorded yet for this session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Receipt Number</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-center">Audit Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {feeDetails.transactions.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {t.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {t.date}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {t.mode}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      ₦{t.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(t)}
                        className="min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold transition border border-brand-primary/20 cursor-pointer"
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footnote on Non-Online Payments */}
        <div className="pt-4 border-t border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
          <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
          <span>
            {online?.ready
              ? 'Payments go straight to the school’s own bank account through Paystack. Payments made at the bursary or by bank transfer are recorded by the Bursar and appear here too.'
              : 'Online payment is not switched on for this school yet. Pay at the bursary or by bank transfer, and the Bursar will record it here.'}
          </span>
        </div>
      </div>

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setSelectedReceipt(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Official School Receipt
                </h3>
                <p className="text-[11px] font-mono text-slate-500">
                  {selectedReceipt.receiptNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                aria-label="Close receipt modal"
                className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Receipt Body */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-50/80 border border-slate-100 text-xs text-slate-700">
              <div className="text-center pb-2 border-b border-slate-200/80">
                <p className="font-bold text-slate-900 text-sm font-serif"><SchoolName /></p>
                <p className="text-[10px] text-slate-500">Official Bursary Financial Receipt</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Student Name:</span>
                  <span className="font-bold text-slate-800">{activeChild?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Admission No:</span>
                  <span className="font-mono font-bold text-slate-800">{activeChild?.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Class:</span>
                  <span className="font-bold text-slate-800">{activeChild?.currentClass}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Academic Session:</span>
                  <span className="font-bold text-slate-800">
                    {finances?.academicSession ? `${finances.academicSession} ${finances?.currentTerm || ''}`.trim() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Date:</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Mode:</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.mode}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Total Amount Paid:</span>
                <span className="text-base font-bold font-mono text-emerald-800">
                  ₦{selectedReceipt.amount.toLocaleString()}
                </span>
              </div>

              <div className="pt-2 text-center text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Reconciled by the Bursary
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
