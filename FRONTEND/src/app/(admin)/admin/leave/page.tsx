'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  X,
  Clock,
  User,
  Calendar,
  Check,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { fetchPrincipalDelegations, PrincipalDelegations } from '@/lib/delegations';
import { DelegationRestrictedBanner } from '@/components/common/DelegationRestrictedBanner';

interface StaffLeaveRequest {
  id: string;
  staffName: string;
  employeeId: string;
  role: string;
  leaveType: 'Medical' | 'Casual' | 'Annual' | 'Maternity';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  reliefTeacher: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Declined';
  notes?: string;
}

const INITIAL_LEAVES: StaffLeaveRequest[] = [];


export default function AdminLeavePage() {
  const [leaves, setLeaves] = useState<StaffLeaveRequest[]>(INITIAL_LEAVES);
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Approved' | 'Declined' | 'All'>('Pending');
  const [selectedLeave, setSelectedLeave] = useState<StaffLeaveRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [delegations, setDelegations] = useState<PrincipalDelegations | null>(null);
  const canApproveLeave = delegations?.canApproveLeave ?? true;

  const fetchLeaves = async () => {
    try {
      const res = await fetch('/api/leave');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLeaves(json.data);
      }
    } catch {
      // Empty state on network error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchPrincipalDelegations().then(setDelegations);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve', notes: reviewNotes || 'Approved by Principal' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Leave request approved');
        fetchLeaves();
      } else {
        showToast(data.message || 'Error approving leave request');
      }
    } catch {
      showToast('Network error updating leave request');
    }
    setSelectedLeave(null);
    setReviewNotes('');
  };

  const handleDecline = async (id: string) => {
    try {
      const res = await fetch('/api/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'decline', notes: reviewNotes || 'Declined' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Leave request declined');
        fetchLeaves();
      } else {
        showToast(data.message || 'Error declining leave request');
      }
    } catch {
      showToast('Network error updating leave request');
    }
    setSelectedLeave(null);
    setReviewNotes('');
  };

  const filteredLeaves = leaves.filter((l) =>
    statusFilter === 'All' ? true : l.status === statusFilter
  );

  const pendingCount = leaves.filter((l) => l.status === 'Pending').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Leave Requests</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review staff leave applications, relief teacher arrangements, and approvals.
        </p>
      </div>

      {/* Authority Restriction Notice */}
      {!canApproveLeave && (
        <DelegationRestrictedBanner
          title="Staff Leave Approval Authority Reserved"
          description="The Office of the Proprietor has reserved leave application approval authorities. The Principal may review and inspect staff leave applications in read-only mode."
        />
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {(['Pending', 'Approved', 'Declined', 'All'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              statusFilter === tab
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{tab}</span>
            {tab === 'Pending' && pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === tab ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4 font-semibold">Staff Member</th>
              <th className="py-2.5 px-4 font-semibold">Leave Type</th>
              <th className="py-2.5 px-4 font-semibold">Duration</th>
              <th className="py-2.5 px-4 font-semibold">Relief Coverage</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLeaves.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <Clock className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 text-sm">No Leave Requests Found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {statusFilter === 'Pending'
                      ? 'The leave queue is completely clear. No staff leave requests are awaiting Principal review.'
                      : `No leave applications recorded with status "${statusFilter}".`}
                  </p>
                </td>
              </tr>
            ) : (
              filteredLeaves.map((req) => {
                const isPending = req.status === 'Pending';
                const isApproved = req.status === 'Approved';

                return (
                  <tr key={req.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{req.staffName}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{req.role}</p>
                    </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{req.leaveType}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    <p className="text-slate-800 font-bold">{req.days} Day(s)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{req.startDate} to {req.endDate}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-700">{req.reliefTeacher}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPending
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : isApproved
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeave(req);
                        setReviewNotes(req.notes || '');
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs"
                    >
                      {isPending ? 'Review' : 'View'}
                    </button>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>

      {/* Modal: Review Leave Application */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Review Leave Request</h3>
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Applicant:</span>
                <span className="font-bold text-slate-900">{selectedLeave.staffName} ({selectedLeave.employeeId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Leave Type:</span>
                <span className="font-semibold text-slate-800">{selectedLeave.leaveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Period:</span>
                <span className="font-mono text-slate-800">
                  {selectedLeave.startDate} to {selectedLeave.endDate} ({selectedLeave.days} Days)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Relief Teacher:</span>
                <span className="font-semibold text-slate-800">{selectedLeave.reliefTeacher}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-0.5">Reason:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  {selectedLeave.reason}
                </p>
              </div>
            </div>

            {selectedLeave.status === 'Pending' ? (
              canApproveLeave ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Approval Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Relief coverage verified..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDecline(selectedLeave.id)}
                      className="px-3.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedLeave.id)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      Approve Leave
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-xs text-amber-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Leave approvals are reserved by the Proprietor.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLeave(null)}
                    className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl"
                  >
                    Close
                  </button>
                </div>
              )
            ) : (
              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedLeave(null)}
                  className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
