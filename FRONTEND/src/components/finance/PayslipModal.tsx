'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { PayrollRecord } from '@/types/finance';
import { numberToNairaWords, formatNaira } from '@/lib/finance-data';
import { Printer, X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface PayslipModalProps {
  record: PayrollRecord | null;
  onClose: () => void;
}

export function PayslipModal({ record, onClose }: PayslipModalProps) {
  if (!record) return null;

  const grossEarnings = record.basicSalary + record.responsibilityAllowance + record.otherAllowances;
  const totalDeductions = record.taxDeduction + (record.cooperativeDeduction || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Controls Bar (hidden during print) */}
        <div className="print:hidden p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">
              Official Payroll Document
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Employee Payslip &bull; {record.employeeId}
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
              <span>Print Payslip</span>
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

        {/* Printable Payslip Body */}
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
                <p className="text-[10px] text-teal-800 font-semibold font-mono">
                  Bursary &bull; Salary Advice
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-[#0f3a3e] text-white font-mono font-bold text-xs">
                {record.payPeriod.toUpperCase()}
              </span>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Doc: PAY-{record.employeeId}</p>
            </div>
          </div>

          {/* Employee Identification Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-100 text-xs bg-slate-50/70 p-3 rounded-xl mt-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Name</span>
              <span className="font-extrabold text-slate-900">{record.name}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff ID</span>
              <span className="font-mono font-bold text-teal-900">{record.employeeId}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role</span>
              <span className="font-semibold text-slate-800">{record.role}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
              <span className="font-semibold text-slate-800">{record.department}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bank Name</span>
              <span className="font-bold text-slate-800">{record.bankName && record.bankName !== '—' ? record.bankName : '—'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Number</span>
              <span className="font-mono font-bold text-slate-900">{record.bankAccount && record.bankAccount !== '—' ? record.bankAccount : '—'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disbursement Channel</span>
              <span className="font-semibold text-slate-800">Commercial Bank Transfer</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
              <span className={`inline-flex items-center gap-1 font-bold ${record.status === 'Approved & Disbursed' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {record.status === 'Approved & Disbursed' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Disbursed
                  </>
                ) : (
                  'Pending'
                )}
              </span>
            </div>
          </div>

          {/* Earnings vs Deductions Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            {/* EARNINGS */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-[#0f3a3e] text-white px-3.5 py-2 font-bold text-xs uppercase tracking-wider flex justify-between">
                <span>Gross Earnings</span>
                <span>Amount (₦)</span>
              </div>
              <div className="p-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Basic Salary</span>
                  <span className="font-mono font-semibold">{formatNaira(record.basicSalary)}</span>
                </div>
                {record.responsibilityAllowance > 0 && (
                  <div className="flex justify-between text-teal-800 font-semibold bg-teal-50/70 p-1.5 rounded">
                    <span>
                      {record.role.includes('Class Teacher')
                        ? 'Class Teacher Responsibility Allowance'
                        : 'Leadership Responsibility Allowance'}
                    </span>
                    <span className="font-mono">+{formatNaira(record.responsibilityAllowance)}</span>
                  </div>
                )}
                {record.otherAllowances > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Transport and Utility Allowances</span>
                    <span className="font-mono">+{formatNaira(record.otherAllowances)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-slate-900">
                  <span>Total Gross Earnings</span>
                  <span className="font-mono">{formatNaira(grossEarnings)}</span>
                </div>
              </div>
            </div>

            {/* DEDUCTIONS */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-800 text-white px-3.5 py-2 font-bold text-xs uppercase tracking-wider flex justify-between">
                <span>Deductions</span>
                <span>Amount (₦)</span>
              </div>
              <div className="p-3.5 space-y-2.5 text-xs">
                {record.taxDeduction > 0 ? (
                  <div className="flex justify-between text-slate-700">
                    <div>
                      <p className="font-medium">PAYE Tax</p>
                      <p className="text-[10px] text-slate-400">Statutory Tax Deduction</p>
                    </div>
                    <span className="font-mono text-rose-700">-{formatNaira(record.taxDeduction)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-700">
                    <div>
                      <p className="font-medium">Statutory Deductions</p>
                      <p className="text-[10px] text-slate-400">Zero pension and tax deductions</p>
                    </div>
                    <span className="font-mono text-slate-500">₦0</span>
                  </div>
                )}
                {record.cooperativeDeduction > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Staff Welfare Deduction</span>
                    <span className="font-mono text-rose-700">-{formatNaira(record.cooperativeDeduction)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-slate-900">
                  <span>Total Deductions</span>
                  <span className="font-mono">-{formatNaira(totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Callout */}
          <div className="mt-5 p-4 rounded-xl bg-[#0f3a3e]/5 border-2 border-[#0f3a3e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-extrabold text-[#0f3a3e] uppercase tracking-wider block">
                Net Disbursed Take-Home Pay
              </span>
              <p className="text-xs text-slate-600 italic mt-0.5">
                Amount in Words: <strong>{numberToNairaWords(record.netSalary)}</strong>
              </p>
            </div>
            <div className="text-right sm:text-right">
              <span className="text-2xl sm:text-3xl font-black text-[#0f3a3e] font-mono tracking-tight">
                {formatNaira(record.netSalary)}
              </span>
            </div>
          </div>

          {/* Official Signatures & Seal */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-200 text-xs">
            <div>
              <div className="h-10 border-b border-dashed border-slate-300 flex items-end pb-1 font-serif italic text-slate-700">
                Folake Esther
              </div>
              <p className="font-extrabold text-slate-900 mt-1">Mrs Folake Esther</p>
              <p className="text-[10px] text-slate-500">Bursar &bull; OAK-BUR-001</p>
            </div>

            <div className="text-right">
              <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-end pb-1 font-serif italic text-[#b3141f]">
                Proprietor
              </div>
              <p className="font-extrabold text-slate-900 mt-1">Office of the Proprietor</p>
              <p className="text-[10px] text-slate-500">School Proprietor</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>This is an official computer-generated payslip issued by Oakland Schools Bursary.</span>
            <span>Electronic Copy &bull; Confirmed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
