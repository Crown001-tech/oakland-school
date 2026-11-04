'use client';
import { SchoolName, PrincipalName } from '@/components/common/SchoolName';

import React, { useState } from 'react';
import { useActiveChild } from '@/context/ParentContext';
import { ParentMessagePreferences } from '@/components/messaging/ParentMessagePreferences';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Users,
  ShieldCheck,
} from 'lucide-react';

export default function ParentProfilePage() {
  const { parent, childrenList } = useActiveChild();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const cleanPass = newPassword.trim();
    if (cleanPass.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setMessage({ type: 'error', text: 'Passwords do not match. Please verify both fields.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword: cleanPass }),
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        setMessage({ type: 'success', text: 'Account password updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update password.' });
      }
    } catch {
      setIsSubmitting(false);
      setMessage({ type: 'error', text: 'Network connection error. Please try again.' });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-7">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          Guardian Profile
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Personal contact details, enrolled dependents, and portal authentication
        </p>
      </div>

      {/* Main Profile Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary text-amber-300 font-bold text-xl flex items-center justify-center shrink-0 border border-amber-500/20">
            {parent?.name?.charAt(0) || 'G'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {parent?.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Relationship: <strong className="text-slate-700">{parent?.relationship || 'Guardian'}</strong> &bull; <SchoolName /> Parent
            </p>
          </div>
        </div>

        {/* Contact Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Official Registered Email
            </span>
            <div className="flex items-center gap-2 font-medium text-slate-800">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{parent?.email || '—'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Primary Telephone
            </span>
            <div className="flex items-center gap-2 font-medium text-slate-800">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{parent?.phone || '—'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Alternate Phone
            </span>
            <div className="flex items-center gap-2 font-medium text-slate-800">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{parent?.altPhone || '—'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Occupation
            </span>
            <div className="flex items-center gap-2 font-medium text-slate-800">
              <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{parent?.occupation || '—'}</span>
            </div>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Residential Address
            </span>
            <div className="flex items-center gap-2 font-medium text-slate-800">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{parent?.address || 'On File with Administration'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enrolled Dependents Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Users className="w-4 h-4 text-brand-primary" />
          <h2 className="text-sm font-bold text-slate-900">
            Linked Students ({childrenList.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {childrenList.map((kid) => (
            <div
              key={kid.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-900">{kid.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Class: <strong>{kid.currentClass}</strong> &bull; No: <span className="font-mono">{kid.admissionNumber}</span>
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-bold">
                Enrolled
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Password Change */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Lock className="w-4 h-4 text-brand-primary" />
          <h2 className="text-sm font-bold text-slate-900">
            Account Password
          </h2>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Current Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full text-xs h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                New Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-brand-primary hover:text-brand-accent font-semibold inline-flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-xs h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-xs h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      <ParentMessagePreferences />

      {/* Logout Session Card */}
      <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 flex items-center justify-between">
        <div className="text-xs">
          <p className="font-bold text-slate-800">Active Guardian Session</p>
          <p className="text-slate-500 text-[11px]">End access to this device securely</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="px-3.5 py-2 min-h-[44px] rounded-xl bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 text-xs font-bold border border-rose-200 transition flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
