'use client';
import { SchoolName, PrincipalName } from '@/components/common/SchoolName';

import React, { useState } from 'react';
import { useStudent } from '@/context/StudentContext';
import {
  User,
  Shield,
  KeyRound,
  GraduationCap,
  Users,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  Mail,
  HeartHandshake,
} from 'lucide-react';

export default function StudentProfilePage() {
  const { student, refresh } = useStudent();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.message || 'Failed to update password.' });
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await refresh();
      }
    } catch {
      setMessage({ type: 'error', text: 'Network communication error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          Student Profile
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Personal details and account security
        </p>
      </div>

      {/* Main Student Identification Hero */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary text-amber-300 border border-amber-500/20 font-bold flex items-center justify-center text-2xl shadow-xs shrink-0">
            {student?.name?.charAt(0) || 'S'}
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">{student?.name || 'Enrolled Student'}</h2>
            <p className="text-xs text-slate-500">
              Admission Number: <span className="font-mono text-slate-800 font-semibold">{student?.admissionNumber || '—'}</span>
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Enrolled Student
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                Class: {student?.currentClass || '—'}
              </span>
              {student?.department && (
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Department: {student.department}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 space-y-1 sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-auto">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
            Academic Session
          </span>
          <p className="font-bold text-slate-900 text-sm">2026/2027</p>
          <p className="text-slate-500"><SchoolName /></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Demographics & Guardians (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Demographics */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2.5 bg-slate-50/50">
              <User className="w-4 h-4 text-brand-primary" />
              <h3 className="font-bold text-sm text-slate-900">Personal Details</h3>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  First Name
                </span>
                <p className="font-semibold text-slate-800 mt-1">{student?.firstName || '—'}</p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Last Name
                </span>
                <p className="font-semibold text-slate-800 mt-1">{student?.lastName || '—'}</p>
              </div>

              {student?.middleName && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Middle Name
                  </span>
                  <p className="font-semibold text-slate-800 mt-1">{student.middleName}</p>
                </div>
              )}

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Gender
                </span>
                <p className="font-semibold text-slate-800 mt-1 capitalize">{student?.gender || '—'}</p>
              </div>

              {student?.department && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Department
                  </span>
                  <p className="font-semibold text-slate-800 mt-1">{student.department}</p>
                </div>
              )}

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Date of Birth
                </span>
                <p className="font-semibold text-slate-800 mt-1">
                  {student?.dob ? new Date(student.dob).toLocaleDateString() : '—'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Blood Group
                </span>
                <p className="font-semibold text-slate-800 mt-1">{student?.bloodGroup || '—'}</p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Residential Address
                </span>
                <p className="font-semibold text-slate-800 mt-1">{student?.address || '—'}</p>
              </div>
            </div>
          </div>

          {/* Linked Guardians */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <HeartHandshake className="w-4 h-4 text-brand-primary" />
                <h3 className="font-bold text-sm text-slate-900">Linked Guardians</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Authorized emergency contacts</span>
            </div>

            <div className="p-6">
              {student?.guardians && student.guardians.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {student.guardians.map((guardian, idx) => (
                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm">{guardian.name}</p>
                          {guardian.isPrimary && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                              Primary Guardian
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 capitalize">Relationship: {guardian.relationship}</p>
                      </div>

                      <div className="flex flex-col sm:items-end gap-1 text-slate-600">
                        {guardian.phone && (
                          <div className="inline-flex items-center gap-1.5 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{guardian.phone}</span>
                          </div>
                        )}
                        {guardian.email && (
                          <div className="inline-flex items-center gap-1.5 text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{guardian.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No linked guardian records registered in the system.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Security & Password Update */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2.5 bg-slate-50/50">
              <KeyRound className="w-4 h-4 text-brand-primary" />
              <h3 className="font-bold text-sm text-slate-900">Change Password</h3>
            </div>

            <form onSubmit={handlePasswordChange} className="p-6 space-y-4 text-xs">
              {message && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Current Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Must be at least 6 characters
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 min-h-[44px] rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white font-semibold text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Quick Notice Card */}
          <div className="p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/15 text-xs space-y-2">
            <div className="flex items-center gap-2 text-brand-primary font-bold">
              <Shield className="w-4 h-4 text-brand-primary shrink-0" />
              <span>Account Security</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Keep your login details safe. If you have any issues with your account, let your class teacher know.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
