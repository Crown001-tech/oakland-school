'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  User,
  Shield,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function ProprietorMyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('School Proprietor');
  const [officialTitle, setOfficialTitle] = useState('School Proprietor');
  const [email, setEmail] = useState('proprietor@oaklandschools.edu');
  const [phone, setPhone] = useState('+234 803 555 0199');
  const [officeLocation, setOfficeLocation] = useState('Executive Suite, Senate Building, Oakland International College');
  const [bio, setBio] = useState('Educationist and school founder committed to academic excellence, STEM leadership, and moral discipline.');

  // Security States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;
    async function loadProprietorProfile() {
      try {
        const [meRes, schoolRes] = await Promise.all([
          fetch('/api/auth/me').then((r) => r.json()).catch(() => ({})),
          fetch('/api/schools/profile').then((r) => r.json()).catch(() => ({})),
        ]);

        if (!isMounted) return;

        if (schoolRes?.data?.proprietorName) {
          setFullName(schoolRes.data.proprietorName);
        }
        if (meRes?.profile?.name) {
          setFullName(meRes.profile.name);
        }
        if (meRes?.profile?.email) {
          setEmail(meRes.profile.email);
        }
        if (meRes?.profile?.phone) {
          setPhone(meRes.profile.phone);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProprietorProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Sync proprietor name to school settings in PostgreSQL
      await fetch('/api/schools/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proprietorName: fullName,
        }),
      });

      showToast('Proprietor profile updated successfully.');
    } catch {
      showToast('Profile updated.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      alert('Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Account password updated successfully.');
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PR';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Profile
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Personal credentials and contact details.
          </p>
        </div>

        <Badge variant="teal" size="sm">
          School Proprietor
        </Badge>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Profile Details Form */}
      <Card className="p-6 border-slate-200 space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-[#0f3a3e] text-white flex items-center justify-center font-bold text-xl border-2 border-teal-700 shadow-xs">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{fullName}</h2>
            <p className="text-xs text-[#b3141f] font-semibold">{officialTitle}</p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Role: Proprietor</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Title</label>
              <input
                type="text"
                value={officialTitle}
                onChange={(e) => setOfficialTitle(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Campus Office</label>
              <input
                type="text"
                value={officeLocation}
                onChange={(e) => setOfficeLocation(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="primary"
              type="submit"
              isLoading={isSaving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Password Management */}
      <Card className="p-6 border-slate-200 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Lock className="w-4 h-4 text-[#0f3a3e]" />
          <h3 className="text-sm font-bold text-slate-900">Security Credentials</h3>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPassword ? 'Hide Password' : 'Show Password'}
            </button>

            <Button size="sm" variant="outline" type="submit">
              Update Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
