'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  History,
  RefreshCw,
  Download,
  Search,
  Filter,
  UserCheck,
  Footprints,
  Package,
  AlertTriangle,
  LogIn,
  Users,
  Eye,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface SecurityLogEvent {
  id: string;
  timestamp: string;
  category: 'visitor' | 'pickup' | 'movement' | 'staff_gate' | 'delivery' | 'incident';
  categoryLabel: string;
  referenceCode: string;
  primaryParty: string;
  details: string;
  officer: string;
  status: string;
  notes: string;
}

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLogEvent[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Log Modal
  const [selectedLog, setSelectedLog] = useState<SecurityLogEvent | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Logs
  const fetchLogs = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') params.append('category', activeCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      // Date Range resolution
      if (dateRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.append('startDate', today.toISOString());
      } else if (dateRange === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.append('startDate', d.toISOString());
      } else if (dateRange === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.append('startDate', d.toISOString());
      }

      const res = await fetch(`/api/security/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
          if (data.categoryCounts) setCategoryCounts(data.categoryCounts);
        }
      }
    } catch (err) {
      console.error('Failed to load security activity logs:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(), 30000);
    return () => clearInterval(interval);
  }, [activeCategory, dateRange]);

  // Handle Export CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') params.append('category', activeCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('format', 'csv');

      if (dateRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.append('startDate', today.toISOString());
      } else if (dateRange === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.append('startDate', d.toISOString());
      } else if (dateRange === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.append('startDate', d.toISOString());
      }

      const downloadUrl = `/api/security/logs?${params.toString()}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `oakland_security_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Activity logs exported to CSV successfully.');
    } catch (err: any) {
      showToast('Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Category Icon & Badge
  const getCategoryBadge = (category: string, label: string) => {
    switch (category) {
      case 'visitor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Users className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
      case 'pickup':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
      case 'movement':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Footprints className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
      case 'staff_gate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <LogIn className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
      case 'delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Package className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
      case 'incident':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3 h-3" />
            <span>{label}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            <span>{label}</span>
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <BrandLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/security" className="text-slate-400 hover:text-slate-600 transition p-1 rounded-md">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Activity Logs
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              Audit Trail
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Chronological audit log of all perimeter gate, reception passes, and safety operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-primary' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Metric Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">All Events</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{logs.length}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Visitors</p>
          <p className="text-xl font-bold font-mono text-blue-900 mt-0.5">{categoryCounts.visitor || 0}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Pickups</p>
          <p className="text-xl font-bold font-mono text-emerald-900 mt-0.5">{categoryCounts.pickup || 0}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Passes</p>
          <p className="text-xl font-bold font-mono text-amber-900 mt-0.5">{categoryCounts.movement || 0}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">Staff Gate</p>
          <p className="text-xl font-bold font-mono text-brand-primary mt-0.5">{categoryCounts.staff_gate || 0}</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Incidents</p>
          <p className="text-xl font-bold font-mono text-rose-900 mt-0.5">{categoryCounts.incident || 0}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'visitor', label: 'Visitors' },
            { id: 'pickup', label: 'Pickups' },
            { id: 'movement', label: 'Passes' },
            { id: 'staff_gate', label: 'Staff' },
            { id: 'delivery', label: 'Deliveries' },
            { id: 'incident', label: 'Incidents' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Date Range & Search Input */}
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[36px]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Past 7 Days</option>
            <option value="30days">Past 30 Days</option>
          </select>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, party, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[36px]"
            />
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Activity Logs Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Historical activity records across all perimeter gate modules will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Reference Code</th>
                  <th className="px-4 py-3">Primary Party</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">Officer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition">
                    {/* Timestamp */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-700">
                      <div className="font-bold text-slate-900">
                        {new Date(ev.timestamp).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(ev.timestamp).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    </td>

                    {/* Event Type */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getCategoryBadge(ev.category, ev.categoryLabel)}
                    </td>

                    {/* Reference Code */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-slate-800">
                      {ev.referenceCode}
                    </td>

                    {/* Primary Party */}
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {ev.primaryParty}
                    </td>

                    {/* Details */}
                    <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={ev.details}>
                      {ev.details}
                    </td>

                    {/* Officer */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                      {ev.officer}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-[11px] font-medium text-slate-700">
                        {ev.status}
                      </span>
                    </td>

                    {/* View Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(ev)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="View Log Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Log Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">{selectedLog.referenceCode}</span>
                {getCategoryBadge(selectedLog.category, selectedLog.categoryLabel)}
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="text-base font-bold text-slate-900">{selectedLog.primaryParty}</h4>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Logged: {new Date(selectedLog.timestamp).toLocaleString('en-GB')}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Officer on Duty:</span>
                  <span className="font-semibold text-slate-800">{selectedLog.officer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Operation Status:</span>
                  <span className="font-bold text-slate-900">{selectedLog.status}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Event Narrative:</span>
                <p className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedLog.details}
                </p>
              </div>

              {selectedLog.notes && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Additional Notes:</span>
                  <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-600">
                    {selectedLog.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition min-h-[44px]"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
