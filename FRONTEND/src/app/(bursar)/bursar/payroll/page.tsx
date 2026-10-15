'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Users,
  Search,
  Download,
  Check,
  CheckCircle2,
  Eye,
  Edit2,
  X,
} from 'lucide-react';
import { PayrollRecord } from '@/types/finance';
import { formatNaira } from '@/lib/finance-data';
import { PayslipModal } from '@/components/finance/PayslipModal';

export default function BursarPayrollPage() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [isDisbursing, setIsDisbursing] = useState(false);

  // Bank management state
  const [editingBankStaff, setEditingBankStaff] = useState<PayrollRecord | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Modals
  const [activePayslip, setActivePayslip] = useState<PayrollRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankStaff) return;
    setBankError(null);

    if (!bankName.trim()) {
      setBankError('Please select a commercial bank.');
      return;
    }

    if (bankAccount.length !== 10) {
      setBankError('Account number must be exactly 10 digits.');
      return;
    }

    setIsSavingBank(true);
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_staff_bank',
          staffId: editingBankStaff.id,
          bankName,
          accountNumber: bankAccount,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update bank details');
      }

      setPayrollRecords((prev) =>
        prev.map((r) =>
          r.id === editingBankStaff.id
            ? { ...r, bankName, bankAccount }
            : r
        )
      );

      showToast(`Bank account for ${editingBankStaff.name} saved successfully.`);
      setEditingBankStaff(null);
    } catch (err: any) {
      setBankError(err?.message || 'Error updating bank details');
    } finally {
      setIsSavingBank(false);
    }
  };

  const loadPayroll = async () => {
    try {
      const res = await fetch('/api/finances');
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.data?.payrollRecords) {
          setPayrollRecords(json.data.payrollRecords);
        }
      }
    } catch {
      // Keep empty state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, []);

  const monthlyPayrollTotal = payrollRecords.reduce((a, b) => a + b.netSalary, 0);
  const totalTaxDeduction = payrollRecords.reduce((a, b) => a + b.taxDeduction, 0);
  const classTeachersCount = payrollRecords.filter((r) => r.responsibilityAllowance > 0).length;
  const totalAllowances = payrollRecords.reduce((a, b) => a + b.responsibilityAllowance + b.otherAllowances, 0);

  const handleDisbursePayroll = async () => {
    setIsDisbursing(true);
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_payroll',
          totalAmount: monthlyPayrollTotal,
          staffCount: payrollRecords.length,
        }),
      });

      if (res.ok) {
        setPayrollRecords((prev) =>
          prev.map((r) => ({ ...r, status: 'Approved & Disbursed' as const }))
        );
        showToast(`Monthly payroll (${formatNaira(monthlyPayrollTotal)}) authorized for disbursement.`);
      } else {
        throw new Error('Failed to authorize payroll');
      }
    } catch {
      showToast('Error authorizing payroll disbursement.');
    } finally {
      setIsDisbursing(false);
    }
  };

  const downloadBankSchedule = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Employee ID,Staff Name,Role,Bank Name,Account Number,Net Disbursed (NGN)\n' +
      payrollRecords
        .map(
          (r) =>
            `"${r.employeeId}","${r.name}","${r.role}","${r.bankName || '—'}","${r.bankAccount || '—'}",${r.netSalary}`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Oakland_Schools_Bank_Payroll_Schedule.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Bank transfer disbursement schedule exported successfully.');
  };

  const filteredPayroll = payrollRecords.filter((rec) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      rec.name.toLowerCase().includes(query) ||
      rec.employeeId.toLowerCase().includes(query) ||
      rec.role.toLowerCase().includes(query);
    const matchesDept = deptFilter === 'All' || rec.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  if (isLoading) {
    return <BrandLoader fullScreen size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Salaries</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Staff monthly compensation, allowances, statutory tax, and bank payment schedule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={downloadBankSchedule}
            className="text-xs font-semibold border-slate-300 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Schedule</span>
          </Button>
          <Button
            type="button"
            onClick={handleDisbursePayroll}
            isLoading={isDisbursing}
            variant="primary"
            size="md"
            className="text-xs font-semibold gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Authorize Disbursement</span>
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-2.5 shadow-xs text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 shadow-xs bg-white">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Monthly Net Payroll
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{formatNaira(monthlyPayrollTotal)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Disbursed via Commercial Bank Transfer</p>
        </Card>

        <Card className="p-4 border-slate-200 shadow-xs bg-white">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Appointed Class Teachers
          </span>
          <p className="text-2xl font-black text-teal-800 mt-1">
            {classTeachersCount} {classTeachersCount === 1 ? 'Teacher' : 'Teachers'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {formatNaira(totalAllowances)} allowance total
          </p>
        </Card>

        <Card className="p-4 border-slate-200 shadow-xs bg-white">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Statutory Deductions
          </span>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {formatNaira(totalTaxDeduction)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Zero pension deductions applied</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Search staff by name, staff ID, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 cursor-pointer"
        >
          <option value="All">All Departments</option>
          <option value="Academic">Academic</option>
          <option value="Administration">Administration</option>
          <option value="Accounts">Accounts</option>
          <option value="Operations & Support">Operations</option>
          <option value="Medical">Medical</option>
        </select>
      </div>

      {/* Payroll Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Staff Compensation Roster ({filteredPayroll.length} {filteredPayroll.length === 1 ? 'Staff' : 'Staff Members'})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Click &quot;Payslip&quot; to inspect or print official stamped payslips
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0f3a3e] text-white font-bold">
              <tr>
                <th className="py-2.5 px-4">Staff Member and ID</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3 text-right">Basic Pay</th>
                <th className="py-2.5 px-3 text-right">Allowances</th>
                <th className="py-2.5 px-3 text-right">Deductions</th>
                <th className="py-2.5 px-4 text-right bg-[#092528]">Net Disbursed</th>
                <th className="py-2.5 px-4">Bank Account</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No Staff Payroll Records Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery || deptFilter !== 'All'
                        ? 'Try adjusting your search query or department filter.'
                        : 'Staff members onboarded in the school database will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayroll.map((rec) => {
                  const totalAllowances = rec.responsibilityAllowance + rec.otherAllowances;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{rec.name}</p>
                        <span className="text-[10px] text-teal-800 font-mono font-semibold">{rec.employeeId}</span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800">{rec.role}</p>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider">{rec.department}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatNaira(rec.basicSalary)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                        +{formatNaira(totalAllowances)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {rec.taxDeduction > 0 ? `-${formatNaira(rec.taxDeduction)}` : '₦0'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 bg-slate-50 text-sm">
                        {formatNaira(rec.netSalary)}
                      </td>
                      <td className="py-3 px-4">
                        {rec.bankName && rec.bankName !== '—' ? (
                          <div className="flex items-center justify-between gap-1 group">
                            <div>
                              <p className="font-bold text-slate-800">{rec.bankName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{rec.bankAccount}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBankStaff(rec);
                                setBankName(rec.bankName);
                                setBankAccount(rec.bankAccount);
                              }}
                              className="text-slate-400 hover:text-teal-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Update Bank Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-mono text-xs">—</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBankStaff(rec);
                                setBankName('');
                                setBankAccount('');
                              }}
                              className="text-[10px] font-semibold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              + Add Bank
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.status === 'Approved & Disbursed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rec.status === 'Approved & Disbursed' ? 'Disbursed' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setActivePayslip(rec)}
                          className="h-7 px-2.5 text-[10px] font-bold text-teal-800 border-teal-300 hover:bg-teal-50"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Print Payslip
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modals */}
      <PayslipModal
        record={activePayslip}
        onClose={() => setActivePayslip(null)}
      />

      {/* Update Bank Details Modal */}
      {editingBankStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-[#0f3a3e] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Staff Bank Account</h3>
                <p className="text-[11px] text-teal-200/80">
                  {editingBankStaff.name} ({editingBankStaff.employeeId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBankStaff(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="p-5 space-y-4">
              {bankError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {bankError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Commercial Bank</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs"
                >
                  <option value="">Select Commercial Bank...</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                  <option value="Guaranty Trust Bank (GTBank)">Guaranty Trust Bank (GTBank)</option>
                  <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="Fidelity Bank">Fidelity Bank</option>
                  <option value="First City Monument Bank (FCMB)">First City Monument Bank (FCMB)</option>
                  <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                  <option value="Sterling Bank">Sterling Bank</option>
                  <option value="Union Bank of Nigeria">Union Bank of Nigeria</option>
                  <option value="Wema Bank">Wema Bank</option>
                  <option value="Kuda Bank">Kuda Bank</option>
                  <option value="Moniepoint MFB">Moniepoint MFB</option>
                  <option value="OPay">OPay</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Number (10 Digits)</label>
                <Input
                  type="text"
                  maxLength={10}
                  required
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 0123456789"
                  className="h-9 text-xs font-mono font-bold tracking-wider"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingBankStaff(null)}
                  disabled={isSavingBank}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSavingBank}
                  className="text-xs font-semibold"
                >
                  {isSavingBank ? 'Saving...' : 'Save Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
