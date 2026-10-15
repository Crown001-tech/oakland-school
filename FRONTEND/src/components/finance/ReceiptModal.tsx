'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { PaymentTransaction, StudentFeeLedgerItem } from '@/types/finance';
import { numberToNairaWords, formatNaira } from '@/lib/finance-data';
import { Printer, X, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ReceiptModalProps {
  payment: PaymentTransaction | null;
  studentItem?: StudentFeeLedgerItem | null;
  onClose: () => void;
}

export function ReceiptModal({ payment, studentItem, onClose }: ReceiptModalProps) {
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const balance = studentItem ? studentItem.balance : 0;
  const bursarName = 'Mrs Folake Esther';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Controls Bar */}
        <div className="print:hidden p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              Official Electronic Receipt
            </span>
            <span className="text-xs text-slate-300 font-medium font-mono">
              {payment.receiptNo}
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
              <span>Print Official Receipt</span>
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

        {/* Printable Official Receipt */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 print:p-0 print:m-0 relative">
          {/* Subtle Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
            <span className="text-8xl font-black rotate-[-25deg] text-slate-900 tracking-widest uppercase">
              OAKLAND
            </span>
          </div>

          {/* School Header */}
          <div className="text-center pb-5 border-b-2 border-[#0f3a3e]">
            <div className="flex justify-center mb-2">
              <Logo size="lg" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
              Oakland Schools, Lagos
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              14 Academic Crescent, Victoria Island, Lagos State &bull; Tel: +234 800 625 5263
            </p>
            <p className="text-[10px] text-teal-800 font-mono font-semibold uppercase tracking-wider mt-0.5">
              Bursary • Official Fee Receipt
            </p>
          </div>

          {/* Receipt Serial & Date Banner */}
          <div className="flex items-center justify-between py-3 border-b border-slate-100 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Receipt Number</span>
              <span className="font-mono font-black text-teal-900 text-sm">{payment.receiptNo}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date</span>
              <span className="font-medium text-slate-700">{payment.timestamp}</span>
            </div>
          </div>

          {/* Student Profile Information */}
          <div className="my-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Student Full Name</span>
              <span className="font-extrabold text-slate-900">{payment.studentName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission ID</span>
              <span className="font-mono font-bold text-teal-900">{payment.admissionNo}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Class</span>
              <span className="font-bold text-slate-900">{payment.class}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Academic Session</span>
              <span className="font-medium text-slate-700">2026/2027</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Term</span>
              <span className="font-medium text-slate-700">First Term</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Channel</span>
              <span className="font-semibold text-slate-800">{payment.method}</span>
            </div>
          </div>

          {/* Fee Itemization Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0f3a3e] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-3">Description of Fee</th>
                  <th className="py-2.5 px-3">Payment Ref</th>
                  <th className="py-2.5 px-3 text-right">Amount (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="py-2.5 px-3">
                    <p className="font-bold text-slate-900">First Term Tuition and Composite Levies</p>
                    <p className="text-[10px] text-slate-500">
                      Includes ICT, Science Lab, Development Levy, and Academic Materials
                    </p>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {payment.bankRef}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 text-sm">
                    {formatNaira(payment.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Words & Total Box */}
          <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-bold">Total Amount Paid:</span>
              <span className="text-lg font-black text-emerald-800 font-mono">{formatNaira(payment.amount)}</span>
            </div>
            <p className="text-[11px] text-emerald-900 italic">
              <strong>Amount in Words:</strong> {numberToNairaWords(payment.amount)}
            </p>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-200/80 text-[11px]">
              <span className="text-slate-600">Outstanding Balance on Account:</span>
              <span className="font-mono font-bold text-slate-800">{formatNaira(balance)}</span>
            </div>
          </div>

          {/* Bank Reconciliation Details */}
          <div className="mt-3 text-[10px] text-slate-500 flex items-center justify-between font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span>Receiving Account: {payment.receivingAccount}</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Bank Verified
            </span>
          </div>

          {/* Official Stamp & Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-6 mt-4 border-t border-slate-200 text-xs items-center">
            {/* Stamp simulation */}
            <div className="p-3 border-2 border-dashed border-emerald-700 rounded-xl text-center bg-emerald-50/30">
              <div className="text-[9px] font-black text-emerald-900 uppercase tracking-widest">
                OAKLAND SCHOOLS BURSARY
              </div>
              <div className="text-xs font-black text-emerald-700 uppercase my-0.5">
                ★ OFFICIAL RECEIPT PAID ★
              </div>
              <div className="text-[9px] font-mono text-emerald-800">
                DATE: {payment.timestamp.split(',')[0]}
              </div>
            </div>

            <div className="text-right">
              <div className="h-8 border-b border-dashed border-slate-300 flex items-end justify-end pb-1 font-serif italic text-slate-800">
                {bursarName} (Bursar)
              </div>
              <p className="font-extrabold text-slate-900 mt-1">{bursarName}</p>
              <p className="text-[10px] text-slate-500">Bursar &bull; Bursary Department &bull; OAK-BUR-001</p>
            </div>
          </div>

          {/* Legal disclaimer */}
          <p className="text-center text-[9px] text-slate-400 mt-5 italic">
            Fees paid are non-refundable and subject to Oakland Schools terms of admission. Valid without physical stamp if electronically verified.
          </p>
        </div>
      </div>
    </div>
  );
}
