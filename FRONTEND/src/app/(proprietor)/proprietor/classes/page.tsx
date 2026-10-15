'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  BookOpen,
  Users,
  GraduationCap,
  UserCheck,
  Shield,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { normalizeClass, getClassTeacherMap } from '@/lib/class-utils';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface ClassData {
  id: string;
  name: 'JSS 1' | 'JSS 2' | 'JSS 3' | 'SS 1' | 'SS 2' | 'SS 3';
  level: string;
  enrolled: number;
  capacity: number;
  classTeacher: string;
  classTeacherId: string;
  subjectsCount: number;
  attendanceToday: string;
}

const BASE_CLASSES: ClassData[] = [
  {
    id: 'cls-1',
    name: 'JSS 1',
    level: 'Junior Secondary 1',
    enrolled: 0,
    capacity: 250,
    classTeacher: 'Unassigned',
    classTeacherId: '—',
    subjectsCount: 12,
    attendanceToday: '—',
  },
  {
    id: 'cls-2',
    name: 'JSS 2',
    level: 'Junior Secondary 2',
    enrolled: 0,
    capacity: 250,
    classTeacher: 'Unassigned',
    classTeacherId: '—',
    subjectsCount: 12,
    attendanceToday: '—',
  },
  {
    id: 'cls-3',
    name: 'JSS 3',
    level: 'Junior Secondary 3 (National Examination Year)',
    enrolled: 0,
    capacity: 250,
    classTeacher: 'Unassigned',
    classTeacherId: '—',
    subjectsCount: 12,
    attendanceToday: '—',
  },
  {
    id: 'cls-4',
    name: 'SS 1',
    level: 'Senior Secondary 1',
    enrolled: 0,
    capacity: 250,
    classTeacher: 'Unassigned',
    classTeacherId: '—',
    subjectsCount: 14,
    attendanceToday: '—',
  },
  {
    id: 'cls-5',
    name: 'SS 2',
    level: 'Senior Secondary 2',
    enrolled: 0,
    capacity: 250,
    classTeacher: 'Unassigned',
    classTeacherId: '—',
    subjectsCount: 14,
    attendanceToday: '—',
  },
  {
    id: 'cls-6',
    name: 'SS 3',
    level: 'Senior Secondary 3 (National Examination Year)',
    enrolled: 0,
    capacity: 250,
    classTeacher: 'Unassigned',
    classTeacherId: '—',
    subjectsCount: 14,
    attendanceToday: '—',
  },
];

export default function ProprietorClassesPage() {
  const [classesList, setClassesList] = useState<ClassData[]>(BASE_CLASSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadState = async () => {
      try {
        const [clsRes, stuRes, setRes, attRes] = await Promise.all([
          fetch('/api/classes').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/students').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/schools/settings').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/attendance').then((r) => (r.ok ? r.json() : null)),
        ]);

        const dbClasses = clsRes?.success && Array.isArray(clsRes.data) ? clsRes.data : [];
        const dbStudents = stuRes?.success && Array.isArray(stuRes.data) ? stuRes.data : [];
        const defaultCapacity = setRes?.data?.classCapacity || 250;
        const liveAttClasses = attRes?.data?.classes || [];

        if (isMounted) {
          setClassesList(
            BASE_CLASSES.map((c) => {
              const dbMatch = dbClasses.find((dbC: any) => dbC.name === c.name);
              const enrolledCount = dbStudents.filter((s: any) => normalizeClass(s.class) === c.name).length;
              const teacherName = dbMatch?.classTeacher && dbMatch.classTeacher !== 'Unassigned'
                ? dbMatch.classTeacher
                : 'Unassigned';

              const attMatch = liveAttClasses.find((a: any) => a.class === c.name);
              const attToday = attMatch && attMatch.attendanceRate !== null && attMatch.attendanceRate !== undefined
                ? `${attMatch.attendanceRate}%`
                : '—';

              return {
                ...c,
                id: dbMatch?.id || c.id,
                capacity: dbMatch?.capacity || defaultCapacity,
                enrolled: enrolledCount,
                classTeacher: teacherName,
                classTeacherId: dbMatch?.teacherId ? dbMatch.teacherId.slice(0, 8) : '—',
                attendanceToday: attToday,
              };
            })
          );
        }
      } catch {} finally {
        if (isMounted) setLoading(false);
      }
    };

    loadState();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalEnrolled = classesList.reduce((acc, c) => acc + c.enrolled, 0);
  const totalCapacity = classesList.reduce((acc, c) => acc + c.capacity, 0);

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Classes and Student Enrollment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Institutional overview of the 6 classes (JSS 1 to SS 3), student capacity, and appointed Class Teachers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="teal" size="sm">
            Enrolled: {totalEnrolled} of {totalCapacity} Capacity
          </Badge>
          <Link href="/proprietor/timetable">
            <Button size="sm" variant="outline">
              Class Timetables
            </Button>
          </Link>
        </div>
      </div>

      {/* Class Cards Grid (The 6 Classes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classesList.map((cls) => {
          const pct = Math.round((cls.enrolled / (cls.capacity || 1)) * 100);
          const hasTeacher = cls.classTeacher !== 'Unassigned';

          return (
            <Card key={cls.id} className="p-6 border-slate-200 space-y-5 hover:shadow-md transition-shadow">
              {/* Class Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-[#b3141f] tracking-wide uppercase">
                    {cls.level}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {cls.name}
                  </h2>
                </div>

                <Badge
                  variant={pct >= 95 ? 'coral' : pct >= 90 ? 'amber' : 'emerald'}
                  size="sm"
                >
                  {pct}% Capacity
                </Badge>
              </div>

              {/* Student Capacity Metrics */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Students Enrolled:</span>
                  <span className="font-bold text-slate-900">
                    {cls.enrolled} of {cls.capacity} seats
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 95 ? 'bg-[#b3141f]' : pct >= 90 ? 'bg-amber-500' : 'bg-[#0f3a3e]'
                    }`}
                    style={{ width: `${Math.max(pct, cls.enrolled > 0 ? 5 : 0)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-0.5">
                  <span>Today's Attendance: <strong className="text-emerald-700">{cls.attendanceToday}</strong></span>
                  <span>{cls.subjectsCount} Subjects</span>
                </div>
              </div>

              {/* Appointed Class Teacher Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold uppercase tracking-wider">
                    Class Teacher
                  </span>
                  {hasTeacher ? (
                    <span className="font-mono font-bold text-teal-800 text-[10px]">
                      {cls.classTeacherId}
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold text-[10px]">Vacant</span>
                  )}
                </div>

                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#0f3a3e]" />
                  {cls.classTeacher}
                </p>
                <p className="text-[10px] text-slate-500">
                  Oversees student conduct, morning roll-call, and reports to the Principal and Proprietor.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href={`/proprietor/students?class=${encodeURIComponent(cls.name)}`}
                  className="font-semibold text-[#0f3a3e] hover:underline flex items-center gap-1"
                >
                  View Students ({cls.enrolled}) <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href={`/proprietor/timetable`}
                  className="font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  Timetable <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
