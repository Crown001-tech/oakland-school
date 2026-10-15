'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Search,
  Printer,
  History,
  Shield,
} from 'lucide-react';

interface ExecutiveAuditEvent {
  id: string;
  actorName: string;
  actorRole: 'Proprietor' | 'Principal' | 'Bursar' | 'Dean';
  action: string;
  details: string;
  category: 'Governance' | 'Finance' | 'Academic' | 'Staff' | 'Admissions';
  timestamp: string;
}

export default function ProprietorActivityPage() {
  const [logs, setLogs] = useState<ExecutiveAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await fetch('/api/audit-logs');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setLogs(json.data);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((item) => {
    const matchesRole = selectedRole === 'All' || item.actorRole === selectedRole;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.actorName.toLowerCase().includes(q) ||
      item.action.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q);
    return matchesRole && matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: ExecutiveAuditEvent['category']) => {
    switch (category) {
      case 'Governance':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Finance':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Academic':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Staff':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Admissions':
        return 'bg-teal-50 text-teal-700 border-teal-200';
    }
  };

  const handlePrintAuditLog = () => {
    const printWin = window.open('', '_blank', 'width=900,height=900');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Institutional Audit Log - Oakland International School</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; line-height: 1.4; }
            .header { border-bottom: 2px solid #0f3a3e; padding-bottom: 12px; margin-bottom: 16px; text-align: center; }
            .title { font-size: 20px; font-weight: 800; color: #0f3a3e; text-transform: uppercase; margin: 0; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background: #f8fafc; font-weight: 700; color: #0f3a3e; }
            .footer { margin-top: 30px; font-size: 11px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Oakland International School</h1>
            <p class="subtitle">Official Institutional Activity Log &bull; Generated ${new Date().toLocaleDateString('en-GB')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Category</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs
                .map(
                  (l) => `
                <tr>
                  <td>${l.timestamp}</td>
                  <td><strong>${l.actorName}</strong></td>
                  <td>${l.actorRole}</td>
                  <td>${l.category}</td>
                  <td><strong>${l.action}</strong></td>
                  <td>${l.details}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Confidential Institutional Audit Trail &bull; Office of the Proprietor</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activity Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">Timeline of key governance decisions, approvals, and financial disbursements.</p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handlePrintAuditLog}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 self-start sm:self-auto whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Log</span>
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activity by actor, action, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="All">All Roles</option>
            <option value="Proprietor">Proprietor</option>
            <option value="Principal">Principal</option>
            <option value="Bursar">Bursar</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Governance">Governance</option>
            <option value="Finance">Finance</option>
            <option value="Academic">Academic</option>
            <option value="Staff">Staff</option>
            <option value="Admissions">Admissions</option>
          </select>
        </div>
      </div>

      {/* Audit List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No Activity Logs Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Administrative actions, settings updates, and timetable publications will appear here in chronological order.
            </p>
          </div>
        ) : (
          filteredLogs.map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getCategoryBadge(item.category)}`}>
                    {item.category}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{item.action}</span>
                </div>
                <p className="text-xs text-slate-600">{item.details}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-700">{item.actorName}</span>
                  <span>&bull;</span>
                  <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-medium">{item.actorRole}</span>
                </div>
              </div>

              <div className="text-right sm:self-center shrink-0">
                <span className="text-[11px] font-mono text-slate-400">{item.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
