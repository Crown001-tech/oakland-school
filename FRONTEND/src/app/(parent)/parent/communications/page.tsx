'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

export default function ParentCommunicationsPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'circulars' | 'urgent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/communications')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.history)) {
          // Strictly filter out any assignment / homework mentions
          const safeNotices = data.history.filter((n: any) => {
            const sub = (n.subject || '').toLowerCase();
            const text = (n.content || '').toLowerCase();
            return !sub.includes('assignment') && !sub.includes('homework') && !text.includes('assignment');
          });
          setNotices(safeNotices);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const filteredNotices = notices.filter((n) => {
    const matchesSearch =
      (n.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.content || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === 'circulars') {
      return matchesSearch && (n.subject || '').toLowerCase().includes('circular');
    }
    if (filter === 'urgent') {
      // DEF-086: Check priority, severity, or urgent keyword
      const isUrgent =
        n.priority === 'urgent' ||
        n.severity === 'critical' ||
        (n.subject || '').toLowerCase().includes('urgent') ||
        (n.subject || '').toLowerCase().includes('critical') ||
        (n.content || '').toLowerCase().includes('urgent');
      return matchesSearch && isUrgent;
    }
    return matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          School Notices
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Official bulletins, administrative circulars, and calendar advisories
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Filter */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-[#0f3a3e] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Notices
          </button>
          <button
            type="button"
            onClick={() => setFilter('circulars')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'circulars'
                ? 'bg-[#0f3a3e] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Circulars
          </button>
          <button
            type="button"
            onClick={() => setFilter('urgent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'urgent'
                ? 'bg-[#0f3a3e] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Urgent Updates
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bulletins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs h-10 min-h-[40px] pl-8 pr-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f3a3e] font-medium text-slate-800"
          />
        </div>
      </div>

      {/* Notices List */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <BrandLoader />
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">
              No Notices Found
            </h3>
            <p className="text-xs text-slate-500">
              No official announcements match your active criteria at this time.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotices.map((n) => (
            <div
              key={n.id}
              onClick={() => setSelectedNotice(n)}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs p-5 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#b3141f] transition">
                    {n.subject}
                  </h3>
                  {(n.subject || '').toLowerCase().includes('urgent') && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {n.content ? n.content.replace(/<[^>]*>/g, '') : 'Official school bulletin dispatched to registered guardians.'}
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 text-slate-400 text-xs">
                <span className="font-semibold text-[11px] text-slate-600">
                  {n.sentAt}
                </span>
                <span className="text-[10px] text-[#0f3a3e] font-bold group-hover:underline">
                  Read Bulletin &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notice Reader Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedNotice.subject}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Published: {selectedNotice.sentAt} &bull; Official Dispatch
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
              className="text-xs text-slate-700 leading-relaxed max-h-80 overflow-y-auto space-y-3"
              dangerouslySetInnerHTML={{
                __html: selectedNotice.content || '<p>Official school circular content.</p>',
              }}
            />

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Oakland International School &bull; Office of the Principal
              </span>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
