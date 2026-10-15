'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Search,
  Phone,
  Mail,
  X,
  FileText,
  Clock,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface AdmissionApplication {
  id: string;
  referenceNumber: string;
  applicantName: string;
  gender: string;
  appliedClass: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  status: 'Pending Review' | 'Accepted' | 'Declined';
  appliedDate: string;
}

export default function ProprietorAdmissionsPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeApp, setActiveApp] = useState<AdmissionApplication | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const classes = ['All', 'JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];
  const statuses = ['All', 'Pending Review', 'Accepted', 'Declined'];

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  const loadAdmissions = async () => {
    try {
      const res = await fetch('/api/admissions');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setApplications(json.data);
      }
    } catch (err) {
      console.error('Failed to load admissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, []);

  const handleDecision = async (id: string, action: 'accept' | 'decline') => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();

      if (json.success) {
        showToast(
          action === 'accept'
            ? `Admission accepted. Student enrolled (${json.admissionNumber}) with Pickup PIN ${json.pickupPin}.`
            : 'Admission declined.'
        );
        setActiveApp(null);
        await loadAdmissions();
      } else {
        alert(json.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Decision failed:', err);
      alert('Error updating admission status');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  const filteredApps = applications.filter((app) => {
    const matchesClass = selectedClass === 'All' || app.appliedClass === selectedClass;
    const matchesStatus = selectedStatus === 'All' || app.status === selectedStatus;
    const matchesSearch =
      app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.parentName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesStatus && matchesSearch;
  });

  const pendingCount = applications.filter((a) => a.status === 'Pending Review').length;
  const acceptedCount = applications.filter((a) => a.status === 'Accepted').length;
  const declinedCount = applications.filter((a) => a.status === 'Declined').length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Admissions Board
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review online applications, approve admissions, and enroll pupils into classes.
          </p>
        </div>
      </div>

      {actionToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionToast}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Total Applications
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{applications.length}</p>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">
            Pending Review
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
            Accepted & Enrolled
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{acceptedCount}</p>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Declined
          </span>
          <p className="text-2xl font-black text-slate-700 mt-1">{declinedCount}</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs pb-1">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                selectedStatus === st
                  ? 'bg-[#0f3a3e] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
          >
            {classes.map((c) => (
              <option key={c} value={c}>
                Class: {c}
              </option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <Card className="p-0 overflow-hidden border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-4 py-3.5">Reference</th>
                <th className="px-4 py-3.5">Class</th>
                <th className="px-4 py-3.5">Guardian</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No Applications Found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No prospective candidates match your current filter criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{app.applicantName}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{app.gender}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">
                      {app.referenceNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="teal" size="sm">
                        {app.appliedClass}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-800">{app.parentName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{app.parentPhone}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {app.appliedDate}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.status === 'Accepted'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : app.status === 'Declined'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs py-1 px-3"
                        leftIcon={<Eye className="w-3 h-3" />}
                        onClick={() => setActiveApp(app)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Modal */}
      {activeApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-white shadow-xl border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Admission Review
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {activeApp.applicantName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Ref: {activeApp.referenceNumber} &bull; Class: {activeApp.appliedClass}
                </p>
              </div>

              <button
                onClick={() => setActiveApp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Applicant Gender</span>
                <span className="font-semibold text-slate-800 capitalize">{activeApp.gender}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Target Class</span>
                <span className="font-semibold text-slate-800">{activeApp.appliedClass}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Guardian Name</span>
                <span className="font-semibold text-slate-800">{activeApp.parentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Guardian Phone</span>
                <span className="font-mono font-semibold text-slate-800">{activeApp.parentPhone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Guardian Email</span>
                <span className="font-semibold text-slate-800">{activeApp.parentEmail}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Current Status</span>
                <span className="font-bold text-slate-900">{activeApp.status}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveApp(null)}
              >
                Close
              </Button>

              {activeApp.status !== 'Declined' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:bg-rose-50 border-rose-200"
                  isLoading={isProcessing}
                  onClick={() => handleDecision(activeApp.id, 'decline')}
                >
                  Decline Admission
                </Button>
              )}

              {activeApp.status !== 'Accepted' && (
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-[#0f3a3e] hover:bg-[#164e53]"
                  isLoading={isProcessing}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={() => handleDecision(activeApp.id, 'accept')}
                >
                  Accept & Enroll Student
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
