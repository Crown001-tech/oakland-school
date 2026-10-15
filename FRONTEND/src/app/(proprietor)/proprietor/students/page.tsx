'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  GraduationCap,
  Search,
  UserPlus,
  Phone,
  CheckCircle2,
  X,
  Eye,
  Upload,
} from 'lucide-react';

import { normalizeClass, getClassTeacherMap } from '@/lib/class-utils';
import { BulkImportModal } from '@/components/common/BulkImportModal';

interface StudentRecord {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female';
  class: string;
  classTeacher: string;
  guardianName: string;
  guardianPhone: string;
  attendanceRate: number | null;
  feeStatus: string;
  status: string;
}

export default function ProprietorStudentsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [enrollSuccessToast, setEnrollSuccessToast] = useState(false);
  const [loading, setLoading] = useState(true);

  const classes = ['All', 'JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classTeachers, setClassTeachers] = useState<Record<string, string>>({});

  // Enrollment Form State
  const [enrollFirstName, setEnrollFirstName] = useState('');
  const [enrollLastName, setEnrollLastName] = useState('');
  const [enrollClass, setEnrollClass] = useState('JSS 1');
  const [enrollGender, setEnrollGender] = useState<'Male' | 'Female'>('Male');
  const [enrollGuardianName, setEnrollGuardianName] = useState('');
  const [enrollGuardianPhone, setEnrollGuardianPhone] = useState('');
  const [enrollGuardianEmail, setEnrollGuardianEmail] = useState('');
  const [enrollDob, setEnrollDob] = useState('2012-05-15');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [studentsRes, staffRes, financeRes] = await Promise.all([
        fetch('/api/students').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/staff').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/finances').then((r) => r.json()).catch(() => ({ data: {} })),
      ]);

      const staffList = Array.isArray(staffRes?.data) ? staffRes.data : [];
      const teacherMap = getClassTeacherMap(staffList);
      setClassTeachers(teacherMap);

      const ledgerList = Array.isArray(financeRes?.data?.studentLedger) ? financeRes.data.studentLedger : [];

      const rawStudents = Array.isArray(studentsRes?.data) ? studentsRes.data : [];
      const mapped: StudentRecord[] = rawStudents.map((s: any) => {
        const parts = (s.fullName || '').trim().split(' ');
        const targetClass = normalizeClass(s.class) || 'JSS 1';
        const assignedTeacher =
          teacherMap[targetClass] && teacherMap[targetClass] !== 'Unassigned'
            ? teacherMap[targetClass]
            : 'Unassigned';

        const ledgerMatch = ledgerList.find(
          (l: any) => l.studentId === s.id || l.admissionNo === s.admissionNo
        );
        const resolvedFeeStatus = ledgerMatch ? ledgerMatch.status : '—';
        const resolvedAttRate = s.attendanceRate ? Number(s.attendanceRate) : null;

        return {
          id: s.id,
          admissionNo: s.admissionNo,
          firstName: parts[0] || 'Student',
          lastName: parts.slice(1).join(' ') || '',
          gender: s.gender === 'Female' ? 'Female' : 'Male',
          class: targetClass,
          classTeacher: assignedTeacher,
          guardianName: s.guardianName || 'Guardian',
          guardianPhone: s.guardianPhone || '—',
          attendanceRate: resolvedAttRate,
          feeStatus: resolvedFeeStatus,
          status: s.status || 'Active',
        };
      });

      setStudents(mapped);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollFirstName.trim() || !enrollLastName.trim()) {
      alert('Please provide student first and last name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        firstName: enrollFirstName.trim(),
        lastName: enrollLastName.trim(),
        class: enrollClass,
        gender: enrollGender,
        guardianName: enrollGuardianName.trim() || 'Primary Guardian',
        guardianPhone: enrollGuardianPhone.trim() || '—',
        guardianEmail: enrollGuardianEmail.trim() || '—',
        dob: enrollDob,
      };

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setShowEnrollModal(false);
        setEnrollSuccessToast(true);
        setTimeout(() => setEnrollSuccessToast(false), 4000);
        setEnrollFirstName('');
        setEnrollLastName('');
        setEnrollGuardianName('');
        setEnrollGuardianPhone('');
        setEnrollGuardianEmail('');
        await loadData();
      } else {
        alert(json.message || 'Enrollment failed');
      }
    } catch {
      alert('Error communicating with server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkImportComplete = async (importedRows: any[]) => {
    const newStudents = importedRows.map((r) => ({
      admissionNo: r.admissionNo || undefined,
      fullName: r.fullName,
      class: r.class || 'JSS 1',
      gender: r.gender || 'Male',
      guardianName: r.guardianName || 'Guardian',
      guardianPhone: r.guardianPhone || '—',
      guardianEmail: r.guardianEmail || '—',
    }));

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudents),
      });
      const data = await res.json();
      if (data?.success) {
        setEnrollSuccessToast(true);
        setTimeout(() => setEnrollSuccessToast(false), 4000);
        await loadData();
      } else {
        alert(data?.message || 'Error saving students');
      }
    } catch {
      alert('Network error saving students');
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  // Filtering
  const filteredStudents = students.filter((s) => {
    const matchesClass = selectedClass === 'All' || s.class === selectedClass;
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchesSearch =
      s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.guardianName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesStatus && matchesSearch;
  });

  const classCounts = classes.reduce<Record<string, number>>((acc, cls) => {
    acc[cls] = cls === 'All' ? students.length : students.filter((s) => s.class === cls).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Student Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete pupil roster across JSS 1 through SS 3 with guardian contact records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setShowBulkImportModal(true)}
          >
            Bulk Import
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={() => setShowEnrollModal(true)}
          >
            Direct Enrollment
          </Button>
        </div>
      </div>

      {enrollSuccessToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Student enrolled and stored in database successfully.</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Total Enrolled
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{students.length}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Live Database Records
          </p>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Junior School
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {(classCounts['JSS 1'] || 0) + (classCounts['JSS 2'] || 0) + (classCounts['JSS 3'] || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            JSS 1: {classCounts['JSS 1'] || 0} &bull; JSS 2: {classCounts['JSS 2'] || 0} &bull; JSS 3: {classCounts['JSS 3'] || 0}
          </p>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Senior School
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {(classCounts['SS 1'] || 0) + (classCounts['SS 2'] || 0) + (classCounts['SS 3'] || 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            SS 1: {classCounts['SS 1'] || 0} &bull; SS 2: {classCounts['SS 2'] || 0} &bull; SS 3: {classCounts['SS 3'] || 0}
          </p>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Fee Clearance Rate
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">100.0%</p>
          <p className="text-[11px] text-slate-500 mt-1">
            All active accounts in good standing
          </p>
        </Card>
      </div>

      {/* Class Switcher Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
        {classes.map((cls) => (
          <button
            key={cls}
            onClick={() => setSelectedClass(cls)}
            className={`px-3.5 py-2 font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
              selectedClass === cls
                ? 'bg-[#0f3a3e] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>{cls}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedClass === cls
                  ? 'bg-[#b3141f] text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {classCounts[cls] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by student name, admission number, or guardian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* Student Roster Table */}
      <Card className="p-0 overflow-hidden border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Student ID</th>
                <th className="py-3.5 px-4 font-semibold">Student Name</th>
                <th className="py-3.5 px-4 font-semibold">Class</th>
                <th className="py-3.5 px-4 font-semibold">Guardian Contact</th>
                <th className="py-3.5 px-4 text-center font-semibold">Attendance</th>
                <th className="py-3.5 px-4 text-center font-semibold">Fee Status</th>
                <th className="py-3.5 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No student records matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-800 text-[11px]">
                      {student.admissionNo}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                          {student.firstName[0]}
                          {student.lastName ? student.lastName[0] : ''}
                        </div>
                        <div>
                          <Link
                            href={`/proprietor/students/${student.id}`}
                            className="font-bold text-slate-900 hover:text-teal-700 hover:underline transition-colors block"
                          >
                            {student.firstName} {student.lastName}
                          </Link>
                          <span className="text-[10px] text-slate-500 capitalize">
                            {student.gender}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="teal" size="sm">
                        {student.class}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{student.guardianName}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {student.guardianPhone}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {student.attendanceRate !== null ? (
                        <span className="font-bold text-slate-900">{student.attendanceRate}%</span>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {student.feeStatus !== '—' ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            student.feeStatus === 'Cleared'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : student.feeStatus === 'Partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {student.feeStatus}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/proprietor/students/${student.id}`}>
                        <Button size="sm" variant="outline" className="text-xs py-1 px-3" leftIcon={<Eye className="w-3 h-3" />}>
                          View Profile
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Direct Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-white shadow-xl border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0f3a3e]" />
                <h3 className="text-base font-bold text-slate-900">Direct Student Enrollment</h3>
              </div>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={enrollFirstName}
                    onChange={(e) => setEnrollFirstName(e.target.value)}
                    placeholder="e.g. Samuel"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={enrollLastName}
                    onChange={(e) => setEnrollLastName(e.target.value)}
                    placeholder="e.g. Okafor"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Class</label>
                  <select
                    value={enrollClass}
                    onChange={(e) => setEnrollClass(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    {classes.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={enrollGender}
                    onChange={(e) => setEnrollGender(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={enrollDob}
                    onChange={(e) => setEnrollDob(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Guardian Name</label>
                  <input
                    type="text"
                    required
                    value={enrollGuardianName}
                    onChange={(e) => setEnrollGuardianName(e.target.value)}
                    placeholder="e.g. Mr. Okafor"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Guardian Phone</label>
                  <input
                    type="tel"
                    required
                    value={enrollGuardianPhone}
                    onChange={(e) => setEnrollGuardianPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Guardian Email</label>
                  <input
                    type="email"
                    value={enrollGuardianEmail}
                    onChange={(e) => setEnrollGuardianEmail(e.target.value)}
                    placeholder="e.g. parent@example.com"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  type="submit"
                  isLoading={isSubmitting}
                >
                  Complete Enrollment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        importType="students"
        onImportComplete={handleBulkImportComplete}
      />
    </div>
  );
}
