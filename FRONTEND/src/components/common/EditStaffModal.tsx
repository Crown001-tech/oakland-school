'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  X,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  BookOpen,
  School,
  Briefcase,
  Phone,
  Building,
} from 'lucide-react';
import {
  getRegisteredCurriculumSubjectNames,
  filterValidCurriculumSubjects,
} from '@/lib/curriculum-data';

const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

interface TeachingAssignment {
  subject: string;
  classes: string[];
}

export interface EditableStaff {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  role: 'Class Teacher' | 'Subject Teacher' | 'Non-Teaching Staff' | string;
  assignedClass?: string | null;
  assignedHomeroom?: string | null;
  subjects?: string[];
  teachingAssignments?: TeachingAssignment[];
  department?: string;
}

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: EditableStaff | null;
  onSuccess: (updatedRole?: string, updatedHomeroom?: string | null) => void;
}

export function EditStaffModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}: EditStaffModalProps) {
  const [role, setRole] = useState<'Class Teacher' | 'Subject Teacher' | 'Non-Teaching Staff'>('Subject Teacher');
  const [homeroom, setHomeroom] = useState<string>('');
  const [department, setDepartment] = useState('Academics');
  const [phone, setPhone] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const curriculumSubjects = getRegisteredCurriculumSubjectNames();

  // Populate state when staff changes or modal opens
  useEffect(() => {
    if (!staff || !isOpen) return;

    setErrorMsg(null);
    const resolvedRole =
      staff.role === 'Class Teacher' || staff.role === 'Subject Teacher' || staff.role === 'Non-Teaching Staff'
        ? (staff.role as 'Class Teacher' | 'Subject Teacher' | 'Non-Teaching Staff')
        : 'Subject Teacher';

    setRole(resolvedRole);
    setHomeroom(staff.assignedHomeroom || staff.assignedClass || '');
    setDepartment(staff.department || (resolvedRole === 'Non-Teaching Staff' ? 'Operations' : 'Academics'));
    setPhone(staff.phone && staff.phone !== '—' ? staff.phone : '');

    const subs = Array.isArray(staff.subjects) ? staff.subjects : [];
    setSelectedSubjects(filterValidCurriculumSubjects(subs, curriculumSubjects));

    const assign = Array.isArray(staff.teachingAssignments) && staff.teachingAssignments.length > 0
      ? staff.teachingAssignments
      : subs.map((s) => ({ subject: s, classes: [] }));
    setAssignments(assign);

    // Fetch existing staff to map homeroom occupants
    fetch('/api/staff')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) {
          setAllStaff(data.data);
        }
      })
      .catch(() => {});
  }, [staff, isOpen]);

  if (!isOpen || !staff) return null;

  const staffDisplayName = staff.fullName || staff.name || staff.email;

  // Map which classes are occupied
  const homeroomMap = new Map<string, string>();
  allStaff.forEach((s) => {
    const classAssigned = s.assignedClass || s.assignedHomeroom;
    if (classAssigned && s.id !== staff.id && s.email?.toLowerCase() !== staff.email?.toLowerCase()) {
      homeroomMap.set(classAssigned.trim(), s.name);
    }
  });

  const handleToggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      setSelectedSubjects((prev) => prev.filter((s) => s !== sub));
      setAssignments((prev) => prev.filter((a) => a.subject !== sub));
    } else {
      setSelectedSubjects((prev) => [...prev, sub]);
      setAssignments((prev) => [...prev, { subject: sub, classes: [] }]);
    }
  };

  const handleToggleClassForSubject = (sub: string, cls: string) => {
    setAssignments((prev) => {
      const existing = prev.find((a) => a.subject === sub);
      if (!existing) {
        return [...prev, { subject: sub, classes: [cls] }];
      }
      const classes = existing.classes.includes(cls)
        ? existing.classes.filter((c) => c !== cls)
        : [...existing.classes, cls];
      return prev.map((a) => (a.subject === sub ? { ...a, classes } : a));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    const payload = {
      action: 'update_role_assignment',
      role,
      assignedHomeroom: role === 'Class Teacher' ? (homeroom || null) : null,
      subjects: role === 'Non-Teaching Staff' ? [] : selectedSubjects,
      teachingAssignments: role === 'Non-Teaching Staff' ? [] : assignments,
      department: department.trim() || 'Academics',
      phone: phone.trim() || '—',
    };

    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || data.error || 'Failed to update staff record');
        setIsSaving(false);
        return;
      }

      setIsSaving(false);
      onSuccess(role, payload.assignedHomeroom);
      onClose();
    } catch {
      setErrorMsg('Network error while saving changes. Please retry.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0f3a3e] text-white uppercase tracking-wider">
                Staff Administration
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {staff.email}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1">
              Edit Role & Assignment
            </h2>
            <p className="text-xs text-slate-500">
              Configure designated responsibility, homeroom custody, and teaching allocations for <span className="font-semibold text-slate-800">{staffDisplayName}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Cannot Save Changes</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Staff Role Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block">
              Designated Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'Class Teacher',
                  title: 'Class Teacher',
                  icon: School,
                },
                {
                  id: 'Subject Teacher',
                  title: 'Subject Teacher',
                  icon: BookOpen,
                },
                {
                  id: 'Non-Teaching Staff',
                  title: 'Non-Teaching',
                  icon: Briefcase,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = role === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setRole(opt.id as any);
                      if (opt.id === 'Non-Teaching Staff') {
                        setDepartment('Operations');
                        setHomeroom('');
                      } else {
                        setDepartment('Academics');
                      }
                    }}
                    className={`py-3 px-3.5 rounded-xl border transition cursor-pointer flex items-center justify-center gap-2 ${
                      isSelected
                        ? 'border-[#0f3a3e] bg-teal-50/60 ring-1 ring-[#0f3a3e]'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#0f3a3e]' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${isSelected ? 'text-[#0f3a3e]' : 'text-slate-700'}`}>
                      {opt.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Homeroom Assignment (Only for Class Teacher) */}
          {role === 'Class Teacher' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Homeroom Custody</span>
                <span className="text-[11px] font-normal text-slate-500">A class has strictly one Class Teacher</span>
              </label>

              <select
                value={homeroom}
                onChange={(e) => setHomeroom(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0f3a3e]"
              >
                <option value="">— Select Homeroom Class (Unassigned) —</option>
                {CLASSES.map((c) => {
                  const occupant = homeroomMap.get(c);
                  return (
                    <option key={c} value={c} disabled={Boolean(occupant)}>
                      {c} {occupant ? `(Occupied by ${occupant})` : '(Available)'}
                    </option>
                  );
                })}
              </select>
              {homeroom && (
                <p className="text-[11px] text-emerald-800 font-medium">
                  {staffDisplayName} will be assigned as the homeroom teacher for <span className="font-bold">{homeroom}</span>.
                </p>
              )}
            </div>
          )}

          {/* 3. Subjects & Class Allocations (For Teaching Staff) */}
          {role !== 'Non-Teaching Staff' && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Subjects Taught
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Select official curriculum subjects taught by this teacher:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {curriculumSubjects.map((sub) => {
                    const isSelected = selectedSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleToggleSubject(sub)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#0f3a3e] text-white border-[#0f3a3e]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Class Allocations Per Subject */}
              {selectedSubjects.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-900 block">
                    Class Allocations by Subject
                  </label>
                  <div className="space-y-2">
                    {selectedSubjects.map((sub) => {
                      const assign = assignments.find((a) => a.subject === sub);
                      const subClasses = assign?.classes || [];
                      return (
                        <div
                          key={sub}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <span className="text-xs font-bold text-slate-900 shrink-0">
                            {sub}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {CLASSES.map((cls) => {
                              const isChecked = subClasses.includes(cls);
                              return (
                                <button
                                  key={cls}
                                  type="button"
                                  onClick={() => handleToggleClassForSubject(sub, cls)}
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold border transition cursor-pointer ${
                                    isChecked
                                      ? 'bg-purple-50 text-purple-900 border-purple-300'
                                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {cls}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Department & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">
                Department
              </label>
              <div className="relative">
                <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Academics, Operations"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0f3a3e] bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#0f3a3e] bg-white"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="bg-[#0f3a3e] hover:bg-[#164e53] text-white font-bold"
            >
              {isSaving ? 'Saving...' : 'Save Role & Assignment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
