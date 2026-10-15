'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  User,
  GraduationCap,
  BookOpen,
  Clock,
  Mail,
  Phone,
  CheckCircle2,
  Printer,
  Edit3,
  Save,
  CreditCard,
  School,
  X,
  AlertCircle,
  Camera,
  Key,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  MapPin,
  Lock,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface StaffRecord {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  assignedClass?: string;
  assignedClasses?: string[];
  subjects?: string[];
  department?: string;
  qualification?: string;
  avatarUrl?: string;
  passwordChanged?: boolean;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  bankName?: string;
  accountNumber?: string;
}

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState<StaffRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'classes' | 'payroll'>('overview');
  
  // Modals and form states
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    phone: '',
    qualification: '',
    emergencyContact: '',
    emergencyPhone: '',
    address: '',
  });

  // Password change tab state
  const [passwordState, setPasswordState] = useState({
    newPassword: '',
    confirmPassword: '',
    showNew: false,
    showConfirm: false,
    error: '',
    loading: false,
  });

  // Setup modal state
  const [setupState, setSetupState] = useState({
    newPassword: '',
    confirmPassword: '',
    phone: '',
    qualification: '',
    emergencyContact: '',
    emergencyPhone: '',
    showPassword: false,
    error: '',
    loading: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      let homeroom: string | undefined = undefined;
      let teachingClasses: string[] = [];

      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.authenticated && meData.profile) {
            const p = meData.profile;
            homeroom = p.assignedClass || undefined;
            const assignments = p.teachingAssignments || [];
            
            const classesFromAssign = assignments.flatMap((ta: any) => ta.classes || []);
            const allAssignedClasses = Array.from(new Set([
              ...(homeroom ? [homeroom] : []),
              ...classesFromAssign,
            ])).filter(Boolean) as string[];

            teachingClasses = allAssignedClasses;

            let distinctSubjects = Array.from(new Set(assignments.map((ta: any) => ta.subject))).filter(Boolean) as string[];
            if (distinctSubjects.length === 0 && Array.isArray(p.subjects)) {
              distinctSubjects = p.subjects;
            }

            const staffObj: StaffRecord = {
              id: p.id || '',
              employeeId: p.employeeId || '—',
              name: p.name || 'Educator',
              email: p.email || '',
              phone: p.phone || '',
              role: homeroom ? 'Class Teacher' : 'Subject Teacher',
              assignedClass: homeroom,
              assignedClasses: allAssignedClasses,
              department: p.department || 'Academics',
              subjects: distinctSubjects,
              qualification: p.qualification || '',
              avatarUrl: p.avatarUrl || '',
              passwordChanged: p.passwordChanged ?? false,
              emergencyContact: p.emergencyContact || '',
              emergencyPhone: p.emergencyPhone || '',
              address: p.address || '',
              bankName: p.bankName || '',
              accountNumber: p.accountNumber || '',
            };

            if (isMounted) {
              setProfile(staffObj);
              setEditForm({
                phone: staffObj.phone,
                qualification: staffObj.qualification || '',
                emergencyContact: staffObj.emergencyContact || '',
                emergencyPhone: staffObj.emergencyPhone || '',
                address: staffObj.address || '',
              });

              setSetupState((prev) => ({
                ...prev,
                phone: staffObj.phone,
                qualification: staffObj.qualification || '',
                emergencyContact: staffObj.emergencyContact || '',
                emergencyPhone: staffObj.emergencyPhone || '',
              }));

              // Trigger onboarding modal if profile needs initial completion and not dismissed in session
              const dismissed = typeof window !== 'undefined' ? sessionStorage.getItem('oakland_setup_modal_dismissed') : null;
              const needsCompletion = !staffObj.passwordChanged || !staffObj.qualification || !staffObj.emergencyContact;
              if (needsCompletion && !dismissed) {
                setShowSetupModal(true);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }

      try {
        const stRes = await fetch('/api/students');
        if (stRes.ok) {
          const stData = await stRes.json();
          if (stData?.success && Array.isArray(stData.data)) {
            if (isMounted) {
              if (homeroom) {
                const homePupils = stData.data.filter((s: any) => s.class === homeroom);
                setStudentCount(homePupils.length);
              } else {
                const teachingSet = new Set(teachingClasses);
                const assignedPupils = stData.data.filter((s: any) => teachingSet.has(s.class));
                setStudentCount(assignedPupils.length);
              }
            }
          }
        }
      } catch {}
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Photo Upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Image file size must be under 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setIsUploadingPhoto(true);
      try {
        const res = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: base64Data }),
        });

        if (res.ok) {
          const data = await res.json();
          const finalUrl = data.avatarUrl || base64Data;
          setProfile((prev) => (prev ? { ...prev, avatarUrl: finalUrl } : null));
          showToast('Profile photo updated successfully.');
        } else {
          alert('Could not update profile photo. Please try again.');
        }
      } catch {
        alert('Failed to upload photo.');
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle In-Place Profile Save
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                phone: editForm.phone,
                qualification: editForm.qualification,
                emergencyContact: editForm.emergencyContact,
                emergencyPhone: editForm.emergencyPhone,
                address: editForm.address,
              }
            : null
        );
        setIsEditing(false);
        showToast('Profile information saved successfully.');
      } else {
        alert('Failed to save profile changes.');
      }
    } catch {
      alert('Network error while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Password Change in Security Tab
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordState((prev) => ({ ...prev, error: '' }));

    if (passwordState.newPassword.length < 6) {
      setPasswordState((prev) => ({ ...prev, error: 'Password must be at least 6 characters long.' }));
      return;
    }

    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setPasswordState((prev) => ({ ...prev, error: 'New password and confirmation do not match.' }));
      return;
    }

    setPasswordState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: passwordState.newPassword }),
      });

      if (res.ok) {
        setProfile((prev) => (prev ? { ...prev, passwordChanged: true } : null));
        setPasswordState({
          newPassword: '',
          confirmPassword: '',
          showNew: false,
          showConfirm: false,
          error: '',
          loading: false,
        });
        showToast('Password changed successfully. Your account is secured.');
      } else {
        const data = await res.json();
        setPasswordState((prev) => ({
          ...prev,
          loading: false,
          error: data.message || 'Failed to update password.',
        }));
      }
    } catch {
      setPasswordState((prev) => ({
        ...prev,
        loading: false,
        error: 'Network error while updating password.',
      }));
    }
  };

  // Handle Onboarding Setup Modal Submission
  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupState((prev) => ({ ...prev, error: '' }));

    if (!setupState.newPassword || setupState.newPassword.length < 6) {
      setSetupState((prev) => ({ ...prev, error: 'Please choose a personal password with at least 6 characters.' }));
      return;
    }

    if (setupState.newPassword !== setupState.confirmPassword) {
      setSetupState((prev) => ({ ...prev, error: 'Password and confirmation do not match.' }));
      return;
    }

    if (!setupState.qualification.trim()) {
      setSetupState((prev) => ({ ...prev, error: 'Please specify your highest academic qualification.' }));
      return;
    }

    setSetupState((prev) => ({ ...prev, loading: true }));
    try {
      const payload: Record<string, any> = {
        newPassword: setupState.newPassword,
        phone: setupState.phone,
        qualification: setupState.qualification,
        emergencyContact: setupState.emergencyContact,
        emergencyPhone: setupState.emergencyPhone,
      };

      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                passwordChanged: true,
                phone: setupState.phone,
                qualification: setupState.qualification,
                emergencyContact: setupState.emergencyContact,
                emergencyPhone: setupState.emergencyPhone,
              }
            : null
        );
        setShowSetupModal(false);
        sessionStorage.setItem('oakland_setup_modal_dismissed', 'true');
        showToast('Account setup complete! Password and profile secured.');
      } else {
        const data = await res.json();
        setSetupState((prev) => ({
          ...prev,
          loading: false,
          error: data.message || 'Failed to complete setup.',
        }));
      }
    } catch {
      setSetupState((prev) => ({
        ...prev,
        loading: false,
        error: 'Network error while completing setup.',
      }));
    }
  };

  const handleDismissModal = () => {
    setShowSetupModal(false);
    sessionStorage.setItem('oakland_setup_modal_dismissed', 'true');
  };

  if (isLoading || !profile) {
    return <BrandLoader fullScreen size="lg" />;
  }

  const isClassTeacher = profile.role === 'Class Teacher';
  const currentDateFormatted = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      {/* GLOBAL PRINT STYLES */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          .screen-view {
            display: none !important;
          }
          .print-view {
            display: block !important;
          }
        }
        @media screen {
          .print-view {
            display: none !important;
          }
        }
      `}</style>

      {/* =========================================================================
          PRINT-ONLY OFFICIAL FACULTY CREDENTIAL SHEET
         ========================================================================= */}
      <div className="print-view p-4 max-w-4xl mx-auto font-sans bg-white text-slate-900">
        {/* Letterhead */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-300 relative">
              <Image src="/logo.jpg" alt="Oakland Schools Logo" fill className="object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">Oakland Schools</h1>
              <p className="text-xs text-slate-600 font-medium">Faculty Credential and Institutional Profile Record</p>
              <p className="text-[10px] text-slate-500">2026/2027 Academic Session &bull; First Term</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Issue</span>
            <span className="text-xs font-mono font-bold text-slate-900">{currentDateFormatted}</span>
          </div>
        </div>

        {/* Staff Overview Box */}
        <div className="grid grid-cols-4 gap-6 py-6 border-b border-slate-200">
          <div className="col-span-1">
            <div className="w-32 h-36 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50 relative">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-2">
                  <User className="w-10 h-10 mx-auto text-slate-400 mb-1" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Official Passport</span>
                </div>
              )}
            </div>
          </div>

          <div className="col-span-3 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Full Name</span>
                <span className="text-base font-bold text-slate-900">{profile.name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Staff Employee ID</span>
                <span className="text-base font-mono font-bold text-slate-900">{profile.employeeId}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Designation / Role</span>
                <span className="text-sm font-semibold text-slate-900">{profile.role}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned Homeroom</span>
                <span className="text-sm font-semibold text-slate-900">{profile.assignedClass || '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Institutional Email</span>
                <span className="text-xs font-mono text-slate-800">{profile.email}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Telephone Number</span>
                <span className="text-xs font-mono text-slate-800">{profile.phone || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Qualifications & Next of Kin */}
        <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-200">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-100 pb-1">
              Academic Standing
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Highest Qualification:</span>
                <span className="font-semibold text-slate-900">{profile.qualification || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Department:</span>
                <span className="font-semibold text-slate-900">{profile.department || 'Academics'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Residential Address:</span>
                <span className="text-slate-800">{profile.address || '—'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 border-b border-slate-100 pb-1">
              Next of Kin Record
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Contact Person:</span>
                <span className="font-semibold text-slate-900">{profile.emergencyContact || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Emergency Phone:</span>
                <span className="font-mono text-slate-900">{profile.emergencyPhone || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Teaching Remit */}
        <div className="py-6 border-b border-slate-200 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
            Instructional Remit
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500 block text-[11px]">Assigned Teaching Classes:</span>
              <span className="font-semibold text-slate-900">
                {profile.assignedClasses && profile.assignedClasses.length > 0
                  ? profile.assignedClasses.join(', ')
                  : profile.assignedClass || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Specialist Subjects:</span>
              <span className="font-semibold text-slate-900">
                {profile.subjects && profile.subjects.length > 0 ? profile.subjects.join(', ') : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Signature & Seal Block */}
        <div className="pt-8 flex items-end justify-between">
          <div className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
            This document constitutes an official internal faculty record of Oakland Schools. Any alterations render this document invalid.
          </div>
          <div className="text-center w-60">
            <div className="border-b border-slate-900 pb-1 mb-1">
              <span className="font-serif italic text-base text-slate-800 font-bold">Mr Seyi Bankole</span>
            </div>
            <p className="text-xs font-bold text-slate-900">Head of School / Principal</p>
            <p className="text-[10px] text-slate-500">Oakland Schools</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCREEN-ONLY INTERACTIVE INTERFACE
         ========================================================================= */}
      <div className="screen-view space-y-6 max-w-5xl mx-auto pb-16">
        {/* Hidden File Input for Avatar Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold animate-in fade-in duration-200 border border-white/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Profile</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal credentials, security settings, and institutional teaching assignments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Profile</span>
            </Button>
            <Link href="/teacher/timetable">
              <Button
                type="button"
                size="sm"
                className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Teaching Timetable</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Card */}
        <div className="rounded-3xl bg-[#0a1b1d] border border-white/10 text-white p-6 sm:p-7 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Avatar with Upload Capability */}
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 border-2 border-teal-500/30 flex items-center justify-center font-bold text-2xl text-teal-200 shadow-inner">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>
                      {profile.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-[10px] text-white font-medium">
                  <Camera className="w-4 h-4 text-teal-300" />
                  <span>{isUploadingPhoto ? 'Uploading...' : 'Change'}</span>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                    {profile.employeeId}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200">
                    {profile.role}
                  </span>
                  {isClassTeacher && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Homeroom: {profile.assignedClass}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5">{profile.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>{profile.email}</span>
                  <span>&bull;</span>
                  <span>{profile.department || 'Academics'}</span>
                </p>
              </div>
            </div>

            {/* Security Indicator Pill */}
            <div className="flex sm:flex-col items-end gap-2 w-full sm:w-auto">
              {profile.passwordChanged ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Account Secured</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowSetupModal(true)}
                  className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Setup Pending &bull; Fix Now</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clean Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-2 rounded-2xl shadow-xs overflow-x-auto">
          {[
            { id: 'overview', label: 'Profile Details', icon: User },
            { id: 'security', label: 'Security and Password', icon: Key },
            { id: 'classes', label: 'Teaching Remit', icon: BookOpen },
            { id: 'payroll', label: 'Compensation', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#0f3a3e] text-[#0f3a3e]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ==========================================
            TAB 1: PROFILE DETAILS
           ========================================== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Academic Standing */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#0f3a3e]" />
                  Academic Qualification
                </CardTitle>
                {!isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="h-7 text-[11px] px-2.5 text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Highest Academic Qualification
                      </label>
                      <Input
                        value={editForm.qualification}
                        onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                        placeholder="e.g. B.Ed Mathematics, M.Sc Education"
                        className="h-8 text-xs bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Residential Address
                      </label>
                      <Input
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        placeholder="Residential address"
                        className="h-8 text-xs bg-slate-50"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Highest Degree / Qualification</span>
                      <span className="font-semibold text-slate-900 mt-0.5 block">
                        {profile.qualification || <span className="text-slate-400 italic">Not entered yet</span>}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">Department</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{profile.department || 'Academics'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">Residential Address</span>
                      <span className="text-slate-800 mt-0.5 block">
                        {profile.address || <span className="text-slate-400 italic">Not provided</span>}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contact & Next of Kin */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#0f3a3e]" />
                  Contact and Next of Kin
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Telephone Number
                      </label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="+234..."
                        className="h-8 text-xs bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Next of Kin (Full Name)
                      </label>
                      <Input
                        value={editForm.emergencyContact}
                        onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                        placeholder="Full Name"
                        className="h-8 text-xs bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Next of Kin Phone
                      </label>
                      <Input
                        value={editForm.emergencyPhone}
                        onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                        placeholder="+234..."
                        className="h-8 text-xs bg-slate-50"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold h-7 px-3 flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="text-xs h-7 px-3 cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Telephone</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">{profile.phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Official Email</span>
                        <span className="font-mono text-slate-800 mt-0.5 block truncate">{profile.email}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">Next of Kin</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {profile.emergencyContact || <span className="text-slate-400 italic">Not recorded</span>}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] block">Next of Kin Phone</span>
                      <span className="font-mono text-slate-800 mt-0.5 block">
                        {profile.emergencyPhone || <span className="text-slate-400 italic">Not recorded</span>}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==========================================
            TAB 2: SECURITY & PASSWORD
           ========================================== */}
        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto">
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#0f3a3e]" />
                  Change Staff Password
                </CardTitle>
                <CardDescription className="text-xs">
                  Update your authentication credentials to safeguard access to academic records.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordState.error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{passwordState.error}</span>
                    </div>
                  )}

                  {!profile.passwordChanged && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>You are currently using the default staff password (Oakland@2026). Please change it now.</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={passwordState.showNew ? 'text' : 'password'}
                        value={passwordState.newPassword}
                        onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                        placeholder="At least 6 characters"
                        className="text-xs pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordState({ ...passwordState, showNew: !passwordState.showNew })}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {passwordState.showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={passwordState.showConfirm ? 'text' : 'password'}
                        value={passwordState.confirmPassword}
                        onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                        placeholder="Re-enter new password"
                        className="text-xs pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordState({ ...passwordState, showConfirm: !passwordState.showConfirm })}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {passwordState.showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={passwordState.loading}
                      className="w-full bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold py-2.5 cursor-pointer shadow-xs"
                    >
                      {passwordState.loading ? 'Updating Password...' : 'Save New Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==========================================
            TAB 3: TEACHING REMIT
           ========================================== */}
        {activeTab === 'classes' && (
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <School className="w-4 h-4 text-[#0f3a3e]" />
                Instructional Remit
              </CardTitle>
              <CardDescription className="text-xs">
                Assigned homeroom responsibility and curriculum subjects.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              {isClassTeacher && (
                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
                    Homeroom Class Appointment
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-1">
                    Class Teacher for {profile.assignedClass}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Authorized for morning attendance, student records, and report cards.
                  </p>
                </div>
              )}

              <div>
                <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block mb-2">
                  Specialist Teaching Subjects
                </span>
                <div className="flex flex-wrap gap-2">
                  {profile.subjects && profile.subjects.length > 0 ? (
                    profile.subjects.map((sub) => (
                      <span
                        key={sub}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200 flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                        {sub}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No specialist subjects assigned.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==========================================
            TAB 4: COMPENSATION
           ========================================== */}
        {activeTab === 'payroll' && (
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0f3a3e]" />
                Compensation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Remuneration Grade</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {isClassTeacher ? 'Faculty Grade (Homeroom Allowance Included)' : 'Faculty Grade (Standard)'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Disbursed monthly via Oakland Bursary</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Disbursement Bank Record</span>
                  {profile.bankName && profile.accountNumber ? (
                    <div>
                      <span className="font-bold text-slate-900 mt-1 block">{profile.bankName}</span>
                      <span className="font-mono text-slate-700 mt-0.5 block">{profile.accountNumber}</span>
                    </div>
                  ) : (
                    <p className="text-slate-500 mt-1">
                      No bank account on file. Provide your Nigerian account details to the Bursary.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* =========================================================================
          24-HOUR ONBOARDING & SECURITY POPUP MODAL
         ========================================================================= */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0a1b1d] p-6 text-white relative">
              <button
                type="button"
                onClick={handleDismissModal}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Action Required &bull; 24 Hours
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">Complete Staff Profile and Security</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Welcome to Oakland Schools. To safeguard academic records, please set a personal password and update your details.
              </p>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCompleteSetup} className="p-6 space-y-4">
              {setupState.error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{setupState.error}</span>
                </div>
              )}

              {/* Password Section */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-teal-700" />
                    Set Personal Password
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Replaces Oakland@2026</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">New Password</label>
                    <Input
                      type={setupState.showPassword ? 'text' : 'password'}
                      value={setupState.newPassword}
                      onChange={(e) => setSetupState({ ...setupState, newPassword: e.target.value })}
                      placeholder="Min 6 characters"
                      className="text-xs bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Confirm Password</label>
                    <Input
                      type={setupState.showPassword ? 'text' : 'password'}
                      value={setupState.confirmPassword}
                      onChange={(e) => setSetupState({ ...setupState, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                      className="text-xs bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Profile Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Highest Academic Qualification
                  </label>
                  <Input
                    value={setupState.qualification}
                    onChange={(e) => setSetupState({ ...setupState, qualification: e.target.value })}
                    placeholder="e.g. B.Ed English, B.Sc Mathematics"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Next of Kin Name</label>
                    <Input
                      value={setupState.emergencyContact}
                      onChange={(e) => setSetupState({ ...setupState, emergencyContact: e.target.value })}
                      placeholder="Full Name"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Next of Kin Phone</label>
                    <Input
                      value={setupState.emergencyPhone}
                      onChange={(e) => setSetupState({ ...setupState, emergencyPhone: e.target.value })}
                      placeholder="+234..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDismissModal}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer px-2 py-1"
                >
                  Remind Me Later
                </button>
                <Button
                  type="submit"
                  disabled={setupState.loading}
                  className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold px-4 py-2 cursor-pointer shadow-xs"
                >
                  {setupState.loading ? 'Saving Setup...' : 'Save and Secure Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
