'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Key,
  Copy,
  Check,
  X,
  Phone,
  Mail,
  Upload,
  Eye,
  BookOpen,
  School,
  ShieldAlert,
  Lock,
  Edit3,
} from 'lucide-react';
import { BulkImportModal } from '@/components/common/BulkImportModal';
import { EditStaffModal } from '@/components/common/EditStaffModal';
import {
  getRegisteredCurriculumSubjectNames,
  filterValidCurriculumSubjects,
} from '@/lib/curriculum-data';
import { fetchPrincipalDelegations, PrincipalDelegations } from '@/lib/delegations';
import { DelegationRestrictedBanner } from '@/components/common/DelegationRestrictedBanner';

export interface TeachingAssignment {
  subject: string;
  classes: string[];
}

export interface StaffRecord {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: 'Class Teacher' | 'Subject Teacher' | 'Non-Teaching Staff';
  assignedClass?: string; // Homeroom for Class Teacher (e.g. 'JSS 1')
  assignedClasses?: string[]; // Multiple classes taught by Subject Teacher (e.g. ['JSS 1', 'JSS 2'])
  subjects: string[]; // Official subjects taught
  teachingAssignments?: TeachingAssignment[]; // Specific pairings: { subject, classes }
  department: string;
  nonTeachingRole?: string;
  status: 'Active' | 'Inactive';
  password?: string;
}

const DEFAULT_STAFF: StaffRecord[] = [];

const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

