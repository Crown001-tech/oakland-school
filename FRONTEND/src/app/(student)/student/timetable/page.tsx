'use client';

import React, { useState, useEffect } from 'react';
import { useStudent } from '@/context/StudentContext';
import {
  Clock,
  Printer,
  Calendar,
  BookOpen,
  MapPin,
  User,
  Sparkles,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
type DayName = (typeof DAYS)[number];

export default function StudentTimetablePage() {
  const { student } = useStudent();
  const [timetableData, setTimetableData] = useState<any | null>(null);
  const [activeDay, setActiveDay] = useState<DayName>('Monday');
  const [isLoading, setIsLoading] = useState(true);

  // Default day to today if weekday
  useEffect(() => {
    const dayIndex = new Date().getDay();
    if (dayIndex >= 1 && dayIndex <= 5) {
      setActiveDay(DAYS[dayIndex - 1]);
    }
  }, []);

  useEffect(() => {
    fetch('/api/timetable')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.data) {
          setTimetableData(data.data);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Filter timetable to student's class
  const classSchedule = React.useMemo(() => {
    if (!timetableData || !student?.currentClass) return null;

    const classKeys = Object.keys(timetableData);
    const matchedKey = classKeys.find(
      (k) =>
        k.toLowerCase() === student.currentClass.toLowerCase() ||
        student.currentClass.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(student.currentClass.toLowerCase())
    );

    if (!matchedKey) return null;
    return timetableData[matchedKey];
  }, [timetableData, student?.currentClass]);

  // Selected day's periods
  const currentPeriods = React.useMemo(() => {
    if (!classSchedule) return [];
    const dayPeriods = classSchedule[activeDay] || [];
    return Array.isArray(dayPeriods) ? dayPeriods : [];
  }, [classSchedule, activeDay]);

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Class Timetable
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Weekly class schedule for <strong>{student?.currentClass || '—'}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5 self-start print:hidden"
        >
          <Printer className="w-4 h-4" />
          <span>Print Schedule</span>
        </button>
      </div>

      {/* Weekday Switcher Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 flex flex-wrap items-center gap-1.5 print:hidden">
        {DAYS.map((day) => {
          const isSelected = activeDay === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              className={`px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition cursor-pointer ${
                isSelected
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Schedule Content */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <BrandLoader />
        </div>
      ) : currentPeriods.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No Periods Scheduled</h3>
            <p className="text-xs text-slate-500">
              No periods recorded for {activeDay} in {student?.currentClass}. Check with your class teacher.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-primary" />
              <h2 className="text-sm font-bold text-slate-900">
                {activeDay} Schedule ({currentPeriods.length} Periods)
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600">
              {student?.currentClass}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {currentPeriods.map((period: any, idx: number) => (
              <div
                key={idx}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    P{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {period.subject || period.subjectName || 'Class Period'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Teacher: <strong className="text-slate-700">{period.teacher || period.teacherName || 'Faculty'}</strong></span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Room: {period.room || 'Classroom'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="self-start sm:self-center shrink-0">
                  <span className="px-3 py-1 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-mono font-bold">
                    {period.time || `0${8 + idx}:00 - 0${8 + idx}:45`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
