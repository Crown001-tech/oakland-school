'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  APPROACH_LABELS,
  REQUEST_APPROACHES,
  REQUEST_STATUSES,
  STATUS_LABELS,
  type RequestApproach,
  type RequestStatus,
} from '@/lib/custom-requests';

interface CustomRequest {
  id: string;
  title: string;
  description: string | null;
  requested_by: string | null;
  status: RequestStatus;
  approach: RequestApproach | null;
  estimated_days: number | null;
  notes: string | null;
  created_by_name: string | null;
  created_at: string;
}

const field =
  'w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary';

export default function CustomRequestsPage() {
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [approach, setApproach] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/custom-requests');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Could not load requests.');
      setRequests(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load requests.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch('/api/custom-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, requestedBy, approach: approach || undefined, estimatedDays }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Could not save the request.');
      setTitle('');
      setDescription('');
      setRequestedBy('');
      setApproach('');
      setEstimatedDays('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the request.');
    } finally {
      setIsSaving(false);
    }
  };

  const update = async (id: string, patch: Record<string, unknown>) => {
    setError(null);
    const res = await fetch('/api/custom-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      setError(json.message || 'Could not update the request.');
      return;
    }
    await load();
  };

  if (isLoading) return <BrandLoader />;

  const totalDays = requests.filter((r) => r.status !== 'declined').reduce((sum, r) => sum + Number(r.estimated_days || 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Custom Requests</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Every request is recorded here. Build it as a setting or a module switch where possible, never as a copy of the code.
          {requests.length > 0 && ` Estimated work so far: ${totalDays} days.`}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-brand-accent/30 bg-brand-accent-soft px-4 py-3 text-sm text-brand-accent">
          {error}
        </p>
      )}

      <form onSubmit={add} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">New request</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-700 sm:col-span-2">
            Title
            <input className={`${field} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </label>
          <label className="block text-xs font-semibold text-slate-700 sm:col-span-2">
            Details
            <textarea className={`${field} mt-1`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Requested by
            <input className={`${field} mt-1`} value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} maxLength={150} />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            How it will be handled
            <select className={`${field} mt-1`} value={approach} onChange={(e) => setApproach(e.target.value)}>
              <option value="">Not decided</option>
              {REQUEST_APPROACHES.map((a) => (
                <option key={a} value={a}>
                  {APPROACH_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Estimated days
            <input className={`${field} mt-1`} type="number" min="0" step="0.5" value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} />
          </label>
        </div>
        <button
          type="submit"
          disabled={isSaving || !title.trim()}
          className="min-h-[44px] rounded-xl bg-brand-primary px-5 text-sm font-bold text-white transition hover:bg-brand-primary-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add request
        </button>
      </form>

      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No requests recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div>
                <p className="text-sm font-bold text-slate-900">{r.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleDateString('en-GB')}
                  {r.requested_by ? ` • ${r.requested_by}` : ''}
                </p>
                {r.description && <p className="mt-2 whitespace-pre-line text-xs text-slate-700">{r.description}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Status
                  <select className={`${field} mt-1`} value={r.status} onChange={(e) => update(r.id, { status: e.target.value })}>
                    {REQUEST_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Handled as
                  <select className={`${field} mt-1`} value={r.approach ?? ''} onChange={(e) => update(r.id, { approach: e.target.value || null })}>
                    <option value="">Not decided</option>
                    {REQUEST_APPROACHES.map((a) => (
                      <option key={a} value={a}>
                        {APPROACH_LABELS[a]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Estimated days
                  <input
                    className={`${field} mt-1`}
                    type="number"
                    min="0"
                    step="0.5"
                    defaultValue={r.estimated_days ?? ''}
                    onBlur={(e) => {
                      const next = e.target.value === '' ? null : Number(e.target.value);
                      if (next !== (r.estimated_days === null ? null : Number(r.estimated_days))) update(r.id, { estimatedDays: next });
                    }}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
