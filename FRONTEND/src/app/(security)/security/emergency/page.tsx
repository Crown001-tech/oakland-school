'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  PhoneCall,
  ShieldAlert,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Flame,
  Shield,
  HeartPulse,
  Truck,
  Zap,
  Building,
  Radio,
  Copy,
  Check,
  X,
  Phone,
  FileText,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface EmergencyContact {
  id: string;
  serviceName: string;
  category: 'police' | 'fire' | 'ambulance' | 'clinic' | 'management' | 'utility';
  contactPerson: string;
  primaryPhone: string;
  secondaryPhone: string | null;
  address: string;
  displayOrder: number;
}

interface SafetyProtocol {
  id: string;
  title: string;
  category: string;
  priority: string;
  assemblyPoint: string;
  immediateActions: string[];
}

export default function SecurityEmergencyPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [protocols, setProtocols] = useState<SafetyProtocol[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'contacts' | 'protocols'>('contacts');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Add Contact Form State
  const [formData, setFormData] = useState({
    serviceName: '',
    category: 'police' as 'police' | 'fire' | 'ambulance' | 'clinic' | 'management' | 'utility',
    contactPerson: '',
    primaryPhone: '',
    secondaryPhone: '',
    address: '',
    displayOrder: 10,
  });

  // Broadcast Form State
  const [broadcastData, setBroadcastData] = useState({
    broadcastType: 'lockdown',
    title: 'Code Red Campus Lockdown',
    message: 'Perimeter threat reported. All teachers lock classroom doors, close window blinds, and keep students silent on the floor immediately. Do not exit until the All-Clear is sounded.',
    initiatorName: 'Godwin Egharevba',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Emergency Data
  const fetchEmergencyData = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const res = await fetch('/api/security/emergency');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setContacts(data.contacts || []);
          setProtocols(data.protocols || []);
          if (data.categoryCounts) setCategoryCounts(data.categoryCounts);
        }
      }
    } catch (err) {
      console.error('Failed to load emergency directory:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmergencyData();
  }, []);

  // Copy Phone Number
  const copyToClipboard = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    showToast(`Copied ${phone} to clipboard`);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  // Submit Add Contact
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.serviceName.trim() || !formData.primaryPhone.trim()) {
      setFormError('Service name and primary phone are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/security/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to add contact');
      }

      showToast(`Contact added: ${data.contact.serviceName}`);
      setIsAddModalOpen(false);

      // Reset form
      setFormData({
        serviceName: '',
        category: 'police',
        contactPerson: '',
        primaryPhone: '',
        secondaryPhone: '',
        address: '',
        displayOrder: 10,
      });

      fetchEmergencyData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Emergency Broadcast
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!broadcastData.title.trim() || !broadcastData.message.trim()) {
      setFormError('Broadcast title and instructions are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/security/emergency/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Broadcast transmission failed');
      }

      showToast(`Emergency alert transmitted to ${data.recipientsCount} staff members!`);
      setIsBroadcastModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to dispatch broadcast');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category Icon Resolver
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'police':
        return <Shield className="w-5 h-5 text-blue-700" />;
      case 'fire':
        return <Flame className="w-5 h-5 text-rose-600" />;
      case 'ambulance':
        return <Truck className="w-5 h-5 text-amber-600" />;
      case 'clinic':
        return <HeartPulse className="w-5 h-5 text-emerald-600" />;
      case 'management':
        return <Building className="w-5 h-5 text-indigo-700" />;
      case 'utility':
        return <Zap className="w-5 h-5 text-yellow-600" />;
      default:
        return <PhoneCall className="w-5 h-5 text-slate-700" />;
    }
  };

  // Filtered Contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      c.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.primaryPhone.includes(searchQuery) ||
      (c.secondaryPhone && c.secondaryPhone.includes(searchQuery)) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
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
              Emergency Directory
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
              Institutional Rapid Dial
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Instant 1-tap emergency service dialing, categorized contacts, and campus safety protocols.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEmergencyData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0f3a3e]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setIsBroadcastModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#b3141f] hover:bg-[#961019] text-white text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px]"
          >
            <Radio className="w-4 h-4" />
            <span>Broadcast Alert</span>
          </button>
        </div>
      </div>

      {/* Speed Dial Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <a
          href="tel:112"
          className="flex items-center justify-between p-3.5 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 rounded-xl transition group min-h-[44px]"
        >
          <div>
            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Civic Emergency</p>
            <p className="text-xl font-bold font-mono text-rose-900">112</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
            <PhoneCall className="w-4 h-4" />
          </div>
        </a>

        <a
          href="tel:767"
          className="flex items-center justify-between p-3.5 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-xl transition group min-h-[44px]"
        >
          <div>
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">State Police Control</p>
            <p className="text-xl font-bold font-mono text-blue-900">767</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
            <Shield className="w-4 h-4" />
          </div>
        </a>

        <a
          href="tel:08055554321"
          className="flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition group min-h-[44px]"
        >
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">School Infirmary</p>
            <p className="text-sm font-bold font-mono text-emerald-900">08055554321</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
            <HeartPulse className="w-4 h-4" />
          </div>
        </a>

        <a
          href="tel:08012345678"
          className="flex items-center justify-between p-3.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl transition group min-h-[44px]"
        >
          <div>
            <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Principal Line</p>
            <p className="text-sm font-bold font-mono text-indigo-900">Mr Seyi Bankole</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
            <Building className="w-4 h-4" />
          </div>
        </a>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'contacts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Emergency Directory ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('protocols')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer min-h-[36px] ${
              activeTab === 'protocols'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Safety Protocols ({protocols.length})
          </button>
        </div>

        {/* Category Filter and Search (For Contacts Tab) */}
        {activeTab === 'contacts' && (
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] min-h-[36px]"
            >
              <option value="all">All Categories</option>
              <option value="police">Police</option>
              <option value="fire">Fire & Rescue</option>
              <option value="ambulance">Ambulance</option>
              <option value="clinic">Infirmary</option>
              <option value="management">Management</option>
              <option value="utility">Utilities</option>
            </select>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search service, contact, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] min-h-[36px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: Emergency Contacts Grid */}
      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      {getCategoryIcon(c.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">{c.serviceName}</h3>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {c.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  {c.contactPerson !== '—' && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="text-slate-400 text-[11px]">Contact:</span>
                      <span className="font-medium">{c.contactPerson}</span>
                    </div>
                  )}

                  {c.address !== '—' && (
                    <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{c.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <a
                  href={`tel:${c.primaryPhone.replace(/\s+/g, '')}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#0f3a3e] hover:bg-[#164e53] text-white font-bold text-xs shadow-xs transition min-h-[44px]"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call: {c.primaryPhone}</span>
                </a>

                <button
                  onClick={() => copyToClipboard(c.primaryPhone)}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  title="Copy Phone Number"
                >
                  {copiedPhone === c.primaryPhone ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Safety Protocols Checklists */}
      {activeTab === 'protocols' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {protocols.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {getCategoryIcon(p.category)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{p.title}</h3>
                    <p className="text-[11px] text-slate-500">Assembly: {p.assemblyPoint}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    p.priority === 'Critical'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {p.priority}
                </span>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  Mandatory Security Actions:
                </p>
                <ol className="space-y-1.5 list-decimal list-inside text-slate-600 leading-relaxed">
                  {p.immediateActions.map((act, idx) => (
                    <li key={idx} className="pl-1">
                      <span>{act}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Emergency Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Emergency Contact</h3>
                  <p className="text-[11px] text-slate-500">Institutional directory line</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Service / Agency Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Area Commander Rapid Response Unit"
                  value={formData.serviceName}
                  onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none bg-white min-h-[44px]"
                  >
                    <option value="police">Police</option>
                    <option value="fire">Fire & Rescue</option>
                    <option value="ambulance">Ambulance</option>
                    <option value="clinic">Clinic / Infirmary</option>
                    <option value="management">School Management</option>
                    <option value="utility">Utility</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Person (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Officer in Charge"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Primary Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 08031234567 or 112"
                    value={formData.primaryPhone}
                    onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Secondary Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 08029876543"
                    value={formData.secondaryPhone}
                    onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Location / Post Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Victoria Island Division, Lagos"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none min-h-[44px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#0f3a3e] hover:bg-[#164e53] text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? 'Saving...' : 'Save Emergency Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Emergency Alert Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-300 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-900">Transmit Emergency Broadcast</h3>
                  <p className="text-[11px] text-rose-600">All-campus priority alert</p>
                </div>
              </div>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <p className="font-bold">⚠️ High-Priority Broadcast Warning</p>
              <p className="text-[11px] text-rose-700">
                Transmitting this alert will send an instant in-app emergency banner to all staff and administrative accounts, and log an executive security incident.
              </p>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Broadcast Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alert Classification <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setBroadcastData({
                        ...broadcastData,
                        broadcastType: 'lockdown',
                        title: 'Code Red Campus Lockdown',
                        message: 'Perimeter threat reported. All teachers lock classroom doors, close window blinds, and keep students silent on the floor immediately. Do not exit until the All-Clear is sounded.',
                      })
                    }
                    className={`py-2 px-3 rounded-lg border font-bold text-xs transition cursor-pointer min-h-[44px] ${
                      broadcastData.broadcastType === 'lockdown'
                        ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Lockdown (Code Red)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBroadcastData({
                        ...broadcastData,
                        broadcastType: 'fire',
                        title: 'Fire Evacuation Alert',
                        message: 'Fire alarm activated. Proceed to the nearest designated emergency escape staircase immediately. Assemble at the Main Sports Field. Do not use elevators.',
                      })
                    }
                    className={`py-2 px-3 rounded-lg border font-bold text-xs transition cursor-pointer min-h-[44px] ${
                      broadcastData.broadcastType === 'fire'
                        ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Fire Evacuation
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alert Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={broadcastData.title}
                  onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none min-h-[44px]"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mandatory Emergency Instructions <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={broadcastData.message}
                  onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {isSubmitting ? 'Transmitting Alert...' : 'Transmit Alert Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
