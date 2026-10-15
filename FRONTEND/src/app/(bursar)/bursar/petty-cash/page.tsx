'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Wallet,
  Plus,
  CheckCircle2,
  Printer,
  TrendingDown,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { PettyCashTransaction } from '@/types/finance';
import { formatNaira } from '@/lib/finance-data';
import { PettyCashModal } from '@/components/finance/PettyCashModal';

export default function BursarPettyCashPage() {
  const [pettyCash, setPettyCash] = useState<PettyCashTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Inflow' | 'Outflow'>('Outflow');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadPettyCash = async () => {
    try {
      const res = await fetch('/api/finances');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.data?.pettyCash) {
          setPettyCash(json.data.pettyCash);
        }
      }
    } catch {
      // Keep empty state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPettyCash();
  }, []);

  const currentBalance = pettyCash.length > 0 ? pettyCash[0].balanceAfter : 0;
  const totalInflow = pettyCash.filter((t) => t.type === 'Inflow').reduce((a, b) => a + b.amount, 0);
  const totalOutflow = pettyCash.filter((t) => t.type === 'Outflow').reduce((a, b) => a + b.amount, 0);

  const handleRecordPettyCash = (tx: PettyCashTransaction) => {
    setPettyCash((prev) => [tx, ...prev]);
    setIsModalOpen(false);
    showToast(`Petty cash ${tx.type === 'Inflow' ? 'replenishment' : 'expense'} of ${formatNaira(tx.amount)} recorded.`);
  };

  if (isLoading) {
    return <BrandLoader fullScreen size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Petty Cash</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily cash float records, emergency expenses, and replenishment log.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          size="md"
          className="text-xs font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Record Entry</span>
        </Button>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-2.5 shadow-xs text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Float Ledger Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Current Float Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-teal-800 mt-2">{formatNaira(currentBalance)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Cash float available in safe</p>
        </Card>

        <Card className="p-4 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Inflows
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{formatNaira(totalInflow)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Cash replenishment total</p>
        </Card>

        <Card className="p-4 border-slate-200 shadow-xs bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Outflows
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{formatNaira(totalOutflow)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Minor campus disbursements</p>
        </Card>
      </div>

      {/* Zero Float Guidance Banner */}
      {pettyCash.length === 0 && (
        <Card className="p-4 border-teal-200 bg-teal-50/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <Coins className="w-5 h-5 text-teal-800 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-teal-950">Campus Safe Cash Float</p>
              <p className="text-[11px] text-teal-900/80 mt-0.5">
                No cash float has been logged yet for the current term. Record an initial float replenishment from the commercial bank account into the campus cash register.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setModalType('Inflow');
              setIsModalOpen(true);
            }}
            className="text-xs font-bold shrink-0 bg-teal-800 hover:bg-teal-900 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Opening Float</span>
          </Button>
        </Card>
      )}

      {/* Petty Cash Journal Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Petty Cash Journal ({pettyCash.length} {pettyCash.length === 1 ? 'Entry' : 'Entries'})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Chronological log of receipts and running cash register
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs border-slate-300 font-semibold gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Journal</span>
          </Button>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0f3a3e] text-white font-bold">
              <tr>
                <th className="py-2.5 px-4">Receipt Number</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-4">Item Description</th>
                <th className="py-2.5 px-3">Requested By</th>
                <th className="py-2.5 px-3 text-right">Inflow</th>
                <th className="py-2.5 px-3 text-right">Outflow</th>
                <th className="py-2.5 px-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pettyCash.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No Petty Cash Entries Recorded</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click &quot;Record Entry&quot; above to log cash replenishment or minor expenses.
                    </p>
                  </td>
                </tr>
              ) : (
                pettyCash.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-mono font-bold text-slate-900">{tx.receiptNo}</p>
                      <p className="text-[10px] text-slate-400">{tx.date}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-sm">
                      {tx.item}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {tx.requestedBy}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                      {tx.type === 'Inflow' ? `+${formatNaira(tx.amount)}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-700 font-bold">
                      {tx.type === 'Outflow' ? `-${formatNaira(tx.amount)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                      {formatNaira(tx.balanceAfter)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <PettyCashModal
          currentBalance={currentBalance}
          initialType={modalType}
          onRecord={handleRecordPettyCash}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
