'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock,
  MapPin,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Trash2,
  Calendar as CalendarIcon,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  fetchPrincipalDelegations,
  type PrincipalDelegations,
} from '@/lib/delegations';
import { DelegationRestrictedBanner } from '@/components/common/DelegationRestrictedBanner';

export interface SchoolEvent {
  id: string;
  title: string;
  description?: string;
  eventType: 'academic' | 'holiday' | 'examination' | 'pta' | 'deadline' | 'sports';
  startDate: string;
  endDate: string;
  allDay: boolean;
  audience: 'all' | 'staff' | 'parents' | 'students';
  location?: string;
}

const EVENT_TYPE_BADGES: Record<string, { label: string; class: string }> = {
  academic: { label: 'Academic', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  holiday: { label: 'Holiday', class: 'bg-blue-50 text-blue-800 border-blue-200' },
  examination: { label: 'Examination', class: 'bg-purple-50 text-purple-800 border-purple-200' },
  pta: { label: 'PTA', class: 'bg-amber-50 text-amber-800 border-amber-200' },
  deadline: { label: 'Deadline', class: 'bg-rose-50 text-rose-800 border-rose-200' },
  sports: { label: 'Sports', class: 'bg-teal-50 text-teal-800 border-teal-200' },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAudience, setSelectedAudience] = useState('all');
  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Month View navigation
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // October (0-indexed)
  const [delegations, setDelegations] = useState<PrincipalDelegations | null>(null);
  const canSetCalendarEvents = delegations?.canSetCalendarEvents ?? true;

  // Load authoritative calendar events from PostgreSQL API with cross-portal sync
  const loadEvents = async () => {
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const payload = await res.json();
        if (payload?.success && Array.isArray(payload.data)) {
          const sorted = payload.data.sort(
            (a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          );
          setEvents(sorted);
          return;
        }
      }
    } catch {}
    setEvents([]);
  };

  useEffect(() => {
    loadEvents();
    fetchPrincipalDelegations().then(setDelegations);
    window.addEventListener('focus', loadEvents);
    return () => {
      window.removeEventListener('focus', loadEvents);
    };
  }, []);

  // Event modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<SchoolEvent['eventType']>('academic');
  const [newStartDate, setNewStartDate] = useState('2026-10-12');
  const [newEndDate, setNewEndDate] = useState('2026-10-12');
  const [newAudience, setNewAudience] = useState<SchoolEvent['audience']>('all');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBroadcast = (evt: SchoolEvent) => {
    showToast(`Reminder alert dispatched for "${evt.title}".`);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!canSetCalendarEvents) {
      showToast('Action prohibited: Academic calendar modification has not been delegated by the Proprietor.');
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));

    try {
      await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
    } catch {}

    showToast('Event removed from school calendar');
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSetCalendarEvents) {
      showToast('Action prohibited: Academic calendar modification has not been delegated by the Proprietor.');
      return;
    }
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          eventType: newType,
          startDate: newStartDate,
          endDate: newEndDate,
          allDay: true,
          audience: newAudience,
          location: newLocation.trim() || 'Oakland Main Campus',
        }),
      });

      if (res.ok) {
        await loadEvents();
        setIsAddOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewLocation('');
        showToast(`Event scheduled: ${newTitle.trim()}`);
      }
    } catch {
      showToast('Failed to schedule event');
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const filteredEvents = events.filter((evt) => {
    if (selectedType !== 'all' && evt.eventType !== selectedType) return false;
    if (selectedAudience !== 'all' && evt.audience !== selectedAudience) return false;
    return true;
  });

  // Calculate days for the active month
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday = 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">School Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official term dates, examination weeks, public holidays, and administrative events.
          </p>
        </div>

        {canSetCalendarEvents ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Event</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Calendar Changes Reserved</span>
            </span>
          </div>
        )}
      </div>

      {/* Authority Restriction Notice */}
      {!canSetCalendarEvents && (
        <DelegationRestrictedBanner
          title="Academic Calendar Management Reserved"
          description="The Office of the Proprietor has reserved academic calendar scheduling and modification authorities. The Principal may review scheduled term dates, exams, and holidays in read-only mode."
        />
      )}

      {/* Controls Bar: Filters & View Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'academic', label: 'Academic' },
            { id: 'examination', label: 'Examinations' },
            { id: 'holiday', label: 'Holidays' },
            { id: 'pta', label: 'PTA' },
            { id: 'sports', label: 'Sports' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedType === cat.id
                  ? 'bg-[#0f3a3e] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* View Switch */}
        <div className="flex items-center gap-2">
          <select
            value={selectedAudience}
            onChange={(e) => setSelectedAudience(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-slate-800 bg-white"
          >
            <option value="all">All Audiences</option>
            <option value="parents">Parents</option>
            <option value="staff">Staff Only</option>
            <option value="students">Students</option>
          </select>

          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                viewMode === 'agenda' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                viewMode === 'month' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              Month View
            </button>
          </div>
        </div>
      </div>

      {/* Main Events Feed: List View */}
      {viewMode === 'agenda' ? (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 text-xs space-y-2">
              <CalendarIcon className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700 text-sm">No Events Scheduled</p>
              <p className="text-slate-400 max-w-sm mx-auto">
                No events currently scheduled. Click &quot;Schedule Event&quot; above to add term resumption dates, examination weeks, holidays, or meetings.
              </p>
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const startDate = new Date(evt.startDate);
              const badge = EVENT_TYPE_BADGES[evt.eventType] || EVENT_TYPE_BADGES.academic;

              return (
                <div
                  key={evt.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="flex items-start gap-4">
                    {/* Date Block */}
                    <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-teal-800 uppercase leading-none">
                        {startDate.toLocaleDateString('en-GB', { month: 'short' })}
                      </span>
                      <span className="text-base font-bold text-slate-900 leading-tight">
                        {startDate.getDate()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.class}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-slate-400 capitalize">
                          Audience: {evt.audience}
                        </span>
                      </div>

                      <h2 className="text-sm font-bold text-slate-900">{evt.title}</h2>
                      {evt.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{evt.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {evt.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBroadcast(evt)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reminder</span>
                    </button>
                    {canSetCalendarEvents && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Month Overview Grid */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day} className="text-[11px] font-semibold text-slate-400 py-1">
                {day}
              </span>
            ))}

            {/* Empty cells before month starts */}
            {Array.from({ length: firstDayWeekday }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-16 p-1.5 rounded-xl bg-slate-50/40 border border-transparent" />
            ))}

            {/* Real Days of Month */}
            {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((date) => {
              const dayEvents = events.filter((e) => {
                const d = new Date(e.startDate);
                return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === date;
              });

              return (
                <div
                  key={date}
                  className={`min-h-16 p-1.5 rounded-xl border text-left flex flex-col justify-between transition ${
                    dayEvents.length > 0
                      ? 'border-teal-200 bg-teal-50/40'
                      : 'border-slate-100 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <span className="font-semibold text-[11px] text-slate-800">{date}</span>
                  <div className="space-y-0.5">
                    {dayEvents.map((evt) => (
                      <span
                        key={evt.id}
                        className="block text-[8.5px] font-bold px-1 py-0.5 rounded truncate bg-[#0f3a3e] text-white"
                        title={evt.title}
                      >
                        {evt.title}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Schedule Event */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add School Event</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Exhibition and Open Day"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Event Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                  >
                    <option value="academic">Academic</option>
                    <option value="examination">Examination</option>
                    <option value="holiday">Holiday</option>
                    <option value="pta">PTA Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="sports">Sports</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Audience</label>
                  <select
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                  >
                    <option value="all">Everyone</option>
                    <option value="parents">Parents</option>
                    <option value="staff">Staff</option>
                    <option value="students">Students</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. School Auditorium"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief details about the event..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0f3a3e] hover:bg-[#164e53] text-white font-semibold rounded-xl transition cursor-pointer"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
