'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  CalendarCheck,
  Clock,
  UserCheck,
  UserX,
  CheckCircle2,
  Phone,
  Search,
  Users,
  GraduationCap,
} from 'lucide-react';
import { getClassTeacherMap, normalizeClass } from '@/lib/class-utils';

interface StaffAttendanceRecord {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  checkInTime: string | null;
  status: string;
}

interface ClassAttendanceSummary {
  class: string;
  classTeacher: string;
  enrolled: number;
  present: number;
  absent: number;
  status: 'Submitted' | 'Pending';
  attendanceRate: number | null;
}

export default function ProprietorAttendancePage() {
  const [activeTab, setActiveTab] = useState<'students' | 'staff'>('students');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [classesData, setClassesData] = useState<ClassAttendanceSummary[]>([]);
  const [staffData, setStaffData] = useState<StaffAttendanceRecord[]>([]);
  const [metrics, setMetrics] = useState<{
    totalEnrolled: number;
    totalPresent: number;
    totalAbsent: number;
    totalSubmitted: number;
    overallRate: number | null;
    isPending: boolean;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadAttendanceData() {
      try {
        const res = await fetch(`/api/attendance?date=${selectedDate}`).then((r) => r.json()).catch(() => ({}));

        if (!isMounted) return;

        if (res.success && res.data) {
          setClassesData(res.data.classes || []);
          setStaffData(res.data.staff || []);
          setMetrics(res.data.metrics || null);
        }
      } catch (err) {
        console.error('Failed to load attendance:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAttendanceData();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  const totalEnrolled = metrics?.totalEnrolled ?? classesData.reduce((acc, c) => acc + c.enrolled, 0);
  const totalPresent = metrics?.totalPresent ?? classesData.reduce((acc, c) => acc + c.present, 0);
  const overallRate = metrics?.overallRate;

  const filteredStaff = staffData.filter(
    (st) =>
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Daily Attendance Oversight
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time morning roll call registers submitted by Homeroom Class Teachers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Total Students
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalEnrolled}</p>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
            Present in Session
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {metrics?.isPending ? '—' : totalPresent}
          </p>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">
            Overall Rate
          </span>
          <p className="text-2xl font-black text-[#0f3a3e] mt-1">
            {overallRate !== null && overallRate !== undefined ? `${overallRate}%` : '—'}
          </p>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Total Staff on Campus
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{staffData.length}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 text-xs">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Classroom Roll Calls
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'staff'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Attendance Log
        </button>
      </div>

      {/* 1. CLASSROOM ROLL CALL TAB */}
      {activeTab === 'students' && (
        <Card className="p-0 overflow-hidden border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Class</th>
                  <th className="px-4 py-3.5">Class Teacher</th>
                  <th className="px-4 py-3.5 text-center">Enrolled Pupils</th>
                  <th className="px-4 py-3.5 text-center">Present</th>
                  <th className="px-4 py-3.5 text-center">Absent</th>
                  <th className="px-5 py-3.5 text-right">Register Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classesData.map((c) => (
                  <tr key={c.class} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      <Badge variant="teal" size="sm">
                        {c.class}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800">
                      {c.classTeacher}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-900">
                      {c.enrolled}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-emerald-700">
                      {c.status === 'Submitted' ? c.present : <span className="text-slate-400 font-mono">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-400">
                      {c.status === 'Submitted' ? c.absent : <span className="text-slate-400 font-mono">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'Submitted'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {c.status === 'Submitted' ? 'Submitted' : 'Pending Roll Call'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 2. STAFF ATTENDANCE LOG TAB */}
      {activeTab === 'staff' && (
        <Card className="p-0 overflow-hidden border-slate-200">
          <div className="p-3 border-b border-slate-100">
            <div className="relative max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Check-In Time</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStaff.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{st.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{st.employeeId}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="teal" size="sm">
                        {st.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {st.department}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">
                      {st.checkInTime || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          st.status === 'Present'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
