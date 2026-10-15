'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PayrollRecord } from '@/types/finance';
import { calculateNetSalary, formatNaira } from '@/lib/finance-data';
import { X, Check, Calculator, DollarSign } from 'lucide-react';

interface SalaryAdjustmentModalProps {
  record: PayrollRecord | null;
  onSave: (updatedRecord: PayrollRecord) => void;
  onClose: () => void;
}

export function SalaryAdjustmentModal({ record, onSave, onClose }: SalaryAdjustmentModalProps) {
  if (!record) return null;

  const [basicSalary, setBasicSalary] = useState(record.basicSalary);
  const [responsibilityAllowance, setResponsibilityAllowance] = useState(record.responsibilityAllowance);
  const [otherAllowances, setOtherAllowances] = useState(record.otherAllowances);
  const [cooperativeDeduction, setCooperativeDeduction] = useState(record.cooperativeDeduction);

  const { gross, tax, pension, net } = calculateNetSalary(
    Number(basicSalary) || 0,
    Number(responsibilityAllowance) || 0,
    Number(otherAllowances) || 0,
    Number(cooperativeDeduction) || 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: PayrollRecord = {
      ...record,
      basicSalary: Number(basicSalary) || 0,
      responsibilityAllowance: Number(responsibilityAllowance) || 0,
      otherAllowances: Number(otherAllowances) || 0,
      taxDeduction: tax,
      pensionDeduction: pension,
      cooperativeDeduction: Number(cooperativeDeduction) || 0,
      netSalary: net,
    };
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#0f3a3e] text-teal-300 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Adjust Staff Compensation</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {record.name} ({record.employeeId}) &bull; {record.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Designated Role</span>
                <p className="font-extrabold text-slate-900">{record.role}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Bank Account</span>
                <p className="font-mono text-slate-800">{record.bankName} - {record.bankAccount}</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Basic Monthly Salary (₦)
                </label>
                <Input
                  type="number"
                  required
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="font-mono font-bold text-sm h-9"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Responsibility Allowance (₦)
                  </label>
                  {record.role.includes('Class Teacher') && (
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                      Standard: ₦35,000 for Class Teachers
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  required
                  value={responsibilityAllowance}
                  onChange={(e) => setResponsibilityAllowance(Number(e.target.value))}
                  className="font-mono font-bold text-sm h-9"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Other Allowances (Transport, Housing, Hazard) (₦)
                </label>
                <Input
                  type="number"
                  required
                  value={otherAllowances}
                  onChange={(e) => setOtherAllowances(Number(e.target.value))}
                  className="font-mono font-bold text-sm h-9"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Voluntary Staff Welfare Deduction (₦)
                </label>
                <Input
                  type="number"
                  required
                  value={cooperativeDeduction}
                  onChange={(e) => setCooperativeDeduction(Number(e.target.value))}
                  className="font-mono font-bold text-sm h-9"
                />
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                Live Statutory Recalculation
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-300">
                  Gross Earnings: <span className="font-mono text-white font-bold">{formatNaira(gross)}</span>
                </div>
                <div className="text-slate-300">
                  PAYE Tax (5%): <span className="font-mono text-rose-400 font-bold">-{formatNaira(tax)}</span>
                </div>
                <div className="text-slate-300">
                  Welfare: <span className="font-mono text-rose-400 font-bold">-{formatNaira(cooperativeDeduction)}</span>
                </div>
              </div>
              <div className="border-t border-slate-700 pt-2 flex items-center justify-between text-sm font-black">
                <span className="text-teal-300">Net Take-Home Pay:</span>
                <span className="font-mono text-emerald-400 text-base">{formatNaira(net)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-bold gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Update Compensation</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
