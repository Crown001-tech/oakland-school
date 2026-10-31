'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpenCheck,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  Search,
  Filter,
  ArrowRight,
  FileText,
  AlertCircle,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  total_marks: number;
  due_date: string;
  status: 'draft' | 'published' | 'closed';
  submission_type: 'text' | 'file' | 'both';
  created_at: string;
  class?: { id: string; name: string; code: string; capacity?: number };
  subject?: { id: string; name: string; code: string };
  teacher?: { id: string; first_name: string; last_name: string };
  totalSubmissions?: number;
  gradedSubmissions?: number;
  pendingGrading?: number;
  classCapacity?: number;
}

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/assignments');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAssignments(data.data);
      }
    } catch {
      // Clean fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const uniqueClasses = Array.from(
    new Set(assignments.map((a) => a.class?.name).filter(Boolean))
  ) as string[];

  const filtered = assignments.filter((a) => {
    if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;
    if (selectedClass !== 'all' && a.class?.name !== selectedClass) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchSubject = a.subject?.name.toLowerCase().includes(q);
      const matchClass = a.class?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchSubject && !matchClass) return false;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Assignments
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage class assignments and review student submissions
          </p>
        </div>

        <Link
          href="/teacher/assignments/new"
          className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-2 self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </Link>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          {(['all', 'published', 'draft', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition capitalize cursor-pointer ${
                selectedStatus === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search & Class Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {uniqueClasses.length > 0 && (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            >
              <option value="all">All Classes</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments..."
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>
        </div>
      </div>

      {/* Assignment List */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <BrandLoader />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((assignment) => {
            const dueDate = new Date(assignment.due_date);
            const isPastDue = new Date() > dueDate;

            return (
              <div
                key={assignment.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-teal-900 border border-teal-200">
                        {assignment.class?.name || 'Class'}
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {assignment.subject?.name || 'Subject'}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border capitalize ${
                        assignment.status === 'published'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : assignment.status === 'draft'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {assignment.status}
                    </span>
                  </div>

                  {/* Title and snippet */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm hover:text-teal-800 transition">
                      <Link href={`/teacher/assignments/${assignment.id}`}>
                        {assignment.title}
                      </Link>
                    </h3>
                    {assignment.instructions && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {assignment.instructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Metrics & Submission Status */}
                <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Due: <strong className={isPastDue ? 'text-red-700 font-semibold' : 'text-slate-800 font-semibold'}>{dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                    </div>
                    <span className="font-semibold text-slate-700">
                      {assignment.total_marks} Marks
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Submissions
                      </span>
                      <span className="font-bold text-slate-800 text-xs">
                        {assignment.totalSubmissions || 0} Submitted
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Graded
                      </span>
                      <span className="font-bold text-emerald-700 text-xs">
                        {assignment.gradedSubmissions || 0} Reviewed
                      </span>
                    </div>

                    <Link
                      href={`/teacher/assignments/${assignment.id}`}
                      className="px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-white font-semibold text-[11px] transition inline-flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span>Review</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Pristine Zero-Mock Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center mx-auto">
            <BookOpenCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              No Assignments Found
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              There are currently no assignments matching your selection. Create an assignment to assign tasks to your students.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/teacher/assignments/new"
              className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
