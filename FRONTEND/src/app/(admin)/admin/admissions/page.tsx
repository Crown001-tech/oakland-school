'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

export interface AdmissionApplication {
  id: string;
  referenceNumber: string;
  applicantName: string;
  firstName?: string;
  lastName?: string;
  gender: string;
  appliedClass: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  status: 'Pending Review' | 'Accepted' | 'Declined';
  appliedDate: string;
  rawStatus: string;
}

export default function AdminAdmissionsPage() {
  const [applicants, setApplicants] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/admissions');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setApplicants(json.data);
          return;
        }
      }
      setApplicants([]);
    } catch (err) {
      console.error('Failed to load admissions:', err);
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDecision = async (id: string, action: 'accept' | 'decline') => {
    const app = applicants.find((a) => a.id === id);
    if (!app) return;

    try {
      const res = await fetch('/api/admissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          action === 'accept'
            ? `${app.applicantName} admitted! Enrolled into ${app.appliedClass}.`
            : `Application for ${app.applicantName} marked as Declined.`
        );
        await fetchApplications();
      } else {
        showToast(json.message || 'Failed to update application status.');
      }
    } catch {
      showToast('Network error while updating admission status.');
    }
  };

  const filtered = applicants.filter((a) => {
    if (activeStage !== 'all' && a.status !== activeStage) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.applicantName.toLowerCase().includes(q) ||
        a.referenceNumber.toLowerCase().includes(q) ||
        a.appliedClass.toLowerCase().includes(q) ||
        a.parentName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStageBadge = (status: AdmissionApplication['status']) => {
    switch (status) {
      case 'Pending Review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Accepted':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Declined':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  const stages = ['Pending Review', 'Accepted', 'Declined'] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#0a1f22]/95 border border-emerald-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-semibold animate-in slide-in-from-bottom-3 duration-300">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admissions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review incoming student applications and accept or decline admission.
          </p>
        </div>
      </div>

      {/* Stage Filter */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveStage('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeStage === 'all'
                ? 'bg-[#0f3a3e] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Applications ({applicants.length})
          </button>

          <span className="text-slate-300">|</span>

          {stages.map((stg) => {
            const count = applicants.filter((a) => a.status === stg).length;
            const isSelected = activeStage === stg;
            return (
              <button
                key={stg}
                type="button"
                onClick={() => setActiveStage(stg)}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f3a3e] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{stg}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md pt-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student, reference, class, or parent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Reference & Date</th>
                <th className="px-4 py-3">Applicant Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Guardian Details</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No applications pending review.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      New admission applications submitted through the public portal will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono font-bold text-slate-900">{app.referenceNumber}</p>
                      <p className="text-[10px] text-slate-400">{app.appliedDate}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{app.applicantName}</p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {app.gender}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded font-bold text-slate-800 bg-slate-100 border border-slate-200">
                        {app.appliedClass}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{app.parentName}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span className="font-mono">{app.parentPhone}</span>
                        </span>
                        {app.parentEmail && app.parentEmail !== '—' && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-2.5 h-2.5 text-slate-400" />
                            <span>{app.parentEmail}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStageBadge(
                          app.status
                        )}`}
                      >
                        {app.status === 'Pending Review' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                        {app.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {app.status === 'Pending Review' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDecision(app.id, 'decline')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecision(app.id, 'accept')}
                            className="px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                        </div>
                      ) : app.status === 'Accepted' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Declined
                          </span>
                        </div>
                      )}
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
