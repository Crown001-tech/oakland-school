'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { callApi, lagosStamp, naira } from '@/lib/client-api';

interface Payment {
  id: string;
  studentName: string;
  admissionNo: string;
  reference: string;
  amount: number;
  status: 'initiated' | 'success' | 'failed' | 'abandoned' | 'mismatch';
  channel: string | null;
  providerFee: number | null;
  paidAt: string | null;
  reason: string | null;
  recorded: boolean;
  createdAt: string;
}

const LABEL: Record<Payment['status'], string> = {
  success: 'Received',
  initiated: 'Waiting',
  failed: 'Failed',
  abandoned: 'Not finished',
  mismatch: 'Needs checking',
};

const TONE: Record<Payment['status'], string> = {
  success: 'text-emerald-700',
  initiated: 'text-slate-600',
  failed: 'text-rose-700',
  abandoned: 'text-slate-500',
  mismatch: 'text-amber-700',
};

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'success', label: 'Received' },
  { value: 'initiated', label: 'Waiting' },
  { value: 'mismatch', label: 'Needs checking' },
  { value: 'failed', label: 'Failed' },
];

/** Every online payment, matched to its student and its receipt. Anything that did not match is shown first. */
export function OnlinePaymentsPanel() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const r = await callApi<{ payments: Payment[]; counts: Record<string, number> }>(`/api/payments/online${filter ? `?status=${filter}` : ''}`);
    if (r.ok) {
      setPayments(r.data.payments);
      setCounts(r.data.counts);
      setError('');
    } else {
      setError(r.message);
      setPayments([]);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const checkAgain = async (reference: string) => {
    setChecking(reference);
    setNotice('');
    const r = await callApi<{ outcome: string; receipt: string | null }>(`/api/payments/verify?reference=${encodeURIComponent(reference)}`);
    setNotice(r.ok ? (r.data.outcome === 'recorded' || r.data.outcome === 'already_recorded' ? `Recorded${r.data.receipt ? `, receipt ${r.data.receipt}` : ''}.` : 'Paystack has not confirmed this payment.') : r.message);
    setChecking('');
    load();
  };

  if (payments === null) return <BrandLoader size="lg" />;

  const needsChecking = counts.mismatch ?? 0;

  return (
    <section className="space-y-4">
      {needsChecking > 0 && (
        <div role="alert" className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold">
          {needsChecking} payment{needsChecking === 1 ? '' : 's'} did not match what was asked for. Paystack has the money, but it is not on any student’s account. Look into each one with Paystack.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold cursor-pointer ${filter === f.value ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            {f.label}
            {f.value && counts[f.value] ? <span className="ml-1.5 font-mono">{counts[f.value]}</span> : null}
          </button>
        ))}
      </div>

      {notice && <p role="status" className="text-xs font-semibold text-slate-700">{notice}</p>}
      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}

      <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-x-auto ${error ? 'hidden' : ''}`}>
        {payments.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No online payments yet.</p>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Started</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Paystack fee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{p.studentName}</span>
                    <span className="font-mono text-[11px] text-slate-500">{p.admissionNo}</span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">{lagosStamp(p.paidAt ?? p.createdAt)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{naira(p.amount)}</td>
                  <td className="py-3 px-4 text-right font-mono">{p.providerFee != null ? naira(p.providerFee) : '—'}</td>
                  <td className={`py-3 px-4 font-bold ${TONE[p.status]}`}>
                    {LABEL[p.status]}
                    {p.status === 'success' && !p.recorded ? ' (not on the account yet)' : ''}
                    {p.reason ? <span className="block font-medium text-[11px] text-slate-500">{p.reason}</span> : null}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{p.reference}</td>
                  <td className="py-3 px-4 text-right">
                    {p.status === 'initiated' || p.status === 'mismatch' || (p.status === 'success' && !p.recorded) ? (
                      <button
                        type="button"
                        disabled={checking === p.reference}
                        onClick={() => checkAgain(p.reference)}
                        className="min-h-[44px] sm:min-h-[32px] px-3.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold border border-brand-primary/20 disabled:opacity-50 cursor-pointer"
                      >
                        {checking === p.reference ? 'Checking' : 'Check Again'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
