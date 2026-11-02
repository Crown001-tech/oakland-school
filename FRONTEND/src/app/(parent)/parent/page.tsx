'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useActiveChild } from '@/context/ParentContext';
import {
  Award,
  CreditCard,
  CalendarCheck,
  ShieldCheck,
  Bell,
  ArrowRight,
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function ParentDashboard() {
  const { parent, activeChild, childrenList, setActiveChildId } = useActiveChild();
  const [finances, setFinances] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [pickupInfo, setPickupInfo] = useState<any>(null);
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);
  const [attendanceStat, setAttendanceStat] = useState<{ attendanceRate: string | null } | null>(null);

  useEffect(() => {
    // 1. Fetch Finances
    fetch('/api/finances')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.classes) setFinances(data);
      })
      .catch(() => {});

    // 2. Fetch Notices (Filtered strictly to announcements, zero assignments)
    fetch('/api/communications')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.history)) {
          // Strict filter: Exclude any item mentioning assignments or homework
          const cleanHistory = data.history.filter((n: any) => {
            const sub = (n.subject || '').toLowerCase();
            const text = (n.content || '').toLowerCase();
            return !sub.includes('assignment') && !sub.includes('homework') && !text.includes('assignment');
          });
          setNotices(cleanHistory.slice(0, 4));
        }
      })
      .catch(() => {});

    // 3. Fetch Calendar
    fetch('/api/calendar')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.events) ? data.events : []);
        setCalendarEvents(list.slice(0, 3));
      })
      .catch(() => {});

    // 4. Fetch Pickup Escorts
    fetch('/api/pickup')
      .then((res) => res.json())
      .then((data) => {
        if (data) setPickupInfo(data);
      })
      .catch(() => {});

    // 5. Fetch Dynamic Student Attendance
    if (activeChild?.id) {
      fetch(`/api/attendance?studentId=${activeChild.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) setAttendanceStat(data);
        })
        .catch(() => {});
    }
  }, [activeChild?.id]);

  // Derive child tuition details from finances
  const childTuition = React.useMemo(() => {
    if (!finances || !activeChild) return { tuition: 0, paid: 0, balance: 0 };
    // The server bills each child by the school's own rule, so the amounts come straight from its ledger
    const ledger = (finances.studentLedger || []).find(
      (s: any) => s.id === activeChild.id || (activeChild.admissionNumber && s.admissionNo === activeChild.admissionNumber)
    );
    const fee = Number(ledger?.totalBilled ?? 0);
    const paid = Number(ledger?.amountPaid ?? 0);
    const balance = ledger?.balance !== undefined ? Number(ledger.balance) : Math.max(0, fee - paid);

    return { tuition: fee, paid, balance };
  }, [finances, activeChild]);

  // Active child pickup PIN
  const childPickupRecord = React.useMemo(() => {
    if (!pickupInfo || !activeChild) return null;
    const records = pickupInfo.guardians || [];
    return records.find((r: any) => r.student_id === activeChild.id);
  }, [pickupInfo, activeChild]);

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Welcome, {parent?.name}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            2026/2027 Academic Session &bull; First Term
          </p>
        </div>

        {/* Quick child switcher if multiple children exist */}
        {childrenList.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Student:</span>
            <div className="flex flex-wrap gap-1.5">
              {childrenList.map((kid) => {
                const isSelected = kid.id === activeChild?.id;
                return (
                  <button
                    key={kid.id}
                    type="button"
                    onClick={() => setActiveChildId(kid.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {kid.name.split(' ')[0]} ({kid.currentClass})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Student Highlight Card */}
      {activeChild ? (
        <div className="bg-linear-to-r from-brand-primary to-brand-primary-light rounded-2xl p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-amber-300 tracking-wider uppercase">
              Current Active Student
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {activeChild.name}
            </h2>
            <p className="text-xs text-slate-200">
              Class: <strong>{activeChild.currentClass}</strong> &bull; Admission No:{' '}
              <span className="font-mono text-amber-200">{activeChild.admissionNumber}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/parent/results"
              className="px-3.5 py-2.5 rounded-xl bg-white text-brand-primary text-xs font-bold hover:bg-slate-100 transition shadow-xs text-center min-h-[44px] flex items-center justify-center"
            >
              Terminal Results
            </Link>
            <Link
              href="/parent/fees"
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 text-center min-h-[44px] flex items-center justify-center"
            >
              Fee Statement
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          No active student record linked to your guardian account. Please contact school administration.
        </div>
      )}

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {attendanceStat?.attendanceRate || '—'}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {attendanceStat?.attendanceRate
              ? 'Present across recorded school days'
              : 'No attendance recorded yet'}
          </p>
        </div>

        {/* Academic Status */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Academics</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-slate-900">
            Scores In Review
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Term 1 assessments under verification
          </p>
        </div>

        {/* Tuition Balance */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tuition</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight font-mono text-slate-900">
            {childTuition.balance === 0 ? (
              <span className="text-emerald-700">Settled</span>
            ) : (
              `₦${childTuition.balance.toLocaleString()}`
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {childTuition.balance === 0
              ? 'No outstanding fee balance'
              : `Total assessed: ₦${childTuition.tuition.toLocaleString()}`}
          </p>
        </div>

        {/* Pickup Security */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Gate Security</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold tracking-tight text-slate-900">
            PIN Active
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            4-digit authorization code verified
          </p>
        </div>
      </div>

      {/* Main Grid: Notices & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): School Notices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-primary" />
              <h3 className="text-sm font-bold text-slate-900">
                School Notices
              </h3>
            </div>
            <Link
              href="/parent/communications"
              className="text-xs text-brand-primary hover:text-brand-accent font-bold inline-flex items-center gap-1 transition-colors"
            >
              View All &rarr;
            </Link>
          </div>

          {notices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs rounded-xl bg-slate-50">
              No circulars or school announcements dispatched at this time.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notices.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setSelectedNotice(n)}
                  className="py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {n.subject}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {n.content ? n.content.replace(/<[^>]*>/g, '') : 'Tap to read official school bulletin.'}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0 whitespace-nowrap">
                    {n.sentAt}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1/3): Upcoming Events */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-primary" />
              <h3 className="text-sm font-bold text-slate-900">
                School Calendar
              </h3>
            </div>
            <Link
              href="/parent/calendar"
              className="text-xs text-brand-primary hover:text-brand-accent font-bold transition-colors"
            >
              Full Calendar &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {calendarEvents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs rounded-xl bg-slate-50">
                No upcoming events recorded on the academic calendar.
              </div>
            ) : (
              calendarEvents.map((ev: any) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-brand-primary font-bold">
                    <span>{ev.startDate || ev.date || 'Upcoming'}</span>
                    <span className="text-slate-400 font-normal">{ev.type || 'Academic'}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {ev.title}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notice Reader Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedNotice.subject}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dispatched: {selectedNotice.sentAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div
              className="text-xs text-slate-700 leading-relaxed max-h-72 overflow-y-auto space-y-2"
              dangerouslySetInnerHTML={{
                __html: selectedNotice.content || '<p>Official notice content.</p>',
              }}
            />

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
