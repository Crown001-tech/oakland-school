'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  Search,
  Plus,
  ArrowRight,
  User,
  Phone,
  Filter,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { BulkImportModal } from '@/components/common/BulkImportModal';

interface StudentRecord {
  id: string;
  admissionNo: string;
  fullName: string;
  class: string;
  gender: 'Male' | 'Female';
  guardianName: string;
  guardianPhone: string;
  attendanceRate: string;
  status: 'Active' | 'Withdrawn' | 'Graduated';
}

const DEFAULT_STUDENTS: StudentRecord[] = [];

const CLASSES = ['All', 'JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>(DEFAULT_STUDENTS);
  const [selectedClass, setSelectedClass] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchLiveStudents = () => {
    fetch('/api/students')
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setStudents(res.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchLiveStudents();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleBulkImportComplete = async (importedRows: any[]) => {
    const newStudents = importedRows.map((r) => ({
      admissionNo: r.admissionNo || undefined,
      fullName: r.fullName,
      class: r.class || 'JSS 1',
      gender: r.gender || 'Male',
      guardianName: r.guardianName || 'Guardian',
      guardianPhone: r.guardianPhone || '—',
    }));

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudents),
      });
      const data = await res.json();
      if (data?.success) {
        showToast(`Successfully registered ${newStudents.length} students into the database!`);
        fetchLiveStudents();
      } else {
        showToast(`Error saving students: ${data?.message || 'Database error'}`);
      }
    } catch {
      showToast('Network error saving students to database.');
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesClass = selectedClass === 'All' || s.class === selectedClass;
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.guardianName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#0f3a3e] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Students</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Student directory, class assignments, and individual profiles.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsBulkModalOpen(true)}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-teal-800" />
            <span>Bulk Import Students</span>
          </Button>

          <Link href="/admin/admissions">
            <Button
              type="button"
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Admit Student</span>
            </Button>
          </Link>
        </div>
      </div>

      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        importType="students"
        onImportComplete={handleBulkImportComplete}
      />


      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
        {/* Class Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {CLASSES.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedClass === cls
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID or guardian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-800 bg-white"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">
            {filteredStudents.length} Students Listed
          </span>
          <span className="text-xs text-slate-500 font-medium">
            2026/2027 Academic Session
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4 font-semibold">Admission No</th>
                <th className="py-2.5 px-4 font-semibold">Student Name</th>
                <th className="py-2.5 px-4 font-semibold">Class</th>
                <th className="py-2.5 px-4 font-semibold">Guardian</th>
                <th className="py-2.5 px-4 font-semibold">Phone</th>
                <th className="py-2.5 px-4 font-semibold">Attendance</th>
                <th className="py-2.5 px-4 font-semibold text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No students registered yet. Use &quot;Admit Student&quot; to admit students into JSS 1 – SS 3.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">
                      {student.admissionNo}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{student.fullName}</span>
                      <span className="text-[11px] text-slate-400 block">{student.gender}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{student.class}</td>
                    <td className="py-3 px-4 text-slate-700">{student.guardianName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{student.guardianPhone}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                      {student.attendanceRate}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs inline-flex items-center gap-1 transition"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
