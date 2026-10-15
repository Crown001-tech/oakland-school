'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clock, Calendar, BookOpen, User, Printer, CheckCircle2 } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { STANDARD_CLASSES } from '@/lib/class-utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface PeriodItem {
  id: string;
  label: string;
  time: string;
  isBreak?: boolean;
}

const DEFAULT_PERIODS: PeriodItem[] = [
  { id: 'roll-call', label: 'Roll Call', time: '07:45 – 08:15', isBreak: true },
  { id: 'p1', label: 'Period 1', time: '08:15 – 09:00' },
  { id: 'p2', label: 'Period 2', time: '09:00 – 09:45' },
  { id: 'p3', label: 'Period 3', time: '09:45 – 10:30' },
  { id: 'break1', label: 'Short Break', time: '10:30 – 10:50', isBreak: true },
  { id: 'p4', label: 'Period 4', time: '10:50 – 11:35' },
  { id: 'p5', label: 'Period 5', time: '11:35 – 12:20' },
  { id: 'p6', label: 'Period 6', time: '12:20 – 13:05' },
  { id: 'break2', label: 'Lunch Break', time: '13:05 – 13:45', isBreak: true },
  { id: 'p7', label: 'Period 7', time: '13:45 – 14:30' },
  { id: 'p8', label: 'Period 8', time: '14:30 – 15:15' },
];

type TimetableCell = { subject: string; teacher: string } | null;
type TimetableData = Record<string, Record<string, Record<string, TimetableCell>>>;

export default function TeacherTimetablePage() {
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState('JSS 2');
  const [timetable, setTimetable] = useState<TimetableData>({});
  const [periods, setPeriods] = useState<PeriodItem[]>(DEFAULT_PERIODS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        // 1. Fetch current teacher profile to identify default assigned class
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.authenticated && meData.profile) {
            const p = meData.profile;
            if (!isMounted) return;
            setCurrentTeacher(p);

            // Default to teacher's assigned class if set
            if (p.assignedClass && STANDARD_CLASSES.includes(p.assignedClass)) {
              setSelectedClass(p.assignedClass);
            } else if (p.teachingAssignments && Array.isArray(p.teachingAssignments) && p.teachingAssignments.length > 0) {
              const firstClass = p.teachingAssignments[0]?.classes?.[0];
              if (firstClass && STANDARD_CLASSES.includes(firstClass)) {
                setSelectedClass(firstClass);
              }
            }
          }
        }

        // 2. Fetch master timetable
        const ttRes = await fetch('/api/timetable');
        if (ttRes.ok) {
          const json = await ttRes.json();
          if (json.success) {
            if (isMounted && json.data) setTimetable(json.data);
            if (isMounted && Array.isArray(json.periods) && json.periods.length > 0) {
              setPeriods(json.periods);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load timetable data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const classData = timetable[selectedClass] || {};
  const hasEntries = Object.keys(classData).some((period) =>
    DAYS.some((day) => Boolean(classData[period]?.[day]))
  );

  // Helper to determine if a cell is taught by the current teacher
  const isCurrentTeacherPeriod = (teacherName: string) => {
    if (!teacherName || !currentTeacher?.name) return false;
    const cleanTeacher = teacherName.toLowerCase().trim();
    const cleanCurrent = (currentTeacher.name as string).toLowerCase().trim();
    if (cleanTeacher === cleanCurrent) return true;
    const parts: string[] = cleanCurrent.split(/\s+/).filter(Boolean);
    return parts.some((part: string) => part.length > 2 && cleanTeacher.includes(part));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Hero Surface */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/70 to-teal-50/30 p-6 sm:p-7 shadow-xs">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0f3a3e] via-teal-600 to-emerald-500" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#0f3a3e] text-white tracking-wide shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-teal-300" />
                <span>Academic Timetable</span>
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Class Timetable
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
                Instructional schedule and period allocations across classes. Your assigned instructional periods are highlighted for instant reference.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => window.print()}
              className="text-xs font-semibold h-10 px-4 rounded-xl border-slate-200 bg-white/80 hover:bg-slate-50 text-slate-700 flex items-center gap-2 shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Schedule</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Class:</span>
          </span>
          {STANDARD_CLASSES.map((cls) => {
            const isSelected = selectedClass === cls;
            const isHome = currentTeacher?.assignedClass === cls;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0f3a3e] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70'
                }`}
              >
                <span>{cls}</span>
                {isHome && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isSelected ? 'bg-teal-700 text-teal-100' : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    My Class
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 ring-2 ring-teal-200" />
            <span className="text-slate-600 font-medium">Your Assigned Teaching Period</span>
          </div>
        </div>
      </div>

      {/* Timetable Matrix */}
      {isLoading ? (
        <div className="py-24 flex justify-center items-center">
          <BrandLoader size="lg" />
        </div>
      ) : !hasEntries ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 p-12 text-center rounded-2xl">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0f3a3e] flex items-center justify-center mx-auto border border-teal-100 shadow-2xs">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No Timetable Published for {selectedClass} Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The School Principal creates and publishes the master instructional timetable. Once scheduled periods are configured in the Principal portal, they will automatically appear here.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="border-slate-200/90 shadow-xs overflow-hidden rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0f3a3e] text-white font-bold">
                <tr>
                  <th className="py-3.5 px-4 w-40">Period</th>
                  {DAYS.map((d) => (
                    <th key={d} className="py-3.5 px-3 min-w-[140px] tracking-wide">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {periods.map((p) => {
                  if (p.isBreak) {
                    return (
                      <tr key={p.id} className="bg-slate-50/80">
                        <td className="py-2.5 px-4 font-bold text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.label}</span>
                        </td>
                        <td
                          colSpan={DAYS.length}
                          className="py-2.5 px-3 text-center text-[11px] text-slate-400 font-medium tracking-wide"
                        >
                          {p.time} &bull; {p.label}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{p.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.time}</p>
                      </td>
                      {DAYS.map((day) => {
                        const cell = classData[p.id]?.[day];
                        const isMyPeriod = cell && isCurrentTeacherPeriod(cell.teacher);

                        return (
                          <td key={day} className="py-3 px-3 align-top">
                            {cell ? (
                              <div
                                className={`p-2.5 rounded-xl border transition-all space-y-1 ${
                                  isMyPeriod
                                    ? 'bg-teal-50/90 border-teal-300 ring-1 ring-teal-200 shadow-2xs'
                                    : 'bg-slate-50/70 border-slate-200/80'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-bold text-slate-900 leading-tight">
                                    {cell.subject}
                                  </p>
                                  {isMyPeriod && (
                                    <span className="shrink-0 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-teal-700 text-white">
                                      You
                                    </span>
                                  )}
                                </div>
                                {cell.teacher && (
                                  <p
                                    className={`text-[10px] flex items-center gap-1 font-medium ${
                                      isMyPeriod ? 'text-teal-800' : 'text-slate-500'
                                    }`}
                                  >
                                    <User className="w-2.5 h-2.5 shrink-0" />
                                    <span>{cell.teacher}</span>
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-[11px] block text-center py-2">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
