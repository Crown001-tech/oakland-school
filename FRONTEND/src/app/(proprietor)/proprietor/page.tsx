'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  Wallet,
  UserCheck,
  ArrowRight,
  Building2,
  CheckCircle2,
  Shield,
} from 'lucide-react';

interface StudentItem {
  id: string;
  admissionNo: string;
  fullName: string;
  class: string;
  status: string;
}

interface StaffItem {
  id: string;
  name: string;
  role: string;
  department: string;
  status: string;
}

interface ExecutiveOfficer {
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  status: string;
}

interface ClassItem {
  id: string;
  name: string;
  capacity: number;
  enrolledCount: number;
  classTeacher?: string;
}

interface FinanceMetrics {
  expectedRevenue: number;
  collectedRevenue: number;
  outstandingRevenue: number;
  collectionPct: string;
}

interface AttendanceMetrics {
  totalEnrolled: number;
  totalPresent: number;
  totalAbsent: number;
  totalSubmitted: number;
  overallRate: number | null;
  isPending: boolean;
}

export default function ProprietorDashboardPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [principal, setPrincipal] = useState<ExecutiveOfficer | null>(null);
  const [bursar, setBursar] = useState<ExecutiveOfficer | null>(null);
  const [defaultCapacity, setDefaultCapacity] = useState<number>(250);
  const [finances, setFinances] = useState<FinanceMetrics>({
    expectedRevenue: 0,
    collectedRevenue: 0,
    outstandingRevenue: 0,
    collectionPct: '0.0',
  });
  const [attendance, setAttendance] = useState<AttendanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const [studentsRes, staffRes, execRes, classesRes, financeRes, attendanceRes, settingsRes] = await Promise.all([
          fetch('/api/students').then((r) => r.json()).catch(() => ({ data: [] })),
          fetch('/api/staff').then((r) => r.json()).catch(() => ({ data: [] })),
          fetch('/api/executives').then((r) => r.json()).catch(() => ({ data: {} })),
          fetch('/api/classes').then((r) => r.json()).catch(() => ({ data: [] })),
          fetch('/api/finances').then((r) => r.json()).catch(() => ({ data: {} })),
          fetch('/api/attendance').then((r) => r.json()).catch(() => ({ data: {} })),
          fetch('/api/schools/settings').then((r) => r.json()).catch(() => ({ data: {} })),
        ]);

        if (!isMounted) return;

        const liveStudents = Array.isArray(studentsRes.data) ? studentsRes.data : [];
        const liveStaff = Array.isArray(staffRes.data) ? staffRes.data : [];
        const liveClasses = Array.isArray(classesRes.data) ? classesRes.data : [];

        setStudents(liveStudents);
        setStaff(liveStaff);
        setClasses(liveClasses);

        if (execRes?.data) {
          setPrincipal(execRes.data.principal || null);
          setBursar(execRes.data.bursar || null);
        }

        const resolvedCap = Number(settingsRes?.data?.classCapacity) || 250;
        setDefaultCapacity(resolvedCap);

        // Compute Finances
        const breakdowns = Array.isArray(financeRes?.data?.classBreakdowns) ? financeRes.data.classBreakdowns : [];
        const exp = breakdowns.reduce((sum: number, b: any) => sum + (Number(b.expected) || 0), 0);
        const col = breakdowns.reduce((sum: number, b: any) => sum + (Number(b.collected) || 0), 0);
        const out = breakdowns.reduce((sum: number, b: any) => sum + (Number(b.outstanding) || 0), 0);
        const pct = exp > 0 ? ((col / exp) * 100).toFixed(1) : '0.0';
        setFinances({
          expectedRevenue: exp,
          collectedRevenue: col,
          outstandingRevenue: out,
          collectionPct: pct,
        });

        // Compute Attendance
        if (attendanceRes?.data?.metrics) {
          setAttendance(attendanceRes.data.metrics);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  const totalCapacity = classes.reduce((sum, c) => sum + (Number(c.capacity) || defaultCapacity), 0) || (classes.length * defaultCapacity) || (6 * defaultCapacity);
  const capacityPct = totalCapacity > 0 ? ((students.length / totalCapacity) * 100).toFixed(1) : '0';

  const kpis = [
    {
      label: 'Total Students',
      value: String(students.length),
      sub: `${capacityPct}% capacity utilized (${students.length}/${totalCapacity})`,
      icon: GraduationCap,
      color: 'text-[#0f3a3e]',
      bg: 'bg-teal-50',
    },
    {
      label: 'Total Staff',
      value: String(staff.length),
      sub: `${staff.length} active personnel registered`,
      icon: Users,
      color: 'text-[#0f3a3e]',
      bg: 'bg-teal-50',
    },
    {
      label: 'Today’s Attendance',
      value: attendance && attendance.overallRate !== null ? `${attendance.overallRate}%` : '—',
      sub: attendance && attendance.overallRate !== null
        ? `${attendance.totalPresent} of ${attendance.totalEnrolled} present`
        : 'Morning roll call pending',
      icon: CalendarCheck,
      color: 'text-[#0f3a3e]',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Tuition',
      value: `₦${finances.collectedRevenue.toLocaleString()}`,
      sub: `${finances.collectionPct}% collected (₦${finances.expectedRevenue.toLocaleString()} target)`,
      icon: Wallet,
      color: 'text-[#0f3a3e]',
      bg: 'bg-amber-50',
    },
  ];

  const standardGrades = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];
  const gradeCapacities = standardGrades.map((gradeName) => {
    const classData = classes.find((c) => c.name === gradeName);
    const capacity = Number(classData?.capacity) || defaultCapacity;
    const enrolled = students.filter((s) => s.class === gradeName).length;
    const pct = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;
    return {
      name: gradeName,
      capacity,
      enrolled,
      pct,
      status: enrolled >= capacity ? 'Full' : 'Open',
    };
  });

  return (
    <div className="space-y-8">
      {/* Welcome & Term Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Oakland International College &bull; Academic Session 2026/2027 &bull; Term 1 (Week 1 of 14)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/proprietor/staff-approvals">
            <Button
              size="sm"
              variant="accent"
              className="bg-[#b3141f] hover:bg-[#961019] text-white shadow-xs"
              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
            >
              Review Staff
            </Button>
          </Link>
          <Link href="/proprietor/finances">
            <Button size="sm" variant="outline" leftIcon={<Wallet className="w-3.5 h-3.5" />}>
              Tuition Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* Operational Readiness Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0f3a3e] to-[#164e53] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-white/10 text-white shrink-0 border border-white/10">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              Academic Session 2026/2027 &bull; Term 1 Operational Readiness
            </h3>
            <p className="text-xs text-teal-100/90 mt-0.5">
              Live database connected. Student rosters, attendance registers, and academic classes are synchronized.
            </p>
          </div>
        </div>

        <Link href="/proprietor/admissions" className="shrink-0">
          <Button
            size="sm"
            className="bg-white text-[#0f3a3e] hover:bg-teal-50 font-bold px-4 shadow-xs"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Admissions Board
          </Button>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="p-5 flex items-start justify-between border-slate-200/80">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.label}
                </p>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {kpi.value}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {kpi.sub}
                </p>
              </div>

              <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Operational Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Class Capacity & Enrollment Widget */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Class Capacity and Enrollment
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Distribution of students across grades and available seats.
                </CardDescription>
              </div>
              <Badge variant="teal" size="sm">
                {students.length} / {totalCapacity} Seats ({capacityPct}%)
              </Badge>
            </div>

            <div className="space-y-3.5 pt-1">
              {gradeCapacities.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px]">
                        {item.enrolled} / {item.capacity} ({item.pct}%)
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.pct >= 95
                            ? 'bg-rose-50 text-rose-700'
                            : item.pct >= 90
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.pct >= 95
                          ? 'bg-rose-500'
                          : item.pct >= 90
                          ? 'bg-[#b3141f]'
                          : 'bg-[#0f3a3e]'
                      }`}
                      style={{ width: `${Math.max(item.pct, item.enrolled > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Enrolled Students Roster */}
          <Card className="p-0 overflow-hidden border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Active Student Register
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Recent enrolled pupils recorded in the institution.
                </CardDescription>
              </div>

              <Link
                href="/proprietor/students"
                className="text-xs font-semibold text-[#0f3a3e] hover:underline flex items-center gap-1"
              >
                View Directory <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-sm text-slate-700">No Students Enrolled</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Admit new pupils through the Admissions Board.
                  </p>
                </div>
              ) : (
                students.slice(0, 4).map((student) => (
                  <div key={student.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0f3a3e] font-bold text-xs flex items-center justify-center border border-teal-100 shrink-0">
                        {student.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{student.fullName}</p>
                        <p className="text-[11px] text-slate-600 font-mono">{student.admissionNo}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{student.class}</p>
                      </div>
                    </div>

                    <Link href={`/proprietor/students/${student.id}`}>
                      <Button size="sm" variant="outline" className="text-xs py-1 px-3">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Administration Status & Financial Health */}
        <div className="space-y-6">
          {/* Administration Appointments */}
          <Card className="p-5 border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0f3a3e]" />
                Administration Appointments
              </CardTitle>
              <Link href="/proprietor/staff" className="text-[11px] font-bold text-[#0f3a3e] hover:underline">
                Manage Staff &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {/* Principal Status */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">School Principal</p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {principal ? principal.name : 'Vacant'}
                  </p>
                  {principal && <p className="text-[10px] text-slate-500 font-mono">{principal.email}</p>}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    principal
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {principal ? 'Appointed' : 'Not Appointed'}
                </span>
              </div>

              {/* Bursar Status */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">School Bursar</p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {bursar ? bursar.name : 'Vacant'}
                  </p>
                  {bursar && <p className="text-[10px] text-slate-500 font-mono">{bursar.email}</p>}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    bursar
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {bursar ? 'Appointed' : 'Not Appointed'}
                </span>
              </div>
            </div>
          </Card>

          {/* Tuition Collection Health */}
          <Card className="p-5 border-slate-200 space-y-4">
            <CardTitle className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Tuition Collection
            </CardTitle>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Target Term Revenue:</span>
                <span className="font-bold text-slate-900">₦{finances.expectedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Collected to Date:</span>
                <span className="font-bold text-emerald-700">₦{finances.collectedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Outstanding:</span>
                <span className="font-bold text-slate-500">₦{finances.outstandingRevenue.toLocaleString()}</span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden mt-2">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, Number(finances.collectionPct)))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 text-right">{finances.collectionPct}% collected</p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Link href="/proprietor/finances" className="w-full block">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Open Tuition Ledger
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
