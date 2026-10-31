'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Tag,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

export default function ParentCalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.events) ? data.events : []);
        setEvents(list);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const filteredEvents = events.filter((ev) => {
    if (filter === 'all') return true;
    const evType = (ev.eventType || ev.type || '').toLowerCase();
    if (filter === 'academic' || filter === 'exam') {
      return evType === 'academic' || evType === 'exam';
    }
    if (filter === 'holiday') {
      return evType === 'holiday';
    }
    if (filter === 'meeting' || filter === 'pta') {
      return evType === 'meeting' || evType === 'pta';
    }
    if (filter === 'sports') {
      return evType === 'sports';
    }
    return evType === filter.toLowerCase();
  });

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          Academic Calendar
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          2026/2027 Term 1 Schedule, examinations, breaks, and conferences
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            filter === 'all'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Events
        </button>
        <button
          type="button"
          onClick={() => setFilter('academic')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            filter === 'academic'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Examinations
        </button>
        <button
          type="button"
          onClick={() => setFilter('holiday')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            filter === 'holiday'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Holidays
        </button>
        <button
          type="button"
          onClick={() => setFilter('meeting')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            filter === 'meeting'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Parent Consultations & PTA
        </button>
        <button
          type="button"
          onClick={() => setFilter('sports')}
          className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            filter === 'sports'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Sports & Co-Curricular
        </button>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <BrandLoader />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No Events Scheduled</h3>
            <p className="text-xs text-slate-500">
              There are no calendar entries matching this category for the current term.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {ev.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                    {ev.type || 'Calendar'}
                  </span>
                </div>
                {ev.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ev.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <CalendarIcon className="w-3.5 h-3.5 text-brand-primary" />
                    <span>{ev.startDate || ev.date || 'TBD'}</span>
                    {ev.endDate && ev.endDate !== ev.startDate && <span> &ndash; {ev.endDate}</span>}
                  </span>
                  {ev.time && (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{ev.time}</span>
                    </span>
                  )}
                  {ev.location && (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{ev.location}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                <span className="px-3 py-1 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[11px] font-bold">
                  Confirmed
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
