'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { callApi } from '@/lib/client-api';
import { SwitchRow } from '@/components/ui/SwitchRow';

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
  const [saving, setSaving] = useState<string[]>([]);

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

  // Each switch changes on its own, at once, and only this one is held while it saves. The others are not touched.
  const change = async (category: string, receive: boolean) => {
    setError('');
    setSaving((s) => [...s, category]);
    setStopped((prev) => (prev ? (receive ? prev.filter((c) => c !== category) : [...prev.filter((c) => c !== category), category]) : prev));
    const r = receive ? await callApi(`/api/messages/opt-out?category=${category}`, { method: 'DELETE' }) : await callApi('/api/messages/opt-out', { method: 'POST', body: { category } });
    if (!r.ok) {
      // It did not save: put this one back
      setError(r.message);
      setStopped((prev) => (prev ? (receive ? [...prev.filter((c) => c !== category), category] : prev.filter((c) => c !== category)) : prev));
    }
    setSaving((s) => s.filter((c) => c !== category));
  };

  if (!stopped) return null;
  const allOff = stopped.includes('all');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Messages to My Phone</h2>
        <p className="text-[11px] text-slate-500 leading-relaxed">Choose which messages the school sends to your phone. You will still see everything in this portal.</p>
      </div>
      <SwitchRow strong label="Receive messages from the school" checked={!allOff} disabled={saving.includes('all')} onChange={(on) => change('all', on)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 border-t border-slate-100 pt-1">
        {CATEGORIES.map((c) => (
          <SwitchRow key={c.value} label={c.label} checked={!allOff && !stopped.includes(c.value)} disabled={allOff || saving.includes(c.value)} onChange={(on) => change(c.value, on)} />
        ))}
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
