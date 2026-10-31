'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  UserCheck,
  X,
  Search,
} from 'lucide-react';

interface LeaveRequestItem {
  id: string;
  staffName: string;
  employeeId: string;
  role: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  reliefTeacher: string;
  submittedAt: string;
  status: 'Approved' | 'Declined' | 'Pending';
  notes: string;
}

export default function TeacherLeavePage() {
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Form State (strictly initialized to empty strings)
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState('1');
  const [reason, setReason] = useState('');
  const [reliefTeacher, setReliefTeacher] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchTeacherAndLeaves = async () => {
    try {
      const [meRes, leaveRes] = await Promise.all([
        fetch('/api/auth/me').then((r) => r.json()).catch(() => null),
        fetch('/api/leave').then((r) => r.json()).catch(() => null),
      ]);

      if (meRes?.authenticated && meRes?.profile) {
        setCurrentTeacher(meRes.profile);
      }

      if (leaveRes?.success && Array.isArray(leaveRes.data)) {
        setRequests(leaveRes.data);
      }
    } catch (err) {
      console.error('Failed to load leave records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherAndLeaves();
  }, []);

  // Modal escape key listener (DEF-010 compliance)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Auto-calculate days when start and end dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) {
        setDays(String(diffDays));
      }
    }
  }, [startDate, endDate]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      alert('Please fill in start date, end date, and justification reason.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        staffName: currentTeacher?.name || 'Faculty Member',
        employeeId: currentTeacher?.employeeId || currentTeacher?.id || '—',
        role: currentTeacher?.roleDisplay || currentTeacher?.role || 'Class Teacher',
        leaveType,
        startDate,
        endDate,
        days: Number(days) || 1,
        reason: reason.trim(),
        reliefTeacher: reliefTeacher.trim() || '—',
      };

      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        showToast('Leave request submitted successfully for Principal review.');
        setIsModalOpen(false);
        // Reset form
        setStartDate('');
        setEndDate('');
        setDays('1');
        setReason('');
        setReliefTeacher('');
        await fetchTeacherAndLeaves();
      } else {
        alert(json.message || 'Failed to submit leave request');
      }
    } catch {
      alert('Network error while submitting leave application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  // Filter requests for this teacher (or display all if staff identifier not set)
  const teacherRequests = currentTeacher?.name
    ? requests.filter((r) => r.staffName.toLowerCase() === currentTeacher.name.toLowerCase())
    : requests;

  const totalCount = teacherRequests.length;
  const approvedCount = teacherRequests.filter((r) => r.status === 'Approved').length;
  const pendingCount = teacherRequests.filter((r) => r.status === 'Pending').length;
  const daysApproved = teacherRequests
    .filter((r) => r.status === 'Approved')
    .reduce((sum, r) => sum + r.days, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Leave Applications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Apply for casual, medical, or official school leave and track Principal review status.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-primary hover:bg-[#14484d] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Leave Request</span>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Requests</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
        </Card>
        <Card className="p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </Card>
        <Card className="p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approved Requests</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{approvedCount}</p>
        </Card>
        <Card className="p-4 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Days Utilized</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{daysApproved} <span className="text-xs font-normal text-slate-500">days</span></p>
        </Card>
      </div>

      {/* Leave Application History Table */}
      <Card className="border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Application Records</h2>
          <span className="text-xs text-slate-500">{totalCount} application{totalCount === 1 ? '' : 's'} on record</span>
        </div>

        {teacherRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No leave requests submitted yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You currently have no pending or historical leave applications on file. Click &quot;New Leave Request&quot; to apply.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Date Range</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Relief Teacher</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Principal Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teacherRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-800">{req.leaveType}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {req.startDate} &rarr; {req.endDate}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{req.days}</td>
                    <td className="px-4 py-3 text-slate-600">{req.reliefTeacher}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'Declined'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate" title={req.notes}>
                      {req.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Leave Application Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">New Leave Application</h2>
                <p className="text-xs text-slate-500 mt-0.5">Direct submission to the Head of School.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Leave Category</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Medical">Medical Leave</option>
                  <option value="Annual">Annual / Academic Recess</option>
                  <option value="Compassionate">Compassionate Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Days</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Relief Teacher</label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Babatunde Alabi"
                    value={reliefTeacher}
                    onChange={(e) => setReliefTeacher(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Justification Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide concise operational context for this leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-primary hover:bg-[#14484d] text-white text-xs font-bold px-4 py-2"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
