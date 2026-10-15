'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  BookOpen,
  GraduationCap,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Printer,
  CreditCard,
  Building,
  Edit3,
  X,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { EditStaffModal } from '@/components/common/EditStaffModal';

type TabType = 'overview' | 'assignment' | 'payroll_security';

interface StaffDetailData {
  id: string;
  userId?: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'Principal' | 'Bursar' | 'Class Teacher' | 'Subject Teacher' | 'Non-Teaching Staff';
  department: string;
  status: string;
  address: string;
  qualification: string;
  joinedAt: string;
  assignedHomeroom: string | null;
  subjects: string[];
  teachingAssignments: Array<{ subject: string; classes: string[] }>;
  defaultPassword: string;
  baseSalary: number | null;
  allowances: number | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
}

export default function AdminStaffProfilePage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params?.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffDetailData | null>(null);

  // Security credentials state
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal state for editing role and assignment
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Bank disbursement details editing state
  const [isEditingBankDetails, setIsEditingBankDetails] = useState(false);
  const [formBankName, setFormBankName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formAccountName, setFormAccountName] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadStaffProfile = async () => {
    try {
      const res = await fetch(`/api/staff/${staffId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setStaff(json.data);
        if (['Principal', 'Bursar', 'Non-Teaching Staff'].includes(json.data.role)) {
          setActiveTab((prev) => (prev === 'assignment' ? 'overview' : prev));
        }
      } else {
        // Check if id matches employeeId in staff list
        const listRes = await fetch('/api/staff').then((r) => r.json());
        const found = (listRes.data || []).find(
          (s: any) =>
            s.id === staffId ||
            s.employeeId === staffId ||
            s.email.toLowerCase() === decodeURIComponent(staffId).toLowerCase()
        );
        if (found) {
          const fullDetail = await fetch(`/api/staff/${found.id}`).then((r) => r.json());
          if (fullDetail.success) {
            setStaff(fullDetail.data);
            if (['Principal', 'Bursar', 'Non-Teaching Staff'].includes(fullDetail.data.role)) {
              setActiveTab((prev) => (prev === 'assignment' ? 'overview' : prev));
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load staff profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffProfile();
  }, [staffId]);

  const handleCopyPassword = () => {
    if (!staff) return;
    navigator.clipboard.writeText(staff.defaultPassword);
    setCopiedPassword(true);
    showToast('Password copied to clipboard.');
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleResetPassword = async () => {
    if (!staff) return;
    setIsResetting(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password' }),
      });
      const json = await res.json();
      if (json.success) {
        setStaff((prev) => (prev ? { ...prev, defaultPassword: 'Oakland@2026' } : null));
        showToast('Password successfully reset to default Oakland@2026');
      } else {
        alert(json.message || 'Failed to reset password');
      }
    } catch {
      alert('Network error while resetting password');
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenEditBankDetails = () => {
    if (!staff) return;
    setFormBankName(staff.bankName || '');
    setFormAccountNumber(staff.accountNumber || '');
    setFormAccountName(staff.accountName || staff.fullName || '');
    setIsEditingBankDetails(true);
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setIsSavingBank(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_bank_account',
          bankName: formBankName.trim() || null,
          accountNumber: formAccountNumber.trim() || null,
          accountName: formAccountName.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStaff((prev) =>
          prev
            ? {
                ...prev,
                bankName: formBankName.trim() || null,
                accountNumber: formAccountNumber.trim() || null,
                accountName: formAccountName.trim() || null,
              }
            : null
        );
        setIsEditingBankDetails(false);
        showToast('Bank disbursement account details updated successfully.');
      } else {
        alert(json.message || 'Failed to update bank details');
      }
    } catch {
      alert('Network error while saving bank details');
    } finally {
      setIsSavingBank(false);
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  if (!staff) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Staff Member Not Found</h2>
        <p className="text-xs text-slate-500">
          No personnel record matching &quot;{staffId}&quot; was found in the school registry.
        </p>
        <Link href="/admin/staff">
          <Button size="sm" variant="outline">
            Return to Staff Directory
          </Button>
        </Link>
      </div>
    );
  }

  const initials =
    staff.fullName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ST';

  const isClassTeacher = staff.role === 'Class Teacher';
  const isLeadership = staff.role === 'Principal' || staff.role === 'Bursar';
  const hasTeachingAssignments = !isLeadership && staff.role !== 'Non-Teaching Staff';

  const basicSalary = staff.baseSalary;
  const responsibilityAllowance = staff.allowances;
  const netMonthlySalary =
    basicSalary !== null && basicSalary !== undefined
      ? basicSalary + (responsibilityAllowance || 0)
      : null;

  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: User },
    ...(hasTeachingAssignments
      ? [{ id: 'assignment' as TabType, label: 'Assignment', icon: BookOpen }]
      : []),
    { id: 'payroll_security', label: 'Salary and Security', icon: Key },
  ];

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. WEB INTERACTIVE VIEW (Hidden entirely during print)
         ───────────────────────────────────────────────────────────── */}
      <div className="space-y-6 max-w-5xl mx-auto pb-16 print:hidden">
        {/* Toast */}
        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/staff"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Staff Directory
          </Link>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => window.print()}
            >
              Print Profile
            </Button>
            <Button
              size="sm"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => setIsEditModalOpen(true)}
              className="bg-[#0f3a3e] hover:bg-[#164e53] text-white font-bold cursor-pointer"
            >
              Edit Role & Assignment
            </Button>
          </div>
        </div>

        {/* Executive Hero Profile Card */}
        <Card className="p-6 sm:p-7 border-slate-200/90 bg-white shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            {/* Avatar & Identification */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#0f3a3e] to-[#164e53] text-white flex items-center justify-center font-black text-2xl sm:text-3xl border-2 border-teal-600/40 shadow-sm shrink-0">
                {initials}
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    {staff.fullName}
                  </h1>
                  <Badge variant="teal" size="sm" className="font-bold tracking-wider uppercase text-[10px] px-2.5 py-0.5">
                    {staff.role}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    ID: {staff.employeeId}
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-slate-600 font-semibold">{staff.department}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-slate-500">Appointed: {staff.joinedAt}</span>
                </div>
              </div>
            </div>

            {/* Role Metrics Pill */}
            <div className="flex items-center gap-4 bg-slate-50/90 p-3 sm:p-3.5 rounded-2xl border border-slate-200/70 shrink-0">
              {staff.role === 'Principal' ? (
                <>
                  <div className="px-2 sm:px-3 text-center sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Executive Office
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block">
                      Head of School
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="px-2 sm:px-3 text-center sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Responsibility
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#0f3a3e] mt-0.5 block">
                      Academic & Operations
                    </span>
                  </div>
                </>
              ) : staff.role === 'Bursar' ? (
                <>
                  <div className="px-2 sm:px-3 text-center sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Executive Office
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block">
                      Chief Financial Officer
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="px-2 sm:px-3 text-center sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Responsibility
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-amber-900 mt-0.5 block">
                      Bursary & Accounts
                    </span>
                  </div>
                </>
              ) : isClassTeacher ? (
                <>
                  <div className="px-2 sm:px-3 text-center sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Homeroom Class
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5 block">
                      {staff.assignedHomeroom || 'Assigned Homeroom'}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="px-2 sm:px-3 text-center sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Teaching Scope
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block">
                      {staff.subjects.join(', ') || 'Class Teacher'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-2 sm:px-3 text-center sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Designation
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 block">
                      {staff.role}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="px-2 sm:px-3 text-center sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Department
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#0f3a3e] mt-0.5 block">
                      {staff.department}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-1 overflow-x-auto text-xs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-3.5 py-2 font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#0f3a3e] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── Tab Panels ── */}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal & Contact Details */}
              <Card className="p-6 border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <User className="w-4 h-4 text-[#0f3a3e]" />
                  <h2 className="text-sm font-bold text-slate-900">Personal Details</h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-semibold text-slate-900">{staff.fullName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Official Email</span>
                    <span className="font-mono font-semibold text-slate-900">{staff.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Phone Contact</span>
                    <span className="font-mono font-semibold text-slate-900">{staff.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Residential Address</span>
                    <span className="font-semibold text-slate-900 text-right max-w-[240px]">
                      {staff.address}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Appointment Date</span>
                    <span className="font-semibold text-slate-900">{staff.joinedAt}</span>
                  </div>
                </div>
              </Card>

              {/* Professional Designation */}
              <Card className="p-6 border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Briefcase className="w-4 h-4 text-[#0f3a3e]" />
                  <h2 className="text-sm font-bold text-slate-900">Professional Designation</h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Employee ID</span>
                    <span className="font-mono font-semibold text-slate-900">{staff.employeeId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Institutional Role</span>
                    <span className="font-semibold text-slate-900">{staff.role}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Primary Department</span>
                    <span className="font-semibold text-slate-900">{staff.department}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Highest Qualification</span>
                    <span className="font-semibold text-slate-900">{staff.qualification}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Appointment Standing</span>
                    <span className="font-semibold text-slate-800">Permanent Full-Time</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Scope of Responsibility */}
            {staff.role === 'Principal' && (
              <Card className="p-6 border-slate-200/80 bg-gradient-to-r from-teal-50/50 via-white to-slate-50 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-[#0f3a3e]" />
                  <h2 className="text-sm font-bold text-slate-900">Executive Administrative Scope</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900">Curriculum & Instructional Leadership</p>
                    <p className="text-slate-600">
                      Supervision of teaching staff, syllabus execution, lesson plans, and instructional standards.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900">Examinations & Result Approvals</p>
                    <p className="text-slate-600">
                      Terminal examination vetting, continuous assessment moderation, and verification of report cards.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* 2. ASSIGNMENT TAB (Only for teaching staff) */}
        {activeTab === 'assignment' && hasTeachingAssignments && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Homeroom Assignment */}
              <Card className="p-6 border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#0f3a3e]" />
                    <h2 className="text-sm font-bold text-slate-900">Homeroom Responsibility</h2>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Edit3 className="w-3 h-3" />}
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs h-7.5 cursor-pointer"
                  >
                    Edit Assignment
                  </Button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  {isClassTeacher && staff.assignedHomeroom ? (
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Assigned Homeroom
                      </span>
                      <p className="text-lg font-bold text-emerald-800 mt-0.5">
                        {staff.assignedHomeroom}
                      </p>
                      <p className="text-slate-500 mt-1">
                        Responsible for daily attendance roll call and general oversight for this class.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase block">
                        Homeroom Status
                      </span>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">
                        Subject Specialist (No designated homeroom custody)
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Subject Areas */}
              <Card className="p-6 border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <BookOpen className="w-4 h-4 text-[#0f3a3e]" />
                  <h2 className="text-sm font-bold text-slate-900">Curriculum Subjects</h2>
                </div>

                <div className="space-y-2 text-xs">
                  {staff.subjects && staff.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {staff.subjects.map((sub) => (
                        <span
                          key={sub}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-[#0f3a3e] font-semibold text-xs"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No subjects currently assigned.</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Teaching Assignments by Class */}
            {staff.teachingAssignments && staff.teachingAssignments.length > 0 && (
              <Card className="p-6 border-slate-200/80 space-y-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Class Allocations
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  {staff.teachingAssignments.map((a, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <p className="font-bold text-slate-900">{a.subject}</p>
                      <div className="flex flex-wrap gap-1">
                        {a.classes.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-slate-700"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* 3. PAYROLL & SECURITY TAB */}
        {activeTab === 'payroll_security' && (
          <div className="space-y-6">
            {/* Security Credentials Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0f3a3e] to-[#164e53] text-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-300" />
                    <h2 className="text-base font-bold tracking-tight">
                      Portal Authentication Credentials
                    </h2>
                  </div>
                  <p className="text-xs text-teal-100/90 max-w-lg">
                    Staff sign in to the portal using their official email address and their standardized default password.
                  </p>
                </div>

                <div className="bg-white/10 border border-white/20 p-4 rounded-xl flex items-center gap-3 shrink-0">
                  <div>
                    <span className="text-[10px] font-bold text-teal-200 uppercase tracking-widest block">
                      Default Password
                    </span>
                    <span className="text-lg font-bold font-mono text-white block mt-0.5">
                      {showPassword ? staff.defaultPassword : '••••••••••••'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white text-[#0f3a3e] hover:bg-teal-50 border-white text-xs font-bold"
                      leftIcon={copiedPassword ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      onClick={handleCopyPassword}
                    >
                      {copiedPassword ? 'Copied' : 'Copy'}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isResetting}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-900 border-amber-400 text-xs font-bold"
                      leftIcon={<RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />}
                      onClick={handleResetPassword}
                    >
                      {isResetting ? 'Resetting...' : 'Reset'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Structure Card (Dynamic from Settings) */}
            <Card className="p-6 border-slate-200/80 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#0f3a3e]" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Salary Structure and Bank Details
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={handleOpenEditBankDetails}
                    className="text-xs"
                  >
                    Update Bank Account
                  </Button>
                </div>
              </div>

              {/* Salary Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Base Monthly Salary</span>
                  <p className="text-xl font-black text-slate-900">
                    {basicSalary !== null && basicSalary !== undefined ? `₦${basicSalary.toLocaleString()}` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400">Institutional scale baseline</p>
                </div>
                <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-100 space-y-1">
                  <span className="text-teal-700 text-[10px] font-bold uppercase">Role Allowances</span>
                  <p className="text-xl font-black text-teal-800">
                    {responsibilityAllowance !== null && responsibilityAllowance !== undefined ? `₦${responsibilityAllowance.toLocaleString()}` : '—'}
                  </p>
                  <p className="text-[10px] text-teal-600">
                    {isClassTeacher ? 'Class Teacher Responsibility Allowance' : 'Standard designation'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                  <span className="text-emerald-700 text-[10px] font-bold uppercase">Total Net Remuneration</span>
                  <p className="text-xl font-black text-emerald-800">
                    {netMonthlySalary !== null ? `₦${netMonthlySalary.toLocaleString()}` : '—'}
                  </p>
                  <p className="text-[10px] text-emerald-600">Monthly gross entitlement</p>
                </div>
              </div>

              {/* Bank Disbursement Details */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-900">Registered Bank Account</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Bank Name</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{staff.bankName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Account Number</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">{staff.accountNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Account Name</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{staff.accountName || '—'}</span>
                  </div>
                </div>
                {!staff.bankName && (
                  <p className="text-[11px] text-slate-400 italic">
                    No bank disbursement account has been registered for this staff member. Click &quot;Update Bank Account&quot; to provide bank details.
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Bank Disbursement Account Modal */}
        {isEditingBankDetails && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#0f3a3e]" />
                  <h3 className="text-base font-bold text-slate-900">Update Bank Disbursement Account</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingBankDetails(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBankDetails} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zenith Bank, Access Bank"
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Number (10 digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. 0123456789"
                    value={formAccountNumber}
                    onChange={(e) => setFormAccountNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Folake Davies"
                    value={formAccountName}
                    onChange={(e) => setFormAccountName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditingBankDetails(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingBank}
                    className="bg-[#0f3a3e] hover:bg-[#164e53] text-white"
                  >
                    {isSavingBank ? 'Saving...' : 'Save Bank Details'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Staff Role & Assignment */}
        <EditStaffModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          staff={staff}
          onSuccess={() => {
            loadStaffProfile();
            showToast('Staff role and assignments updated successfully');
          }}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PRINTABLE PROFILE (Visible ONLY during print)
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden print:block font-serif text-slate-900 p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
              Oakland International School
            </h1>
            <p className="text-xs italic text-slate-600">Knowledge, Integrity and Excellence &bull; Academic Session 2026/2027</p>
            <p className="text-[10px] text-slate-500 mt-1">Official Staff Registry Record</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-400 font-mono text-xs font-bold">
              {staff.employeeId}
            </span>
            <p className="text-[9px] text-slate-500 mt-1">Role: {staff.role}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-xs border border-slate-300 p-4">
          <div className="col-span-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><strong className="text-slate-600">Full Name:</strong> {staff.fullName}</div>
              <div><strong className="text-slate-600">Email:</strong> {staff.email}</div>
              <div><strong className="text-slate-600">Phone:</strong> {staff.phone}</div>
              <div><strong className="text-slate-600">Department:</strong> {staff.department}</div>
              <div><strong className="text-slate-600">Qualification:</strong> {staff.qualification}</div>
            </div>
            <div><strong className="text-slate-600">Residential Address:</strong> {staff.address}</div>
          </div>
        </div>

        {hasTeachingAssignments && staff.teachingAssignments && staff.teachingAssignments.length > 0 && (
          <div className="border border-slate-300 p-4 text-xs space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              Teaching Allocations
            </h3>
            {staff.teachingAssignments.map((a, i) => (
              <div key={i} className="flex justify-between py-1 border-b border-slate-100 last:border-none">
                <span><strong>{a.subject}</strong></span>
                <span>Classes: {a.classes.join(', ')}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border border-slate-300 p-4 text-xs space-y-2">
          <h3 className="font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
            Registered Bank Details
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center py-2">
            <div className="border border-slate-200 p-2">
              <span className="block text-[10px] text-slate-500 uppercase">Bank Name</span>
              <strong className="text-xs">{staff.bankName || '—'}</strong>
            </div>
            <div className="border border-slate-200 p-2">
              <span className="block text-[10px] text-slate-500 uppercase">Account Number</span>
              <strong className="text-xs font-mono">{staff.accountNumber || '—'}</strong>
            </div>
            <div className="border border-slate-200 p-2">
              <span className="block text-[10px] text-slate-500 uppercase">Account Name</span>
              <strong className="text-xs">{staff.accountName || '—'}</strong>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end pt-12 text-xs">
          <div className="border-t border-slate-800 pt-1 text-center w-48">
            <p className="font-bold">Principal</p>
            <p className="text-[10px] text-slate-500">Signature and Stamp</p>
          </div>
          <div className="text-center text-[10px] text-slate-400">
            Certified Oakland School Record &bull; Printed: {new Date().toLocaleDateString('en-GB')}
          </div>
          <div className="border-t border-slate-800 pt-1 text-center w-48">
            <p className="font-bold">Administrative Officer</p>
            <p className="text-[10px] text-slate-500">Date Verified</p>
          </div>
        </div>
      </div>
    </>
  );
}
