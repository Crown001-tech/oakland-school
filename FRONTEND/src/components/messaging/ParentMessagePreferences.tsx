'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { callApi } from '@/lib/client-api';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'payment', label: 'Payment receipts' },
  { value: 'attendance', label: 'Child absent or late' },
  { value: 'gate', label: 'Child leaves school' },
  { value: 'results', label: 'Results released' },
  { value: 'broadcast', label: 'School notices' },
  { value: 'reminder', label: 'Fee reminders' },
];

/** A parent chooses which messages from the school they receive on their phone. Notices in the portal are unaffected. */
export function ParentMessagePreferences() {
  const [stopped, setStopped] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await callApi<{ categories: string[] }>('/api/messages/opt-out');
    if (r.ok) setStopped(r.data.categories);
    else {
      setError(r.message);
      setStopped([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (category: string, receive: boolean) => {
    setBusy(true);
    setError('');
    const r = receive ? await callApi(`/api/messages/opt-out?category=${category}`, { method: 'DELETE' }) : await callApi('/api/messages/opt-out', { method: 'POST', body: { category } });
    if (!r.ok) setError(r.message);
    await load();
    setBusy(false);
  };

  if (!stopped) return null;
  const allOff = stopped.includes('all');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Messages to My Phone</h2>
        <p className="text-[11px] text-slate-500 leading-relaxed">Choose which messages the school sends to your phone. You will still see everything in this portal.</p>
      </div>
      <label className="flex items-center gap-3 min-h-[44px] text-xs font-bold text-slate-900 cursor-pointer">
        <input type="checkbox" disabled={busy} checked={!allOff} onChange={(e) => change('all', e.target.checked)} className="w-5 h-5" />
        Receive messages from the school
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        {CATEGORIES.map((c) => (
          <label key={c.value} className={`flex items-center gap-3 min-h-[44px] text-xs font-semibold cursor-pointer ${allOff ? 'text-slate-400' : 'text-slate-800'}`}>
            <input type="checkbox" disabled={busy || allOff} checked={!allOff && !stopped.includes(c.value)} onChange={(e) => change(c.value, e.target.checked)} className="w-5 h-5" />
            {c.label}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
