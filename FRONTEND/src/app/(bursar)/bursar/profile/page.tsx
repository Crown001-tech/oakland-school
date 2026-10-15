'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building,
  Briefcase,
  BadgeCheck,
  Home,
  UserCheck,
  Camera,
  Upload,
} from 'lucide-react';

interface StaffProfile {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  qualification: string;
  avatarUrl?: string;
  passwordChanged: boolean;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
}

export default function BursarProfilePage() {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');

  // Contact form state
  const [contactForm, setContactForm] = useState({
    phone: '',
    emergencyContact: '',
    emergencyPhone: '',
    address: '',
  });
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Password state
  const [passwordState, setPasswordState] = useState({
    newPassword: '',
    confirmPassword: '',
    showNew: false,
    showConfirm: false,
    error: '',
    loading: false,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: base64 }),
        });

        const data = await res.json();
        if (data.success) {
          setProfile((prev) => (prev ? { ...prev, avatarUrl: data.avatarUrl || base64 } : null));
          showToast('Profile photo updated successfully.');
        } else {
          throw new Error(data.message || 'Failed to update photo');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Error uploading profile photo');
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file');
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          throw new Error('Could not load user profile');
        }

        const data = await res.json();
        if (data?.authenticated && data.profile && isMounted) {
          const p = data.profile;
          const staff: StaffProfile = {
            id: p.id || '',
            employeeId: p.employeeId || 'OAK-BUR-001',
            name: p.name || 'Mrs Folake Esther',
            email: p.email || 'folakeesther6@gmail.com',
            phone: p.phone || '',
            role: 'Bursar',
            department: p.department || 'Bursary',
            qualification: p.qualification || 'Accountant',
            avatarUrl: p.avatarUrl || '',
            passwordChanged: Boolean(p.passwordChanged),
            emergencyContact: p.emergencyContact || '',
            emergencyPhone: p.emergencyPhone || '',
            address: p.address || '',
          };

          setProfile(staff);
          setContactForm({
            phone: staff.phone,
            emergencyContact: staff.emergencyContact || '',
            emergencyPhone: staff.emergencyPhone || '',
            address: staff.address || '',
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err?.message || 'Failed to load profile');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContact(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: contactForm.phone,
          emergencyContact: contactForm.emergencyContact,
          emergencyPhone: contactForm.emergencyPhone,
          address: contactForm.address,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Could not save profile changes.');
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              phone: contactForm.phone,
              emergencyContact: contactForm.emergencyContact,
              emergencyPhone: contactForm.emergencyPhone,
              address: contactForm.address,
            }
          : null
      );
      showToast('Contact information saved successfully.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save changes.');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordState((prev) => ({ ...prev, error: '' }));
    setErrorMessage(null);

    if (passwordState.newPassword.length < 6) {
      setPasswordState((prev) => ({
        ...prev,
        error: 'Password must be at least 6 characters long.',
      }));
      return;
    }

    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setPasswordState((prev) => ({
        ...prev,
        error: 'New password and confirmation do not match.',
      }));
      return;
    }

    setPasswordState((prev) => ({ ...prev, loading: true }));

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: passwordState.newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Could not update password.');
      }

      setProfile((prev) => (prev ? { ...prev, passwordChanged: true } : null));
      setPasswordState({
        newPassword: '',
        confirmPassword: '',
        showNew: false,
        showConfirm: false,
        error: '',
        loading: false,
      });
      showToast('Password updated successfully. Your account is secured.');
    } catch (err: any) {
      setPasswordState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to update password.',
      }));
    }
  };

  if (isLoading) {
    return <BrandLoader fullScreen size="lg" />;
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Profile Not Available</h2>
        <p className="text-xs text-slate-500">
          We could not load your profile records. Please refresh the page or sign in again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f3a3e] text-white px-4 py-3 rounded-xl shadow-lg border border-teal-500/30 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-white via-slate-50/70 to-teal-50/30 border border-slate-200/80 p-6 sm:p-8 shadow-xs overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-teal-500/30"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#0f3a3e] text-white flex items-center justify-center font-bold text-xl shadow-md border-2 border-teal-500/30">
                  {profile.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 rounded-2xl bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50"
                title="Upload Profile Photo"
              >
                <Camera className="w-5 h-5 text-white" />
                <span className="text-[9px] font-bold mt-0.5">Upload</span>
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {profile.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                  <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />
                  {profile.role}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Staff ID: <span className="font-semibold text-slate-700">{profile.employeeId}</span> •{' '}
                {profile.department}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-[#0f3a3e] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'security'
                  ? 'bg-[#0f3a3e] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Security</span>
              {!profile.passwordChanged && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'details' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Official Administrative Details (Read-only) */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div>
                <CardTitle>Work Details</CardTitle>
                <CardDescription>Official school appointment records</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Staff Identification
                </span>
                <p className="text-sm font-semibold text-slate-800">{profile.employeeId}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Role
                </span>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  {profile.role}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Department
                </span>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  {profile.department}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Official Email
                </span>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {profile.email}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Account Status
                </span>
                <div className="pt-0.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Active Staff Account
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details (Editable) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Keep your phone number and address up to date
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveContact} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    id="phone"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="e.g. 08093571819"
                    leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
                  />
                  <Input
                    label="Emergency Contact Name"
                    id="emergencyContact"
                    value={contactForm.emergencyContact}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, emergencyContact: e.target.value })
                    }
                    placeholder="e.g. Next of kin name"
                    leftIcon={<UserCheck className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Emergency Contact Phone"
                    id="emergencyPhone"
                    value={contactForm.emergencyPhone}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, emergencyPhone: e.target.value })
                    }
                    placeholder="e.g. 08012345678"
                    leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
                  />
                  <Input
                    label="Residential Address"
                    id="address"
                    value={contactForm.address}
                    onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                    placeholder="e.g. Victoria Island, Lagos"
                    leftIcon={<Home className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSavingContact}
                    size="md"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Security Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Security Status Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div>
                <CardTitle>Security Status</CardTitle>
                <CardDescription>Protection for financial records</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.passwordChanged ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Account Secured</span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    You have changed your default password. Your ledger and transaction records are
                    protected.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Default Password In Use</span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Your account is still using the school default password (<code className="font-mono bg-white px-1.5 py-0.5 rounded text-slate-800">Oakland@2026</code>).
                    Please choose a new password.
                  </p>
                </div>
              )}

              <div className="space-y-2 text-xs text-slate-500 pt-2">
                <p className="font-semibold text-slate-700">Password Requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>At least 6 characters long</li>
                  <li>Do not share your password with anyone</li>
                  <li>Use a combination you can remember</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Enter a new password below to secure your account
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-lg">
                {passwordState.error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{passwordState.error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="newPassword"
                    className="block text-xs font-semibold text-slate-700 tracking-wide uppercase"
                  >
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="newPassword"
                      type={passwordState.showNew ? 'text' : 'password'}
                      value={passwordState.newPassword}
                      onChange={(e) =>
                        setPasswordState({ ...passwordState, newPassword: e.target.value })
                      }
                      placeholder="At least 6 characters"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPasswordState((prev) => ({ ...prev, showNew: !prev.showNew }))
                      }
                      className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {passwordState.showNew ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-semibold text-slate-700 tracking-wide uppercase"
                  >
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="confirmPassword"
                      type={passwordState.showConfirm ? 'text' : 'password'}
                      value={passwordState.confirmPassword}
                      onChange={(e) =>
                        setPasswordState({ ...passwordState, confirmPassword: e.target.value })
                      }
                      placeholder="Re-type new password"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPasswordState((prev) => ({ ...prev, showConfirm: !prev.showConfirm }))
                      }
                      className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {passwordState.showConfirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={passwordState.loading}
                    size="md"
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
