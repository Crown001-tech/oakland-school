'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStudent } from '@/context/StudentContext';
import {
  Clock,
  BookOpen,
  FileText,
  Laptop,
  Award,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function StudentDashboard() {
  const { student } = useStudent();
  const [timetable, setTimetable] = useState<any | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Get current day of week (default to Monday on weekends)
  const todayDayName = React.useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const current = days[new Date().getDay()];
    return current === 'Saturday' || current === 'Sunday' ? 'Monday' : current;
  }, []);

  useEffect(() => {
    // 1. Fetch Timetable
    fetch('/api/timetable')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) setTimetable(data.data);
      })
      .catch(() => {});

    // 2. Fetch Learning Materials
    const classQuery = student?.currentClass ? `?class=${encodeURIComponent(student.currentClass)}` : '';
    fetch(`/api/materials${classQuery}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.materials)) {
          setMaterials(data.materials.slice(0, 4));
        }
      })
      .catch(() => {});

    // 3. Fetch Subjects
    const subParams = new URLSearchParams();
    if (student?.currentClassId) subParams.append('classId', student.currentClassId);
    if (student?.currentClass) subParams.append('class', student.currentClass);
    if (student?.department) subParams.append('department', student.department);
    const subQuery = subParams.toString() ? `?${subParams.toString()}` : '';

    fetch(`/api/subjects${subQuery}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setSubjects(data.data);
        }
      })
      .catch(() => {});

    // 4. Fetch Calendar
    fetch('/api/calendar')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.events) ? data.events : []);
        setEvents(list.slice(0, 3));
      })
      .catch(() => {});
  }, [student?.currentClass, student?.currentClassId, student?.department]);

  // Today's scheduled periods for the student's class
  const todayPeriods = React.useMemo(() => {
    if (!timetable || !student) return [];

    // Find class schedule matching student's current class name (e.g. 'JSS 1', 'JSS 1A')
    const classKeys = Object.keys(timetable);
    const matchedKey = classKeys.find(
      (k) =>
        k.toLowerCase() === student.currentClass.toLowerCase() ||
        student.currentClass.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(student.currentClass.toLowerCase())
    );

    if (!matchedKey) return [];

    const classSchedule = timetable[matchedKey];
    const daySchedule = classSchedule[todayDayName] || [];

    return Array.isArray(daySchedule) ? daySchedule : [];
  }, [timetable, student, todayDayName]);

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      {/* Welcome & Student Hero */}
      <div className="bg-linear-to-r from-brand-primary via-[#14484d] to-[#0a272a] rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Oakland International School &bull; 2026/2027
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting}, {student?.firstName || student?.name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="text-xs text-slate-200 font-medium">
            Enrolled in Class: <strong className="text-white">{student?.currentClass}</strong>
            {student?.department ? (
              <> &bull; Department: <strong className="text-amber-200 font-bold">{student.department}</strong></>
            ) : null} &bull; Admission No:{' '}
            <span className="font-mono text-amber-200">{student?.admissionNumber}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/student/timetable"
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-white text-brand-primary text-xs font-bold hover:bg-slate-100 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Class Timetable</span>
          </Link>
          <Link
            href="/student/materials"
            className="px-4 py-2.5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Study Notes</span>
          </Link>
        </div>
      </div>

      {/* 4 Core Academic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Enrolled Subjects */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Enrolled Subjects</span>
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {subjects.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {student?.department ? `${student.department} department subjects` : 'Registered subjects'}
          </p>
        </div>

        {/* Scheduled Periods Today */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Scheduled Today</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {todayPeriods.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Classes scheduled today
          </p>
        </div>

        {/* Learning Materials */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Study Materials</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {materials.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Available study notes
          </p>
        </div>

        {/* Term Status */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Status</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-700">
            Enrolled
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Academic session
          </p>
        </div>
      </div>

      {/* Today's Schedule & Learning Materials Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-primary" />
              <h2 className="text-sm font-bold text-slate-900">
                Today&apos;s Class Schedule ({todayDayName})
              </h2>
            </div>
            <Link
              href="/student/timetable"
              className="text-xs text-brand-primary hover:text-brand-accent font-bold inline-flex items-center gap-1"
            >
              Full Timetable &rarr;
            </Link>
          </div>

          {todayPeriods.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 rounded-xl bg-slate-50">
              No periods scheduled for {todayDayName}. Consult full timetable.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todayPeriods.map((period: any, idx: number) => (
                <div
                  key={idx}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/60 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      P{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {period.subject || period.subjectName || 'Class Period'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Teacher: <strong className="text-slate-700">{period.teacher || period.teacherName || 'Faculty'}</strong> &bull; Room: {period.room || 'Classroom'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-semibold text-slate-500 shrink-0">
                    {period.time || `0${8 + idx}:00 - 0${8 + idx}:45`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1/3): Recent Materials & Events */}
        <div className="space-y-6">
          {/* Recent Study Materials */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-slate-900">
                  Study Materials
                </h3>
              </div>
              <Link
                href="/student/materials"
                className="text-xs text-brand-primary hover:text-brand-accent font-bold"
              >
                All &rarr;
              </Link>
            </div>

            {materials.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 rounded-xl bg-slate-50">
                No new study notes uploaded this week.
              </div>
            ) : (
              <div className="space-y-2.5">
                {materials.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {m.title}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {m.subjectName} &bull; {m.fileType}
                      </p>
                    </div>
                    {m.fileUrl ? (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-brand-primary hover:bg-brand-primary/10 transition shrink-0"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Notes</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Academic Calendar Events */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-slate-900">
                  Upcoming Dates
                </h3>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 rounded-xl bg-slate-50">
                No events recorded.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((ev: any) => (
                  <div key={ev.id} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <p className="font-bold text-slate-800">{ev.title}</p>
                    <p className="text-[10px] text-brand-primary font-bold mt-0.5">{ev.startDate || ev.date || 'Upcoming'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
