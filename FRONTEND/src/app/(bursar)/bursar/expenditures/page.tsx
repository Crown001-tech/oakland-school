'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  ShoppingBag,
  Plus,
  Search,
  Fuel,
  BookOpen,
  Cpu,
  FileText,
  CheckCircle2,
  Check,
  X,
} from 'lucide-react';
import { formatNaira } from '@/lib/finance-data';
import { EXPENDITURE_CATEGORIES, ExpenditureRecord } from '@/types/finance';
import { VoucherModal } from '@/components/finance/VoucherModal';

export default function BursarExpendituresPage() {
  const [expenditures, setExpenditures] = useState<ExpenditureRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modals
  const [activeVoucher, setActiveVoucher] = useState<ExpenditureRecord | null>(null);
  const [isNewVoucherModalOpen, setIsNewVoucherModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Voucher Form State
  const [voucherCategory, setVoucherCategory] = useState<ExpenditureRecord['category'] | ''>('');
  const [voucherDesc, setVoucherDesc] = useState('');
  const [voucherAmount, setVoucherAmount] = useState('');
  const [voucherBeneficiary, setVoucherBeneficiary] = useState('');
  const [voucherAccount, setVoucherAccount] = useState<string>('');
  const [availableAccounts, setAvailableAccounts] = useState<
    Array<{ id: string; name: string; bank: string; accountNumber: string; displayName: string }>
  >([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadExpenditures = async () => {
    try {
      const res = await fetch('/api/finances');
      if (res.ok) {
        const json = await res.json();
        if (json?.success) {
          if (json.data?.expenditures) {
            setExpenditures(json.data.expenditures);
          }
          if (json.data?.institutionalBankAccounts && json.data.institutionalBankAccounts.length > 0) {
            setAvailableAccounts(json.data.institutionalBankAccounts);
            setVoucherAccount(
              `${json.data.institutionalBankAccounts[0].bank} (${json.data.institutionalBankAccounts[0].accountNumber})`
            );
          }
        }
      }
    } catch {
      // Keep empty state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenditures();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNewVoucherModalOpen) {
        setIsNewVoucherModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewVoucherModalOpen]);

  const formatCategoryLabel = (cat: string) => cat.replace(/\s*&\s*/g, ' and ');

  const totalExpenditures = expenditures.reduce((a, b) => a + b.amount, 0);

  // Dynamic Category Totals
  const categoryTotal = (category: ExpenditureRecord['category']) =>
    expenditures.filter((e) => e.category === category).reduce((a, b) => a + b.amount, 0);
  const powerTotal = categoryTotal('Power');
  const laboratoriesTotal = categoryTotal('Laboratories');
  const technologyTotal = categoryTotal('Technology');
  const stationeryTotal = categoryTotal('Stationery');

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amt = Number(voucherAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (!voucherBeneficiary.trim()) {
      setErrorMsg('Please enter the beneficiary name.');
      return;
    }

    if (!voucherDesc.trim()) {
      setErrorMsg('Please enter an expenditure description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_voucher',
          category: voucherCategory,
          description: voucherDesc.trim(),
          amount: amt,
          vendor: voucherBeneficiary.trim(),
          paymentAccount: voucherAccount,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.message || 'Failed to record voucher in database.');
      }

      const inserted = resData.data;
      const newVch: ExpenditureRecord = {
        id: inserted?.id || `exp-${Date.now()}`,
        voucherNo: inserted?.voucher_number || '—',
        category: (inserted?.category || voucherCategory) as ExpenditureRecord['category'],
        description: inserted?.description || voucherDesc.trim(),
        amount: Number(inserted?.amount ?? amt),
        beneficiary: inserted?.vendor || voucherBeneficiary.trim(),
        approvedBy: inserted?.approved_by || inserted?.recorded_by || '—',
        paymentAccount: (inserted?.payment_account || voucherAccount) as ExpenditureRecord['paymentAccount'],
        date: inserted?.date || new Date().toLocaleDateString('en-GB'),
        status: 'Approved & Paid',
      };

      setExpenditures((prev) => [newVch, ...prev]);
      setIsNewVoucherModalOpen(false);
      setVoucherDesc('');
      setVoucherAmount('');
      setVoucherBeneficiary('');
      setVoucherCategory('');
      setActiveVoucher(newVch);
      showToast(`Expenditure voucher ${newVch.voucherNo} (${formatNaira(amt)}) recorded successfully.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenditures = expenditures.filter((vch) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      vch.beneficiary.toLowerCase().includes(query) ||
      vch.description.toLowerCase().includes(query) ||
      vch.voucherNo.toLowerCase().includes(query);
    const matchesCat = categoryFilter === 'All' || vch.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  if (isLoading) {
    return <BrandLoader fullScreen size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expenditures</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operating expenses, payment vouchers, and vendor disbursements.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setIsNewVoucherModalOpen(true);
          }}
          variant="primary"
          size="md"
          className="text-xs font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Payment Voucher</span>
        </Button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-2.5 shadow-xs text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Power</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">{formatNaira(powerTotal)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Generators and power</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Fuel className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Laboratories</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">{formatNaira(laboratoriesTotal)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Science reagents and kits</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Technology</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">{formatNaira(technologyTotal)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Dedicated connections</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stationery</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">{formatNaira(stationeryTotal)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Printing and materials</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <Input
            placeholder="Search vouchers by beneficiary, description, or voucher number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs min-h-[44px]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 cursor-pointer"
        >
          <option value="All">All Categories</option>
          {EXPENDITURE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Expenditures Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Vouchers Ledger ({filteredExpenditures.length} {filteredExpenditures.length === 1 ? 'Voucher' : 'Vouchers'})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Authorized school operating disbursements
            </CardDescription>
          </div>
          <span className="text-xs font-bold text-slate-800 font-mono">
            Total: {formatNaira(totalExpenditures)}
          </span>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0f3a3e] text-white font-bold">
              <tr>
                <th className="py-2.5 px-4">Voucher Number</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-3">Beneficiary</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Debited Account</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredExpenditures.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No Expenditure Vouchers Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery || categoryFilter !== 'All'
                        ? 'Try adjusting your search criteria or active filters.'
                        : 'Operating disbursement vouchers and vendor payments will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenditures.map((vch) => (
                  <tr key={vch.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-mono font-bold text-slate-800">{vch.voucherNo}</p>
                      <p className="text-[10px] text-slate-400">{vch.date}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {formatCategoryLabel(vch.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                      {vch.description}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {vch.beneficiary}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-700 text-sm">
                      {formatNaira(vch.amount)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-600">
                      {vch.paymentAccount}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {vch.status === 'Approved & Paid' ? 'Paid' : vch.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveVoucher(vch)}
                        className="min-h-[44px] sm:min-h-[32px] px-2.5 text-[10px] font-bold text-slate-800 border-slate-300 hover:bg-slate-100"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Print Voucher
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modals */}
      <VoucherModal
        voucher={activeVoucher}
        onClose={() => setActiveVoucher(null)}
      />

      {isNewVoucherModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsNewVoucherModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Record Operating Expenditure Voucher
                </h3>
                <p className="text-[10px] text-slate-400">
                  Log campus expense for power, supplies, or repairs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewVoucherModalOpen(false)}
                aria-label="Close voucher modal"
                className="w-11 h-11 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher}>
              <div className="p-5 space-y-4 text-xs">
                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={voucherCategory}
                    onChange={(e) => setVoucherCategory(e.target.value as ExpenditureRecord['category'] | '')}
                    className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white text-slate-800"
                    required
                  >
                    <option value="">Select Category</option>
                    {EXPENDITURE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Beneficiary Name
                  </label>
                  <Input
                    required
                    value={voucherBeneficiary}
                    onChange={(e) => setVoucherBeneficiary(e.target.value)}
                    placeholder="e.g. Fuel Supplier, Chemical Vendor..."
                    className="min-h-[44px] text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Amount (₦)
                    </label>
                    <Input
                      type="number"
                      required
                      value={voucherAmount}
                      onChange={(e) => setVoucherAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="min-h-[44px] text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Debited Payment Account
                    </label>
                    <select
                      value={voucherAccount}
                      onChange={(e) => setVoucherAccount(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs"
                    >
                      {availableAccounts.length > 0 ? (
                        availableAccounts.map((acc) => (
                          <option key={acc.id} value={`${acc.bank} (${acc.accountNumber})`}>
                            {acc.bank} ({acc.accountNumber}) - {acc.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No bank account configured</option>
                      )}
                      <option value="Petty Cash Desk">Campus Petty Cash Desk</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={voucherDesc}
                    onChange={(e) => setVoucherDesc(e.target.value)}
                    placeholder="Provide details of the item or service purchased..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-teal-600"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewVoucherModalOpen(false)}
                  disabled={isSubmitting}
                  className="min-h-[44px] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  className="min-h-[44px] bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-bold gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Authorize Voucher</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
