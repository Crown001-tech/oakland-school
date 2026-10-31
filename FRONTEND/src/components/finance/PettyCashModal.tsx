'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PETTY_CASH_CATEGORIES, PettyCashTransaction } from '@/types/finance';
import { X, Check, Wallet } from 'lucide-react';

interface PettyCashModalProps {
  currentBalance: number;
  initialType?: 'Inflow' | 'Outflow';
  onRecord: (transaction: PettyCashTransaction) => void;
  onClose: () => void;
}

export function PettyCashModal({ currentBalance, initialType, onRecord, onClose }: PettyCashModalProps) {
  const [item, setItem] = useState('');
  const [category, setCategory] = useState<PettyCashTransaction['category'] | ''>('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<PettyCashTransaction['type']>(initialType || 'Outflow');
  const [requestedBy, setRequestedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    const amt = Number(amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (!item.trim()) {
      setErrorMsg('Please enter an item description.');
      return;
    }

    if (!category) {
      setErrorMsg('Please choose a category.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_petty_cash',
          description: item.trim(),
          category,
          amount: amt,
          type,
          requestedBy: requestedBy.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.message || 'Failed to save petty cash transaction.');
      }

      const inserted = resData.data;
      const balanceAfter =
        type === 'Inflow' ? currentBalance + amt : Math.max(0, currentBalance - amt);

      const newTx: PettyCashTransaction = {
        id: inserted?.id || `pc-${Date.now()}`,
        receiptNo: inserted?.receipt_number || '—',
        date: new Date(inserted?.date || Date.now()).toLocaleDateString('en-GB'),
        item: item.trim(),
        category: (inserted?.category || category) as PettyCashTransaction['category'],
        amount: amt,
        type,
        balanceAfter,
        requestedBy: requestedBy.trim() || '—',
        approvedBy: inserted?.approved_by || '—',
      };

      onRecord(newTx);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error communicating with server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-brand-primary text-teal-300 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Record Petty Cash Transaction</h3>
              <p className="text-[10px] text-slate-400">Daily cash float record</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Transaction Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PettyCashTransaction['type'])}
                  className="w-full min-h-[44px] sm:h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  <option value="Outflow">Expense</option>
                  <option value="Inflow">Add Cash to Float</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PettyCashTransaction['category'] | '')}
                  required
                  className="w-full min-h-[44px] sm:h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  <option value="">Select Category</option>
                  {PETTY_CASH_CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Item Description
              </label>
              <textarea
                rows={2}
                required
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="e.g. Courier dispatch of documents, replacement plumbing valve..."
                className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:outline-teal-600"
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
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="font-mono font-bold text-sm min-h-[44px] sm:h-10"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Requested By
                </label>
                <Input
                  required
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  placeholder="e.g. Science Teacher"
                  className="text-xs min-h-[44px] sm:h-10"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold gap-1.5 min-h-[44px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Record to Cash Book</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
