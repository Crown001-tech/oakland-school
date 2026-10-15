'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { ExpenditureRecord } from '@/types/finance';
import { numberToNairaWords, formatNaira } from '@/lib/finance-data';
import { Printer, X, CheckCircle2, Shield } from 'lucide-react';

interface VoucherModalProps {
  voucher: ExpenditureRecord | null;
  onClose: () => void;
}

export function VoucherModal({ voucher, onClose }: VoucherModalProps) {
  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Controls Bar */}
        <div className="print:hidden p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
              Financial Disbursement Voucher
            </span>
            <span className="text-xs text-slate-300 font-medium font-mono">
              {voucher.voucherNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-bold gap-1.5 h-8 px-3"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Payment Voucher</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Official Voucher */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 print:p-0 print:m-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-[#0f3a3e] pb-5">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                  Oakland Schools, Lagos
                </h1>
                <p className="text-[11px] text-slate-500">
                  14 Academic Crescent, Victoria Island, Lagos &bull; +234 800 625 5263
                </p>
                <p className="text-[10px] text-teal-800 font-mono font-semibold uppercase">
                  Bursary &bull; Official Payment Voucher
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-mono font-bold text-xs">
                {voucher.voucherNo}
              </span>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Date: {voucher.date}</p>
            </div>
          </div>

          {/* Classification & Payee Details */}
          <div className="grid grid-cols-2 gap-3 py-4 border-b border-slate-100 text-xs mt-3 bg-slate-50 p-3 rounded-xl">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Beneficiary Vendor
              </span>
              <span className="font-extrabold text-slate-900 text-sm">{voucher.beneficiary}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Expense Category
              </span>
              <span className="font-bold text-teal-900">{voucher.category}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Debited Account
              </span>
              <span className="font-medium text-slate-800">{voucher.paymentAccount}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Invoice Reference
              </span>
              <span className="font-mono font-semibold text-slate-700">
                {voucher.invoiceNo || 'N/A (Direct Operational)'}
              </span>
            </div>
          </div>

          {/* Operational Description */}
          <div className="mt-4 p-3.5 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Expenditure Description
            </span>
            <p className="text-slate-800 font-medium leading-relaxed">
              {voucher.description}
            </p>
          </div>

          {/* Amount Box */}
          <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Authorized Amount
              </span>
              <span className="text-xs text-slate-300 italic block mt-0.5">
                {numberToNairaWords(voucher.amount)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {formatNaira(voucher.amount)}
              </span>
            </div>
          </div>

          {/* Signatures and Authorizations */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-200 text-[11px]">
            <div>
              <div className="h-8 border-b border-dashed border-slate-300 flex items-end pb-1 font-serif italic text-slate-800 text-sm">
                Folake Esther
              </div>
              <p className="font-extrabold text-slate-900 mt-1">Prepared By</p>
              <p className="text-[10px] text-slate-500">Mrs Folake Esther (Bursar)</p>
            </div>

            <div className="text-right">
              <div className="h-8 border-b border-dashed border-slate-300 flex items-end justify-end pb-1 font-serif italic text-[#0f3a3e] text-sm">
                Proprietor
              </div>
              <p className="font-extrabold text-slate-900 mt-1">Proprietor Approval</p>
              <p className="text-[10px] text-slate-500">Office of the Proprietor</p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Institutional Accounting Voucher &bull; Oakland Schools Internal Audit</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disbursed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
