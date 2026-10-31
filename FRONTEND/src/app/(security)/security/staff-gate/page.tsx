'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  RefreshCw,
  Plus,
  Search,
  LogIn,
  LogOut,
  Car,
  Footprints,
  UserCheck,
  Users,
  Shield,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface StaffGateLog {
  id: string;
  staffId: string | null;
  staffName: string;
  employeeId: string;
  department: string;
  direction: 'entry' | 'exit';
  transitMode: 'pedestrian' | 'vehicle';
  vehicleRegistration: string | null;
  timestamp: string;
  securityOfficerName: string;
  notes: string;
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  role: string;
  phone: string;
  email: string;
  status: 'on_site' | 'off_site' | 'unrecorded';
  lastTransitTime: string | null;
}

interface GateStats {
  entriesToday: number;
  exitsToday: number;
  currentlyOnSite: number;
  vehiclesLogged: number;
}

export default function SecurityStaffGatePage() {
  const [logs, setLogs] = useState<StaffGateLog[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<GateStats>({
    entriesToday: 0,
    exitsToday: 0,
    currentlyOnSite: 0,
    vehiclesLogged: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'onsite' | 'directory'>('today');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'entry' | 'exit'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'pedestrian' | 'vehicle'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Transit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State (Zero mock defaults)
  const [formData, setFormData] = useState({
    staffId: '',
    staffName: '',
    employeeId: '',
    department: '',
    direction: 'entry' as 'entry' | 'exit',
    transitMode: 'pedestrian' as 'pedestrian' | 'vehicle',
    vehicleRegistration: '',
    securityOfficerName: 'Security Desk',
    notes: '',
  });

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch gate logs and stats
  const fetchLogs = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const res = await fetch('/api/security/staff-gate');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
          if (data.stats) {
            setStats(data.stats);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load staff gate logs:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch staff directory with current gate status
  const fetchStaffRoster = async () => {
    try {
      const res = await fetch('/api/security/staff-gate/staff');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStaffList(data.staff || []);
        }
      }
    } catch (err) {
      console.error('Failed to load staff roster:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStaffRoster();
    const interval = setInterval(() => {
      fetchLogs();
      fetchStaffRoster();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Quick 1-Click Log Transit directly from roster or buttons
  const handleQuickTransit = async (
    staff: StaffMember,
    direction: 'entry' | 'exit',
    transitMode: 'pedestrian' | 'vehicle' = 'pedestrian',
    vehicleReg: string = ''
  ) => {
    try {
      const res = await fetch('/api/security/staff-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staff.id,
          staffName: staff.name,
          employeeId: staff.employeeId,
          department: staff.department,
          direction,
          transitMode,
          vehicleRegistration: vehicleReg || null,
          securityOfficerName: 'Security Desk',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to record transit');
      }

      showToast(`Staff ${direction === 'entry' ? 'entry' : 'exit'} recorded for ${staff.name}`);
      fetchLogs();
      fetchStaffRoster();
    } catch (err: any) {
      showToast(err.message || 'Transit recording failed', 'error');
    }
  };

  // Form Submit Handler
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.staffName.trim()) {
      setFormError('Staff name is required.');
      return;
    }

    if (formData.transitMode === 'vehicle' && !formData.vehicleRegistration.trim()) {
      setFormError('Vehicle registration plate is required for vehicle transits.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/security/staff-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: formData.staffId || null,
          staffName: formData.staffName.trim(),
          employeeId: formData.employeeId.trim(),
          department: formData.department.trim() || null,
          direction: formData.direction,
          transitMode: formData.transitMode,
          vehicleRegistration: formData.transitMode === 'vehicle' ? formData.vehicleRegistration.trim() : null,
          securityOfficerName: formData.securityOfficerName.trim(),
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to record transit');
      }

      showToast(`Logged ${formData.direction} for ${formData.staffName}`);
      setIsModalOpen(false);

      // Reset form
      setFormData({
        staffId: '',
        staffName: '',
        employeeId: '',
        department: '',
        direction: 'entry',
        transitMode: 'pedestrian',
        vehicleRegistration: '',
        securityOfficerName: 'Security Desk',
        notes: '',
      });

      fetchLogs();
      fetchStaffRoster();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit staff gate log.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-fill modal for a specific staff member
  const openModalForStaff = (staff: StaffMember, defaultDirection: 'entry' | 'exit' = 'entry') => {
    setFormData({
      staffId: staff.id,
      staffName: staff.name,
      employeeId: staff.employeeId,
      department: staff.department,
      direction: defaultDirection,
      transitMode: 'pedestrian',
      vehicleRegistration: '',
      securityOfficerName: 'Security Desk',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Filtered Logs
  const filteredLogs = logs.filter((l) => {
    const matchesDirection = directionFilter === 'all' || l.direction === directionFilter;
    const matchesMode = modeFilter === 'all' || l.transitMode === modeFilter;
    const matchesSearch =
      !searchQuery ||
      l.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.vehicleRegistration && l.vehicleRegistration.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesDirection && matchesMode && matchesSearch;
  });

  // Filtered On-Site Staff
  const onSiteStaff = staffList.filter((s) => s.status === 'on_site');

  // Filtered Directory Staff
  const filteredDirectory = staffList.filter((s) => {
    return (
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
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
              Staff Gate Transit
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              Perimeter Security
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Physical gate entry and exit logging for school staff, faculty, and administrative personnel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchLogs(true);
              fetchStaffRoster();
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-primary' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setFormData({
                staffId: '',
                staffName: '',
                employeeId: '',
                department: '',
                direction: 'entry',
                transitMode: 'pedestrian',
                vehicleRegistration: '',
                securityOfficerName: 'Security Desk',
                notes: '',
              });
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Log Staff Transit</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Currently On Campus */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Currently On Campus</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{stats.currentlyOnSite}</span>
              <span className="text-[10px] text-brand-primary font-bold">Active inside</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Entries Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Entries</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-700">{stats.entriesToday}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Recorded in</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <LogIn className="w-5 h-5" />
          </div>
        </div>

        {/* Exits Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Exits</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-amber-700">{stats.exitsToday}</span>
              <span className="text-[10px] text-amber-600 font-semibold">Recorded out</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
        </div>

        {/* Vehicle Transits */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vehicles Logged</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{stats.vehiclesLogged}</span>
              <span className="text-[10px] text-slate-500 font-semibold">Drive-through</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Car className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'today'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Today's Log ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('onsite')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'onsite'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Staff On Site ({onSiteStaff.length})
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'directory'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Staff Directory ({staffList.length})
          </button>
        </div>

        {/* Direction & Mode Filters for Today's Log */}
        {activeTab === 'today' && (
          <div className="flex items-center gap-2">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[36px]"
            >
              <option value="all">All Directions</option>
              <option value="entry">Entries Only</option>
              <option value="exit">Exits Only</option>
            </select>

            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[36px]"
            >
              <option value="all">All Modes</option>
              <option value="pedestrian">Pedestrian</option>
              <option value="vehicle">Vehicle</option>
            </select>
          </div>
        )}

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff, ID, plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[36px]"
          />
        </div>
      </div>

      {/* Tab 1: Today's Transit Log */}
      {activeTab === 'today' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Staff Gate Movements Logged Today</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All staff perimeter entry and exit records logged at the security gate will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Vehicle Plate</th>
                    <th className="px-4 py-3">Officer</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const isEntry = log.direction === 'entry';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        {/* Time */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-700">
                          <div className="font-bold text-slate-900">
                            {new Date(log.timestamp).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(log.timestamp).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                        </td>

                        {/* Staff Member */}
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900 block">{log.staffName}</span>
                          <span className="text-[11px] text-brand-primary font-bold block">
                            {log.department} ({log.employeeId})
                          </span>
                        </td>

                        {/* Direction */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isEntry
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {isEntry ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                            <span className="capitalize">{log.direction}</span>
                          </span>
                        </td>

                        {/* Transit Mode */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium capitalize">
                            {log.transitMode === 'vehicle' ? (
                              <Car className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <Footprints className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>{log.transitMode}</span>
                          </span>
                        </td>

                        {/* Vehicle Plate */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono">
                          {log.vehicleRegistration ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-bold text-[11px] border border-slate-200">
                              {log.vehicleRegistration}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Security Officer */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                          {log.securityOfficerName}
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">
                          {log.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Staff On Site */}
      {activeTab === 'onsite' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {onSiteStaff.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Staff Currently Logged On Campus</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When staff members enter the school premises and their entry is logged, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Staff Name</th>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Entry Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Gate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {onSiteStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{staff.name}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-700">{staff.employeeId}</td>
                      <td className="px-4 py-3.5 text-slate-600">{staff.department}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {staff.lastTransitTime ? (
                          new Date(staff.lastTransitTime).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>On Campus</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => openModalForStaff(staff, 'exit')}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition cursor-pointer min-h-[36px]"
                        >
                          Log Exit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Staff Directory with Quick Actions */}
      {activeTab === 'directory' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {filteredDirectory.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Staff Members Found</h3>
              <p className="text-xs text-slate-500">Try modifying your search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Staff Name</th>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Gate Status</th>
                    <th className="px-4 py-3 text-right">Transit Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDirectory.map((staff) => {
                    const isOnSite = staff.status === 'on_site';
                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-900">{staff.name}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-700">{staff.employeeId}</td>
                        <td className="px-4 py-3.5 text-slate-600">{staff.department}</td>
                        <td className="px-4 py-3.5 capitalize text-slate-600">{staff.role}</td>
                        <td className="px-4 py-3.5">
                          {isOnSite ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>On Campus</span>
                            </span>
                          ) : staff.status === 'off_site' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              <span>Off Campus</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Unrecorded</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleQuickTransit(staff, 'entry')}
                              className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] transition cursor-pointer min-h-[36px]"
                              title="Quick Log Entry"
                            >
                              Log Entry
                            </button>
                            <button
                              onClick={() => handleQuickTransit(staff, 'exit')}
                              className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] transition cursor-pointer min-h-[36px]"
                              title="Quick Log Exit"
                            >
                              Log Exit
                            </button>
                            <button
                              onClick={() => openModalForStaff(staff, isOnSite ? 'exit' : 'entry')}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="Detailed Transit with Vehicle/Notes"
                            >
                              <Car className="w-3.5 h-3.5 text-slate-500" />
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
      )}

      {/* Transit Recording Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Staff Gate Transit</h3>
                  <p className="text-[11px] text-slate-500">Physical gate access register</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Staff Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Staff Member <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.staffId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const s = staffList.find((item) => item.id === selectedId);
                    if (s) {
                      setFormData({
                        ...formData,
                        staffId: s.id,
                        staffName: s.name,
                        employeeId: s.employeeId,
                        department: s.department,
                      });
                    } else {
                      setFormData({
                        ...formData,
                        staffId: '',
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none bg-white min-h-[44px]"
                >
                  <option value="">Select Staff from Directory...</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.department} ({s.employeeId})
                    </option>
                  ))}
                </select>

                <div className="mt-2">
                  <input
                    type="text"
                    required
                    placeholder="Or enter staff name directly"
                    value={formData.staffName}
                    onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Direction Toggle */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Direction <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, direction: 'entry' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border font-bold text-xs transition cursor-pointer min-h-[44px] ${
                      formData.direction === 'entry'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Gate Entry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, direction: 'exit' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border font-bold text-xs transition cursor-pointer min-h-[44px] ${
                      formData.direction === 'exit'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Gate Exit</span>
                  </button>
                </div>
              </div>

              {/* Transit Mode Toggle */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Transit Mode <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transitMode: 'pedestrian' })}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg border font-bold text-xs transition cursor-pointer min-h-[44px] ${
                      formData.transitMode === 'pedestrian'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Footprints className="w-4 h-4" />
                    <span>Pedestrian (Walking)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transitMode: 'vehicle' })}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg border font-bold text-xs transition cursor-pointer min-h-[44px] ${
                      formData.transitMode === 'vehicle'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Car className="w-4 h-4" />
                    <span>Vehicle</span>
                  </button>
                </div>
              </div>

              {/* Conditional Vehicle License Plate Input */}
              {formData.transitMode === 'vehicle' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Vehicle Registration Plate <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KSF-124-AA"
                    value={formData.vehicleRegistration}
                    onChange={(e) => setFormData({ ...formData, vehicleRegistration: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none uppercase font-mono min-h-[44px]"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Official errands, special equipment, parking bay, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-primary focus:outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-brand-accent hover:bg-brand-accent-hover text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Transit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
