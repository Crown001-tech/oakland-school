'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Footprints,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Tag,
  X,
  Printer,
  AlertTriangle,
  RefreshCw,
  Plus,
  Check,
  Building,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface StudentMovement {
  id: string;
  passNumber: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  reason: string;
  authorizedById: string | null;
  authorizedByName: string;
  escortType: string;
  escortName: string;
  escortPhone: string;
  departureTime: string;
  expectedReturnTime: string | null;
  actualReturnTime: string | null;
  status: 'departed' | 'returned' | 'overdue';
  securityOfficerName: string;
  notes: string;
  createdAt: string;
}

interface StudentOption {
  id: string;
  admissionNo: string;
  fullName: string;
  className: string;
}

interface StaffHost {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  department: string;
}

export default function SecurityMovementPage() {
  const [movements, setMovements] = useState<StudentMovement[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [staffList, setStaffList] = useState<StaffHost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Pass Modal State
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Inputs (Zero mock defaults)
  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    studentClass: '',
    reason: '',
    customReason: '',
    authorizedById: '',
    authorizedByName: '',
    escortType: 'guardian',
    escortName: '',
    escortPhone: '',
    expectedReturnTime: '',
    notes: '',
  });

  // Selected Pass for View/Print
  const [selectedPass, setSelectedPass] = useState<StudentMovement | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const formatReason = (reason: string): string => {
    const map: Record<string, string> = {
      medical: 'Medical',
      official_errand: 'Official Errand',
      sports: 'Sports',
      competition: 'Competition',
      early_dismissal: 'Early Dismissal',
      other: 'Other',
    };
    return map[reason] || reason;
  };

  // Fetch movements
  const fetchMovements = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const res = await fetch('/api/security/movement');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMovements(data.movements || []);
        }
      }
    } catch (err) {
      console.error('Failed to load movements:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch enrolled students
  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/security/movement/students');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStudents(data.students || []);
        }
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  // Fetch staff list for authorizing teacher
  const fetchStaff = async () => {
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
    fetchMovements();
    fetchStudents();
    fetchStaff();
    const interval = setInterval(() => fetchMovements(), 20000);
    return () => clearInterval(interval);
  }, []);

  // Handle Gate Pass Creation
  const handlePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const isOther = formData.reason === 'other' || formData.reason === 'Other';
    const reasonValue = isOther ? 'other' : formData.reason;
    const combinedNotes = isOther && formData.customReason
      ? `Reason details: ${formData.customReason}. ${formData.notes || ''}`.trim()
      : formData.notes;

    if (
      !formData.studentId ||
      !formData.studentName.trim() ||
      !reasonValue.trim() ||
      !formData.authorizedByName.trim() ||
      !formData.escortName.trim()
    ) {
      setFormError('Student, reason, authorizing staff, and escort name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/security/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: formData.studentId,
          studentName: formData.studentName,
          studentClass: formData.studentClass,
          reason: reasonValue,
          authorizedById: formData.authorizedById || null,
          authorizedByName: formData.authorizedByName,
          escortType: formData.escortType,
          escortName: formData.escortName,
          escortPhone: formData.escortPhone,
          expectedReturnTime: formData.expectedReturnTime || null,
          notes: combinedNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Pass issuance failed');
      }

      showToast(`Gate pass issued: ${data.movement.studentName} (${data.movement.passNumber})`);
      setIsPassModalOpen(false);
      // Reset form
      setFormData({
        studentId: '',
        studentName: '',
        studentClass: '',
        reason: '',
        customReason: '',
        authorizedById: '',
        authorizedByName: '',
        escortType: 'guardian',
        escortName: '',
        escortPhone: '',
        expectedReturnTime: '',
        notes: '',
      });
      fetchMovements();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during pass creation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Record Return
  const handleRecordReturn = async (movementId: string, studentName: string) => {
    try {
      const res = await fetch(`/api/security/movement/${movementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Return logging failed');
      }

      showToast(`Student ${studentName} return recorded.`);
      fetchMovements();
    } catch (err: any) {
      showToast(err.message || 'Return logging failed', 'error');
    }
  };

  // Filters
  const activeMovements = movements.filter((m) => m.status === 'departed' || m.status === 'overdue');
  const displayedMovements = activeTab === 'active' ? activeMovements : movements;

  const filteredMovements = displayedMovements.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.studentName.toLowerCase().includes(q) ||
      m.passNumber.toLowerCase().includes(q) ||
      m.studentClass.toLowerCase().includes(q) ||
      m.authorizedByName.toLowerCase().includes(q) ||
      m.escortName.toLowerCase().includes(q) ||
      m.reason.toLowerCase().includes(q)
    );
  });

  // Calculate elapsed time
  const getElapsedString = (departureIso: string) => {
    const diffMs = Date.now() - new Date(departureIso).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m out`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m out`;
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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
              Student Movement Passes
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              {activeMovements.length} Currently Out
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official intra-day student departures, faculty exit authorizations, and return verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchMovements(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            title="Refresh passes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0f3a3e]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsPassModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#b3141f] hover:bg-[#961019] text-white text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Gate Pass</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
              activeTab === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Currently Out ({activeMovements.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Movement Logs ({movements.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student, pass, class, escort..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0f3a3e]"
          />
        </div>
      </div>

      {/* Movement Passes Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <BrandLoader size="md" />
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Footprints className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">
              {searchQuery
                ? `No passes matching "${searchQuery}"`
                : activeTab === 'active'
                ? 'No students currently out on movement passes'
                : 'No student movement records found'}
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeTab === 'active'
                ? 'All enrolled students are physically accounted for on campus.'
                : 'Gate passes issued for clinic visits, official errands, and sporting fixtures will be logged here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Pass Code</th>
                  <th className="px-4 py-3">Student Details</th>
                  <th className="px-4 py-3">Reason & Authorizer</th>
                  <th className="px-4 py-3">Escort Details</th>
                  <th className="px-4 py-3">Departure & Expected Return</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => {
                  const isOut = m.status === 'departed' || m.status === 'overdue';
                  const isOverdue = m.status === 'overdue';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                      {/* Pass Number */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 text-xs block">
                          {m.passNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">Gate Pass</span>
                      </td>

                      {/* Student Details */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{m.studentName}</span>
                        <span className="text-[11px] text-[#0f3a3e] font-bold">{m.studentClass}</span>
                      </td>

                      {/* Reason & Authorizer */}
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-slate-800 block">{formatReason(m.reason)}</span>
                        <span className="text-[11px] text-slate-400">
                          Auth: <span className="font-semibold text-slate-600">{m.authorizedByName}</span>
                        </span>
                      </td>

                      {/* Escort Details */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 block">{m.escortName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium capitalize">
                          {m.escortType}
                        </span>
                        {m.escortPhone !== '—' && (
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                            {m.escortPhone}
                          </span>
                        )}
                      </td>

                      {/* Departure & Expected Return */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono text-slate-700 text-xs">
                          {new Date(m.departureTime).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {isOut ? (
                          <div className={`text-[10px] font-semibold mt-0.5 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                            {getElapsedString(m.departureTime)}
                            {m.expectedReturnTime && (
                              <span className="block text-[10px] text-slate-500">
                                Due: {new Date(m.expectedReturnTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                            Returned: {m.actualReturnTime ? new Date(m.actualReturnTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isOut
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOverdue
                                ? 'bg-rose-500'
                                : isOut
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          {isOverdue ? 'Overdue Return' : isOut ? 'Departed' : 'Returned'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedPass(m)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold transition cursor-pointer"
                        >
                          Pass
                        </button>

                        {isOut && (
                          <button
                            onClick={() => handleRecordReturn(m.id, m.studentName)}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition cursor-pointer"
                          >
                            Record Return
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

      {/* Gate Pass Issuance Modal */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Footprints className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Issue Student Gate Pass</h3>
                  <p className="text-[11px] text-slate-500">Record school-hour exit authorization</p>
                </div>
              </div>
              <button
                onClick={() => setIsPassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePassSubmit} className="space-y-4 pt-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Student Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Enrolled Student <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.studentId}
                  onChange={(e) => {
                    const sId = e.target.value;
                    const stud = students.find((s) => s.id === sId);
                    setFormData({
                      ...formData,
                      studentId: sId,
                      studentName: stud ? stud.fullName : '',
                      studentClass: stud ? stud.className : '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none bg-white"
                >
                  <option value="">Select Student from Roster...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} — {s.className} ({s.admissionNo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason for Departure */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Exit <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none bg-white"
                >
                  <option value="">Select Reason...</option>
                  <option value="medical">Medical</option>
                  <option value="official_errand">Official Errand</option>
                  <option value="sports">Sports</option>
                  <option value="competition">Competition</option>
                  <option value="early_dismissal">Early Dismissal</option>
                  <option value="other">Other</option>
                </select>

                {(formData.reason === 'other' || formData.reason === 'Other') && (
                  <input
                    type="text"
                    required
                    placeholder="Specify exit reason"
                    value={formData.customReason}
                    onChange={(e) => setFormData({ ...formData, customReason: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none"
                  />
                )}
              </div>

              {/* Authorizing Staff */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Authorizing Staff <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    value={formData.authorizedById}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const staffObj = staffList.find((s) => s.id === selectedId);
                      setFormData({
                        ...formData,
                        authorizedById: selectedId,
                        authorizedByName: staffObj ? `${staffObj.name} (${staffObj.department})` : formData.authorizedByName,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none bg-white"
                  >
                    <option value="">Select Authorizing Faculty Member...</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.department} ({s.role})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    required
                    placeholder="Or enter authorizing staff name directly"
                    value={formData.authorizedByName}
                    onChange={(e) => setFormData({ ...formData, authorizedByName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Escort Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Escort Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.escortType}
                    onChange={(e) => setFormData({ ...formData, escortType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none bg-white"
                  >
                    <option value="guardian">Guardian</option>
                    <option value="staff">Staff Member</option>
                    <option value="driver">Family Driver</option>
                    <option value="unaccompanied">Unaccompanied</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Escort Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full name of escort"
                    value={formData.escortName}
                    onChange={(e) => setFormData({ ...formData, escortName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 08023334455"
                    value={formData.escortPhone}
                    onChange={(e) => setFormData({ ...formData, escortPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none"
                  />
                </div>
              </div>

              {/* Expected Return Time */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Expected Return Time (If returning today)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expectedReturnTime}
                  onChange={(e) => setFormData({ ...formData, expectedReturnTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none bg-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Security Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Clinic pass attached, destination clinic, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#0f3a3e] focus:outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPassModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#b3141f] hover:bg-[#961019] text-white font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Issuing Pass...' : 'Confirm Gate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Pass Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gate Movement Pass</span>
              <button
                onClick={() => setSelectedPass(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-amber-500/40 rounded-xl p-4 bg-amber-50/20 space-y-3 text-center">
              <div>
                <p className="text-[10px] font-bold text-[#b3141f] uppercase tracking-widest">
                  Oakland International School
                </p>
                <p className="text-xs font-semibold text-slate-700">Official Student Gate Pass</p>
              </div>

              <div className="py-2 bg-white rounded-lg border border-slate-200">
                <p className="text-[10px] text-slate-400 font-mono">PASS CODE</p>
                <p className="text-xl font-bold font-mono text-slate-900 tracking-wider">
                  {selectedPass.passNumber}
                </p>
              </div>

              <div className="text-left text-xs space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Student:</span>
                  <span className="font-semibold text-slate-800">{selectedPass.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Class:</span>
                  <span className="font-semibold text-slate-800">{selectedPass.studentClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reason:</span>
                  <span className="font-medium text-slate-700">{formatReason(selectedPass.reason)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Authorizer:</span>
                  <span className="font-semibold text-slate-800">{selectedPass.authorizedByName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Escort:</span>
                  <span className="text-slate-700">{selectedPass.escortName} ({selectedPass.escortType})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Departure:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(selectedPass.departureTime).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <p className="text-[9px] text-slate-400 pt-2 border-t border-slate-200">
                Notice: Student must present this pass upon gate exit and check back in with Security upon return.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => window.print()}
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
