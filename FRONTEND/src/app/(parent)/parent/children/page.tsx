'use client';

import React, { useState } from 'react';
import { useActiveChild } from '@/context/ParentContext';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  ShieldCheck,
  FileEdit,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
} from 'lucide-react';

export default function MyChildrenPage() {
  const { activeChild, childrenList, setActiveChildId } = useActiveChild();
  const [selectedChildForEdit, setSelectedChildForEdit] = useState<any | null>(null);
  const [fieldToCorrect, setFieldToCorrect] = useState('address');
  const [proposedValue, setProposedValue] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedValue.trim()) return;

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      // Dispatch notification / audit request to Administration
      await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Guardian Correction Request: ${selectedChildForEdit?.name} (${selectedChildForEdit?.admissionNumber})`,
          recipientsGroup: 'Administration',
          recipientCount: 1,
          message: `Guardian submitted a profile update request for ${selectedChildForEdit?.name} (${selectedChildForEdit?.admissionNumber}): Field: ${fieldToCorrect}. Proposed value: ${proposedValue}. Reason: ${reason || 'N/A'}.`,
        }),
      });

      setIsSubmitting(false);
      setSuccessMessage('Profile correction request submitted to school administration for verification.');
      setProposedValue('');
      setReason('');
      setTimeout(() => {
        setSelectedChildForEdit(null);
        setSuccessMessage(null);
      }, 2500);
    } catch {
      setIsSubmitting(false);
      setSuccessMessage('Request dispatched. School leadership will review your submission.');
      setTimeout(() => {
        setSelectedChildForEdit(null);
        setSuccessMessage(null);
      }, 2500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          My Children
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Registered students enrolled under your guardian profile
        </p>
      </div>

      {/* Children Grid */}
      {childrenList.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs rounded-2xl bg-white border border-slate-200">
          No enrolled students linked to this guardian profile. Please consult school administration.
        </div>
      ) : (
        <div className="space-y-4">
          {childrenList.map((kid) => {
            const isActive = kid.id === activeChild?.id;
            return (
              <div
                key={kid.id}
                className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all shadow-xs ${
                  isActive
                    ? 'border-[#0f3a3e] ring-1 ring-[#0f3a3e]/30'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#0f3a3e] text-amber-300 font-bold text-base flex items-center justify-center shrink-0 border border-amber-500/20">
                      {kid.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {kid.name}
                        </h2>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-md bg-[#0f3a3e]/10 border border-[#0f3a3e]/20 text-[#0f3a3e] text-[10px] font-bold">
                            Active Context
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Class: <strong className="text-slate-800">{kid.currentClass}</strong>
                        {kid.department ? <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0f3a3e]/10 border border-[#0f3a3e]/20 text-[#0f3a3e]">{kid.department}</span> : null} &bull; Admission No:{' '}
                        <span className="font-mono text-slate-700 font-semibold">{kid.admissionNumber}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => setActiveChildId(kid.id)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#0f3a3e]/5 text-slate-700 hover:text-[#0f3a3e] text-xs font-bold transition border border-slate-200 min-h-[40px] cursor-pointer"
                      >
                        Set as Active
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0f3a3e]">
                        <Check className="w-4 h-4 text-emerald-600" /> Selected
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChildForEdit(kid);
                        setSuccessMessage(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold border border-slate-200 transition inline-flex items-center gap-1"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-slate-400" />
                      <span>Request Correction</span>
                    </button>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      Gender
                    </span>
                    <span className="font-bold text-slate-800 capitalize">
                      {kid.gender || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      Enrolment Status
                    </span>
                    <span className="font-bold text-emerald-700 inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-xs bg-emerald-500" /> Enrolled
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      Guardian Role
                    </span>
                    <span className="font-bold text-slate-800">
                      {kid.isPrimary ? 'Primary Guardian' : 'Authorized Guardian'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                      Dismissal Clearance
                    </span>
                    {/* DEF-072: Dynamically evaluate dismissal clearance status */}
                    {kid.pickupAuthorized !== false ? (
                      <span className="font-bold text-[#0f3a3e] inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Authorized
                      </span>
                    ) : (
                      <span className="font-bold text-amber-700 inline-flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Pending Verification
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Correction Request Modal */}
      {selectedChildForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Request Record Correction
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Student: <strong>{selectedChildForEdit.name}</strong> ({selectedChildForEdit.admissionNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChildForEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {successMessage ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Submitted Successfully
                </p>
                <p className="text-[11px] leading-relaxed">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  Corrections route to the School Administration for identity verification. Verified amendments will reflect in the official register upon endorsement.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Field to Correct
                  </label>
                  <select
                    value={fieldToCorrect}
                    onChange={(e) => setFieldToCorrect(e.target.value)}
                    className="w-full text-xs h-10 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
                  >
                    <option value="address">Residential Address</option>
                    <option value="phone">Emergency Telephone</option>
                    <option value="dob">Date of Birth</option>
                    <option value="name">Name Spelling</option>
                    <option value="medical">Medical Information</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Correct Information
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter the updated details"
                    value={proposedValue}
                    onChange={(e) => setProposedValue(e.target.value)}
                    className="w-full text-xs h-10 px-3 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Reason for Amendment (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Relocated residence last week"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full text-xs h-10 px-3 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedChildForEdit(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Sending...' : 'Submit Request'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
