'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { callApi, lagosStamp, naira } from '@/lib/client-api';

interface Message {
  id: string;
  event: string;
  category: string;
  to: string;
  asked: string | null;
  sentBy: string | null;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'skipped';
  body: string;
  attempts: number;
  problem: string | null;
  cost: number | null;
  createdAt: string;
  sentAt: string | null;
}
interface Usage {
  total: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, { count: number; cost: number }>;
  knownCost: number;
  withoutCost: number;
}
interface Data {
  usage: Usage;
  connected: { sms: boolean; email: boolean; whatsapp: boolean };
  messages: Message[];
}

const EVENT: Record<string, string> = {
  payment_received: 'Payment received',
  absent: 'Absent',
  late: 'Late',
  gate_release: 'Left school',
  results_released: 'Results released',
  broadcast: 'School notice',
  fee_reminder_upcoming: 'Fee due soon',
  fee_reminder_overdue: 'Fee overdue',
  parent_invite: 'Account invite',
};
const STATUS: Record<Message['status'], string> = { queued: 'Waiting', sending: 'Sending', sent: 'Sent', delivered: 'Delivered', failed: 'Failed', skipped: 'Not sent' };
const TONE: Record<Message['status'], string> = { queued: 'text-slate-600', sending: 'text-slate-600', sent: 'text-sky-700', delivered: 'text-emerald-700', failed: 'text-rose-700', skipped: 'text-amber-700' };
const FILTERS = [
  { value: '', label: 'All' },
  { value: 'queued', label: 'Waiting' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Not sent' },
];
const CHANNEL: Record<string, string> = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email' };

/** What the school has sent to parents this month, what it cost, and what failed and why. */
export function MessagesPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const r = await callApi<Data>(`/api/messages${filter ? `?status=${filter}` : ''}`);
    if (r.ok) {
      setData(r.data);
      setError('');
    } else setError(r.message);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = async (id: string) => {
    const r = await callApi('/api/messages', { method: 'POST', body: { action: 'retry', id } });
    if (!r.ok) setError(r.message);
    load();
  };

  if (!data) return error ? <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p> : <BrandLoader size="lg" />;

  const { usage, connected } = data;
  const anyConnected = connected.sms || connected.email || connected.whatsapp;
  const tiles: [string, string][] = [
    ['Messages this month', String(usage.total)],
    ['Delivered', String(usage.byStatus.delivered ?? 0)],
    ['Failed', String(usage.byStatus.failed ?? 0)],
    ['Cost this month', usage.knownCost ? naira(usage.knownCost) : '—'],
  ];

  return (
    <section className="space-y-4">
      {!anyConnected && (
        <div role="status" className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold">
          No messaging account is connected yet, so messages wait in the queue and none are sent. Parents still see notices in their portal.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
            <span className="text-xl font-bold font-mono text-slate-900">{value}</span>
          </div>
        ))}
      </div>
      {usage.withoutCost > 0 && (
        <p className="text-[11px] text-slate-500">
          {usage.withoutCost} sent message{usage.withoutCost === 1 ? ' has' : 's have'} no cost yet. Cost is added when the provider reports it, or from the SMS cost set in Messaging Setup. It is never counted as free.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.value || 'all'} type="button" onClick={() => setFilter(f.value)} className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold cursor-pointer ${filter === f.value ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
            {f.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-x-auto">
        {data.messages.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No messages yet.</p>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">When</th>
                <th className="py-3 px-4">What</th>
                <th className="py-3 px-4">To</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {data.messages.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 px-4 whitespace-nowrap">{lagosStamp(m.sentAt ?? m.createdAt)}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{EVENT[m.event] ?? m.event.replace(/_/g, ' ')}</span>
                    <span className="text-[11px] text-slate-500 block max-w-xs truncate">{m.body}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">{m.to}</td>
                  <td className="py-3 px-4">{m.sentBy ? CHANNEL[m.sentBy] ?? m.sentBy : m.asked ? `${CHANNEL[m.asked] ?? m.asked} first` : '—'}</td>
                  <td className={`py-3 px-4 font-bold ${TONE[m.status]}`}>
                    {STATUS[m.status]}
                    {m.problem ? <span className="block font-medium text-[11px] text-slate-500">{m.problem}</span> : null}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{m.cost != null ? naira(m.cost) : '—'}</td>
                  <td className="py-3 px-4 text-right">
                    {m.status === 'failed' ? (
                      <button type="button" onClick={() => retry(m.id)} className="min-h-[44px] sm:min-h-[32px] px-3.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold border border-brand-primary/20 cursor-pointer">
                        Try Again
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
