'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Building,
  User,
  School,
  Lock,
  FileText,
  Box,
  Truck,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface DeliveryItem {
  id: string;
  trackingCode: string;
  courierService: string;
  senderName: string;
  recipientType: 'staff' | 'department' | 'school';
  recipientId: string | null;
  recipientName: string;
  department: string;
  packageDescription: string;
  packageType: 'document' | 'parcel' | 'box' | 'equipment' | 'confidential';
  receivedTime: string;
  receivedByOfficer: string;
  status: 'received' | 'notified' | 'collected';
  collectedTime: string | null;
  collectedByName: string | null;
  notes: string;
  createdAt: string;
}

interface StaffHost {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  department: string;
}

interface DeliveryStats {
  awaitingCollection: number;
  collectedToday: number;
  totalLogged: number;
  confidentialPackages: number;
}

export default function SecurityDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [staffList, setStaffList] = useState<StaffHost[]>([]);
  const [stats, setStats] = useState<DeliveryStats>({
    awaitingCollection: 0,
    collectedToday: 0,
    totalLogged: 0,
    confidentialPackages: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'awaiting' | 'all' | 'collected'>('awaiting');
  const [packageTypeFilter, setPackageTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedForCollect, setSelectedForCollect] = useState<DeliveryItem | null>(null);
  const [collectorName, setCollectorName] = useState('');
  const [collectNotes, setCollectNotes] = useState('');

  // Selected for ticket view
  const [selectedTicket, setSelectedTicket] = useState<DeliveryItem | null>(null);

  // Form State (Zero mock defaults)
  const [formData, setFormData] = useState({
    courierService: '',
    senderName: '',
    recipientType: 'staff' as 'staff' | 'department' | 'school',
    recipientId: '',
    recipientName: '',
    department: '',
    packageDescription: '',
    packageType: 'parcel' as 'document' | 'parcel' | 'box' | 'equipment' | 'confidential',
    customTrackingCode: '',
    securityOfficerName: 'Security Desk',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Deliveries
  const fetchDeliveries = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const res = await fetch('/api/security/deliveries');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDeliveries(data.deliveries || []);
          if (data.stats) setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch Staff List
  const fetchStaffList = async () => {
    try {
      const res = await fetch('/api/security/visitors/hosts');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStaffList(data.hosts || []);
        }
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    fetchStaffList();
    const interval = setInterval(() => fetchDeliveries(), 20000);
    return () => clearInterval(interval);
  }, []);

  // Submit New Delivery
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.courierService.trim() || !formData.recipientName.trim() || !formData.packageDescription.trim()) {
      setFormError('Courier service, recipient name, and package description are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/security/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierService: formData.courierService,
          senderName: formData.senderName,
          recipientType: formData.recipientType,
          recipientId: formData.recipientId || null,
          recipientName: formData.recipientName,
          department: formData.department,
          packageDescription: formData.packageDescription,
          packageType: formData.packageType,
          customTrackingCode: formData.customTrackingCode,
          securityOfficerName: formData.securityOfficerName,
          notes: formData.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Delivery logging failed');
      }

      showToast(`Package logged: ${data.delivery.trackingCode} for ${data.delivery.recipientName}`);
      setIsLogModalOpen(false);

      // Reset form
      setFormData({
        courierService: '',
        senderName: '',
        recipientType: 'staff',
        recipientId: '',
        recipientName: '',
        department: '',
        packageDescription: '',
        packageType: 'parcel',
        customTrackingCode: '',
        securityOfficerName: 'Security Desk',
        notes: '',
      });

      fetchDeliveries();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Handover / Collection
  const handleConfirmCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForCollect) return;

    if (!collectorName.trim()) {
      showToast('Collector name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/security/deliveries/${selectedForCollect.id}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectedByName: collectorName.trim(),
          notes: collectNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Handover confirmation failed');
      }

      showToast(`Handover confirmed for ${data.delivery.trackingCode}`);
      setIsCollectModalOpen(false);
      setSelectedForCollect(null);
      setCollectorName('');
      setCollectNotes('');
      fetchDeliveries();
    } catch (err: any) {
      showToast(err.message || 'Collection failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Reminder Notification
  const handleSendReminder = async (item: DeliveryItem) => {
    try {
      const res = await fetch(`/api/security/deliveries/${item.id}/notify`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send reminder');
      }
      showToast(data.message || 'Reminder sent');
      fetchDeliveries();
    } catch (err: any) {
      showToast(err.message || 'Could not send reminder', 'error');
    }
  };

  // Filter deliveries
  const filteredDeliveries = deliveries.filter((d) => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'awaiting'
        ? d.status !== 'collected'
        : d.status === 'collected';

    const matchesType = packageTypeFilter === 'all' || d.packageType === packageTypeFilter;

    const matchesSearch =
      !searchQuery ||
      d.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.courierService.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.packageDescription.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesType && matchesSearch;
  });

  const getPackageTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="w-3.5 h-3.5 text-blue-600" />;
      case 'box':
      case 'equipment':
        return <Box className="w-3.5 h-3.5 text-amber-600" />;
      case 'confidential':
        return <Lock className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Package className="w-3.5 h-3.5 text-[#0f3a3e]" />;
    }
  };

  const getRecipientTypeIcon = (type: string) => {
    switch (type) {
      case 'department':
        return <Building className="w-3 h-3 text-slate-500" />;
      case 'school':
        return <School className="w-3 h-3 text-indigo-600" />;
      default:
        return <User className="w-3 h-3 text-[#0f3a3e]" />;
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
              Deliveries
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Parcel Intake
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Courier parcel intake, internal recipient tagging, and handover confirmation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDeliveries(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0f3a3e]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setIsLogModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#b3141f] hover:bg-[#961019] text-white text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Log Delivery</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Awaiting Collection */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Awaiting Collection</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-amber-700">{stats.awaitingCollection}</span>
              <span className="text-[10px] text-amber-600 font-semibold">At desk</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Collected Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Collected Today</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-700">{stats.collectedToday}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Handed over</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Logged */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Received</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{stats.totalLogged}</span>
              <span className="text-[10px] text-slate-500 font-semibold">Lifetime logs</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Confidential Items */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confidential</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-rose-700">{stats.confidentialPackages}</span>
              <span className="text-[10px] text-rose-600 font-semibold">Vault custody</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('awaiting')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'awaiting'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Awaiting Collection ({stats.awaitingCollection})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Packages ({deliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('collected')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'collected'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Collected ({deliveries.filter((d) => d.status === 'collected').length})
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Package Type Filter */}
          <select
            value={packageTypeFilter}
            onChange={(e) => setPackageTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] min-h-[36px]"
          >
            <option value="all">All Package Types</option>
            <option value="document">Document</option>
            <option value="parcel">Parcel</option>
            <option value="box">Box</option>
            <option value="equipment">Equipment</option>
            <option value="confidential">Confidential</option>
          </select>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, courier, recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] min-h-[36px]"
            />
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {filteredDeliveries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {activeTab === 'awaiting' ? 'No Packages Awaiting Collection' : 'No Delivery Records Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Inbound packages, letters, and courier consignments received at Reception or the Security Gate will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Tracking Code</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Courier & Sender</th>
                  <th className="px-4 py-3">Item Details</th>
                  <th className="px-4 py-3">Received Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeliveries.map((item) => {
                  const isAwaiting = item.status !== 'collected';
                  const isConfidential = item.packageType === 'confidential';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      {/* Tracking Code */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTicket(item)}
                          className="font-mono font-bold text-slate-900 hover:text-[#0f3a3e] flex items-center gap-1 cursor-pointer"
                        >
                          <span>{item.trackingCode}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                        <span className="text-[10px] text-slate-400 block">
                          By: {item.receivedByOfficer}
                        </span>
                      </td>

                      {/* Recipient */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {getRecipientTypeIcon(item.recipientType)}
                          <span className="font-bold text-slate-900">{item.recipientName}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          {item.department !== '—' ? item.department : item.recipientType}
                        </span>
                      </td>

                      {/* Courier & Sender */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 block">{item.courierService}</span>
                        <span className="text-[11px] text-slate-400 block">
                          From: {item.senderName}
                        </span>
                      </td>

                      {/* Item Details */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {getPackageTypeIcon(item.packageType)}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold capitalize ${
                              isConfidential
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {item.packageType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 max-w-xs truncate" title={item.packageDescription}>
                          {item.packageDescription}
                        </p>
                      </td>

                      {/* Received Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-700">
                        <div className="font-semibold text-slate-900">
                          {new Date(item.receivedTime).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.receivedTime).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.status === 'collected' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" />
                              <span>Collected</span>
                            </span>
                            {item.collectedByName && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                By {item.collectedByName}
                              </span>
                            )}
                          </div>
                        ) : item.status === 'notified' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Send className="w-3 h-3" />
                            <span>Notified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Received</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAwaiting && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedForCollect(item);
                                  setCollectorName(item.recipientName);
                                  setCollectNotes('');
                                  setIsCollectModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer min-h-[36px]"
                              >
                                Handover
                              </button>
                              <button
                                onClick={() => handleSendReminder(item)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                                title="Send reminder notice"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedTicket(item)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="View parcel pass ticket"
                          >
                            <FileText className="w-3.5 h-3.5" />
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

      {/* Log Delivery Intake Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Log Inbound Delivery</h3>
                  <p className="text-[11px] text-slate-500">Reception and gate package intake</p>
                </div>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Courier & Sender Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Courier Service <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="couriers-list"
                    placeholder="e.g. DHL, FedEx, GIG Logistics"
                    value={formData.courierService}
                    onChange={(e) => setFormData({ ...formData, courierService: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                  />
                  <datalist id="couriers-list">
                    <option value="DHL Express" />
                    <option value="FedEx" />
                    <option value="GIG Logistics" />
                    <option value="Speedaf Express" />
                    <option value="Dispatch Rider" />
                    <option value="In-Person Delivery" />
                    <option value="Nigeria Post (NIPOST)" />
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sender Details (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WAEC Office, Evans Publishers"
                    value={formData.senderName}
                    onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Recipient Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Recipient Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipientType: 'staff' })}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border font-bold text-xs transition cursor-pointer min-h-[44px] ${
                      formData.recipientType === 'staff'
                        ? 'bg-[#0f3a3e] text-white border-[#0f3a3e] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Staff Member</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipientType: 'department' })}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border font-bold text-xs transition cursor-pointer min-h-[44px] ${
                      formData.recipientType === 'department'
                        ? 'bg-[#0f3a3e] text-white border-[#0f3a3e] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Department</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipientType: 'school' })}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border font-bold text-xs transition cursor-pointer min-h-[44px] ${
                      formData.recipientType === 'school'
                        ? 'bg-[#0f3a3e] text-white border-[#0f3a3e] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <School className="w-3.5 h-3.5" />
                    <span>School Office</span>
                  </button>
                </div>
              </div>

              {/* Recipient Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Recipient Name <span className="text-rose-500">*</span>
                </label>
                {formData.recipientType === 'staff' && (
                  <select
                    value={formData.recipientId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const staff = staffList.find((s) => s.id === selId);
                      setFormData({
                        ...formData,
                        recipientId: selId,
                        recipientName: staff ? staff.name : formData.recipientName,
                        department: staff ? staff.department : formData.department,
                      });
                    }}
                    className="w-full mb-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none bg-white min-h-[44px]"
                  >
                    <option value="">Select Staff from Directory...</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.department} ({s.role})
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  required
                  placeholder="Enter recipient name or office title"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                />
              </div>

              {/* Package Type & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Package Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.packageType}
                    onChange={(e) => setFormData({ ...formData, packageType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none bg-white min-h-[44px]"
                  >
                    <option value="parcel">Parcel</option>
                    <option value="document">Document / Letter</option>
                    <option value="box">Carton / Box</option>
                    <option value="equipment">Equipment / Devices</option>
                    <option value="confidential">Confidential Custody</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Waybill Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Leave blank for auto-generated code"
                    value={formData.customTrackingCode}
                    onChange={(e) => setFormData({ ...formData, customTrackingCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none uppercase font-mono min-h-[44px]"
                  />
                </div>
              </div>

              {/* Package Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Package Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Science reagents sealed carton, WAEC registration certificates envelope"
                  value={formData.packageDescription}
                  onChange={(e) => setFormData({ ...formData, packageDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Storage Location or Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Stored at Security Desk Shelf B, Reception Counter, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#b3141f] hover:bg-[#961019] text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? 'Logging...' : 'Confirm Delivery Intake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Handover / Collection Modal */}
      {isCollectModalOpen && selectedForCollect && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Confirm Package Handover</h3>
              <button
                onClick={() => setIsCollectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Tracking Code:</span>
                <span className="font-mono font-bold text-slate-900">{selectedForCollect.trackingCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Courier:</span>
                <span className="font-semibold text-slate-800">{selectedForCollect.courierService}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient:</span>
                <span className="font-bold text-[#0f3a3e]">{selectedForCollect.recipientName}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmCollection} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Collected By Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Person picking up the package"
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Handover Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="ID verified, signature on physical register, etc."
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? 'Confirming...' : 'Confirm Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Parcel Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parcel Intake Ticket</span>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-indigo-400/50 rounded-xl p-4 bg-indigo-50/20 space-y-3 text-center">
              <div>
                <p className="text-[10px] font-bold text-[#b3141f] uppercase tracking-widest">
                  Oakland International School
                </p>
                <p className="text-xs font-semibold text-slate-700">Reception Parcel Intake</p>
              </div>

              <div className="py-2.5 bg-white rounded-lg border border-slate-200">
                <p className="text-[10px] text-slate-400 font-mono">PARCEL CODE</p>
                <p className="text-xl font-bold font-mono text-slate-900 tracking-wider">
                  {selectedTicket.trackingCode}
                </p>
              </div>

              <div className="text-left text-xs space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Recipient:</span>
                  <span className="font-semibold text-slate-800">{selectedTicket.recipientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Courier:</span>
                  <span className="font-medium text-slate-700">{selectedTicket.courierService}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sender:</span>
                  <span className="text-slate-700">{selectedTicket.senderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className="font-medium capitalize text-slate-700">{selectedTicket.packageType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Received:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(selectedTicket.receivedTime).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Officer:</span>
                  <span className="text-slate-700">{selectedTicket.receivedByOfficer}</span>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-200/60">
                Present this ticket or staff ID upon collection at Reception.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition min-h-[44px]"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
