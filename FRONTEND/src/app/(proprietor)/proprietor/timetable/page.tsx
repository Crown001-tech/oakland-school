'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { Clock, Calendar, User, Printer } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
  { id: 'roll-call', label: 'Roll Call', time: '07:45 – 08:15', isBreak: true },
  { id: 'p1', label: 'Period 1', time: '08:15 – 09:00' },
  { id: 'p2', label: 'Period 2', time: '09:00 – 09:45' },
  { id: 'p3', label: 'Period 3', time: '09:45 – 10:30' },
  { id: 'break1', label: 'Short Break', time: '10:30 – 10:50', isBreak: true },
  { id: 'p4', label: 'Period 4', time: '10:50 – 11:35' },
  { id: 'p5', label: 'Period 5', time: '11:35 – 12:20' },
  { id: 'p6', label: 'Period 6', time: '12:20 – 13:05' },
  { id: 'break2', label: 'Lunch', time: '13:05 – 13:45', isBreak: true },
  { id: 'p7', label: 'Period 7', time: '13:45 – 14:30' },
  { id: 'p8', label: 'Period 8', time: '14:30 – 15:15' },
];

const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

type TimetableCell = { subject: string; teacher: string } | null;
type TimetableData = Record<string, Record<string, Record<string, TimetableCell>>>;

export default function ProprietorTimetablePage() {
  const [selectedClass, setSelectedClass] = useState('JSS 1');
  const [mobileDay, setMobileDay] = useState('Monday');
  const [timetable, setTimetable] = useState<TimetableData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadTimetable() {
      try {
        const res = await fetch('/api/timetable');
        const json = await res.json();
        if (json.success && json.data && isMounted) {
          setTimetable(json.data);
        }
      } catch (err) {
        console.error('Failed to load timetable:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTimetable();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  const classData = timetable[selectedClass] || {};
  const hasEntries = Object.keys(classData).some((period) =>
    DAYS.some((day) => Boolean(classData[period]?.[day]))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Master Timetable
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Schedule of lesson periods, subjects, and assigned teachers across classes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="text-xs border-slate-300 text-slate-700 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Master Schedule</span>
          </Button>
        </div>
      </div>

      {/* Class selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Class:</span>
        {CLASSES.map((cls) => (
          <button
            key={cls}
            onClick={() => setSelectedClass(cls)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedClass === cls
                ? 'bg-brand-primary text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cls}
          </button>
        ))}
      </div>

      {/* Timetable View */}
      {!hasEntries ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 p-12 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-brand-primary flex items-center justify-center mx-auto border border-teal-100">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No Master Timetable Configured for {selectedClass} Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              The Principal is responsible for creating and maintaining the timetable across all 6 classes. Once saved by the Principal, periods will appear here for executive audit.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Mobile Day Segment Selector (< md) */}
          <div className="flex md:hidden items-center justify-between bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setMobileDay(d)}
                className={`flex-1 py-1.5 px-2 text-center text-xs font-bold rounded-lg transition-all ${
                  mobileDay === d
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Mobile Vertical Period Stack (< md) */}
          <div className="md:hidden space-y-2">
            {PERIODS.map((p) => {
              if (p.isBreak) {
                return (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-2"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.label} &bull; {p.time}</span>
                  </div>
                );
              }
              const cell = classData[p.id]?.[mobileDay];
              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {p.label} ({p.time})
                    </span>
                    {cell ? (
                      <div className="mt-0.5">
                        <p className="text-sm font-bold text-slate-900">{cell.subject}</p>
                        {cell.teacher && (
                          <p className="text-xs text-teal-800 font-medium flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3" />
                            <span>{cell.teacher}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-0.5">Free Period</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop 5-Day Master Grid (>= md) */}
          <Card className="hidden md:block border-slate-200 shadow-xs overflow-hidden">
            <CardContent className="p-0 overflow-x-auto relative">
              <table className="w-full text-xs text-left">
                <thead className="bg-brand-primary text-white font-bold">
                  <tr>
                    <th className="py-3 px-4 w-36">Period</th>
                    {DAYS.map((d) => (
                      <th key={d} className="py-3 px-3 min-w-[130px]">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {PERIODS.map((p) => {
                  if (p.isBreak) {
                    return (
                      <tr key={p.id} className="bg-slate-50/80">
                        <td className="py-2.5 px-4 font-bold text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.label}</span>
                        </td>
                        <td colSpan={5} className="py-2.5 px-3 text-center text-[11px] text-slate-400 font-medium tracking-wide">
                          {p.time} &bull; {p.label}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{p.label}</p>
                        <p className="text-[10px] text-slate-400">{p.time}</p>
                      </td>
                      {DAYS.map((day) => {
                        const cell = classData[p.id]?.[day];
                        return (
                          <td key={day} className="py-3 px-3 align-top">
                            {cell ? (
                              <div className="p-2 rounded-lg bg-teal-50/60 border border-teal-100/80 space-y-0.5">
                                <p className="font-bold text-slate-900 leading-tight">{cell.subject}</p>
                                {cell.teacher && (
                                  <p className="text-[10px] text-teal-800 flex items-center gap-1">
                                    <User className="w-2.5 h-2.5" />
                                    <span>{cell.teacher}</span>
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-[11px]">—</span>
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
      </>
      )}
    </div>
  );
}
