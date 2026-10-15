'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Search,
  Printer,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: 'Proprietor' | 'Principal' | 'Bursar' | 'Dean';
  action: string;
  details: string;
  category: 'Governance' | 'Finance' | 'Academic' | 'Staff' | 'Admissions';
  timestamp: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await fetch('/api/audit-logs');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setLogs(json.data);
            return;
          }
        }
        setLogs([]);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesCategory = filterCategory === 'All' || log.category === filterCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.actorRole.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: AuditLogEntry['category']) => {
    switch (category) {
      case 'Governance':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Finance':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Academic':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Staff':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Admissions':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  const categories = ['All', 'Governance', 'Finance', 'Academic', 'Staff', 'Admissions'] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">Chronological record of operational, academic, and administrative actions.</p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 mr-1.5" />
          <span>Print Log</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterCategory === cat
                  ? 'bg-[#0f3a3e] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, person, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3 text-right">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No activity logs found.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Operational and administrative actions will be automatically recorded here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{log.timestamp}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                          {log.actorName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{log.actorName}</p>
                          <p className="text-[10px] text-slate-400">{log.actorRole}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{log.action}</span>
                    </td>

                    <td className="px-4 py-3 max-w-md">
                      <span className="text-slate-600">{log.details}</span>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadge(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
