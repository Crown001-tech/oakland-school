'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Landmark,
  Plus,
  CheckCircle2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  X,
  Check,
} from 'lucide-react';
import { formatNaira } from '@/lib/finance-data';
import { PaymentTransaction, ExpenditureRecord } from '@/types/finance';

interface InstitutionalBankAccount {
  id: string;
  name: string;
  bank: string;
  accountNumber: string;
  balance: number;
  displayName: string;
}

export default function BursarBankAccountsPage() {
  const [accounts, setAccounts] = useState<InstitutionalBankAccount[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [expenditures, setExpenditures] = useState<ExpenditureRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/finances');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.data) {
          setAccounts(json.data.institutionalBankAccounts || []);
          setPayments(json.data.payments || []);
          setExpenditures(json.data.expenditures || []);
        }
      }
    } catch {
      // Keep clean state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAddModalOpen) {
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!accountName.trim()) {
      setErrorMsg('Please enter the official account name.');
      return;
    }
    if (!bankName.trim()) {
      setErrorMsg('Please select or enter a commercial bank.');
      return;
    }
    if (accountNumber.replace(/\D/g, '').length !== 10) {
      setErrorMsg('Account number must be exactly 10 digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_bank_account',
          accountName: accountName.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.replace(/\D/g, ''),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to register bank account.');
      }

      const created = json.data;
      const newAcc: InstitutionalBankAccount = {
        id: created.id,
        name: created.account_name,
        bank: created.bank_name,
        accountNumber: created.account_number,
        balance: Number(created.balance || 0),
        displayName: `${created.bank_name} (${created.account_number}) - ${created.account_name}`,
      };
      setAccounts((prev) => [...prev, newAcc]);
      setIsAddModalOpen(false);
      setAccountName('');
      setBankName('');
      setAccountNumber('');
      showToast(`Institutional bank account (${newAcc.bank} - ${newAcc.accountNumber}) registered.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <BrandLoader fullScreen size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bank Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official school commercial bank accounts for tuition collection and expenditure disbursement.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setIsAddModalOpen(true);
          }}
          variant="primary"
          size="md"
          className="min-h-[44px] text-xs font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Bank Account</span>
        </Button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-2.5 shadow-xs text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Bank Accounts Grid */}
      {accounts.length === 0 ? (
        <Card className="p-10 text-center border-slate-200 shadow-xs bg-white space-y-3">
          <Landmark className="w-8 h-8 text-slate-300 mx-auto" />
          <div>
            <p className="text-sm font-bold text-slate-800">No Institutional Bank Accounts Registered</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Click &quot;Add Bank Account&quot; above to register a school commercial bank account.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const matchedInflows = payments
              .filter(
                (p) =>
                  p.receivingAccount?.includes(acc.accountNumber) ||
                  p.receivingAccount?.toLowerCase().includes(acc.bank.toLowerCase())
              )
              .reduce((sum, p) => sum + (p.amount || 0), 0);

            const matchedOutflows = expenditures
              .filter(
                (e) =>
                  e.paymentAccount?.includes(acc.accountNumber) ||
                  e.paymentAccount?.toLowerCase().includes(acc.bank.toLowerCase())
              )
              .reduce((sum, e) => sum + (e.amount || 0), 0);

            const reconciledBalance =
              acc.balance && acc.balance > 0 ? acc.balance : Math.max(0, matchedInflows - matchedOutflows);

            return (
              <Card key={acc.id} className="p-5 border-slate-200 shadow-xs bg-white space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded uppercase tracking-wider">
                      Active Account
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-2">{acc.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{acc.bank}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    NUBAN Account No
                  </span>
                  <span className="text-sm font-mono font-black text-slate-900 tracking-wider">
                    {acc.accountNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" /> Recorded Inflows
                    </span>
                    <p className="font-mono font-bold text-emerald-700 mt-0.5">
                      {formatNaira(matchedInflows)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                      <TrendingDown className="w-3 h-3 text-rose-600" /> Recorded Outflows
                    </span>
                    <p className="font-mono font-bold text-rose-700 mt-0.5">
                      {formatNaira(matchedOutflows)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">Net Book Balance</span>
                  <span className="text-base font-mono font-black text-slate-900">
                    {formatNaira(reconciledBalance)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Bank Account Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-brand-primary text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Register Institutional Bank Account</h3>
                <p className="text-[11px] text-teal-200/80">
                  Add an official school bank account for fee deposits or disbursements
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
                className="w-11 h-11 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Title</label>
                <Input
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Oakland International School - Tuition"
                  className="min-h-[44px] text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Commercial Bank</label>
                <select
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs"
                >
                  <option value="">Select Commercial Bank...</option>
                  <option value="Guaranty Trust Bank">Guaranty Trust Bank (GTBank)</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                  <option value="United Bank for Africa">United Bank for Africa (UBA)</option>
                  <option value="Fidelity Bank">Fidelity Bank</option>
                  <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">10-Digit NUBAN Account Number</label>
                <Input
                  required
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 0123984712"
                  className="min-h-[44px] text-xs font-mono font-bold tracking-wider"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="min-h-[44px] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  className="min-h-[44px] text-xs font-semibold gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Bank Account</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
