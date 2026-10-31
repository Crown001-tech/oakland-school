'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  Footprints,
  Package,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface SecurityStats {
  activeVisitors: number;
  todayPickups: number;
  activeMovements: number;
  pendingDeliveries: number;
  openIncidents: number;
}

interface SecurityAlerts {
  criticalIncidents: Array<{
    id: string;
    incident_number: string;
    title: string;
    severity: string;
    status: string;
    location: string;
    incident_time: string;
  }>;
  flaggedPickups: Array<{
    id: string;
    student_name: string;
    student_class: string;
    picked_up_by_name: string;
    status: string;
    notes: string;
    pickup_time: string;
  }>;
}

interface ActivityEvent {
  id: string;
  type: 'pickup' | 'visitor' | 'movement' | 'delivery';
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
  badgeColor: string;
}

export default function SecurityDashboardPage() {
  const [stats, setStats] = useState<SecurityStats>({
    activeVisitors: 0,
    todayPickups: 0,
    activeMovements: 0,
    pendingDeliveries: 0,
    openIncidents: 0,
  });
  const [alerts, setAlerts] = useState<SecurityAlerts>({
    criticalIncidents: [],
    flaggedPickups: [],
  });
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchOverview = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/security/overview');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setAlerts(data.alerts);
          setRecentActivity(data.recentActivity || []);
          setLastUpdated(new Date());
        }
      }
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(() => fetchOverview(), 30000);
    return () => clearInterval(interval);
  }, []);

  const hasActiveAlerts =
    alerts.criticalIncidents.length > 0 || alerts.flaggedPickups.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Operational Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Security & Reception Operations
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0f3a3e]/10 text-[#0f3a3e] border border-[#0f3a3e]/20">
              Perimeter Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time campus physical security, student gate clearance, and visitor registry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={() => fetchOverview(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            title="Refresh live metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0f3a3e]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Active Security Warning / Clean Status Banner */}
      {hasActiveAlerts ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Security Attention Required</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {alerts.flaggedPickups.map((f) => (
              <div
                key={f.id}
                className="bg-white/80 border border-rose-200 rounded-lg p-3 text-xs space-y-1 shadow-xs"
              >
                <div className="flex items-center justify-between font-semibold text-rose-800">
                  <span>Flagged Unauthorized Pickup</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold uppercase">
                    Alert
                  </span>
                </div>
                <p className="text-slate-700">
                  Student: <span className="font-semibold">{f.student_name}</span> ({f.student_class})
                </p>
                <p className="text-slate-500 text-[11px]">{f.notes}</p>
                <Link
                  href="/security/pickup"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 pt-1"
                >
                  <span>Review at Pickup Gate</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}

            {alerts.criticalIncidents.map((i) => (
              <div
                key={i.id}
                className="bg-white/80 border border-rose-200 rounded-lg p-3 text-xs space-y-1 shadow-xs"
              >
                <div className="flex items-center justify-between font-semibold text-rose-800">
                  <span>{i.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold uppercase">
                    {i.severity}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Location: {i.location} • Status: {i.status}
                </p>
                <Link
                  href="/security/incidents"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 pt-1"
                >
                  <span>Open Incident Details</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-900">
                Perimeter Normal — No Active Security Warnings
              </p>
              <p className="text-[11px] text-emerald-700">
                All gate entry points and dismissal stations operating under standard protocols.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-800 hidden sm:inline">
            Status: Clear
          </span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Visitors on Campus */}
        <Link
          href="/security/visitors"
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Visitors</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">
              {isLoading ? '—' : stats.activeVisitors}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">On Campus</p>
          </div>
        </Link>

        {/* Student Pickups Cleared Today */}
        <Link
          href="/security/pickup"
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pickups</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">
              {isLoading ? '—' : stats.todayPickups}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Cleared Today</p>
          </div>
        </Link>

        {/* Student Intra-day Movements */}
        <Link
          href="/security/movement"
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gate Passes</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
              <Footprints className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">
              {isLoading ? '—' : stats.activeMovements}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Currently Out</p>
          </div>
        </Link>

        {/* Deliveries Pending Collection */}
        <Link
          href="/security/deliveries"
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deliveries</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900">
              {isLoading ? '—' : stats.pendingDeliveries}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting Pickup</p>
          </div>
        </Link>

        {/* Open Incidents */}
        <Link
          href="/security/incidents"
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-xs transition group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Incidents</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition group-hover:scale-105 ${
              stats.openIncidents > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-bold ${stats.openIncidents > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {isLoading ? '—' : stats.openIncidents}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Active Reports</p>
          </div>
        </Link>
      </div>

      {/* Fast Operational Action Buttons (Touch Ergonomics >= 44px) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Fast Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/security/pickup"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-[#b3141f]/30 hover:bg-rose-50/30 transition text-center group min-h-[96px]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#b3141f]/10 text-[#b3141f] flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">Verify Pickup</span>
            <span className="text-[10px] text-slate-400 mt-0.5">4-Digit PIN</span>
          </Link>

          <Link
            href="/security/visitors"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0f3a3e]/30 hover:bg-[#0f3a3e]/5 transition text-center group min-h-[96px]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0f3a3e]/10 text-[#0f3a3e] flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">Visitor Pass</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Fast Check-in</span>
          </Link>

          <Link
            href="/security/movement"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-500/30 hover:bg-amber-50/30 transition text-center group min-h-[96px]"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Footprints className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">Student Exit</span>
            <span className="text-[10px] text-slate-400 mt-0.5">School Hours</span>
          </Link>

          <Link
            href="/security/deliveries"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-500/30 hover:bg-indigo-50/30 transition text-center group min-h-[96px]"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">Log Delivery</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Parcels</span>
          </Link>

          <Link
            href="/security/incidents"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-rose-500/30 hover:bg-rose-50/30 transition text-center group min-h-[96px]"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">Report Incident</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Escalate</span>
          </Link>

          <Link
            href="/security/emergency"
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-rose-500/30 hover:bg-rose-50/30 transition text-center group min-h-[96px]"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <PhoneCall className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">Emergency</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Hotlines</span>
          </Link>
        </div>
      </div>

      {/* Recent Gate Activity Stream */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Gate Activity</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live chronological stream of verified gate departures, visitors, and package arrivals.
            </p>
          </div>
          <Link
            href="/security/logs"
            className="text-xs font-semibold text-[#b3141f] hover:underline flex items-center gap-1"
          >
            <span>Full Activity Log</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Loading recent gate activity...
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No gate activity recorded yet today</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Verified student dismissals, visitor check-ins, intra-day movements, and deliveries will appear here automatically.
              </p>
            </div>
          ) : (
            recentActivity.map((event) => (
              <div
                key={event.id}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/70 transition text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      event.badgeColor === 'emerald'
                        ? 'bg-emerald-500'
                        : event.badgeColor === 'amber'
                        ? 'bg-amber-500'
                        : event.badgeColor === 'blue'
                        ? 'bg-blue-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{event.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{event.subtitle}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-4">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      event.status === 'cleared' || event.status === 'returned'
                        ? 'bg-emerald-50 text-emerald-700'
                        : event.status === 'checked_in' || event.status === 'departed'
                        ? 'bg-blue-50 text-blue-700'
                        : event.status === 'flagged_unauthorized'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {event.status.replace(/_/g, ' ')}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {new Date(event.timestamp).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
