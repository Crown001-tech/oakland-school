'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Car,
  Building,
  Phone,
  Tag,
  X,
  Printer,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Calendar,
  FileText,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface Visitor {
  id: string;
  passNumber: string;
  fullName: string;
  phone: string;
  organization: string;
  purpose: string;
  hostType: string;
  hostId: string | null;
  hostName: string;
  badgeNumber: string;
  vehicleRegistration: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: 'checked_in' | 'checked_out' | 'overdue' | 'flagged';
  securityOfficerName: string;
  notes: string;
  createdAt: string;
}

interface Host {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  department: string;
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Check-In Modal state
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Inputs (Strictly empty defaults - Zero mock data)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    organization: '',
    purpose: '',
    customPurpose: '',
    hostType: 'staff',
    hostId: '',
    hostName: '',
    badgeNumber: '',
    vehicleRegistration: '',
    notes: '',
  });

  // Badge Pass Modal State
  const [selectedVisitorForPass, setSelectedVisitorForPass] = useState<Visitor | null>(null);

  // Toast alert
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch visitors
  const fetchVisitors = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const res = await fetch('/api/security/visitors');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setVisitors(data.visitors || []);
        }
      }
    } catch (err) {
      console.error('Failed to load visitors:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch host staff list
  const fetchHosts = async () => {
    try {
      const res = await fetch('/api/security/visitors/hosts');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHosts(data.hosts || []);
        }
      }
    } catch (err) {
      console.error('Failed to load host staff:', err);
    }
  };

  useEffect(() => {
    fetchVisitors();
    fetchHosts();
    const interval = setInterval(() => fetchVisitors(), 20000);
    return () => clearInterval(interval);
  }, []);

  // Handle Form Submission
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalPurpose = formData.purpose === 'Other' ? formData.customPurpose : formData.purpose;

    if (!formData.fullName.trim() || !formData.phone.trim() || !finalPurpose.trim() || !formData.hostName.trim()) {
      setFormError('Full name, phone, purpose, and host name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/security/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          organization: formData.organization,
          purpose: finalPurpose,
          hostType: formData.hostType,
          hostId: formData.hostId || null,
          hostName: formData.hostName,
          badgeNumber: formData.badgeNumber,
          vehicleRegistration: formData.vehicleRegistration,
          notes: formData.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Check-in failed');
      }

      showToast(`Visitor checked in: ${data.visitor.fullName} (Pass: ${data.visitor.passNumber})`);
      setIsCheckInOpen(false);
      // Reset form to empty
      setFormData({
        fullName: '',
        phone: '',
        organization: '',
        purpose: '',
        customPurpose: '',
        hostType: 'staff',
        hostId: '',
        hostName: '',
        badgeNumber: '',
        vehicleRegistration: '',
        notes: '',
      });
      fetchVisitors();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Check-Out
  const handleCheckOut = async (visitorId: string, visitorName: string) => {
    try {
      const res = await fetch(`/api/security/visitors/${visitorId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Check-out failed');
      }

      showToast(`Visitor ${visitorName} checked out successfully.`);
      fetchVisitors();
    } catch (err: any) {
      showToast(err.message || 'Check-out failed', 'error');
    }
  };

  // Filtering visitors
  const activeVisitors = visitors.filter((v) => v.status === 'checked_in');
  const displayedVisitors = activeTab === 'active' ? activeVisitors : visitors;

  const filteredVisitors = displayedVisitors.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.fullName.toLowerCase().includes(q) ||
      v.passNumber.toLowerCase().includes(q) ||
      v.phone.toLowerCase().includes(q) ||
      v.hostName.toLowerCase().includes(q) ||
      v.organization.toLowerCase().includes(q) ||
      v.badgeNumber.toLowerCase().includes(q) ||
      v.vehicleRegistration.toLowerCase().includes(q)
    );
  });

  // Calculate elapsed time
  const getElapsedString = (checkInIso: string) => {
    const diffMs = Date.now() - new Date(checkInIso).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m on site`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m on site`;
  };

  // Print Pass Function
  const handlePrintPass = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/security" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Visitor Registry
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              {activeVisitors.length} Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official visitor check-in, temporary pass issuance, and campus presence monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchVisitors(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            title="Refresh visitor list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0f3a3e]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCheckInOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#b3141f] hover:bg-[#961019] text-white text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Check-in Visitor</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-2 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            On Campus ({activeVisitors.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Logs ({visitors.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, pass, phone, host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] focus:border-[#0f3a3e] transition min-h-[38px]"
          />
        </div>
      </div>

      {/* Visitors List / Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <BrandLoader size="md" />
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">
              {searchQuery
                ? `No visitors matching "${searchQuery}"`
                : activeTab === 'active'
                ? 'No visitors currently on campus'
                : 'No visitor records found'}
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeTab === 'active'
                ? 'Check in new arrivals using the button above to generate visitor passes.'
                : 'All incoming visitor check-ins and check-outs will be recorded here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Pass Code</th>
                  <th className="px-4 py-3">Visitor Details</th>
                  <th className="px-4 py-3">Purpose & Host</th>
                  <th className="px-4 py-3">Check-In Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisitors.map((v) => {
                  const isCheckedIn = v.status === 'checked_in';
                  const isLongStay =
                    isCheckedIn &&
                    Date.now() - new Date(v.checkInTime).getTime() > 4 * 60 * 60 * 1000;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition">
                      {/* Pass Number & Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {v.passNumber}
                        </div>
                        {v.badgeNumber !== '—' && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#0f3a3e] bg-[#0f3a3e]/10 border border-[#0f3a3e]/20 px-1.5 py-0.5 rounded font-mono font-bold mt-1">
                            <Tag className="w-2.5 h-2.5" />
                            {v.badgeNumber}
                          </span>
                        )}
                      </td>

                      {/* Visitor Name & Info */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800 text-xs">
                          {v.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-2.5 h-2.5" />
                            {v.phone}
                          </span>
                          {v.organization !== '—' && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Building className="w-2.5 h-2.5" />
                              {v.organization}
                            </span>
                          )}
                          {v.vehicleRegistration !== '—' && (
                            <span className="flex items-center gap-1 text-slate-500 font-mono">
                              <Car className="w-2.5 h-2.5" />
                              {v.vehicleRegistration}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Purpose & Host */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-medium text-xs">
                          {v.purpose}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Host: <span className="font-semibold text-slate-700">{v.hostName}</span>
                        </div>
                      </td>

                      {/* Check-In / Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-slate-700 font-mono text-xs">
                          {new Date(v.checkInTime).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {isCheckedIn ? (
                          <div className={`text-[10px] font-semibold mt-0.5 ${isLongStay ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                            {getElapsedString(v.checkInTime)}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Out:{' '}
                            {v.checkOutTime
                              ? new Date(v.checkOutTime).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isCheckedIn
                              ? isLongStay
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isCheckedIn && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLongStay ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                          )}
                          {isCheckedIn ? (isLongStay ? 'Overdue' : 'On Campus') : 'Checked Out'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedVisitorForPass(v)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold transition cursor-pointer"
                          title="View Printable Pass"
                        >
                          Pass
                        </button>

                        {isCheckedIn && (
                          <button
                            onClick={() => handleCheckOut(v.id, v.fullName)}
                            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition cursor-pointer"
                          >
                            Check Out
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Check-In Modal */}
      {isCheckInOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#b3141f] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Visitor Check-in</h3>
                  <p className="text-[11px] text-slate-500">Record campus entry and issue pass</p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckInOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Visitor Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adebayo Ogunlesi"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 08031234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none"
                  />
                </div>
              </div>

              {/* Organization and Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Organization (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Company, Ministry, or Agency"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Vehicle Plate (If Driving)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KSF-123-AA"
                    value={formData.vehicleRegistration}
                    onChange={(e) => setFormData({ ...formData, vehicleRegistration: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Visit Purpose <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none bg-white"
                >
                  <option value="">Select Purpose...</option>
                  <option value="Official Meeting">Official Meeting</option>
                  <option value="Parent Inquiry">Parent Inquiry</option>
                  <option value="Vendor / Supplier">Vendor / Supplier Delivery</option>
                  <option value="Maintenance / Technical">Maintenance / Technical Service</option>
                  <option value="Government / Inspectorate">Government / Inspectorate</option>
                  <option value="Admissions Inquiry">Admissions Inquiry</option>
                  <option value="Other">Other (Specify)</option>
                </select>

                {formData.purpose === 'Other' && (
                  <input
                    type="text"
                    required
                    placeholder="Specify visit purpose"
                    value={formData.customPurpose}
                    onChange={(e) => setFormData({ ...formData, customPurpose: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none"
                  />
                )}
              </div>

              {/* Host Staff Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Host Person <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    value={formData.hostId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const hostObj = hosts.find((h) => h.id === selectedId);
                      setFormData({
                        ...formData,
                        hostId: selectedId,
                        hostName: hostObj ? `${hostObj.name} (${hostObj.department})` : formData.hostName,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none bg-white"
                  >
                    <option value="">Select Staff Member from Directory...</option>
                    {hosts.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} — {h.department} ({h.role})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    required
                    placeholder="Or type host name / department directly"
                    value={formData.hostName}
                    onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Physical Badge Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Visitor Badge Tag (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIS-01, BADGE-14"
                  value={formData.badgeNumber}
                  onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Security Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Items in possession, special clearance, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCheckInOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#b3141f] hover:bg-[#961019] text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Checking In...' : 'Confirm Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Visitor Pass Modal */}
      {selectedVisitorForPass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visitor Pass</span>
              <button
                onClick={() => setSelectedVisitorForPass(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pass Card Component (Printable) */}
            <div className="border-2 border-dashed border-[#b3141f]/30 rounded-xl p-4 bg-slate-50/50 space-y-3 text-center">
              <div>
                <p className="text-[10px] font-bold text-[#b3141f] uppercase tracking-widest">
                  Oakland International School
                </p>
                <p className="text-xs font-semibold text-slate-700">Visitor Clearance Pass</p>
              </div>

              <div className="py-2 bg-white rounded-lg border border-slate-200">
                <p className="text-[10px] text-slate-400 font-mono">PASS NUMBER</p>
                <p className="text-xl font-bold font-mono text-slate-900 tracking-wider">
                  {selectedVisitorForPass.passNumber}
                </p>
                {selectedVisitorForPass.badgeNumber !== '—' && (
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#0f3a3e]/10 text-[#0f3a3e] border border-[#0f3a3e]/20 font-mono mt-1">
                    Badge #{selectedVisitorForPass.badgeNumber}
                  </span>
                )}
              </div>

              <div className="text-left text-xs space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Visitor:</span>
                  <span className="font-semibold text-slate-800">{selectedVisitorForPass.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Host:</span>
                  <span className="font-semibold text-slate-800">{selectedVisitorForPass.hostName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Purpose:</span>
                  <span className="font-medium text-slate-700">{selectedVisitorForPass.purpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Check-in:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(selectedVisitorForPass.checkInTime).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <p className="text-[9px] text-slate-400 pt-2 border-t border-slate-200">
                Notice: Please keep this pass visible and return it to Reception upon departure.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handlePrintPass}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Pass</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
