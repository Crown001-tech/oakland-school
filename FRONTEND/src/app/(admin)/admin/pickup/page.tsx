'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  User,
  Plus,
  X,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface AuthorizedPerson {
  id: string;
  studentId: string;
  studentName?: string;
  studentClass?: string;
  admissionNo?: string;
  fullName: string;
  relationship: string;
  phone: string;
  nationalId?: string;
  photoUrl?: string;
  qrToken: string;
  pickupPin: string;
  isActive: boolean;
  isGuardian?: boolean;
}

interface PickupLog {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  pickedUpByName: string;
  relationship: string;
  verifiedByName: string;
  verificationMethod: 'qr_scan' | 'manual_code' | 'emergency_override';
  status: 'cleared' | 'flagged_unauthorized';
  notes?: string;
  pickupTime: string;
}

export default function GateSecurityPickupPage() {
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [logs, setLogs] = useState<PickupLog[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [activeEscort, setActiveEscort] = useState<AuthorizedPerson | null>(null);

  const [authorizedEscorts, setAuthorizedEscorts] = useState<AuthorizedPerson[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newEscortName, setNewEscortName] = useState('');
  const [newEscortRelation, setNewEscortRelation] = useState('Parent');
  const [newEscortPhone, setNewEscortPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch recent logs, authorized escorts & student directory from PostgreSQL database
  const loadData = async () => {
    try {
      const [pickupRes, studentsRes] = await Promise.all([
        fetch('/api/pickup'),
        fetch('/api/students'),
      ]);

      if (pickupRes.ok) {
        const pData = await pickupRes.json();
        if (pData.success) {
          setLogs(pData.logs || []);
          setAuthorizedEscorts(pData.escorts || []);
        }
      }

      if (studentsRes.ok) {
        const sData = await studentsRes.json();
        if (sData.success && Array.isArray(sData.data)) {
          setStudentsList(sData.data);
          if (sData.data.length > 0) {
            setSelectedStudentId(sData.data[0].id);
          }
        }
      }
    } catch {
      // Clean fallback handled by empty states
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLookup = async (token?: string) => {
    const val = (token || searchInput).trim().toUpperCase();
    if (!val) return;

    try {
      const res = await fetch(`/api/pickup?query=${encodeURIComponent(val)}`);
      const data = await res.json();

      if (data.success && data.match) {
        setActiveStudent(data.match.student);
        setActiveEscort(data.match.escort);
        if (data.match.authorizedEscorts && data.match.authorizedEscorts.length > 0) {
          setAuthorizedEscorts(data.match.authorizedEscorts);
        }
        showToast(`Pass verified for ${data.match.student.name}`);
        return;
      }
    } catch {}

    // Fallback in-memory search across active loaded escorts or students
    const escortMatch = authorizedEscorts.find(
      (e) =>
        e.pickupPin === val ||
        e.qrToken.toUpperCase() === val ||
        e.fullName.toUpperCase().includes(val)
    );

    if (escortMatch) {
      const studentMatch = studentsList.find((s) => s.id === escortMatch.studentId);
      if (studentMatch) {
        setActiveStudent({
          id: studentMatch.id,
          name: studentMatch.fullName || studentMatch.name,
          class: studentMatch.class || 'Enrolled',
          admissionNo: studentMatch.admissionNo || studentMatch.admissionNumber,
        });
      } else {
        setActiveStudent({
          id: escortMatch.studentId,
          name: escortMatch.studentName || 'Student',
          class: escortMatch.studentClass || 'Enrolled',
          admissionNo: escortMatch.admissionNo || '—',
        });
      }
      setActiveEscort(escortMatch);
      showToast(`Verified: ${escortMatch.fullName} (${escortMatch.relationship})`);
      return;
    }

    const matchedStudent = studentsList.find(
      (s) =>
        (s.admissionNo && s.admissionNo.toUpperCase() === val) ||
        (s.admissionNumber && s.admissionNumber.toUpperCase() === val) ||
        (s.fullName && s.fullName.toUpperCase().includes(val)) ||
        (s.name && s.name.toUpperCase().includes(val))
    );

    if (matchedStudent) {
      const studentObj = {
        id: matchedStudent.id,
        name: matchedStudent.fullName || matchedStudent.name,
        class: matchedStudent.class || 'Enrolled',
        admissionNo: matchedStudent.admissionNo || matchedStudent.admissionNumber || val,
      };
      setActiveStudent(studentObj);

      const studentEscorts = authorizedEscorts.filter((e) => e.studentId === matchedStudent.id);
      if (studentEscorts.length > 0) {
        setActiveEscort(studentEscorts[0]);
      } else {
        setActiveEscort(null);
      }
      showToast(`Student Identified: ${studentObj.name} (${studentObj.class})`);
      return;
    }

    setActiveStudent(null);
    setActiveEscort(null);
    showToast(`No authorized pickup pass or student found matching "${val}".`);
  };

  const handleClearPickup = async () => {
    if (!activeStudent || !activeEscort) return;

    try {
      const res = await fetch('/api/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          studentId: activeStudent.id,
          studentName: activeStudent.name,
          studentClass: activeStudent.class,
          pickedUpByName: activeEscort.fullName,
          relationship: activeEscort.relationship,
          verifiedByName: 'Officer Yakubu (Gate 1)',
          verificationMethod: 'manual_code',
          notes: '4-digit PIN verified. Student released.',
        }),
      });

      const data = await res.json();
      if (data.success && data.log) {
        setLogs((prev) => [data.log, ...prev]);
        showToast(`Released: ${activeStudent.name} with ${activeEscort.fullName}.`);
      } else {
        showToast(data.message || 'Failed to record release.');
      }
    } catch {
      showToast('Network error while recording departure.');
    }
  };

  const handleFlagAlert = async () => {
    if (!activeStudent || !activeEscort) return;

    try {
      const res = await fetch('/api/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'flag',
          studentId: activeStudent.id,
          studentName: activeStudent.name,
          studentClass: activeStudent.class,
          pickedUpByName: activeEscort.fullName,
          relationship: activeEscort.relationship,
          verifiedByName: 'Officer Yakubu (Gate 1)',
          reason: 'Escort identity questioned at gate dismissal.',
        }),
      });

      const data = await res.json();
      if (data.success && data.log) {
        setLogs((prev) => [data.log, ...prev]);
        showToast(`Security incident recorded for ${activeStudent.name}`);
      } else {
        showToast(data.message || 'Failed to record security flag.');
      }
    } catch {
      showToast('Network error while flagging incident.');
    }
  };

  const handleRegisterEscort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEscortName.trim() || !newEscortPhone.trim()) return;

    const targetStudent =
      studentsList.find((s) => s.id === selectedStudentId) ||
      (activeStudent ? studentsList.find((s) => s.id === activeStudent.id) : null) ||
      studentsList[0];

    if (!targetStudent && !activeStudent) {
      showToast('Please select an enrolled student first.');
      return;
    }

    const studentToLink = targetStudent || activeStudent;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_escort',
          studentId: studentToLink.id,
          fullName: newEscortName.trim(),
          relationship: newEscortRelation,
          phone: newEscortPhone.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.escort) {
        setAuthorizedEscorts((prev) => [data.escort, ...prev]);
        setActiveStudent({
          id: studentToLink.id,
          name: studentToLink.fullName || studentToLink.name,
          class: studentToLink.class || 'Enrolled',
          admissionNo: studentToLink.admissionNo || studentToLink.admissionNumber || '—',
        });
        setActiveEscort(data.escort);
        setIsRegisterOpen(false);
        setNewEscortName('');
        setNewEscortPhone('');
        showToast(`Registered: ${data.escort.fullName} with PIN ${data.escort.pickupPin}`);
      } else {
        showToast(data.message || 'Failed to register authorized escort');
      }
    } catch {
      showToast('Network error while registering escort');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Pickup</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify authorized escorts via 4-digit PIN or student credentials and log departures.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setIsRegisterOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Authorized Person</span>
        </Button>
      </div>

      {/* Primary Verification Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5">
        {/* Search / Scan Bar */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            4-Digit Pickup PIN, Token, or Student Admission Number
          </label>
          <div className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. 4703, OAK-PK-4703, or OAK-2026-938"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold uppercase border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
              />
            </div>
            <button
              type="button"
              onClick={() => handleLookup()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
            >
              Verify
            </button>
          </div>

          {/* Quick verification shortcuts from PostgreSQL records */}
          {authorizedEscorts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="text-[11px] text-slate-400">Authorized passes:</span>
              {authorizedEscorts.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSearchInput(p.pickupPin || p.qrToken);
                    handleLookup(p.pickupPin || p.qrToken);
                  }}
                  className="text-[11px] font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 flex items-center gap-1"
                >
                  <span>{p.fullName}</span>
                  <span className="text-slate-400 font-mono text-[10px]">({p.pickupPin})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Verification Card: Student & Escort */}
        {activeStudent && activeEscort ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-3 border-t border-slate-100 items-start">
            {/* Student Record */}
            <div className="md:col-span-4 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Student Record
              </span>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-800 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {activeStudent.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'ST'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{activeStudent.name}</p>
                  <p className="text-xs text-slate-500">
                    {activeStudent.class} &bull; {activeStudent.admissionNo}
                  </p>
                </div>
              </div>
            </div>

            {/* Escort Verification */}
            <div className="md:col-span-8 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Escort Verification
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Authorized
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-200 text-slate-600 font-bold flex items-center justify-center shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{activeEscort.fullName}</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      {activeEscort.relationship}
                    </p>
                    <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {activeEscort.phone}
                    </p>
                    <p className="text-[10px] text-teal-800 font-mono font-bold mt-1">
                      PIN: {activeEscort.pickupPin}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleClearPickup}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Release Student
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFlagAlert}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Flag Concern
                  </Button>
                </div>
              </div>

              {/* Switch between authorized escorts for this student */}
              {authorizedEscorts.filter(e => e.studentId === activeStudent.id).length > 1 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 mb-2">
                    Authorized Escorts for {activeStudent.name}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {authorizedEscorts
                      .filter((e) => e.studentId === activeStudent.id)
                      .map((escort) => {
                        const isSelected = activeEscort.id === escort.id;
                        return (
                          <button
                            key={escort.id}
                            type="button"
                            onClick={() => setActiveEscort(escort)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{escort.fullName}</span>
                            <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                              ({escort.relationship})
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center border-t border-slate-100 text-slate-400 text-xs">
            Enter 4-digit pickup PIN, pass code, or student admission number above to verify pickup authorization.
          </div>
        )}
      </div>

      {/* Dismissal History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Today&apos;s Pickups</h2>
          <span className="text-xs text-slate-500 font-medium">
            {logs.length} logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Picked Up By</th>
                <th className="py-2.5 px-3">Relationship</th>
                <th className="py-2.5 px-3">Gate Officer</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No pickup logs recorded yet. Verified departures will appear here in chronological order.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const timeStr = new Date(log.pickupTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const isCleared = log.status === 'cleared';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-mono text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {timeStr}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {log.studentName}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{log.studentClass}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {log.pickedUpByName}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{log.relationship}</td>
                      <td className="py-3 px-3 text-slate-500">{log.verifiedByName}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCleared
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isCleared ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                          )}
                          {isCleared ? 'Cleared' : 'Flagged'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Register Authorized Pickup Person
              </h3>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterEscort} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Enrolled Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                >
                  {studentsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName || s.name} ({s.class || 'Enrolled'} &bull; {s.admissionNo || s.admissionNumber})
                    </option>
                  ))}
                  {studentsList.length === 0 && (
                    <option value="">No registered students found</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name of Authorized Person
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chief Emeka Okafor"
                  value={newEscortName}
                  onChange={(e) => setNewEscortName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Relationship
                  </label>
                  <select
                    value={newEscortRelation}
                    onChange={(e) => setNewEscortRelation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Family Driver">Family Driver</option>
                    <option value="Relative">Relative</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 800 000 0000"
                    value={newEscortPhone}
                    onChange={(e) => setNewEscortPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 pt-1">
                A 4-digit pickup PIN will be automatically assigned to this authorized escort in the registry.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
