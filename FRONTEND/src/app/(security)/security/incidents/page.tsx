'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Send,
  Eye,
  Check,
  X,
  MapPin,
  Clock,
  User,
  FileText,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface SecurityIncident {
  id: string;
  incidentNumber: string;
  category: string;
  title: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedByName: string;
  involvedParties: string;
  actionTaken: string;
  status: 'open' | 'under_investigation' | 'resolved' | 'escalated';
  escalatedTo: string | null;
  resolutionNotes: string;
  incidentTime: string;
  createdAt: string;
}

interface IncidentStats {
  openIncidents: number;
  criticalIncidents: number;
  escalatedIncidents: number;
  resolvedIncidents: number;
  totalLogged: number;
}

export default function SecurityIncidentsPage() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [stats, setStats] = useState<IncidentStats>({
    openIncidents: 0,
    criticalIncidents: 0,
    escalatedIncidents: 0,
    resolvedIncidents: 0,
    totalLogged: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'open_all' | 'all' | 'critical' | 'resolved'>('open_all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);

  // Report Form State (Zero mock defaults)
  const [formData, setFormData] = useState({
    title: '',
    category: 'unauthorized_access',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    location: '',
    description: '',
    involvedParties: '',
    actionTaken: '',
    escalateImmediately: false,
    reportedByName: 'Godwin Egharevba',
  });

  // Resolve Form State
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Incidents
  const fetchIncidents = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const res = await fetch('/api/security/incidents');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIncidents(data.incidents || []);
          if (data.stats) setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(() => fetchIncidents(), 20000);
    return () => clearInterval(interval);
  }, []);

  // Format Category
  const formatCategory = (cat: string) => {
    const map: Record<string, string> = {
      unauthorized_access: 'Unauthorized Access',
      suspicious_activity: 'Suspicious Activity',
      student_misconduct: 'Student Misconduct',
      property_damage: 'Property Damage',
      medical_emergency: 'Medical Emergency',
      perimeter_breach: 'Perimeter Breach',
      vehicle_incident: 'Vehicle Incident',
      other: 'Other Incident',
    };
    return map[cat] || cat;
  };

  // Submit New Incident
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      setFormError('Title, description, and location are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/security/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          category: formData.category,
          severity: formData.severity,
          location: formData.location.trim(),
          description: formData.description.trim(),
          involvedParties: formData.involvedParties.trim(),
          actionTaken: formData.actionTaken.trim(),
          escalateImmediately: formData.escalateImmediately,
          reportedByName: formData.reportedByName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Incident reporting failed');
      }

      showToast(`Incident reported: ${data.incident.incidentNumber} (${data.incident.title})`);
      setIsReportModalOpen(false);

      // Reset form
      setFormData({
        title: '',
        category: 'unauthorized_access',
        severity: 'medium',
        location: '',
        description: '',
        involvedParties: '',
        actionTaken: '',
        escalateImmediately: false,
        reportedByName: 'Godwin Egharevba',
      });

      fetchIncidents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit incident report');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Escalate to Principal
  const handleEscalate = async (incident: SecurityIncident) => {
    try {
      const res = await fetch(`/api/security/incidents/${incident.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalatedTo: 'Principal',
          notes: 'Officer initiated urgent executive escalation from security portal.',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Escalation failed');
      }

      showToast(`Incident ${incident.incidentNumber} escalated to Principal`);
      fetchIncidents();
    } catch (err: any) {
      showToast(err.message || 'Escalation failed', 'error');
    }
  };

  // Update Status
  const handleStatusUpdate = async (incidentId: string, newStatus: string, notes: string = '') => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/security/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolutionNotes: notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Status update failed');
      }

      showToast(`Incident status updated to ${newStatus}`);
      setIsResolveModalOpen(false);
      setSelectedIncident(null);
      setResolutionNotes('');
      fetchIncidents();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Incidents
  const filteredIncidents = incidents.filter((inc) => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'open_all'
        ? inc.status !== 'resolved'
        : activeTab === 'critical'
        ? inc.severity === 'critical' || inc.severity === 'high'
        : inc.status === 'resolved';

    const matchesCategory = categoryFilter === 'all' || inc.category === categoryFilter;

    const matchesSearch =
      !searchQuery ||
      inc.incidentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.reportedByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.involvedParties.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesCategory && matchesSearch;
  });

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
              Security Incidents
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
              Emergency Lifecycle
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Campus safety incident logs, severity grading, and 1-click Principal emergency escalation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchIncidents(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-primary' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setIsReportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Open Incidents */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Open Incidents</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{stats.openIncidents}</span>
              <span className="text-[10px] text-amber-600 font-semibold">Active cases</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">High & Critical</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-rose-700">{stats.criticalIncidents}</span>
              <span className="text-[10px] text-rose-600 font-semibold">Urgent priority</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Escalated to Principal */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Escalated</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-indigo-700">{stats.escalatedIncidents}</span>
              <span className="text-[10px] text-indigo-600 font-semibold">Principal review</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-700">{stats.resolvedIncidents}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Cases closed</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('open_all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'open_all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Open ({stats.openIncidents})
          </button>
          <button
            onClick={() => setActiveTab('critical')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'critical'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Critical ({stats.criticalIncidents})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Logs ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'resolved'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Resolved ({stats.resolvedIncidents})
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[36px]"
          >
            <option value="all">All Categories</option>
            <option value="unauthorized_access">Unauthorized Access</option>
            <option value="suspicious_activity">Suspicious Activity</option>
            <option value="student_misconduct">Student Misconduct</option>
            <option value="property_damage">Property Damage</option>
            <option value="medical_emergency">Medical Emergency</option>
            <option value="perimeter_breach">Perimeter Breach</option>
            <option value="vehicle_incident">Vehicle Incident</option>
            <option value="other">Other</option>
          </select>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, title, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[36px]"
            />
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {activeTab === 'open_all' ? 'Zero Open Security Incidents' : 'No Incident Records Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All perimeter alerts, safety logs, and escalation reports recorded by the security desk will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Incident ID</th>
                  <th className="px-4 py-3">Title & Category</th>
                  <th className="px-4 py-3">Location & Time</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.map((inc) => {
                  const isResolved = inc.status === 'resolved';
                  const isEscalated = inc.status === 'escalated';

                  return (
                    <tr key={inc.id} className="hover:bg-slate-50/70 transition">
                      {/* Incident ID */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedIncident(inc);
                            setIsDetailsModalOpen(true);
                          }}
                          className="font-mono font-bold text-slate-900 hover:text-brand-primary block cursor-pointer"
                        >
                          {inc.incidentNumber}
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(inc.incidentTime).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </td>

                      {/* Title & Category */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{inc.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium inline-block mt-0.5">
                          {formatCategory(inc.category)}
                        </span>
                      </td>

                      {/* Location & Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-800 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{inc.location}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(inc.incidentTime).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inc.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : inc.severity === 'high'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : inc.severity === 'medium'
                              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" />
                            <span>Resolved</span>
                          </span>
                        ) : isEscalated ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Send className="w-3 h-3" />
                              <span>Escalated</span>
                            </span>
                            <span className="text-[10px] text-indigo-600 block mt-0.5">
                              {inc.escalatedTo || 'Principal'}
                            </span>
                          </div>
                        ) : inc.status === 'under_investigation' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3" />
                            <span>Investigating</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3" />
                            <span>Open</span>
                          </span>
                        )}
                      </td>

                      {/* Reporter */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                        {inc.reportedByName}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isResolved && (
                            <>
                              {!isEscalated && (
                                <button
                                  onClick={() => handleEscalate(inc)}
                                  className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition cursor-pointer min-h-[36px]"
                                  title="Urgent Principal Escalation"
                                >
                                  Escalate
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedIncident(inc);
                                  setResolutionNotes('');
                                  setIsResolveModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer min-h-[36px]"
                              >
                                Resolve
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedIncident(inc);
                              setIsDetailsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="View Incident Record"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Security Incident Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Report Security Incident</h3>
                  <p className="text-[11px] text-slate-500">Record campus safety event and perimeter alert</p>
                </div>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Incident Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unauthorized individual attempted gate entry, Broken window at Lab"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none min-h-[44px]"
                />
              </div>

              {/* Category & Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none bg-white min-h-[44px]"
                  >
                    <option value="unauthorized_access">Unauthorized Access</option>
                    <option value="suspicious_activity">Suspicious Activity</option>
                    <option value="student_misconduct">Student Misconduct</option>
                    <option value="property_damage">Property Damage</option>
                    <option value="medical_emergency">Medical Emergency</option>
                    <option value="perimeter_breach">Perimeter Breach</option>
                    <option value="vehicle_incident">Vehicle Incident</option>
                    <option value="other">Other Incident</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Location on Campus <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Gate, Science Lab, Senior Quadrangle"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Severity Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Severity Level <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map((sev) => {
                    const isSelected = formData.severity === sev;
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setFormData({ ...formData, severity: sev })}
                        className={`py-2 rounded-lg border font-bold text-xs uppercase tracking-wider transition cursor-pointer min-h-[44px] ${
                          isSelected
                            ? sev === 'critical'
                              ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                              : sev === 'high'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : sev === 'medium'
                              ? 'bg-yellow-500 text-white border-yellow-500 shadow-xs'
                              : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {sev}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Incident Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed narrative of what happened, time of occurrence, observations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none resize-none"
                />
              </div>

              {/* Involved Parties & Immediate Action Taken */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Involved Parties (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Names, IDs, Vehicle Plate, Guard on Duty"
                    value={formData.involvedParties}
                    onChange={(e) => setFormData({ ...formData, involvedParties: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Immediate Action Taken (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Denied entry, First aid administered, Perimeter secured"
                    value={formData.actionTaken}
                    onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Escalate Toggle */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="escalateToggle"
                  checked={formData.escalateImmediately}
                  onChange={(e) => setFormData({ ...formData, escalateImmediately: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded text-brand-accent focus:ring-rose-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="escalateToggle" className="cursor-pointer">
                  <span className="font-bold text-amber-900 block">
                    Escalate Immediately to Principal
                  </span>
                  <span className="text-[11px] text-amber-700 block">
                    Dispatches an urgent push notification alert to the principal's inbox.
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-brand-accent hover:bg-brand-accent-hover text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? 'Submitting...' : 'File Incident Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Incident Modal */}
      {isResolveModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Resolve Incident</h3>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{selectedIncident.incidentNumber}</div>
              <div className="font-semibold text-slate-700">{selectedIncident.title}</div>
              <div className="text-slate-500">{selectedIncident.location}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Resolution Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Actions taken, perpetrator reprimanded, perimeter secured, or false alarm verified..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedIncident.id, 'resolved', resolutionNotes)}
                  disabled={isSubmitting || !resolutionNotes.trim()}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? 'Resolving...' : 'Confirm Resolved'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incident Details Record Modal */}
      {isDetailsModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">{selectedIncident.incidentNumber}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    selectedIncident.severity === 'critical'
                      ? 'bg-rose-100 text-rose-800'
                      : selectedIncident.severity === 'high'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {selectedIncident.severity}
                </span>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="text-base font-bold text-slate-900">{selectedIncident.title}</h4>
                <p className="text-[11px] text-brand-primary font-bold mt-0.5">
                  {formatCategory(selectedIncident.category)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span className="font-semibold text-slate-800">{selectedIncident.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(selectedIncident.incidentTime).toLocaleString('en-GB')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reporter:</span>
                  <span className="text-slate-700">{selectedIncident.reportedByName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="capitalize font-bold text-slate-800">{selectedIncident.status}</span>
                </div>
                {selectedIncident.escalatedTo && (
                  <div className="flex justify-between text-indigo-700 font-semibold">
                    <span>Escalated To:</span>
                    <span>{selectedIncident.escalatedTo}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Description:</span>
                <p className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {selectedIncident.description}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Involved Parties:</span>
                <p className="text-slate-600">{selectedIncident.involvedParties}</p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Action Taken:</span>
                <p className="text-slate-600">{selectedIncident.actionTaken}</p>
              </div>

              {selectedIncident.resolutionNotes && (
                <div>
                  <span className="font-bold text-emerald-800 block mb-1">Resolution Details:</span>
                  <p className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200 text-emerald-900">
                    {selectedIncident.resolutionNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition min-h-[44px]"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
