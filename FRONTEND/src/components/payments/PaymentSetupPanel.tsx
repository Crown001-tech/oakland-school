'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { callApi } from '@/lib/client-api';

interface Status {
  paystackConnected: boolean;
  testMode: boolean;
  subaccountConfigured: boolean;
  accountLast4: string | null;
  enabled: boolean;
  ready: boolean;
  feeBearer: 'account' | 'subaccount';
}
interface Bank { name: string; code: string }

const field = 'w-full min-h-[44px] px-3.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:border-brand-primary focus:ring-1 focus:ring-brand-primary';
const button = 'min-h-[44px] px-5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50';
const card = 'bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4';

/**
 * The proprietor connects the school's own bank account. Parents then pay straight into it through Paystack, and
 * Eductive never holds the money. Only the last four digits of the account number are kept.
 */
export function PaymentSetupPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const r = await callApi<Status>('/api/payments/settings');
    if (r.ok) setStatus(r.data);
    else setMessage(r.message);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!status?.paystackConnected) return;
    (async () => {
      const r = await callApi<Bank[]>('/api/payments/settings', { method: 'POST', body: { action: 'banks' } });
      if (r.ok) setBanks(r.data);
    })();
  }, [status?.paystackConnected]);

  const act = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    setMessage('');
    const r = await callApi('/api/payments/settings', { method: 'POST', body });
    setMessage(r.ok ? done : r.message);
    setBusy(false);
    if (r.ok) {
      setAccountNumber('');
      setReplacing(false);
      load();
    }
  };

  if (!status) return message ? <p role="alert" className="text-xs font-semibold text-rose-700">{message}</p> : <BrandLoader size="lg" />;

  const showForm = !status.subaccountConfigured || replacing;

  return (
    <div className="space-y-6">
      {message && <p role="status" className="text-xs font-semibold text-slate-800 bg-slate-100 rounded-xl px-4 py-3">{message}</p>}

      {!status.paystackConnected && (
        <div role="alert" className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold">
          Paystack is not connected to Eductive yet, so online payments cannot be switched on. Ask Eductive to add the Paystack key.
        </div>
      )}
      {status.paystackConnected && status.testMode && (
        <div role="status" className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 font-semibold">
          Paystack is in test mode. Payments here use test cards and no real money moves.
        </div>
      )}

      <section className={card}>
        <h2 className="text-sm font-bold text-slate-900">School Bank Account</h2>
        {!status.subaccountConfigured && !status.paystackConnected ? <p className="text-xs text-slate-500">No account is connected yet. You can add the school’s account here once Paystack is connected.</p> : null}
        {status.subaccountConfigured && !replacing ? (
          <>
            <p className="text-xs text-slate-700">Parents’ payments go to the school’s account ending <span className="font-mono font-bold">{status.accountLast4 ?? '—'}</span>.</p>
            <button type="button" onClick={() => setReplacing(true)} className={`${button} border border-slate-200 text-slate-700 hover:bg-slate-50`}>Change Account</button>
          </>
        ) : null}
        {showForm && status.paystackConnected ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act({ action: 'create_subaccount', businessName, bankCode, accountNumber, replace: replacing }, 'The school’s account is connected.');
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <div>
              <label htmlFor="pay-name" className="block text-[11px] font-bold text-slate-600 mb-1.5">Account name</label>
              <input id="pay-name" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="pay-bank" className="block text-[11px] font-bold text-slate-600 mb-1.5">Bank</label>
              <select id="pay-bank" required value={bankCode} onChange={(e) => setBankCode(e.target.value)} className={field}>
                <option value="" disabled>Choose</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pay-number" className="block text-[11px] font-bold text-slate-600 mb-1.5">Account number</label>
              <input id="pay-number" required inputMode="numeric" pattern="\d{10}" maxLength={10} autoComplete="off" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} className={`${field} font-mono`} />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <button type="submit" disabled={busy} className={`${button} bg-brand-primary hover:bg-brand-primary-light text-white`}>{busy ? 'Connecting' : 'Connect Account'}</button>
              {replacing && <button type="button" onClick={() => setReplacing(false)} className={`${button} text-slate-600 hover:bg-slate-100`}>Cancel</button>}
            </div>
          </form>
        ) : null}
      </section>

      {status.subaccountConfigured && (
        <section className={card}>
          <h2 className="text-sm font-bold text-slate-900">Online Payments</h2>
          <p className="text-xs text-slate-700">
            {status.ready ? 'On. Parents see the Pay Online button on their fees page.' : status.enabled ? 'Waiting for Paystack to be connected to Eductive.' : 'Off. Parents cannot pay online.'}
          </p>
          <button type="button" disabled={busy} onClick={() => act({ action: 'set_enabled', enabled: !status.enabled }, status.enabled ? 'Online payments are off.' : 'Online payments are on.')} className={`${button} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
            {status.enabled ? 'Turn Off' : 'Turn On'}
          </button>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold text-slate-900">Who pays Paystack’s fee</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">Paystack charges a small fee on every payment. It can come out of what the school receives, or Eductive can carry it.</p>
            <div className="flex flex-wrap gap-2">
              {([['subaccount', 'The school'], ['account', 'Eductive']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={busy}
                  onClick={() => status.feeBearer !== value && act({ action: 'set_fee_bearer', feeBearer: value }, `${label} now pays Paystack’s fee.`)}
                  className={`${button} border ${status.feeBearer === value ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