const NON_TEACHING_ROLES = [
  'Security Officer',
  'Maintenance Officer',
  'Administrative Officer',
  'Transport Driver',
  'School Nurse',
  'Accounts Assistant',
  'IT Support',
];

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffRecord[]>(DEFAULT_STAFF);
  const [curriculumSubjects, setCurriculumSubjects] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<'All' | 'Class Teachers' | 'Subject Teachers' | 'Non-Teaching'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [delegations, setDelegations] = useState<PrincipalDelegations | null>(null);
  const canOnboard = delegations?.canOnboardStaff ?? true;

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedStaffForCreds, setSelectedStaffForCreds] = useState<StaffRecord | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // Add Staff Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<StaffRecord['role']>('Subject Teacher');
  const [newHomeroomClass, setNewHomeroomClass] = useState('JSS 1');
  const [courseAssignments, setCourseAssignments] = useState<TeachingAssignment[]>([
    { subject: 'Mathematics', classes: ['JSS 1', 'JSS 2'] },
  ]);
  const [newNonTeachingRole, setNewNonTeachingRole] = useState(NON_TEACHING_ROLES[0]);
  const [newDept, setNewDept] = useState('Academics');

  const fetchStaffFromServer = () => {
    fetch('/api/staff')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.success && Array.isArray(payload.data)) {
          // Filter out Principal (as Principal has own supervisory role and shouldn't appear in teacher roster)
          const staffWithoutPrincipal = payload.data.filter(
            (s: any) => s.role !== 'Principal' && s.role !== 'admin'
          );
          setStaffList(staffWithoutPrincipal);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStaffFromServer();
    fetchPrincipalDelegations().then(setDelegations);

    const subs = getRegisteredCurriculumSubjectNames();
    setCurriculumSubjects(subs);
    if (subs.length > 0) {
      setCourseAssignments((prev) => {
        if (prev.length === 0 || !subs.includes(prev[0].subject)) {
          return [{ subject: subs[0], classes: ['JSS 1', 'JSS 2'] }];
        }
        return prev;
      });
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyCredentials = () => {
    if (!selectedStaffForCreds) return;
    const credText = `Oakland School Portal Login\nEmail: ${selectedStaffForCreds.email}\nPassword: ${selectedStaffForCreds.password || 'Contact Admin'}`;
    navigator.clipboard.writeText(credText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteStaff = (id: string) => {
    const target = staffList.find((s) => s.id === id);
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    fetch(`/api/staff?id=${encodeURIComponent(id)}${target?.email ? `&email=${encodeURIComponent(target.email)}` : ''}${target?.employeeId ? `&employeeId=${encodeURIComponent(target.employeeId)}` : ''}`, {
      method: 'DELETE',
    })
      .then(() => fetchStaffFromServer())
      .catch(() => {});
    showToast('Staff record removed');
  };

  const handleAddCourseAssignment = () => {
    const defaultSub = curriculumSubjects.find(
      (s) => !courseAssignments.some((ca) => ca.subject === s)
    ) || curriculumSubjects[0] || 'Mathematics';
    setCourseAssignments((prev) => [...prev, { subject: defaultSub, classes: ['JSS 1'] }]);
  };

  const handleRemoveCourseAssignment = (index: number) => {
    setCourseAssignments((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));
  };

  const handleCourseSubjectChange = (index: number, newSub: string) => {
    setCourseAssignments((prev) =>
      prev.map((ca, idx) => (idx === index ? { ...ca, subject: newSub } : ca))
    );
  };

  const handleToggleCourseClass = (index: number, cls: string) => {
    setCourseAssignments((prev) =>
      prev.map((ca, idx) => {
        if (idx !== index) return ca;
        const exists = ca.classes.includes(cls);
        const nextClasses = exists
          ? ca.classes.filter((c) => c !== cls)
          : [...ca.classes, cls];
        return { ...ca, classes: nextClasses };
      })
    );
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canOnboard) {
      showToast('Action prohibited: Staff onboarding has not been delegated by the Proprietor.');
      return;
    }
    if (!newName.trim() || !newEmail.trim()) return;

    let finalDept = newDept;
    if (newRole === 'Non-Teaching Staff') {
      if (newNonTeachingRole.includes('Security')) finalDept = 'Operations & Safety';
      else if (newNonTeachingRole.includes('Facilities')) finalDept = 'Maintenance';
      else if (newNonTeachingRole.includes('Nurse')) finalDept = 'Health & Medical';
      else if (newNonTeachingRole.includes('Accounts')) finalDept = 'Finance';
      else finalDept = 'Administration';
    }

    if (newRole === 'Class Teacher') {
      const conflict = staffList.find(
        (s) => s.role === 'Class Teacher' && s.assignedClass === newHomeroomClass
      );
      if (conflict) {
        showToast(`This class (${newHomeroomClass}) has already been assigned to ${conflict.name}. A class can only have one Class Teacher.`);
        return;
      }
    }

    // Filter and sanitize course assignments
    const registeredSubs = getRegisteredCurriculumSubjectNames();
    const cleanedAssignments: TeachingAssignment[] = newRole === 'Non-Teaching Staff'
      ? []
      : courseAssignments
          .filter((a) => registeredSubs.includes(a.subject) && a.classes.length > 0)
          .map((a) => ({
            subject: a.subject,
            classes: Array.from(new Set(a.classes)),
          }));

    const distinctSubjects = Array.from(new Set(cleanedAssignments.map((a) => a.subject)));
    let distinctClasses = Array.from(new Set(cleanedAssignments.flatMap((a) => a.classes)));
    if (newRole === 'Class Teacher' && newHomeroomClass && !distinctClasses.includes(newHomeroomClass)) {
      distinctClasses.push(newHomeroomClass);
    }

    const cleanPassword = 'Oakland@2026';

    const newStaff: StaffRecord = {
      id: `stf-${Date.now()}`,
      employeeId: `OAK/STF/0${staffList.length + 1}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      phone: newPhone.trim(),
      role: newRole,
      assignedClass: newRole === 'Class Teacher' ? newHomeroomClass : undefined,
      assignedClasses: newRole === 'Non-Teaching Staff' ? [] : distinctClasses,
      subjects: distinctSubjects,
      teachingAssignments: cleanedAssignments,
      department: finalDept,
      nonTeachingRole: newRole === 'Non-Teaching Staff' ? newNonTeachingRole : undefined,
      status: 'Active',
      password: cleanPassword,
    };

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', staff: newStaff }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to onboard staff member in database.');
        return;
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error saving staff credentials.');
      return;
    }

    fetchStaffFromServer();
    setIsAddOpen(false);
    setSelectedStaffForCreds(newStaff);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    showToast(`Staff member ${newStaff.name} onboarded successfully!`);
  };

  const handleBulkImportComplete = async (importedRows: any[]) => {
    if (!canOnboard) {
      showToast('Action prohibited: Staff onboarding has not been delegated by the Proprietor.');
      return;
    }
    const registeredSubs = getRegisteredCurriculumSubjectNames();
    const newStaffMembers: StaffRecord[] = importedRows.map((r, i) => {
      let role: StaffRecord['role'] = 'Subject Teacher';
      const rawRole = (r.role || '').toLowerCase();
      const rawDept = (r.department || '').toLowerCase();

      if (rawRole.includes('class teacher') || rawRole.includes('homeroom')) {
        role = 'Class Teacher';
      } else if (
        rawRole.includes('security') ||
        rawRole.includes('facility') ||
        rawRole.includes('driver') ||
        rawRole.includes('nurse') ||
        rawRole.includes('cleaner') ||
        rawRole.includes('admin') ||
        rawRole.includes('non-teaching') ||
        rawDept.includes('security') ||
        rawDept.includes('maintenance')
      ) {
        role = 'Non-Teaching Staff';
      } else if (rawRole.includes('subject') || rawRole.includes('teacher')) {
        role = 'Subject Teacher';
      }

      let rawSubs: string[] = [];
      if (Array.isArray(r.subjects) && r.subjects.length > 0) {
        rawSubs = r.subjects;
      } else if (typeof r.subject === 'string' && r.subject.trim()) {
        rawSubs = r.subject.split(/[;,|/]|(?:\s+(?:and|&)\s+)/i).map((s: string) => s.trim()).filter(Boolean);
      }

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
        body: JSON.stringify(newStaffMembers),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || data.error || 'Failed to import staff members');
        return;
      }
      fetchStaffFromServer();
      if (data.warnings && data.warnings.length > 0) {
        showToast(`Onboarded ${data.count ?? newStaffMembers.length} staff. Note: ${data.warnings[0]}`);
      } else {
        showToast(`Successfully onboarded ${data.count ?? newStaffMembers.length} staff members into the school system!`);
      }
    } catch {
      showToast('Network error while importing staff members');
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (roleFilter === 'Class Teachers' && s.role !== 'Class Teacher') return false;
    if (roleFilter === 'Subject Teachers' && s.role !== 'Subject Teacher') return false;
    if (roleFilter === 'Non-Teaching' && s.role !== 'Non-Teaching Staff') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.employeeId.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.subjects && s.subjects.some((sub) => sub.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  const classTeacherCount = staffList.filter((s) => s.role === 'Class Teacher').length;
  const subjectTeacherCount = staffList.filter((s) => s.role === 'Subject Teacher').length;
  const nonTeachingCount = staffList.filter((s) => s.role === 'Non-Teaching Staff').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Staff</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Teaching and non-teaching staff directory.
          </p>
        </div>

        {canOnboard ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsBulkOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import Staff</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Onboarding Reserved</span>
            </span>
          </div>
        )}
      </div>

      {/* Authority Restriction Notice */}
      {!canOnboard && (
        <DelegationRestrictedBanner
          title="Faculty Onboarding Authority Reserved"
          description="The Office of the Proprietor has reserved faculty onboarding authorities. The Principal may inspect the faculty roster, contact details, and classroom assignments in read-only mode."
        />
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'All', label: 'All Staff', count: staffList.length },
            { id: 'Class Teachers', label: 'Class Teachers', count: classTeacherCount },
            { id: 'Subject Teachers', label: 'Subject Teachers', count: subjectTeacherCount },
            { id: 'Non-Teaching', label: 'Non-Teaching Staff', count: nonTeachingCount },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoleFilter(r.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                roleFilter === r.id
                  ? 'bg-[#0f3a3e] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <span>{r.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  roleFilter === r.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {r.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">
            {filteredStaff.length} Staff Members Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-semibold">Staff Member</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Assignment</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Contact</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No staff members found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center font-bold text-xs shrink-0">
                          {staff.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <Link
                            href={`/admin/staff/${staff.id}`}
                            className="font-bold text-slate-900 hover:text-[#0f3a3e] hover:underline transition-colors block"
                          >
                            {staff.name}
                          </Link>
                          <p className="text-[10px] text-slate-400 font-mono">{staff.employeeId}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          staff.role === 'Class Teacher'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : staff.role === 'Subject Teacher'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {staff.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {staff.role === 'Class Teacher' ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <School className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              Homeroom: {staff.assignedClass || 'Unassigned'}
                            </span>
                          </div>
                          {staff.teachingAssignments && staff.teachingAssignments.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-sm">
                              {staff.teachingAssignments.map((ta, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                                >
                                  <BookOpen className="w-2.5 h-2.5 text-slate-500" />
                                  <span>{ta.subject}</span>
                                  <span className="text-slate-500 font-mono text-[9px] bg-white px-1 rounded border border-slate-200/60">
                                    {ta.classes.join(', ')}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : staff.subjects && staff.subjects.length > 0 ? (
                            <p className="text-[10px] text-slate-500 truncate max-w-xs">
                              Courses: {staff.subjects.join(', ')}
                            </p>
                          ) : null}
                        </div>
                      ) : staff.role === 'Subject Teacher' ? (
                        <div className="space-y-1">
                          {staff.teachingAssignments && staff.teachingAssignments.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-sm">
                              {staff.teachingAssignments.map((ta, idx) => {
                                const classLabel = ta.classes.length === 6
                                  ? 'All Classes'
                                  : ta.classes.length > 0
                                  ? ta.classes.join(', ')
                                  : 'Unassigned';
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-50 text-purple-900 px-2 py-0.5 rounded border border-purple-200"
                                  >
                                    <BookOpen className="w-2.5 h-2.5 text-purple-700" />
                                    <span>{ta.subject}</span>
                                    <span className="text-purple-700 font-mono text-[9px] bg-purple-100 px-1 rounded font-bold">
                                      {classLabel}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <>
                              <p className="font-semibold text-slate-800 truncate max-w-xs">
                                {staff.subjects && staff.subjects.length > 0
                                  ? staff.subjects.join(', ')
                                  : 'General Curriculum'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Classes: {staff.assignedClasses && staff.assignedClasses.length === 6
                                  ? 'All Classes'
                                  : staff.assignedClasses && staff.assignedClasses.length > 0
                                  ? staff.assignedClasses.join(', ')
                                  : 'Unassigned'}
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-medium">
                          {staff.nonTeachingRole || staff.department || 'Operations Support'}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-slate-600 font-medium">{staff.department}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-slate-800 font-mono text-[11px]">{staff.email}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{staff.phone || '—'}</p>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/admin/staff/${staff.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#0f3a3e] hover:text-white text-slate-700 text-[11px] font-semibold transition shadow-2xs mr-0.5"
                          title="Inspect Staff Profile"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Profile</span>
                          <span className="text-[10px]">&rarr;</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditingStaff(staff)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-[#0f3a3e] transition"
                          title="Edit Role & Assignment"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStaffForCreds(staff)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition"
                          title="View Login Credentials"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                          title="Remove Staff"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Staff */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Staff Member</h3>
                <p className="text-[11px] text-slate-500">Onboard teaching or support staff</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mrs. Folake Davies"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="f.davies@oaklandschools.edu.ng"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+234 800 000 0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff Category *</label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    const r = e.target.value as StaffRecord['role'];
                    setNewRole(r);
                    if (r === 'Non-Teaching Staff') {
                      setNewDept('Operations & Safety');
                    } else {
                      setNewDept('Academics');
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                >
                  <option value="Class Teacher">Class Teacher (Homeroom and Attendance)</option>
                  <option value="Subject Teacher">Subject Teacher (Curriculum Subject Specialist)</option>
                  <option value="Non-Teaching Staff">Non-Teaching Staff (Security, Maintenance, Admin)</option>
                </select>
              </div>

              {/* NON-TEACHING SPECIFIC FIELDS */}
              {newRole === 'Non-Teaching Staff' && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Role and Department
                  </span>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Operational Designation</label>
                    <select
                      value={newNonTeachingRole}
                      onChange={(e) => setNewNonTeachingRole(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden"
                    >
                      {NON_TEACHING_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Non-teaching personnel do not have class roll-call or exam score entry authority.
                  </p>
                </div>
              )}

              {/* TEACHING FACULTY ASSIGNMENT BUILDER (Class Teacher & Subject Teacher) */}
              {(newRole === 'Class Teacher' || newRole === 'Subject Teacher') && (
                <div className="space-y-3.5">
                  {newRole === 'Class Teacher' && (() => {
                    const conflict = staffList.find(
                      (s) => s.role === 'Class Teacher' && s.assignedClass === newHomeroomClass
                    );
                    return (
                      <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 space-y-2">
                        <label className="block font-semibold text-blue-950">
                          Assigned Homeroom Class (Roll Call and Attendance) *
                        </label>
                        <select
                          value={newHomeroomClass}
                          onChange={(e) => setNewHomeroomClass(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-xl bg-white font-bold text-blue-900 focus:outline-hidden ${
                            conflict ? 'border-amber-400 ring-2 ring-amber-200/60' : 'border-blue-200'
                          }`}
                        >
                          {CLASSES.map((c) => (
                            <option key={c} value={c}>
                              {c} — Homeroom Class
                            </option>
                          ))}
                        </select>
                        {conflict ? (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-900 text-[11px] font-medium">
                            <span className="font-bold text-amber-700 shrink-0">⚠️ Conflict:</span>
                            <span>This class ({newHomeroomClass}) has already been assigned to <strong>{conflict.name}</strong>. A class can only have one Class Teacher.</span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-blue-800">
                            Responsible for morning roll call, student profiles, and terminal report card remarks for this class.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#0f3a3e]" />
                          Subject and Class Allocations
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Pin each subject this teacher instructs to its specific classes.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddCourseAssignment}
                        className="text-xs font-semibold text-[#0f3a3e] border-[#0f3a3e]/30 hover:bg-[#0f3a3e]/10 flex items-center gap-1 h-7 px-2.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Subject</span>
                      </Button>
                    </div>

                    {curriculumSubjects.length === 0 ? (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                        No registered curriculum subjects available. Add subjects in Academic Curriculum first.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {courseAssignments.map((ca, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                  Subject #{idx + 1}
                                </label>
                                <select
                                  value={ca.subject}
                                  onChange={(e) => handleCourseSubjectChange(idx, e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50/50 focus:outline-hidden"
                                >
                                  {curriculumSubjects.map((sub) => (
                                    <option key={sub} value={sub}>
                                      {sub}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {courseAssignments.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCourseAssignment(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition mt-4"
                                  title="Remove Subject Assignment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Classes taking {ca.subject} with this teacher:
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {CLASSES.map((cls) => {
                                  const isSelected = ca.classes.includes(cls);
                                  return (
                                    <button
                                      type="button"
                                      key={cls}
                                      onClick={() => handleToggleCourseClass(idx, cls)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                        isSelected
                                          ? 'bg-[#0f3a3e] text-white shadow-2xs'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                                      }`}
                                    >
                                      {cls}
                                    </button>
                                  );
                                })}
                              </div>
                              {ca.classes.length === 0 && (
                                <p className="text-[10px] text-amber-600 mt-1">
                                  Please select at least one class for this subject.
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0f3a3e] hover:bg-[#164e53] text-white font-semibold rounded-xl shadow-xs transition"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Credentials */}
      {selectedStaffForCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Portal Credentials</h3>
              <button
                type="button"
                onClick={() => setSelectedStaffForCreds(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Staff Member:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedStaffForCreds.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Email:</span>
                <span className="font-mono text-slate-800 break-all">{selectedStaffForCreds.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Default Password:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedStaffForCreds.password || 'Oakland@2026'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleCopyCredentials}
              className="w-full bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs py-2.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Credentials'}</span>
            </Button>
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
          fetchStaffFromServer();
          showToast('Staff role and assignments updated successfully');
        }}
      />
    </div>
  );
}
