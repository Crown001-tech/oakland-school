'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Briefcase,
  Mail,
  Phone,
  Shield,
  Search,
  Check,
  BookOpen,
  Lock,
} from 'lucide-react';

import { BrandLoader } from '@/components/ui/BrandLoader';

const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

interface PendingStaff {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  photoUrl?: string;
  qualification: string;
  department: string;
  desiredRole: 'teacher' | 'admin' | 'bursar';
  experience: string;
  appliedAt: string;
  status: 'pending' | 'approved' | 'declined';
  employeeId?: string;
  assignedSubject?: string;
  assignedClasses?: string[];
  isClassTeacher?: boolean;
  classTeacherOf?: 'JSS 1' | 'JSS 2' | 'JSS 3' | 'SS 1' | 'SS 2' | 'SS 3';
}

export default function StaffApprovalsPage() {
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<PendingStaff | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal configuration states
  const [assignedRole, setAssignedRole] = useState<'teacher' | 'admin' | 'bursar'>('teacher');
  const [assignedSubject, setAssignedSubject] = useState('Basic Science');
  const [selectedTeachingClasses, setSelectedTeachingClasses] = useState<string[]>(['SS 1', 'SS 2', 'SS 3']);
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const availableSubjects = [
    'Basic Science',
    'Mathematics',
    'English Language',
    'Physics',
    'Chemistry',
    'Biology',
    'Social Studies',
    'Economics & Accounts',
    'Civic Education',
    'Information Technology',
  ];

  const [applicants, setApplicants] = useState<PendingStaff[]>([]);

  const fetchApplicants = async () => {
    try {
      const res = await fetch('/api/staff-approvals');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setApplicants(json.data);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  // Generate role-originated Employee ID whenever role changes
  useEffect(() => {
    let prefix = 'OAK-TCH';
    if (assignedRole === 'admin') {
      prefix = 'OAK-ADM';
    } else if (assignedRole === 'bursar') {
      prefix = 'OAK-BUR';
    }
    const randomNum = Math.floor(100 + Math.random() * 900);
    setGeneratedEmployeeId(`${prefix}-${randomNum}`);
  }, [assignedRole]);

  const handleOpenApproveModal = (staff: PendingStaff) => {
    setSelectedStaff(staff);
    setAssignedRole(staff.desiredRole);

    if (staff.department.includes('Science')) {
      setAssignedSubject('Basic Science');
      setSelectedTeachingClasses(['SS 1', 'SS 2', 'SS 3']);
    } else if (staff.department.includes('English') || staff.department.includes('Language')) {
      setAssignedSubject('English Language');
      setSelectedTeachingClasses(['JSS 1', 'JSS 2', 'JSS 3']);
    } else {
      setAssignedSubject('Mathematics');
      setSelectedTeachingClasses(['SS 1', 'SS 2']);
    }
  };

  const toggleTeachingClass = (cls: string) => {
    setSelectedTeachingClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const handleConfirmApproval = async () => {
    if (!selectedStaff) return;
    setIsApproving(true);

    try {
      const nameParts = selectedStaff.name.split(' ');
      const fName = selectedStaff.firstName || nameParts[0] || 'Staff';
      const lName = selectedStaff.lastName || nameParts.slice(1).join(' ') || 'Member';

      const res = await fetch('/api/staff-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantId: selectedStaff.id,
          assignedRole,
          assignedSubject: assignedRole === 'teacher' ? assignedSubject : undefined,
          assignedClasses: assignedRole === 'teacher' ? selectedTeachingClasses : undefined,
          employeeId: generatedEmployeeId,
          firstName: fName,
          lastName: lName,
          email: selectedStaff.email,
          phone: selectedStaff.phone,
          department: selectedStaff.department,
          qualification: selectedStaff.qualification,
        }),
      });

      const json = await res.json();
      if (json.success) {
        let summary = '';
        if (assignedRole === 'teacher') {
          summary = `${selectedStaff.name} appointed as ${generatedEmployeeId}. Default password: Oakland@2026.`;
        } else {
          summary = `${selectedStaff.name} appointed as ${assignedRole.toUpperCase()} (${generatedEmployeeId}). Default password: Oakland@2026.`;
        }
        setSuccessToast(summary);
        setSelectedStaff(null);
        fetchApplicants();
        setTimeout(() => setSuccessToast(null), 6000);
      } else {
        alert(json.message || 'Approval failed.');
      }
    } catch {
      alert('Network error while approving staff.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDecline = async (id: string, name: string) => {
    try {
      const res = await fetch('/api/staff-approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId: id, action: 'decline' }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessToast(`Application for ${name} was declined.`);
        fetchApplicants();
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch {
      alert('Failed to decline application.');
    }
  };

  const filteredApplicants = applicants.filter((item) => {
    const matchesTab =
      filterTab === 'all'
        ? true
        : filterTab === 'pending'
        ? item.status === 'pending'
        : item.status === 'approved';
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = applicants.filter((a) => a.status === 'pending').length;

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Staff Approvals
            </h1>
            {pendingCount > 0 && (
              <Badge variant="coral" size="sm">
                {pendingCount} Pending
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review applicant qualifications, assign subjects, and appoint class teachers.
          </p>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:underline text-[11px] cursor-pointer">
            Dismiss
          </button>
        </div>
      )}



      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 text-xs font-semibold">
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Review ({pendingCount})
          </button>
          <button
            onClick={() => setFilterTab('approved')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterTab === 'approved'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved Staff
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Submissions
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
          />
        </div>
      </div>

      {/* Applicant Cards List */}
      <div className="space-y-4">
        {filteredApplicants.length === 0 ? (
          <Card className="p-12 text-center border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No applications found</p>
            <p className="text-xs text-slate-500">
              All staff applications have been reviewed.
            </p>
          </Card>
        ) : (
          filteredApplicants.map((staff) => (
            <Card
              key={staff.id}
              className={`p-5 border transition-all ${
                staff.status === 'pending'
                  ? 'border-amber-200/80 bg-white hover:border-amber-300 shadow-xs'
                  : staff.status === 'approved'
                  ? 'border-emerald-200/60 bg-emerald-50/20'
                  : 'border-slate-200 bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Staff Info & Photo */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#0f3a3e] text-white flex items-center justify-center font-bold text-base shrink-0 overflow-hidden border border-teal-800">
                    {staff.photoUrl ? (
                      <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover" />
                    ) : (
                      staff.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{staff.name}</h3>
                      {staff.employeeId && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 border border-slate-200">
                          {staff.employeeId}
                        </span>
                      )}
                      {staff.status === 'pending' && (
                        <Badge variant="amber" size="sm">
                          Pending Review
                        </Badge>
                      )}
                      {staff.status === 'approved' && (
                        <Badge variant="emerald" size="sm">
                          Active &bull; Appointed
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-slate-800">
                        <GraduationCap className="w-3.5 h-3.5 text-[#0f3a3e]" />
                        {staff.qualification}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        {staff.department} ({staff.experience})
                      </span>
                    </div>

                    {/* Assigned Courses and Class Teacher role */}
                    {staff.assignedSubject && staff.assignedClasses && (
                      <div className="p-2 rounded-lg bg-teal-50/70 border border-teal-100 text-[11px] text-[#0f3a3e] mt-1 space-y-0.5">
                        <p className="font-bold flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#b3141f]" />
                          Subject: {staff.assignedSubject} &bull; Teaching Classes: {staff.assignedClasses.join(', ')}
                        </p>
                        {staff.isClassTeacher && (
                          <p className="text-[#b3141f] font-bold">
                            &bull; Appointed Class Teacher for {staff.classTeacherOf} (Daily Roll Call & Student Oversight)
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {staff.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {staff.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Applied: {staff.appliedAt}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {staff.status === 'pending' ? (
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                      onClick={() => handleDecline(staff.id, staff.name)}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs px-4"
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenApproveModal(staff)}
                    >
                      Approve & Configure Classes
                    </Button>
                  </div>
                ) : (
                  <div className="text-right text-xs text-slate-500 shrink-0">
                    <Badge variant="teal" size="sm">
                      Configured &bull; Live
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Appointment & Course Assignment Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl bg-white shadow-2xl border-slate-200 p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#0f3a3e]">
                <Shield className="w-5 h-5 text-[#b3141f]" />
                <CardTitle className="text-base font-bold text-slate-900">
                  Staff Appointment
                </CardTitle>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Applicant Summary */}
            <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-900 text-sm">{selectedStaff.name}</p>
              <p>{selectedStaff.qualification} &bull; Specialization: {selectedStaff.department}</p>
              <p className="text-[11px] text-slate-500">{selectedStaff.email} &bull; {selectedStaff.phone}</p>
            </div>

            <div className="space-y-4">
              {/* 1. Appointed Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  1. Appointed Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'teacher', label: 'Teacher', desc: 'Class or Subject Teacher' },
                    { id: 'admin', label: 'Principal', desc: 'Academics & Administration' },
                    { id: 'bursar', label: 'Bursar', desc: 'Accounts & Tuition' },
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setAssignedRole(role.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        assignedRole === role.id
                          ? 'border-[#0f3a3e] bg-teal-50 text-[#0f3a3e] font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs font-bold">{role.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{role.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Course & Classes Configuration (For Teachers) */}
              {assignedRole === 'teacher' && (
                <div className="space-y-4 p-4 rounded-xl bg-teal-50/40 border border-teal-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                      2. Subject to Teach
                    </label>
                    <select
                      value={assignedSubject}
                      onChange={(e) => setAssignedSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
                    >
                      {availableSubjects.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                      3. Assign Teaching Classes (JSS 1 through SS 3)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Select which of the 6 classes this teacher will teach {assignedSubject} in:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {CLASSES.map((cls) => {
                        const isSelected = selectedTeachingClasses.includes(cls);
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => toggleTeachingClass(cls)}
                            className={`p-2 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'border-[#0f3a3e] bg-[#0f3a3e] text-white font-bold'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{cls}</span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Originated Official Employee ID (Strictly Read-Only) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Originated Employee ID (Auto-Generated)
                  </label>
                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> System Originated
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={generatedEmployeeId}
                    className="w-full px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 select-all cursor-not-allowed"
                  />
                  <Badge variant="teal" size="sm">
                    {assignedRole === 'admin'
                      ? 'ADMIN'
                      : assignedRole === 'bursar'
                      ? 'BURSAR'
                      : 'FACULTY'}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Prefix reflects role: <code className="font-bold">OAK-TCH</code> for Teaching Faculty, <code className="font-bold">OAK-ADM</code> for Admin, <code className="font-bold">OAK-BUR</code> for Bursar.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setSelectedStaff(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                isLoading={isApproving}
                onClick={handleConfirmApproval}
                className="bg-[#0f3a3e] hover:bg-[#164e53] text-white px-5 shadow-sm font-semibold"
              >
                Confirm Appointment & Configure Dashboard
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
