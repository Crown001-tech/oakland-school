'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  UserPlus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Award,
  BookOpen,
  ArrowRight,
  Shield,
  School,
  Megaphone,
} from 'lucide-react';
import { getClassTeacherMap, normalizeClass } from '@/lib/class-utils';

export default function AdminDashboardPage() {
  const [principalName, setPrincipalName] = React.useState('Mr Seyi Bankole');
  const [employeeId, setEmployeeId] = React.useState('OAK-ADM-001');
  const [academicSession, setAcademicSession] = React.useState('2026/2027');
  const [currentTerm, setCurrentTerm] = React.useState('Term 1');
  const [totalEnrolled, setTotalEnrolled] = React.useState(0);
  const [attendanceRate, setAttendanceRate] = React.useState('0.0%');
  const [attendanceBreakdown, setAttendanceBreakdown] = React.useState('0 Present &bull; 0 Late &bull; 0 Absent');
  const [pendingReportCount, setPendingReportCount] = React.useState(0);
  const [pendingLeaveCount, setPendingLeaveCount] = React.useState(0);

  const [classes, setClasses] = React.useState([
    { class: 'JSS 1', enrolled: 0, present: 0, late: 0, absent: 0, teacher: 'Unassigned', status: 'Pending' },
    { class: 'JSS 2', enrolled: 0, present: 0, late: 0, absent: 0, teacher: 'Unassigned', status: 'Pending' },
    { class: 'JSS 3', enrolled: 0, present: 0, late: 0, absent: 0, teacher: 'Unassigned', status: 'Pending' },
    { class: 'SS 1', enrolled: 0, present: 0, late: 0, absent: 0, teacher: 'Unassigned', status: 'Pending' },
    { class: 'SS 2', enrolled: 0, present: 0, late: 0, absent: 0, teacher: 'Unassigned', status: 'Pending' },
    { class: 'SS 3', enrolled: 0, present: 0, late: 0, absent: 0, teacher: 'Unassigned', status: 'Pending' },
  ]);
  const [broadcasts, setBroadcasts] = React.useState<any[]>([]);

  const stats = [
    {
      title: 'Active Students',
      value: totalEnrolled.toString(),
      change: '6 Classes (JSS 1 – SS 3)',
      icon: GraduationCap,
      color: 'text-[#0f3a3e]',
      bg: 'bg-slate-100',
      href: '/admin/students',
    },
    {
      title: "Today's Attendance",
      value: attendanceRate,
      change: attendanceBreakdown,
      icon: CalendarCheck,
      color: 'text-[#0f3a3e]',
      bg: 'bg-slate-100',
      href: '/admin/attendance',
    },
    {
      title: 'Report Cards for Review',
      value: `${pendingReportCount} Batches`,
      change: 'Terminal Scores Pending',
      icon: Award,
      color: 'text-[#0f3a3e]',
      bg: 'bg-slate-100',
      href: '/admin/results',
    },
    {
      title: 'Staff Leave Queue',
      value: `${pendingLeaveCount} Requests`,
      change: pendingLeaveCount === 0 ? 'Queue Clear' : `${pendingLeaveCount} Pending Review`,
      icon: FileText,
      color: 'text-[#0f3a3e]',
      bg: 'bg-slate-100',
      href: '/admin/leave',
    },
  ];

  React.useEffect(() => {
    let activeUserResolved = false;

    // 1. Fetch live authenticated principal identity from /api/auth/me
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated && data.profile?.name) {
          activeUserResolved = true;
          setPrincipalName(data.profile.name);
          if (data.profile.employeeId) setEmployeeId(data.profile.employeeId);
        }
      })
      .catch(() => {});

    // 2. Fetch session and term settings from /api/schools/settings
    fetch('/api/schools/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (payload?.success && payload.data) {
          if (payload.data.academicSession) setAcademicSession(payload.data.academicSession);
          if (payload.data.currentTerm) setCurrentTerm(payload.data.currentTerm);
        }
      })
      .catch(() => {});

    const loadState = async () => {
      try {
        if (!activeUserResolved) {
          setPrincipalName('Mr Seyi Bankole');
          setEmployeeId('PRIN-2026-001');
        }

        // Live teachers map
        let teacherMap: Record<string, string> = {
          'JSS 1': 'Unassigned',
          'JSS 2': 'Unassigned',
          'JSS 3': 'Unassigned',
          'SS 1': 'Unassigned',
          'SS 2': 'Unassigned',
          'SS 3': 'Unassigned',
        };

        try {
          const staffRes = await fetch('/api/staff').then((r) => (r.ok ? r.json() : null));
          if (staffRes?.success && Array.isArray(staffRes.data)) {
            teacherMap = getClassTeacherMap(staffRes.data);
          }
        } catch {}

        // Real enrolled students from /api/students
        let studentsList: any[] = [];
        try {
          const studentsRes = await fetch('/api/students').then((r) => (r.ok ? r.json() : null));
          if (studentsRes?.success && Array.isArray(studentsRes.data)) {
            studentsList = studentsRes.data;
          }
        } catch {}

        // Today's attendance from /api/attendance
        let attendanceRecords: any[] = [];
        let hasAttendanceToday = false;
        try {
          const today = new Date().toISOString().split('T')[0];
          const attRes = await fetch(`/api/attendance?date=${today}`).then((r) => (r.ok ? r.json() : null));
          if (attRes?.success && Array.isArray(attRes.data) && attRes.data.length > 0) {
            attendanceRecords = attRes.data;
            hasAttendanceToday = true;
          }
        } catch {}

        // Map class status & metrics (real database numbers, zero fake 100% defaults)
        const updatedClasses = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'].map((className) => {
          const classStudents = studentsList.filter((s) => normalizeClass(s.class) === className);
          const enrolled = classStudents.length;

          const classAtt = attendanceRecords.find((a) => normalizeClass(a.class) === className);
          const present = classAtt?.presentCount ?? 0;
          const late = classAtt?.lateCount ?? 0;
          const absent = classAtt?.absentCount ?? 0;
          const status = classAtt ? 'Submitted' : 'Pending';

          return {
            class: className,
            enrolled,
            present,
            late,
            absent,
            teacher: teacherMap[className] || 'Unassigned',
            status,
          };
        });

        setClasses(updatedClasses);

        const totalStudents = studentsList.length;
        setTotalEnrolled(totalStudents);

        if (hasAttendanceToday && totalStudents > 0) {
          const totalPresent = updatedClasses.reduce((acc, c) => acc + c.present, 0);
          const totalLate = updatedClasses.reduce((acc, c) => acc + c.late, 0);
          const totalAbsent = updatedClasses.reduce((acc, c) => acc + c.absent, 0);
          const rate = Math.round(((totalPresent + totalLate) / totalStudents) * 100);
          setAttendanceRate(`${rate}%`);
          setAttendanceBreakdown(`${totalPresent} Present &bull; ${totalLate} Late &bull; ${totalAbsent} Absent`);
        } else {
          setAttendanceRate('0.0%');
          setAttendanceBreakdown('0 Present &bull; 0 Late &bull; 0 Absent');
        }

        // Executive Broadcasts from live /api/staff/broadcasts
        try {
          const bcRes = await fetch('/api/staff/broadcasts').then((r) => (r.ok ? r.json() : null));
          if (bcRes?.success && Array.isArray(bcRes.data)) {
            const relevant = bcRes.data.filter(
              (b: any) => b.audience === 'All Staff' || b.audience === 'Administration'
            );
            setBroadcasts(
              relevant.map((b: any) => ({
                id: b.id,
                title: b.title,
                message: b.message || '',
                senderName: b.senderName || 'Office of the Proprietor',
                dispatchedAt: b.dispatchedAt || 'Recent',
                priority: b.priority || 'Notice',
                audience: b.audience,
              }))
            );
          }
        } catch {}
      } catch {}
    };

    loadState();
  }, []);

  const recentAuditEvents: Array<{ action: string; detail: string; actor: string; time: string; type: string }> = [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Principal Profile Banner */}
      <div className="p-6 rounded-2xl bg-[#0f2e32] border border-[#164247] text-white shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/90 font-mono text-[11px] font-semibold border border-white/15">
                Staff ID: {employeeId}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-[11px] font-medium border border-white/15">
                Session {academicSession} &bull; {currentTerm}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {principalName}
            </h1>
            <p className="text-sm text-teal-100/80 max-w-2xl">
              Oversee staff allocations, student attendance, and terminal report card submissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin/staff">
              <Button className="bg-white text-[#0f3a3e] hover:bg-slate-100 font-bold text-xs shadow-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Onboard Staff</span>
              </Button>
            </Link>
            <Link href="/admin/attendance">
              <Button className="border border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4" />
                <span>Daily Roll Call</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards (Clickable with Redirections) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link key={i} href={stat.href} className="block group focus:outline-hidden">
              <Card className="p-5 flex items-start justify-between border-slate-200/90 shadow-xs bg-white hover:border-[#0f3a3e] hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-slate-500 group-hover:text-[#0f3a3e] transition-colors">
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500" dangerouslySetInnerHTML={{ __html: stat.change }} />
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} border border-slate-200/60 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Operational Grid: Attendance Roll and Supervisory Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Class Attendance Breakdown across strictly 6 classes */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0 overflow-hidden border-slate-200 shadow-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Morning Roll Call Status &bull; Class Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Daily attendance logged by assigned Class Teachers.
                </CardDescription>
              </div>

              <Link href="/admin/attendance" className="text-xs font-semibold text-[#0f3a3e] hover:underline flex items-center gap-1">
                Full Register <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Class Teacher</th>
                    <th className="py-3 px-4 text-center">Enrolled</th>
                    <th className="py-3 px-4 text-center">Present</th>
                    <th className="py-3 px-4 text-center">Late</th>
                    <th className="py-3 px-4 text-center">Absent</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                      onClick={() => {
                        window.location.href = `/admin/attendance`;
                      }}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-[#0f3a3e]">
                        {item.class}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{item.teacher}</td>
                      <td className="py-3.5 px-4 text-center text-slate-600 font-mono">{item.enrolled}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700 font-mono">{item.present}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-700 font-mono">{item.late}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-700 font-mono">{item.absent}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'Submitted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Notices & Supervisory Stream */}
        <div className="space-y-4">
          {/* Executive Notices from Proprietor */}
          <Card className="p-5 border-teal-200/80 bg-teal-50/20 shadow-xs">
            <CardTitle className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-teal-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#0f3a3e]">
                <Megaphone className="w-4 h-4 text-[#b3141f]" />
                Proprietor Directives
              </span>
              <Badge variant="teal" size="sm">
                {broadcasts.length} Active
              </Badge>
            </CardTitle>

            <div className="space-y-3">
              {broadcasts.length === 0 ? (
                <div className="p-4 bg-white rounded-lg border border-slate-200/80 text-center text-slate-400 text-xs">
                  No active executive directives from the Proprietor.
                </div>
              ) : (
                broadcasts.slice(0, 3).map((bc) => (
                  <div key={bc.id} className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{bc.title}</span>
                      <span className="text-[10px] text-slate-400">{bc.dispatchedAt}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {bc.message}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[10px] text-teal-800 font-semibold">
                        From: {bc.senderName}
                      </p>
                      <span className="text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                        {bc.audience}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-5 border-slate-200 shadow-xs">
            <CardTitle className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Supervisory Activity</span>
              <Badge variant="teal" size="sm">Live</Badge>
            </CardTitle>

            <div className="space-y-4">
              {recentAuditEvents.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No recent supervisory events. Staff activity will appear here in real time.
                </div>
              ) : (
                recentAuditEvents.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs pb-3 border-b border-slate-100 last:border-none last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-[#0f3a3e] mt-1.5 shrink-0" />
                    <div className="space-y-0.5 flex-1">
                      <p className="font-bold text-slate-900">{event.action}</p>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{event.detail}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span className="font-mono text-teal-800">{event.actor}</span>
                        <span>{event.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100">
              <Link href="/admin/audit" className="w-full block">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Full Audit Trail
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
