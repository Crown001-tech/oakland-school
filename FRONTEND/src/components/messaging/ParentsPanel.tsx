'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { callApi } from '@/lib/client-api';

interface Parent {
  id: string;
  name: string;
  phone: string | null;
  hasEmail: boolean;
  children: string[];
  activated: boolean;
  invited: boolean;
}
interface Data { total: number; activated: number; parents: Parent[] }
interface Sent { status: string; reason: string | null; link: string | null }

const FILTERS = [
  { value: 'waiting', label: 'Not activated' },
  { value: 'activated', label: 'Activated' },
  { value: 'all', label: 'All' },
];

/** Which parents have set up an account, and a button to send each of the others a link on their phone. */
export function ParentsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState('waiting');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState<Record<string, Sent>>({});
  const [bulk, setBulk] = useState('');

  const load = useCallback(async () => {
    const r = await callApi<Data>('/api/parent-invites');
    if (r.ok) setData(r.data);
    else {
      setError(r.message);
      setData({ total: 0, activated: 0, parents: [] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async (p: Parent) => {
    setBusy(p.id);
    setError('');
    const r = await callApi<{ status: string; reason: string | null; link: string | null }>('/api/parent-invites', { method: 'POST', body: { guardianId: p.id, resend: p.activated } });
    if (r.ok) setResults((prev) => ({ ...prev, [p.id]: r.data }));
    else setError(r.message);
    setBusy('');
    load();
  };

  const ready = (data?.parents ?? []).filter((p) => !p.activated && !p.invited && (p.phone || p.hasEmail)).length;

  const inviteAll = async () => {
    if (!window.confirm(`Send a sign-up link to ${ready} parent${ready === 1 ? '' : 's'}? Each gets it on their phone.`)) return;
    setBusy('all');
    setError('');
    setBulk('');
    const r = await callApi<{ queued: number; skipped: number; failed: number; nobodyToSendTo: number }>('/api/parent-invites', { method: 'POST', body: { all: true } });
    if (r.ok) {
      const d = r.data;
      setBulk(`${d.queued} link${d.queued === 1 ? '' : 's'} queued to send.${d.skipped ? ` ${d.skipped} not sent (opted out).` : ''}${d.failed ? ` ${d.failed} failed.` : ''}${d.nobodyToSendTo ? ` ${d.nobodyToSendTo} parent${d.nobodyToSendTo === 1 ? ' has' : 's have'} no phone or email on record.` : ''}`);
    } else setError(r.message);
    setBusy('');
    load();
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.parents ?? []).filter((p) => (filter === 'all' || (filter === 'activated') === p.activated) && (!q || p.name.toLowerCase().includes(q) || p.children.some((c) => c.toLowerCase().includes(q))));
  }, [data, filter, search]);

  if (!data) return <BrandLoader size="lg" />;

  const percent = data.total > 0 ? Math.round((data.activated / data.total) * 100) : null;

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
        <p className="text-xs text-slate-600 leading-relaxed">
          A parent needs their own account to see their child’s fees and results and to pay online. Send them a link on their phone: they open it, choose a password, and they are in. Nobody types anything for them. Messages from the school (absent, fees received, results) reach a parent’s phone <strong>without</strong> an account.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Parents activated</span>
            <span className="text-2xl font-bold font-mono text-slate-900">{data.total > 0 ? `${data.activated} of ${data.total}` : '—'}</span>
            {percent !== null && <span className="ml-3 text-sm font-bold text-slate-600">{percent}%</span>}
          </div>
          <button type="button" disabled={busy === 'all' || ready === 0} onClick={inviteAll} className="min-h-[44px] px-5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold disabled:opacity-50 cursor-pointer sm:ml-auto">
            {busy === 'all' ? 'Sending' : ready === 0 ? 'Everyone has been invited' : `Send Link to All ${ready} Parents`}
          </button>
        </div>
        {bulk && <p role="status" className="text-xs font-semibold text-slate-800">{bulk}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => setFilter(f.value)} className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold cursor-pointer ${filter === f.value ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <label htmlFor="parent-search" className="sr-only">Search by parent or child</label>
        <input id="parent-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by parent or child" className="flex-1 min-h-[44px] px-3.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:border-brand-primary" />
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}

      <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-x-auto ${error && data.total === 0 ? 'hidden' : ''}`}>
        {shown.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">{data.total === 0 ? 'No parents on record yet.' : 'No parents match.'}</p>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Parent</th>
                <th className="py-3 px-4">Children</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {shown.map((p) => {
                const sent = results[p.id];
                return (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4">{p.children.length ? p.children.join(', ') : '—'}</td>
                    <td className="py-3 px-4 font-mono text-[11px]">{p.phone ?? '—'}</td>
                    <td className={`py-3 px-4 font-bold ${p.activated ? 'text-emerald-700' : p.invited ? 'text-sky-700' : 'text-slate-500'}`}>{p.activated ? 'Activated' : p.invited ? 'Invite sent' : 'Not invited'}</td>
                    <td className="py-3 px-4 text-right">
                      <button type="button" disabled={busy === p.id || (!p.phone && !p.hasEmail)} onClick={() => invite(p)} className="min-h-[44px] sm:min-h-[32px] px-3.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold border border-brand-primary/20 disabled:opacity-50 cursor-pointer">
                        {p.activated ? 'New Link' : p.invited ? 'Send Again' : 'Send Invite'}
                      </button>
                      {!p.phone && !p.hasEmail && <span className="block text-[11px] text-slate-500 mt-1">No phone or email on record</span>}
                      {sent && (
                        <span className="block text-[11px] text-slate-600 mt-1 text-left sm:text-right break-all">
                          {sent.status === 'queued' ? 'Link queued to send.' : `Not sent (${(sent.reason ?? 'nowhere to send').replace(/_/g, ' ')}). Give the parent this link yourself: ${sent.link}`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
