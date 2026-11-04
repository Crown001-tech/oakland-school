'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { callApi } from '@/lib/client-api';
import { CATEGORY_OF, type MessageEvent } from '@/lib/messaging/templates';

interface Messaging {
  enabled?: boolean;
  senderId?: string;
  whatsappDeviceId?: string;
  smsUnitCost?: number;
  useDndRoute?: boolean;
  whatsappTemplates?: Record<string, { templateId: string; fields?: string[] }>;
}
interface Reminders { enabled?: boolean; daysBefore?: number[]; daysAfter?: number[]; dueDate?: string }
interface Settings {
  messaging: Messaging;
  reminders: Reminders;
  providers: { termii: boolean; email: boolean; defaultSenderId: string | null };
}

const EVENT_LABEL: Record<MessageEvent, string> = {
  payment_received: 'Payment received',
  absent: 'Child absent',
  late: 'Child late',
  gate_release: 'Child left school',
  results_released: 'Results released',
  broadcast: 'School notice',
  fee_reminder_upcoming: 'Fee due soon',
  fee_reminder_overdue: 'Fee overdue',
  parent_invite: 'Account invite',
};

const field = 'w-full min-h-[44px] px-3.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:border-brand-primary focus:ring-1 focus:ring-brand-primary';
const button = 'min-h-[44px] px-5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50';
const card = 'bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4';
const days = (s: string) => s.split(',').map((d) => d.trim()).filter(Boolean).map(Number);

