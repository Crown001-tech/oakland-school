'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Trash2,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BrandLoader } from '@/components/ui/BrandLoader';

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

export default function ProprietorCalendarPage() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Month View navigation
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // October (0-indexed)

  // Event modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<SchoolEvent['eventType']>('academic');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAudience, setNewAudience] = useState<SchoolEvent['audience']>('all');
  const [newLocation, setNewLocation] = useState('Oakland Main Campus');
  const [newDescription, setNewDescription] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/calendar');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEvents(json.data);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStartDate) return;

    setSaving(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          eventType: newType,
          startDate: newStartDate,
          endDate: newEndDate || newStartDate,
          audience: newAudience,
          location: newLocation,
          description: newDescription.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast('Event created successfully.');
        setIsAddOpen(false);
        setNewTitle('');
        setNewDescription('');
        loadEvents();
      } else {
        alert(json.message || 'Failed to save event.');
      }
    } catch {
      alert('Network error while saving event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        showToast('Event deleted.');
      }
    } catch {
      alert('Failed to delete event.');
    }
  };

  const filteredEvents = events.filter((e) => {
    if (selectedType !== 'all' && e.eventType !== selectedType) return false;
    return true;
  });

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            School Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Institutional term schedule, examination dates, PTA sessions, and public holidays.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'agenda' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Month Grid
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="bg-[#0f3a3e] hover:bg-[#164e53] text-white shadow-xs text-xs font-semibold"
          >
            Schedule Event
          </Button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
          Filter:
        </span>
        <button
          onClick={() => setSelectedType('all')}
          className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
            selectedType === 'all'
              ? 'bg-[#0f3a3e] text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Categories ({events.length})
        </button>
        {Object.entries(EVENT_TYPE_BADGES).map(([key, cfg]) => {
          const count = events.filter((e) => e.eventType === key).length;
          return (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                selectedType === key
                  ? 'bg-[#0f3a3e] text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div className="space-y-4">
          {filteredEvents.length === 0 ? (
            <Card className="py-16 text-center space-y-3 border-dashed border-slate-300">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No School Events Scheduled</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No events match the selected category. Click &quot;Schedule Event&quot; to add a new academic milestone or holiday.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((evt) => {
                const badge = EVENT_TYPE_BADGES[evt.eventType] || EVENT_TYPE_BADGES.academic;
                return (
                  <Card key={evt.id} className="p-5 border-slate-200 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.class}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 capitalize">
                            Audience: {evt.audience}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">{evt.title}</h3>
                      </div>

                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition cursor-pointer"
                        title="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {evt.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">{evt.description}</p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {evt.startDate}
                          {evt.endDate && evt.endDate !== evt.startDate ? ` to ${evt.endDate}` : ''}
                        </span>
                      </div>
                      {evt.location && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin className="w-3 h-3" />
                          <span>{evt.location}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <Card className="p-6 border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200 text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-slate-50 p-2 text-center font-bold text-slate-500 text-[11px]">
                {d}
              </div>
            ))}

            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50/40 min-h-[90px] p-2" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = events.filter((e) => e.startDate <= dateStr && e.endDate >= dateStr);

              return (
                <div key={dayNum} className="bg-white min-h-[90px] p-2 flex flex-col justify-between hover:bg-slate-50/50 transition">
                  <span className="font-bold text-slate-700 text-xs">{dayNum}</span>
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-[#0f3a3e] border border-teal-200 truncate"
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-bold block">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ADD EVENT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Schedule School Event</h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Mid-Term Examination Week"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-700 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-700 text-xs capitalize"
                  >
                    <option value="academic">Academic</option>
                    <option value="holiday">Holiday</option>
                    <option value="examination">Examination</option>
                    <option value="pta">PTA Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="sports">Sports</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-700 text-xs capitalize"
                  >
                    <option value="all">Entire School</option>
                    <option value="staff">Staff Only</option>
                    <option value="parents">Parents Only</option>
                    <option value="students">Students Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-700 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g., School Auditorium or Online"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-700 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Additional event details, guidelines, or notices..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-700 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-[#0f3a3e] hover:bg-[#164e53] text-white"
                >
                  {saving ? 'Saving...' : 'Save Event'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
