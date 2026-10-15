'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Shield,
  UserCheck,
  Mail,
  Phone,
  CheckCircle2,
  Send,
  Plus,
  Copy,
  Check,
  Search,
  Users,
  X,
  AlertCircle,
  Key,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Landmark,
  GraduationCap,
  Briefcase,
  Upload,
  Edit3,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { BulkImportModal } from '@/components/common/BulkImportModal';
import { EditStaffModal } from '@/components/common/EditStaffModal';
import {
  getRegisteredCurriculumSubjectNames,
  filterValidCurriculumSubjects,
} from '@/lib/curriculum-data';

interface ExecutiveData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  appointedAt: string;
  status: 'Active' | 'Pending Verification';
  role: 'Principal' | 'Bursar';
  employeeId: string;
}

interface StaffSummary {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  assignedClass?: string;
  qualification?: string;
  department?: string;
  status: string;
  password?: string;
}

export default function ProprietorStaffManagementPage() {
  const [principal, setPrincipal] = useState<ExecutiveData | null>(null);
  const [bursar, setBursar] = useState<ExecutiveData | null>(null);
  const [staffList, setStaffList] = useState<StaffSummary[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffSummary | null>(null);

  // Executive Appointment Modal
  const [isAppointModalOpen, setIsAppointModalOpen] = useState(false);
  const [appointRole, setAppointRole] = useState<'principal' | 'bursar'>('principal');
  const [execName, setExecName] = useState('');
  const [execEmail, setExecEmail] = useState('');
  const [execPhone, setExecPhone] = useState('');
  const [passwordMode, setPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Slip Modal (Credentials display only — no dashboard shortcut button)
  const [successSlip, setSuccessSlip] = useState<{
    roleTitle: string;
    fullName: string;
    employeeId: string;
    email: string;
    password: string;
    emailStatus: 'sent' | 'smtp_error';
    errorMessage?: string;
  } | null>(null);
  const [copiedSlip, setCopiedSlip] = useState(false);

  // Staff Dismissal Confirmation Modal
  const [sackTarget, setSackTarget] = useState<{
    id: string;
    name: string;
    role: string;
    employeeId: string;
    email?: string;
    type: 'principal' | 'bursar' | 'staff';
  } | null>(null);
  const [isSacking, setIsSacking] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [execRes, staffRes] = await Promise.all([
          fetch('/api/executives').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/staff').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (isMounted) {
          if (execRes?.success && execRes?.data) {
            setPrincipal(execRes.data.principal || null);
            setBursar(execRes.data.bursar || null);
          }
          if (staffRes?.success && Array.isArray(staffRes.data)) {
            setStaffList(staffRes.data);
          }
        }
      } catch (err) {
        console.error('Failed to load staff data:', err);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleBulkImportComplete = async (importedRows: any[]) => {
    const registeredSubs = getRegisteredCurriculumSubjectNames();
    const newStaff: StaffSummary[] = importedRows.map((r, i) => {
      let rawSubs: string[] = [];
      if (Array.isArray(r.subjects) && r.subjects.length > 0) {
        rawSubs = r.subjects;
      } else if (typeof r.subject === 'string' && r.subject.trim()) {
        rawSubs = r.subject.split(/[;,|/]/).map((s: string) => s.trim()).filter(Boolean);
      }

      const role = r.role || 'Subject Teacher';
      // Filter against registered curriculum subjects: drops any unlisted subject
      const validatedSubjects = role === 'Non-Teaching Staff'
        ? []
        : filterValidCurriculumSubjects(rawSubs, registeredSubs);

      let resolvedAssignedClasses: string[] = [];
      if (Array.isArray(r.assignedClasses) && r.assignedClasses.length > 0) {
        resolvedAssignedClasses = r.assignedClasses;
      } else if (r.assignedClass) {
        resolvedAssignedClasses = [r.assignedClass];
      }

      let resolvedHomeroom = role === 'Class Teacher' ? (r.assignedClass || resolvedAssignedClasses[0] || 'JSS 1') : undefined;
      if (role === 'Class Teacher' && resolvedHomeroom && !resolvedAssignedClasses.includes(resolvedHomeroom)) {
        resolvedAssignedClasses = [resolvedHomeroom, ...resolvedAssignedClasses];
      }

      return {
        id: r.id || `stf-bulk-${Date.now()}-${i}`,
        employeeId: r.employeeId || `OAK/STF/${Math.floor(100 + Math.random() * 900)}`,
        name: r.name,
        email: r.email,
        phone: r.phone || '—',
        role,
        assignedClass: resolvedHomeroom,
        assignedClasses: role === 'Non-Teaching Staff' ? [] : resolvedAssignedClasses,
        subjects: validatedSubjects,
        department: r.department || (role === 'Non-Teaching Staff' ? 'Operations & Safety' : 'Academics'),
        status: 'Active',
        password: r.password || 'Oakland@2026',
      };
    });

    try {
      // Persist new staff batch directly to database & Auth
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || data.error || 'Failed to import staff members');
        return;
      }

      // Re-fetch authoritative staff list directly from PostgreSQL
      const staffRes = await fetch('/api/staff').then((r) => (r.ok ? r.json() : null));
      if (staffRes?.success && Array.isArray(staffRes.data)) {
        setStaffList(staffRes.data);
      }

      if (data.warnings && data.warnings.length > 0) {
        showToast(`Onboarded ${data.count ?? newStaff.length} staff. Note: ${data.warnings[0]}`);
      } else {
        showToast(`Successfully onboarded ${data.count ?? newStaff.length} faculty and staff members!`);
      }
    } catch {
      showToast('Network error while importing staff members');
    }
  };

  const handleOpenAppoint = (role: 'principal' | 'bursar') => {
    setAppointRole(role);
    if (role === 'principal' && principal) {
      setExecName(principal.name);
      setExecEmail(principal.email);
      setExecPhone(principal.phone || '');
    } else if (role === 'bursar' && bursar) {
      setExecName(bursar.name);
      setExecEmail(bursar.email);
      setExecPhone(bursar.phone || '');
    } else {
      setExecName('');
      setExecEmail('');
      setExecPhone('');
    }
    setPasswordMode('auto');
    setCustomPassword('');
    setShowPassword(false);
    setIsAppointModalOpen(true);
  };

  const handleAppointExecutive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!execEmail.trim() || !execName.trim()) return;

    setIsSubmitting(true);
    const cleanEmail = execEmail.trim().toLowerCase();
    const cleanName = execName.trim();
    const chosenPassword = passwordMode === 'auto'
      ? `Oak-${Math.floor(100000 + Math.random() * 900000)}`
      : customPassword.trim() || `Oak-${Math.floor(100000 + Math.random() * 900000)}`;

    const isPrincipal = appointRole === 'principal';
    const employeeId = isPrincipal ? 'OAK-ADM-001' : 'OAK-BUR-001';
    const roleTitle = isPrincipal ? 'School Principal & Head of Academics' : 'School Bursar & Chief Financial Officer';

    const appointedExec: ExecutiveData = {
      name: cleanName,
      email: cleanEmail,
      phone: execPhone.trim(),
      password: chosenPassword,
      appointedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Active',
      role: isPrincipal ? 'Principal' : 'Bursar',
      employeeId,
    };

    let emailDeliveryStatus: 'sent' | 'smtp_error' = 'sent';
    let emailDeliveryError: string | undefined = undefined;

    // 1. Persist appointment directly to database & Supabase Auth via /api/executives
    try {
      const execRes = await fetch('/api/executives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isPrincipal ? 'principal' : 'bursar',
          data: appointedExec,
        }),
      });

      const execData = await execRes.json();
      if (!execRes.ok || !execData.success) {
        showToast(execData.message || 'Failed to register executive credentials in database.');
        setIsSubmitting(false);
        return;
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error connecting to authentication database.');
      setIsSubmitting(false);
      return;
    }

    // 2. Notify backend services (non-blocking)
    try {
      const endpoint = isPrincipal ? '/staff/appoint-principal' : '/staff/appoint-bursar';
      await apiClient.post(endpoint, {
        fullName: cleanName,
        email: cleanEmail,
        phone: execPhone.trim(),
        password: chosenPassword,
      });
    } catch (err: any) {
      emailDeliveryStatus = 'smtp_error';
      emailDeliveryError = err.message || 'Optional backend notification service offline';
    }

    if (isPrincipal) {
      setPrincipal(appointedExec);
    } else {
      setBursar(appointedExec);

      // Also ensure Bursar appears in staff directory
      const updatedDirectory = [...staffList.filter((s) => s.email.toLowerCase() !== cleanEmail), {
        id: `bur-${Date.now()}`,
        employeeId,
        name: cleanName,
        email: cleanEmail,
        phone: execPhone.trim(),
        role: 'Bursar',
        subjects: ['Financial Accounting', 'Accounts'],
        qualification: 'Chief Financial Officer',
        department: 'Accounts',
        status: 'Active',
        password: chosenPassword,
      }];
      setStaffList(updatedDirectory);
    }

    setIsSubmitting(false);
    setIsAppointModalOpen(false);

    // Show credentials slip
    setSuccessSlip({
      roleTitle,
      fullName: cleanName,
      employeeId,
      email: cleanEmail,
      password: chosenPassword,
      emailStatus: emailDeliveryStatus,
      errorMessage: emailDeliveryError,
    });

    showToast(`Appointment confirmed for ${cleanName} as ${appointedExec.role}.`);
  };

  const handleConfirmSack = async () => {
    if (!sackTarget) return;
    setIsSacking(true);

    try {
      if (sackTarget.id) {
        await apiClient.delete(`/staff/${encodeURIComponent(sackTarget.id)}`).catch(() => {});
      }
    } catch {
      // Prevent network or API failure from stopping termination
    }

    // Revoke from server store
    if (sackTarget.type === 'principal' || sackTarget.type === 'bursar') {
      try {
        fetch(`/api/executives?role=${sackTarget.type}`, { method: 'DELETE' }).catch(() => {});
      } catch {}
    }

    if (sackTarget.type === 'principal') {
      setPrincipal(null);
      const updatedList = staffList.filter((s) => s.email.toLowerCase() !== sackTarget.id.toLowerCase() && s.role !== 'Principal');
      setStaffList(updatedList);
      showToast(`Principal ${sackTarget.name} has been relieved of duty. Academic portal is locked.`);
    } else if (sackTarget.type === 'bursar') {
      setBursar(null);
      const updatedList = staffList.filter((s) => s.email.toLowerCase() !== sackTarget.id.toLowerCase() && s.role !== 'Bursar');
      setStaffList(updatedList);
      showToast(`Bursar ${sackTarget.name} has been relieved of duty. Bursary portal is locked.`);
    } else {
      const updatedList = staffList.filter((s) => s.id !== sackTarget.id && s.employeeId !== sackTarget.employeeId);
      setStaffList(updatedList);

      // Persist deletion to server store
      const sackEmail = sackTarget.email || (sackTarget.id?.includes('@') ? sackTarget.id : '');
      await fetch(`/api/staff?id=${encodeURIComponent(sackTarget.id)}${sackEmail ? `&email=${encodeURIComponent(sackEmail)}` : ''}&employeeId=${encodeURIComponent(sackTarget.employeeId || '')}`, {
        method: 'DELETE',
      }).catch(() => {});

      showToast(`Staff member ${sackTarget.name} has been terminated from school service.`);
    }

    setIsSacking(false);
    setSackTarget(null);
  };

  const copyCredentialsSlip = () => {
    if (!successSlip) return;
    const text = `=========================================
OAKLAND INTERNATIONAL SCHOOL
OFFICIAL STAFF CREDENTIALS SLIP
=========================================
Role: ${successSlip.roleTitle}
Employee ID: ${successSlip.employeeId}
Full Name: ${successSlip.fullName}
Official Email: ${successSlip.email}
Portal Password: ${successSlip.password}
Official Sign-In Portal: ${window.location.origin}/login
=========================================
Issued by the Office of the Proprietor.`;
    navigator.clipboard.writeText(text);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 3000);
  };

  // Compile full staff roster (Executive leadership + teaching/support faculty)
  const fullRoster: StaffSummary[] = [];

  if (principal) {
    fullRoster.push({
      id: principal.id || principal.employeeId,
      employeeId: principal.employeeId,
      name: principal.name,
      email: principal.email,
      phone: principal.phone,
      role: 'Principal',
      qualification: 'Principal',
      department: 'Administration',
      status: principal.status,
    });
  }

  if (bursar) {
    fullRoster.push({
      id: bursar.id || bursar.employeeId,
      employeeId: bursar.employeeId,
      name: bursar.name,
      email: bursar.email,
      phone: bursar.phone,
      role: 'Bursar',
      qualification: 'Chief Financial Officer',
      department: 'Accounts',
      status: bursar.status,
    });
  }

  staffList.forEach((st) => {
    const isAlreadyPrincipal = principal && st.email.toLowerCase() === principal.email.toLowerCase();
    const isAlreadyBursar = bursar && st.email.toLowerCase() === bursar.email.toLowerCase();
    if (!isAlreadyPrincipal && !isAlreadyBursar) {
      fullRoster.push(st);
    }
  });

  const filteredRoster = fullRoster.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoaded) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Appoint leadership, oversee faculty and administrative staff, and manage contracts.</p>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Executive Leadership (Principal & Bursar) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#b3141f]" /> Executive Leadership Appointments
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Principal Card */}
          {principal ? (
            <Card className="border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-slate-50 shadow-xs flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0f3a3e] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{principal.name}</h3>
                      </div>
                      <p className="text-xs font-semibold text-[#0f3a3e] mt-0.5">School Principal & Head of Academics</p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">ID: {principal.employeeId}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-teal-100/70">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{principal.email}</span>
                  </div>
                  {principal.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{principal.phone}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 pt-1">Appointed: {principal.appointedAt}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-teal-100/70">
                  <Link
                    href={`/proprietor/staff/${principal.id || principal.employeeId}`}
                    className="flex-1 text-xs bg-[#0f3a3e] text-white hover:bg-[#164e53] rounded-lg py-2 px-3 text-center font-bold inline-flex items-center justify-center gap-1.5 transition shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Profile</span>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenAppoint('principal')}
                    className="text-xs border-teal-300 text-teal-900 hover:bg-teal-50"
                  >
                    Update Appointment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSackTarget({
                      id: principal.email,
                      name: principal.name,
                      role: 'School Principal',
                      employeeId: principal.employeeId,
                      type: 'principal',
                    })}
                    className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Relieve Appointment</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-slate-300 bg-slate-50/60 p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0f3a3e] flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">No School Principal Appointed</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Appoint the academic head of the school to oversee faculty, academic assessments, and curriculum governance.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleOpenAppoint('principal')}
                className="mt-4 w-full bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-bold gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Appoint School Principal</span>
              </Button>
            </Card>
          )}

          {/* Bursar Card */}
          {bursar ? (
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-slate-50 shadow-xs flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{bursar.name}</h3>
                      </div>
                      <p className="text-xs font-semibold text-amber-900 mt-0.5">School Bursar & Chief Financial Officer</p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">ID: {bursar.employeeId}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-amber-100/70">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{bursar.email}</span>
                  </div>
                  {bursar.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{bursar.phone}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 pt-1">Appointed: {bursar.appointedAt}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-amber-100/70">
                  <Link
                    href={`/proprietor/staff/${bursar.id || bursar.employeeId}`}
                    className="flex-1 text-xs bg-amber-800 text-white hover:bg-amber-900 rounded-lg py-2 px-3 text-center font-bold inline-flex items-center justify-center gap-1.5 transition shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Profile</span>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenAppoint('bursar')}
                    className="text-xs border-amber-300 text-amber-900 hover:bg-amber-50"
                  >
                    Update Appointment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSackTarget({
                      id: bursar.email,
                      name: bursar.name,
                      role: 'School Bursar',
                      employeeId: bursar.employeeId,
                      type: 'bursar',
                    })}
                    className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Relieve Appointment</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-slate-300 bg-slate-50/60 p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">No School Bursar Appointed</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Only the Proprietor can grant Bursar access to administer tuition fee payments, student ledgers, and expenditure records.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleOpenAppoint('bursar')}
                className="mt-4 w-full bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Appoint School Bursar</span>
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* 2. Full School Staff & Faculty Roster */}
      <div className="space-y-3 pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-800" /> Staff Directory
            </h2>
            <p className="text-xs text-slate-500">
              Complete oversight of all institutional personnel. You have the executive authority to terminate employment of any staff member.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsBulkOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import Staff</span>
            </Button>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              {filteredRoster.length} Total Staff Listed
            </span>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search staff roster..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50"
              />
            </div>
          </div>
        </div>

        {filteredRoster.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/40 p-8 text-center">
            <p className="text-xs text-slate-500">
              No staff members found matching your search. Appoint the Principal and Bursar above to activate leadership.
            </p>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0f3a3e] text-white font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Official ID</th>
                    <th className="py-2.5 px-4">Staff Member</th>
                    <th className="py-2.5 px-4">Role & Department</th>
                    <th className="py-2.5 px-4">Official Email</th>
                    <th className="py-2.5 px-4">Contact Phone</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRoster.map((st) => {
                    const isPrincipalRow = principal && st.email.toLowerCase() === principal.email.toLowerCase();
                    const isBursarRow = bursar && st.email.toLowerCase() === bursar.email.toLowerCase();

                    return (
                      <tr key={st.id || st.employeeId} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-teal-800">
                          {st.employeeId}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <Link
                            href={`/proprietor/staff/${st.id}`}
                            className="hover:text-teal-700 hover:underline transition-colors block"
                          >
                            {st.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPrincipalRow
                              ? 'bg-teal-100 text-teal-900 border border-teal-200'
                              : isBursarRow
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {st.role} {st.assignedClass ? `(${st.assignedClass})` : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {st.email}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {st.phone || '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <Link
                              href={`/proprietor/staff/${st.id}`}
                              className="h-7 text-[11px] px-2.5 bg-slate-50 border border-slate-200 hover:bg-[#0f3a3e] hover:text-white text-slate-700 font-semibold rounded-lg inline-flex items-center gap-1 transition shadow-2xs"
                              title="Inspect Staff Profile"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect</span>
                              <span className="text-[10px]">&rarr;</span>
                            </Link>
                            {!isPrincipalRow && !isBursarRow && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingStaff(st)}
                                className="h-7 text-[11px] px-2 text-slate-700 border-slate-200 hover:bg-slate-100 font-bold flex items-center gap-1 cursor-pointer"
                                title="Edit Role & Assignment"
                              >
                                <Edit3 className="w-3 h-3 text-[#0f3a3e]" />
                                <span>Edit</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSackTarget({
                                id: st.id,
                                name: st.name,
                                role: st.role,
                                employeeId: st.employeeId,
                                email: st.email,
                                type: isPrincipalRow ? 'principal' : isBursarRow ? 'bursar' : 'staff',
                              })}
                              className="h-7 text-[11px] px-2 text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300 font-bold flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Terminate</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Appointment Modal (Principal or Bursar) */}
      {isAppointModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setIsAppointModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                appointRole === 'principal' ? 'bg-teal-50 text-[#0f3a3e]' : 'bg-amber-50 text-amber-800'
              }`}>
                {appointRole === 'principal' ? <GraduationCap className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {appointRole === 'principal' ? 'Appoint School Principal' : 'Appoint School Bursar'}
                </h3>
                <p className="text-xs text-slate-500">
                  {appointRole === 'principal'
                    ? 'Grant academic head access and issue official portal credentials.'
                    : 'Grant financial control access to manage fees, tuition, and school accounts.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleAppointExecutive} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder={appointRole === 'principal' ? 'e.g. Mr. Seyi Bankole' : 'e.g. Mrs. Folake Bidemi'}
                  value={execName}
                  onChange={(e) => setExecName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  placeholder={appointRole === 'principal' ? 'principal@oaklandschools.edu' : 'bursar@oaklandschools.edu'}
                  value={execEmail}
                  onChange={(e) => setExecEmail(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <Input
                  placeholder="e.g. +234 803 000 1122"
                  value={execPhone}
                  onChange={(e) => setExecPhone(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Initial Portal Password
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setPasswordMode('auto')}
                    className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                      passwordMode === 'auto'
                        ? 'border-[#0f3a3e] bg-[#eaf3f3] text-[#0f3a3e] font-bold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Auto-Generate Secure
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordMode('manual')}
                    className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                      passwordMode === 'manual'
                        ? 'border-[#0f3a3e] bg-[#eaf3f3] text-[#0f3a3e] font-bold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Set Password Manually
                  </button>
                </div>
                {passwordMode === 'manual' ? (
                  <Input
                    required
                    type="text"
                    placeholder="e.g. Oak-Exec@2026"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="text-xs font-mono"
                  />
                ) : (
                  <p className="text-[11px] text-slate-500">
                    A secure password will be generated automatically and printed on their official credentials slip.
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-200 text-[11px] text-teal-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" /> Real-Time Appointment Activation
                </p>
                <p className="text-teal-800">
                  Their account will be confirmed immediately. An official credentials slip will be generated for them to sign in at the school portal.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAppointModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Issue Appointment & Credentials</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Credentials Slip Modal (Credentials display only — no staff dashboard entrance) */}
      {successSlip && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-teal-200 text-left relative animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Official Appointment Granted
                </h3>
                <p className="text-xs text-slate-500">
                  Credentials generated for <strong>{successSlip.fullName}</strong>.
                </p>
              </div>
            </div>

            {/* Official Credentials Slip Box */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 relative shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400 font-sans uppercase tracking-wider font-bold">
                <span>Oakland Official Appointment</span>
                <span className="text-teal-400">Official Record</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Executive Role</span>
                  <span className="text-white font-semibold">{successSlip.roleTitle}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Employee ID</span>
                  <span className="text-teal-300 font-bold">{successSlip.employeeId}</span>
                </div>
              </div>
              <div className="pt-1">
                <span className="text-[10px] text-slate-400 block font-sans">Official Email</span>
                <span className="text-white select-all">{successSlip.email}</span>
              </div>
              <div className="pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 block font-sans">Portal Password</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-sans"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <div className="p-2 rounded bg-slate-800/80 border border-slate-700 font-mono text-sm text-emerald-400 font-bold tracking-wider mt-1 select-all">
                  {showPassword ? successSlip.password : '••••••••••••'}
                </div>
              </div>
              <div className="pt-1 border-t border-slate-800 text-[11px] text-slate-300 font-sans">
                <span>Official Sign-In Portal: </span>
                <span className="text-teal-400 font-mono font-semibold">{window.location.origin}/login</span>
              </div>
            </div>

            {/* Email Dispatch Notice */}
            {successSlip.emailStatus === 'sent' ? (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px]">An official appointment email with these credentials was dispatched to <strong>{successSlip.email}</strong>.</p>
              </div>
            ) : (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-[11px]">Copy the credentials above and hand them to the appointed official. They can log into the school portal immediately.</p>
              </div>
            )}

            <div className="flex items-center gap-2 mt-5">
              <Button
                onClick={copyCredentialsSlip}
                className="flex-1 bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-bold py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm"
              >
                {copiedSlip ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Credentials Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Credentials Slip</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSuccessSlip(null)}
                className="text-xs text-slate-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Dismissal Confirmation Modal */}
      {sackTarget && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 relative text-left">
            <button
              onClick={() => setSackTarget(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Staff Termination & Sacking
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proprietor's Executive Dismissal Authority
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 space-y-2 mb-4">
              <p className="font-bold">
                Are you sure you want to dismiss and sack this staff member?
              </p>
              <div className="space-y-1 text-[11px] text-rose-800 bg-white p-2.5 rounded-lg border border-rose-200">
                <p><span className="font-semibold text-slate-600">Name:</span> <strong>{sackTarget.name}</strong></p>
                <p><span className="font-semibold text-slate-600">Role:</span> <strong>{sackTarget.role}</strong></p>
                <p><span className="font-semibold text-slate-600">Official ID:</span> <span className="font-mono">{sackTarget.employeeId}</span></p>
              </div>
              <p className="text-[11px] text-rose-700">
                Executing this order will permanently revoke their portal credentials, strike them from active service, and remove their administrative permissions immediately.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSackTarget(null)}
                className="text-xs"
              >
                Cancel Order
              </Button>
              <Button
                type="button"
                isLoading={isSacking}
                onClick={handleConfirmSack}
                className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Dismissal & Revoke Access</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Import Staff */}
      <BulkImportModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        importType="staff"
        onImportComplete={handleBulkImportComplete}
      />

      {/* Modal: Edit Staff Role & Assignment */}
      <EditStaffModal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        staff={editingStaff}
        onSuccess={() => {
          // Re-fetch authoritative staff list directly from PostgreSQL
          fetch('/api/staff')
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data?.success && Array.isArray(data.data)) {
                setStaffList(data.data);
              }
            })
            .catch(() => {});
          showToast('Staff role and assignment updated successfully');
        }}
      />
    </div>
  );
}