/** How the school sends messages, and when fee reminders go out. The proprietor changes these. */
export function MessagingSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [senderId, setSenderId] = useState('');
  const [whatsappDeviceId, setWhatsappDeviceId] = useState('');
  const [smsUnitCost, setSmsUnitCost] = useState('');
  const [useDndRoute, setUseDndRoute] = useState(false);
  const [templates, setTemplates] = useState<Record<string, { templateId: string; fields: string }>>({});

  const [remindersOn, setRemindersOn] = useState(false);
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [dueDate, setDueDate] = useState('');

  const load = useCallback(async () => {
    const r = await callApi<Settings>('/api/messages/settings');
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    const { messaging: m, reminders: rem } = r.data;
    setSettings(r.data);
    setEnabled(m.enabled !== false);
    setSenderId(m.senderId ?? '');
    setWhatsappDeviceId(m.whatsappDeviceId ?? '');
    setSmsUnitCost(m.smsUnitCost != null ? String(m.smsUnitCost) : '');
    setUseDndRoute(Boolean(m.useDndRoute));
    setTemplates(Object.fromEntries(Object.entries(m.whatsappTemplates ?? {}).map(([k, v]) => [k, { templateId: v.templateId, fields: (v.fields ?? []).join(', ') }])));
    setRemindersOn(Boolean(rem.enabled));
    setBefore((rem.daysBefore ?? []).join(', '));
    setAfter((rem.daysAfter ?? []).join(', '));
    setDueDate(rem.dueDate ?? '');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    setMessage('');
    const r = await callApi('/api/messages/settings', { method: 'POST', body });
    setMessage(r.ok ? done : r.message);
    setBusy(false);
    if (r.ok) load();
  };

  if (!settings) return message ? <p role="alert" className="text-xs font-semibold text-rose-700">{message}</p> : <BrandLoader size="lg" />;

  const sendable = (Object.keys(CATEGORY_OF) as MessageEvent[]).filter((e) => e !== 'parent_invite');

  return (
    <div className="space-y-6">
      {message && <p role="status" className="text-xs font-semibold text-slate-800 bg-slate-100 rounded-xl px-4 py-3">{message}</p>}

      {!settings.providers.termii && (
        <div role="status" className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold">
          No SMS or WhatsApp provider is connected to Eductive yet. You can fill these in now; messages will wait in the queue until it is connected.
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save({ messaging: { enabled, senderId, whatsappDeviceId, smsUnitCost, useDndRoute, whatsappTemplates: Object.fromEntries(Object.entries(templates).map(([k, v]) => [k, { templateId: v.templateId, fields: v.fields.split(',').map((f) => f.trim()).filter(Boolean) }])) } }, 'Messaging settings saved.');
        }}
        className={card}
      >
        <h2 className="text-sm font-bold text-slate-900">Messages to Parents</h2>
        <label className="flex items-center gap-3 min-h-[44px] text-xs font-semibold text-slate-800 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-5 h-5" />
          Send messages to parents
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="ms-sender" className="block text-[11px] font-bold text-slate-600 mb-1.5">Sender name (3 to 11 letters or digits)</label>
            <input id="ms-sender" value={senderId} maxLength={11} onChange={(e) => setSenderId(e.target.value)} className={field} />
            <p className="text-[11px] text-slate-500 mt-1">{settings.providers.defaultSenderId ? 'Left empty, messages use Eductive’s own sender name.' : 'The sender name must be registered with the SMS provider first.'}</p>
          </div>
          <div>
            <label htmlFor="ms-wa" className="block text-[11px] font-bold text-slate-600 mb-1.5">WhatsApp device name</label>
            <input id="ms-wa" value={whatsappDeviceId} onChange={(e) => setWhatsappDeviceId(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="ms-cost" className="block text-[11px] font-bold text-slate-600 mb-1.5">Cost of one SMS part, in naira</label>
            <input id="ms-cost" type="number" inputMode="decimal" min={0} max={1000} step="0.01" value={smsUnitCost} onChange={(e) => setSmsUnitCost(e.target.value)} className={field} />
            <p className="text-[11px] text-slate-500 mt-1">Used to estimate cost when the provider does not report it.</p>
          </div>
          <label className="flex items-center gap-3 min-h-[44px] text-xs font-semibold text-slate-800 cursor-pointer sm:self-center">
            <input type="checkbox" checked={useDndRoute} onChange={(e) => setUseDndRoute(e.target.checked)} className="w-5 h-5" />
            Use the route that reaches numbers with Do Not Disturb on
          </label>
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-3">
          <h3 className="text-xs font-bold text-slate-900">WhatsApp templates</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">WhatsApp only lets a school start a conversation with a template that WhatsApp has approved. Enter the template id for each message and the names of the values it is filled with, in order. A message with no template goes by SMS.</p>
          {sendable.map((event) => (
            <div key={event} className="grid grid-cols-1 sm:grid-cols-[10rem_1fr_1fr] gap-2 items-end">
              <span className="text-xs font-bold text-slate-800 sm:pb-3">{EVENT_LABEL[event]}</span>
              <div>
                <label htmlFor={`tpl-id-${event}`} className="sr-only">Template id for {EVENT_LABEL[event]}</label>
                <input id={`tpl-id-${event}`} placeholder="Template id" value={templates[event]?.templateId ?? ''} onChange={(e) => setTemplates({ ...templates, [event]: { templateId: e.target.value, fields: templates[event]?.fields ?? '' } })} className={field} />
              </div>
              <div>
                <label htmlFor={`tpl-fields-${event}`} className="sr-only">Values for {EVENT_LABEL[event]}</label>
                <input id={`tpl-fields-${event}`} placeholder="Values, separated by commas" value={templates[event]?.fields ?? ''} onChange={(e) => setTemplates({ ...templates, [event]: { templateId: templates[event]?.templateId ?? '', fields: e.target.value } })} className={field} />
              </div>
            </div>
          ))}
        </div>

        <button type="submit" disabled={busy} className={`${button} bg-brand-primary hover:bg-brand-primary-light text-white`}>Save</button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save({ reminders: { enabled: remindersOn, daysBefore: days(before), daysAfter: days(after), dueDate } }, 'Reminder settings saved.');
        }}
        className={card}
      >
        <h2 className="text-sm font-bold text-slate-900">Fee Reminders</h2>
        <p className="text-[11px] text-slate-500 leading-relaxed">Parents who still owe fees get a message on the days you choose. A reminder is never sent twice for the same day, and not to a parent who has opted out.</p>
        <label className="flex items-center gap-3 min-h-[44px] text-xs font-semibold text-slate-800 cursor-pointer">
          <input type="checkbox" checked={remindersOn} onChange={(e) => setRemindersOn(e.target.checked)} className="w-5 h-5" />
          Send fee reminders
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="rem-due" className="block text-[11px] font-bold text-slate-600 mb-1.5">Fees fall due on</label>
            <input id="rem-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="rem-before" className="block text-[11px] font-bold text-slate-600 mb-1.5">Days before the due date</label>
            <input id="rem-before" inputMode="numeric" value={before} onChange={(e) => setBefore(e.target.value)} className={field} />
            <p className="text-[11px] text-slate-500 mt-1">Separate with commas.</p>
          </div>
          <div>
            <label htmlFor="rem-after" className="block text-[11px] font-bold text-slate-600 mb-1.5">Days after the due date</label>
            <input id="rem-after" inputMode="numeric" value={after} onChange={(e) => setAfter(e.target.value)} className={field} />
            <p className="text-[11px] text-slate-500 mt-1">Separate with commas.</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">Students on an instalment plan are reminded before each instalment instead.</p>
        <button type="submit" disabled={busy} className={`${button} bg-brand-primary hover:bg-brand-primary-light text-white`}>Save</button>
      </form>
    </div>
  );
}
