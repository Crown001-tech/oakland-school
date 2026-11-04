'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { callApi, naira } from '@/lib/client-api';

interface StudentRow { id: string; fullName: string; admissionNo: string; class: string }
interface Adjustment { id: string; kind: string; amount: number | null; percent: number | null; reason: string; is_active: boolean; created_by_name: string | null }
interface Detail { gross: number; off: number; adjustments: Adjustment[] }
interface PlanRow { sequence: number; due_date: string; amount: number; paid: number; state: string }
interface Family { guardianId: string; guardianName: string; children: { id: string; name: string; hasSiblingDiscount: boolean }[] }

const KINDS: { value: string; label: string }[] = [
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'discount', label: 'Discount' },
  { value: 'waiver', label: 'Waiver' },
];

const field = 'w-full min-h-[44px] px-3.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:border-brand-primary focus:ring-1 focus:ring-brand-primary';
const button = 'min-h-[44px] px-5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50';
const card = 'bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4';

/**
 * What the school takes off a student's fees (scholarships, discounts, waivers, sibling discounts), the student's
 * instalment plan, and a bank account number of their own. Every change keeps who made it and why.
 */
export function AdjustmentsPanel() {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [plan, setPlan] = useState<PlanRow[]>([]);
  const [draftPlan, setDraftPlan] = useState<{ due_date: string; amount: string }[]>([]);
  const [account, setAccount] = useState<{ accountNumber: string; bankName: string; accountName: string } | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [kind, setKind] = useState('');
  const [by, setBy] = useState<'amount' | 'percent'>('percent');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [siblingPercent, setSiblingPercent] = useState('');

  useEffect(() => {
    (async () => {
      const [s, f] = await Promise.all([callApi<StudentRow[]>('/api/students'), callApi<{ families: Family[] }>('/api/payments/adjustments?families=1')]);
      setStudents(s.ok ? s.data : []);
      if (f.ok) setFamilies(f.data.families);
    })();
  }, []);

  const loadStudent = useCallback(async (id: string) => {
    if (!id) return;
    const [a, p] = await Promise.all([callApi<Detail>(`/api/payments/adjustments?studentId=${id}`), callApi<{ plan: PlanRow[] }>(`/api/payments/instalments?studentId=${id}`)]);
    setDetail(a.ok ? a.data : null);
    setPlan(p.ok ? p.data.plan : []);
    setDraftPlan([]);
    if (!a.ok) setMessage(a.message);
  }, []);

  useEffect(() => {
    setDetail(null);
    setPlan([]);
    setAccount(null);
    setMessage('');
    if (studentId) loadStudent(studentId);
  }, [studentId, loadStudent]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !students) return [];
    return students.filter((s) => s.fullName.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q)).slice(0, 8);
  }, [search, students]);

  const run = async (work: () => Promise<{ ok: boolean; message?: string }>, done: string) => {
    setBusy(true);
    setMessage('');
    const r = await work();
    setMessage(r.ok ? done : r.message || 'Something went wrong.');
    setBusy(false);
    return r.ok;
  };

  const addAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() => callApi('/api/payments/adjustments', { method: 'POST', body: { studentId, kind, reason, [by]: value } }), 'Saved. The bill is updated.');
    if (ok) {
      setKind('');
      setValue('');
      setReason('');
      loadStudent(studentId);
    }
  };

  const removeAdjustment = async (id: string) => {
    if (!window.confirm('Switch this off? The student’s bill goes back up. It stays on their record.')) return;
    if (await run(() => callApi(`/api/payments/adjustments?id=${id}`, { method: 'DELETE' }), 'Switched off.')) loadStudent(studentId);
  };

  const savePlan = async () => {
    const instalments = draftPlan.map((r) => ({ due_date: r.due_date, amount: Number(r.amount) }));
    if (await run(() => callApi('/api/payments/instalments', { method: 'POST', body: { studentId, instalments } }), 'Plan saved.')) loadStudent(studentId);
  };

  const removePlan = async () => {
    if (!window.confirm('Remove this instalment plan?')) return;
    if (await run(() => callApi(`/api/payments/instalments?studentId=${studentId}`, { method: 'DELETE' }), 'Plan removed.')) loadStudent(studentId);
  };

  const giveAccount = async () => {
    setBusy(true);
    setMessage('');
    const r = await callApi<{ accountNumber: string; bankName: string; accountName: string }>('/api/payments/virtual-account', { method: 'POST', body: { studentId } });
    if (r.ok) setAccount(r.data);
    else setMessage(r.message);
    setBusy(false);
  };

  const giveSibling = async (guardianId: string) => {
    const ok = await run(() => callApi('/api/payments/adjustments', { method: 'POST', body: { action: 'sibling', guardianId, percent: siblingPercent } }), 'Sibling discount given to the later children.');
    if (ok) {
      const f = await callApi<{ families: Family[] }>('/api/payments/adjustments?families=1');
      if (f.ok) setFamilies(f.data.families);
    }
  };

  if (students === null) return <BrandLoader size="lg" />;

  const planTotal = draftPlan.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {message && (
        <p role="status" className="text-xs font-semibold text-slate-800 bg-slate-100 rounded-xl px-4 py-3">
          {message}
        </p>
      )}

      <section className={card}>
        <h2 className="text-sm font-bold text-slate-900">Choose a Student</h2>
        <label htmlFor="adj-search" className="sr-only">Search by name or admission number</label>
        <input id="adj-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or admission number" className={field} />
        {matches.length > 0 && (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {matches.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setStudentId(s.id);
                    setSearch('');
                  }}
                  className="w-full min-h-[44px] px-4 text-left text-xs hover:bg-slate-50 cursor-pointer"
                >
                  <span className="font-bold text-slate-900">{s.fullName}</span>
                  <span className="text-slate-500"> &middot; {s.admissionNo} &middot; {s.class}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {studentId && detail && (
          <p className="text-xs text-slate-700">
            <span className="font-bold">{students.find((s) => s.id === studentId)?.fullName}</span>: class tuition {naira(detail.gross)}, less {naira(detail.off)}, billed{' '}
            <span className="font-mono font-bold">{naira(Math.max(0, detail.gross - detail.off))}</span>
          </p>
        )}
      </section>

      {studentId && detail && (
        <>
          <section className={card}>
            <h2 className="text-sm font-bold text-slate-900">Scholarships, Discounts and Waivers</h2>
            {detail.adjustments.length === 0 ? (
              <p className="text-xs text-slate-500">Nothing taken off this student’s fees.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {detail.adjustments.map((a) => (
                  <li key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-xs">
                    <span className={a.is_active ? '' : 'text-slate-400 line-through'}>
                      <span className="font-bold text-slate-900 capitalize">{a.kind}</span>: {a.percent != null ? `${a.percent}%` : naira(a.amount)} &middot; {a.reason}
                      {a.created_by_name ? <span className="text-slate-500"> &middot; by {a.created_by_name}</span> : null}
                    </span>
                    {a.is_active && (
                      <button type="button" disabled={busy} onClick={() => removeAdjustment(a.id)} className="min-h-[44px] sm:min-h-[32px] px-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50">
                        Switch Off
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={addAdjustment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label htmlFor="adj-kind" className="block text-[11px] font-bold text-slate-600 mb-1.5">Type</label>
                <select id="adj-kind" required value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
                  <option value="" disabled>Choose</option>
                  {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="adj-by" className="block text-[11px] font-bold text-slate-600 mb-1.5">Given as</label>
                <select id="adj-by" value={by} onChange={(e) => setBy(e.target.value as 'amount' | 'percent')} className={field}>
                  <option value="percent">Percent of tuition</option>
                  <option value="amount">Amount in naira</option>
                </select>
              </div>
              <div>
                <label htmlFor="adj-value" className="block text-[11px] font-bold text-slate-600 mb-1.5">{by === 'percent' ? 'Percent' : 'Naira'}</label>
                <input id="adj-value" required type="number" inputMode="decimal" min={0} value={value} onChange={(e) => setValue(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="adj-reason" className="block text-[11px] font-bold text-slate-600 mb-1.5">Reason</label>
                <input id="adj-reason" required type="text" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
              </div>
              <div className="sm:col-span-4">
                <button type="submit" disabled={busy} className={`${button} bg-brand-primary hover:bg-brand-primary-light text-white`}>Add</button>
              </div>
            </form>
          </section>

          <section className={card}>
            <h2 className="text-sm font-bold text-slate-900">Instalment Plan</h2>
            {plan.length > 0 && draftPlan.length === 0 ? (
              <>
                <ul className="divide-y divide-slate-100 text-xs">
                  {plan.map((p) => (
                    <li key={p.sequence} className="flex justify-between py-2.5">
                      <span>{p.sequence}. Due {p.due_date}</span>
                      <span className="font-mono font-bold">{naira(p.amount)} <span className="font-sans font-semibold text-slate-500">({p.state === 'paid' ? 'paid' : p.state === 'overdue' ? 'overdue' : p.state === 'partial' ? 'part paid' : 'upcoming'})</span></span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDraftPlan(plan.map((p) => ({ due_date: p.due_date, amount: String(p.amount) })))} className={`${button} border border-slate-200 text-slate-700 hover:bg-slate-50`}>Change Plan</button>
                  <button type="button" disabled={busy} onClick={removePlan} className={`${button} border border-slate-200 text-rose-700 hover:bg-rose-50`}>Remove Plan</button>
                </div>
              </>
            ) : draftPlan.length === 0 ? (
              <>
                <p className="text-xs text-slate-500">No plan. The parent can pay any amount at any time.</p>
                <button type="button" onClick={() => setDraftPlan([{ due_date: '', amount: '' }, { due_date: '', amount: '' }])} className={`${button} border border-slate-200 text-slate-700 hover:bg-slate-50`}>Set Up a Plan</button>
              </>
            ) : (
              <div className="space-y-3">
                {draftPlan.map((row, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] gap-2 items-end">
                    <span className="text-xs font-bold text-slate-700 sm:pb-3">{i + 1}.</span>
                    <div>
                      <label htmlFor={`plan-due-${i}`} className="block text-[11px] font-bold text-slate-600 mb-1">Due date</label>
                      <input id={`plan-due-${i}`} type="date" required value={row.due_date} onChange={(e) => setDraftPlan(draftPlan.map((r, j) => (j === i ? { ...r, due_date: e.target.value } : r)))} className={field} />
                    </div>
                    <div>
                      <label htmlFor={`plan-amt-${i}`} className="block text-[11px] font-bold text-slate-600 mb-1">Amount</label>
                      <input id={`plan-amt-${i}`} type="number" inputMode="decimal" min={0} required value={row.amount} onChange={(e) => setDraftPlan(draftPlan.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))} className={field} />
                    </div>
                    <button type="button" aria-label={`Remove instalment ${i + 1}`} onClick={() => setDraftPlan(draftPlan.filter((_, j) => j !== i))} className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer">✕</button>
                  </div>
                ))}
                <p className="text-xs text-slate-600">
                  Adds up to <span className="font-mono font-bold">{naira(planTotal)}</span>. It must equal exactly what the student is billed, {naira(Math.max(0, detail.gross - detail.off))}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={draftPlan.length >= 12} onClick={() => setDraftPlan([...draftPlan, { due_date: '', amount: '' }])} className={`${button} border border-slate-200 text-slate-700 hover:bg-slate-50`}>Add Instalment</button>
                  <button type="button" disabled={busy} onClick={savePlan} className={`${button} bg-brand-primary hover:bg-brand-primary-light text-white`}>Save Plan</button>
                  <button type="button" onClick={() => setDraftPlan([])} className={`${button} text-slate-600 hover:bg-slate-100`}>Cancel</button>
                </div>
              </div>
            )}
          </section>

          <section className={card}>
            <h2 className="text-sm font-bold text-slate-900">Student Bank Account Number</h2>
            <p className="text-xs text-slate-500 leading-relaxed">A bank account number that belongs to this student alone. A transfer to it is matched to the student with nothing to type. Paystack decides whether it can offer this to the school.</p>
            {account ? (
              <p className="text-xs font-semibold text-slate-900">{account.bankName}, {account.accountNumber}, {account.accountName}</p>
            ) : (
              <button type="button" disabled={busy} onClick={giveAccount} className={`${button} border border-slate-200 text-slate-700 hover:bg-slate-50`}>Get Account Number</button>
            )}
          </section>
        </>
      )}

      <section className={card}>
        <h2 className="text-sm font-bold text-slate-900">Sibling Discount</h2>
        <p className="text-xs text-slate-500 leading-relaxed">The first child pays in full. Every later child of the same family gets this percentage off.</p>
        <div className="max-w-xs">
          <label htmlFor="sib-percent" className="block text-[11px] font-bold text-slate-600 mb-1.5">Percent off for later children</label>
          <input id="sib-percent" type="number" inputMode="decimal" min={0} max={100} value={siblingPercent} onChange={(e) => setSiblingPercent(e.target.value)} className={field} />
        </div>
        {families.length === 0 ? (
          <p className="text-xs text-slate-500">No family has more than one child at the school.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {families.map((f) => (
              <li key={f.guardianId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-xs">
                <span>
                  <span className="font-bold text-slate-900">{f.guardianName}</span>
                  <span className="text-slate-500"> &middot; {f.children.map((c) => c.name + (c.hasSiblingDiscount ? ' (has discount)' : '')).join(', ')}</span>
                </span>
                <button type="button" disabled={busy || !siblingPercent} onClick={() => giveSibling(f.guardianId)} className="min-h-[44px] sm:min-h-[32px] px-3.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold border border-brand-primary/20 disabled:opacity-50 cursor-pointer">
                  Give Discount
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
