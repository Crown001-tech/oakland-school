'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  GraduationCap,
  ArrowLeft,
  Calendar,
  Clock,
  Shield,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Printer,
  CheckCircle2,
  Copy,
  Check,
  Key,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

type TabType = 'overview' | 'academics' | 'attendance' | 'guardians' | 'tuition';

interface GuardianInfo {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isPrimary: boolean;
  authorizedPickup: boolean;
  pickupPin: string | null;
}

interface Student360Data {
  student: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    fullName: string;
    gender: string;
    dob: string;
    bloodGroup: string;
    address: string;
    status: string;
    createdAt?: string;
  };
  currentClass: string;
  guardians: GuardianInfo[];
  academics: {
    averageScore: number | null;
    classRank: string | null;
    totalAssessments?: number;
  };
  attendance: {
    totalDays: number;
    daysPresent: number;
    daysAbsent: number;
    ratePercentage: number | null;
  };
  finance: {
    termFee: number;
    totalPaid: number;
    balance: number;
    status: string;
  };
}

export default function AdminStudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Student360Data | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadStudent() {
      try {
        const res = await fetch(`/api/students/${studentId}`);
        const json = await res.json();

        if (isMounted) {
          if (json.success && json.data) {
            setProfile(json.data);
          } else {
            // Check if id matches admission number in list
            const listRes = await fetch('/api/students').then((r) => r.json());
            const found = (listRes.data || []).find(
              (s: any) => s.id === studentId || s.admissionNo === studentId
            );
            if (found && isMounted) {
              const fullDetail = await fetch(`/api/students/${found.id}`).then((r) => r.json());
              if (fullDetail.success) setProfile(fullDetail.data);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load student profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStudent();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPin(true);
    showToast('Pickup PIN copied to clipboard.');
    setTimeout(() => setCopiedPin(false), 2000);
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  if (!profile || !profile.student) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Student Profile Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested student record could not be found in the school database.
        </p>
        <Link href="/admin/students">
          <Button size="sm" variant="outline">
            Return to Students Directory
          </Button>
        </Link>
      </div>
    );
  }

  const { student, currentClass, guardians, academics, attendance, finance } = profile;

  const initials =
    student.fullName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ST';

  const primaryGuardian = guardians.find((g) => g.isPrimary) || guardians[0];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'guardians', label: 'Guardians and Pickup', icon: Shield },
    { id: 'academics', label: 'Academics', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'tuition', label: 'Tuition', icon: CreditCard },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Students
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
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Sleek Hero Profile Card */}
      <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0f3a3e] text-white flex items-center justify-center font-bold text-xl border-2 border-teal-700 shadow-xs shrink-0">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {student.fullName}
                </h1>
                <Badge variant="teal" size="sm">
                  {currentClass}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Admission No: {student.admissionNumber}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar (Authoritative Real Metrics Only) */}
          <div className="grid grid-cols-3 gap-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60 shrink-0">
            <div className="text-center px-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Attendance
              </span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                {attendance.ratePercentage !== null ? `${attendance.ratePercentage}%` : '—'}
              </span>
            </div>
            <div className="text-center px-3 border-x border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Average
              </span>
              <span className="text-base font-black text-[#0f3a3e] mt-0.5 block">
                {academics.averageScore !== null ? `${academics.averageScore}%` : '—'}
              </span>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tuition
              </span>
              <span className="text-base font-black text-emerald-700 mt-0.5 block">
                {finance.termFee > 0 ? finance.status : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Clean Tab Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-1 overflow-x-auto text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#0f3a3e] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tab Panels */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
          <Card className="p-6 border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-[#0f3a3e]" />
              <h2 className="text-sm font-bold text-slate-900">Student Details</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Full Name</span>
                <span className="font-semibold text-slate-900">{student.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Admission Number</span>
                <span className="font-mono font-semibold text-slate-900">{student.admissionNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Enrolled Class</span>
                <span className="font-semibold text-slate-900">{currentClass}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Gender</span>
                <span className="font-semibold text-slate-900 capitalize">{student.gender}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Date of Birth</span>
                <span className="font-semibold text-slate-900">{student.dob}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Blood Group</span>
                <span className="font-semibold text-slate-900">{student.bloodGroup}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Residential Address</span>
                <span className="font-semibold text-slate-900 text-right max-w-[220px]">
                  {student.address}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Shield className="w-4 h-4 text-[#0f3a3e]" />
              <h2 className="text-sm font-bold text-slate-900">Primary Contact</h2>
            </div>

            {primaryGuardian ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Guardian Name</span>
                  <span className="font-semibold text-slate-900">{primaryGuardian.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Relationship</span>
                  <span className="font-semibold text-slate-900">{primaryGuardian.relationship}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Phone Number</span>
                  <span className="font-mono font-semibold text-slate-900">{primaryGuardian.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Email Address</span>
                  <span className="font-semibold text-slate-900">{primaryGuardian.email}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Gate Pickup Access</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No guardian records registered.</p>
            )}
          </Card>
        </div>
      )}

      {/* 2. GUARDIANS & PICKUP TAB */}
      {activeTab === 'guardians' && (
        <div className="space-y-6 print:hidden">
          {/* Pickup Gate Security Hero */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0f3a3e] to-[#164e53] text-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-300" />
                  <h2 className="text-base font-bold tracking-tight">
                    Gate Departure Security PIN
                  </h2>
                </div>
                <p className="text-xs text-teal-100/90 max-w-lg">
                  This 4-digit security PIN is required at the school gate before pupil release to authorized pickup persons.
                </p>
              </div>

              <div className="bg-white/10 border border-white/20 p-4 rounded-xl flex items-center gap-4 shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-teal-200 uppercase tracking-widest block">
                    Active Pickup PIN
                  </span>
                  <span className="text-2xl font-black font-mono tracking-widest text-white block mt-0.5">
                    {primaryGuardian?.pickupPin || 'Not Set'}
                  </span>
                </div>

                {primaryGuardian?.pickupPin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white text-[#0f3a3e] hover:bg-teal-50 border-white text-xs font-bold"
                    leftIcon={copiedPin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    onClick={() => copyToClipboard(primaryGuardian.pickupPin!)}
                  >
                    {copiedPin ? 'Copied' : 'Copy PIN'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Authorized Guardians List */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Authorized Guardians</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guardians.map((g, idx) => (
                <Card key={g.id || idx} className="p-5 border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{g.name}</p>
                      <p className="text-xs text-slate-500">{g.relationship}</p>
                    </div>
                    {g.isPrimary && (
                      <Badge variant="teal" size="sm">
                        Primary Contact
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                    <p className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{g.phone}</span>
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{g.email}</span>
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-600 font-medium">Gate Pickup Access</span>
                    <span className="font-mono font-bold text-slate-900">
                      PIN: {g.pickupPin || '—'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. ACADEMICS TAB */}
      {activeTab === 'academics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          <Card className="p-6 border-slate-200/80 md:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Academic Standing</h2>
              <span className="text-xs font-bold text-[#0f3a3e]">{currentClass}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Term Average</span>
                <p className="text-lg font-black text-slate-900">
                  {academics.averageScore !== null ? `${academics.averageScore}%` : '—'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {academics.averageScore !== null ? 'Continuous Assessment' : 'No scores logged'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Class Position</span>
                <p className="text-lg font-black text-slate-900">
                  {academics.classRank || '—'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {academics.classRank ? 'Class standing' : 'Pending collation'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Term Status</span>
                <p className="text-lg font-black text-emerald-700">In Session</p>
                <p className="text-[10px] text-slate-400">First Term</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
              {academics.averageScore !== null
                ? 'Continuous assessment and exam marks are recorded by subject teachers and verified by the Principal.'
                : 'No continuous assessment or examination marks have been entered for this pupil yet.'}
            </div>
          </Card>

          <Card className="p-6 border-slate-200/80 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Report Cards
            </h2>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-2 text-xs">
              <FileText className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-800">Term Report Cards</p>
              <p className="text-slate-500 text-[11px]">No published report cards for this session yet.</p>
            </div>
          </Card>
        </div>
      )}

      {/* 4. ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <Card className="p-6 border-slate-200/80 space-y-6 print:hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Attendance Register</h2>
            <Badge variant="teal" size="sm">
              Term 1 (2026/2027)
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase">Total School Days</span>
              <p className="text-2xl font-black text-slate-900">{attendance.totalDays}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center space-y-1">
              <span className="text-emerald-700 text-[10px] font-bold uppercase">Days Present</span>
              <p className="text-2xl font-black text-emerald-700">{attendance.daysPresent}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase">Days Absent</span>
              <p className="text-2xl font-black text-slate-700">{attendance.daysAbsent}</p>
            </div>
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 text-center space-y-1">
              <span className="text-teal-700 text-[10px] font-bold uppercase">Attendance Rate</span>
              <p className="text-2xl font-black text-[#0f3a3e]">
                {attendance.ratePercentage !== null ? `${attendance.ratePercentage}%` : '—'}
              </p>
            </div>
          </div>

          {attendance.totalDays === 0 && (
            <p className="text-xs text-slate-500 text-center pt-2">
              No roll call attendance records logged yet for this pupil.
            </p>
          )}
        </Card>
      )}

      {/* 5. TUITION TAB */}
      {activeTab === 'tuition' && (
        <Card className="p-6 border-slate-200/80 space-y-6 print:hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Tuition Fees</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {finance.status}
            </span>
          </div>

          {finance.termFee > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Term Bill</span>
                <p className="text-xl font-black text-slate-900">₦{finance.termFee.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                <span className="text-emerald-700 text-[10px] font-bold uppercase">Amount Paid</span>
                <p className="text-xl font-black text-emerald-700">₦{finance.totalPaid.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Balance Due</span>
                <p className="text-xl font-black text-slate-900">₦{finance.balance.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-4">
              No fee schedule has been assigned for this class yet.
            </p>
          )}
        </Card>
      )}

      {/* ── PRINTABLE PROFILE (Visible ONLY during print) ──── */}
      <div className="hidden print:block font-serif text-slate-900 p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
              Oakland International School
            </h1>
            <p className="text-xs italic text-slate-600">Knowledge, Integrity and Excellence &bull; Academic Session 2026/2027</p>
            <p className="text-[10px] text-slate-500 mt-1">Official Student Record</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-400 font-mono text-xs font-bold">
              {student.admissionNumber}
            </span>
            <p className="text-[9px] text-slate-500 mt-1">Class: {currentClass}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-xs border border-slate-300 p-4">
          <div className="col-span-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><strong className="text-slate-600">Full Name:</strong> {student.fullName}</div>
              <div><strong className="text-slate-600">Gender:</strong> {student.gender}</div>
              <div><strong className="text-slate-600">Date of Birth:</strong> {student.dob}</div>
              <div><strong className="text-slate-600">Blood Group:</strong> {student.bloodGroup}</div>
            </div>
            <div><strong className="text-slate-600">Address:</strong> {student.address}</div>
          </div>
        </div>

        <div className="border border-slate-300 p-4 text-xs space-y-2">
          <h3 className="font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
            Guardians
          </h3>
          {guardians.map((g: any, i: number) => (
            <div key={i} className="flex justify-between py-1 border-b border-slate-100 last:border-none">
              <span><strong>{g.name}</strong> ({g.relationship})</span>
              <span>Phone: {g.phone}</span>
              <span>Email: {g.email}</span>
            </div>
          ))}
        </div>

        <div className="border border-slate-300 p-4 text-xs space-y-2">
          <h3 className="font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
            School Standing
          </h3>
          <div className="grid grid-cols-2 gap-2 text-center py-2">
            <div className="border border-slate-200 p-2">
              <span className="block text-[10px] text-slate-500 uppercase">Attendance Rate</span>
              <strong className="text-sm">{attendance.ratePercentage !== null ? `${attendance.ratePercentage}%` : '—'}</strong>
            </div>
            <div className="border border-slate-200 p-2">
              <span className="block text-[10px] text-slate-500 uppercase">Academic Average</span>
              <strong className="text-sm">{academics.averageScore !== null ? `${academics.averageScore}%` : '—'}</strong>
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
            <p className="font-bold">Guidance Officer</p>
            <p className="text-[10px] text-slate-500">Date Verified</p>
          </div>
        </div>
      </div>
    </div>
  );
}
