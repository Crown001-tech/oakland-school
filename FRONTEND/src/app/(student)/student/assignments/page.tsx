'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Award,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  total_marks: number;
  due_date: string;
  status: 'published' | 'closed';
  submission_type: 'text' | 'file' | 'both';
  class?: { id: string; name: string; code: string };
  subject?: { id: string; name: string; code: string };
  teacher?: { id: string; first_name: string; last_name: string };
  submission?: {
    id: string;
    submitted_at: string;
    status: 'submitted' | 'graded' | 'late';
    marks_awarded: number | null;
    teacher_feedback: string | null;
  } | null;
  studentStatus: 'pending' | 'submitted' | 'graded' | 'late' | 'overdue';
  isSubmitted: boolean;
  isPastDue: boolean;
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'graded' | 'all'>('pending');

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

  const pendingCount = assignments.filter((a) => !a.isSubmitted && !a.isPastDue).length;
  const submittedCount = assignments.filter((a) => a.isSubmitted && a.submission?.status !== 'graded').length;
  const gradedCount = assignments.filter((a) => a.submission?.status === 'graded').length;

  const filtered = assignments.filter((a) => {
    if (activeTab === 'pending') return !a.isSubmitted;
    if (activeTab === 'submitted') return a.isSubmitted && a.submission?.status !== 'graded';
    if (activeTab === 'graded') return a.submission?.status === 'graded';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          Assignments
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Your class assignments and homework tasks
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        {[
          { key: 'pending', label: 'Pending', count: pendingCount },
          { key: 'submitted', label: 'Submitted', count: submittedCount },
          { key: 'graded', label: 'Graded', count: gradedCount },
          { key: 'all', label: 'All Tasks', count: assignments.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl font-semibold transition inline-flex items-center gap-2 cursor-pointer ${
              activeTab === tab.key
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Assignment List */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <BrandLoader />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3.5">
          {filtered.map((assignment) => {
            const dueDate = new Date(assignment.due_date);
            const isPastDue = new Date() > dueDate;

            return (
              <div
                key={assignment.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      {assignment.subject?.name || 'Subject'}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border uppercase text-[10px] ${
                        assignment.submission?.status === 'graded'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : assignment.submission?.status === 'submitted' || assignment.submission?.status === 'late'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : isPastDue
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {assignment.submission?.status === 'graded'
                        ? 'Graded'
                        : assignment.isSubmitted
                        ? assignment.submission?.status === 'late'
                          ? 'Submitted Late'
                          : 'Submitted'
                        : isPastDue
                        ? 'Overdue'
                        : 'Pending'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">
                    {assignment.title}
                  </h3>

                  {assignment.instructions && (
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                      {assignment.instructions}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Due: <strong className={isPastDue && !assignment.isSubmitted ? 'text-red-700 font-semibold' : 'text-slate-700 font-semibold'}>
                          {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </span>
                    </span>

                    <span>&bull;</span>

                    <span>Total: <strong className="text-slate-800 font-semibold">{assignment.total_marks} Marks</strong></span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {assignment.submission?.status === 'graded' && (
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Score
                      </span>
                      <span className="font-bold text-emerald-700 text-sm">
                        {assignment.submission.marks_awarded} / {assignment.total_marks}
                      </span>
                    </div>
                  )}

                  <Link
                    href={`/student/assignments/${assignment.id}`}
                    className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{assignment.isSubmitted ? 'View Submission' : 'Open Task'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Pristine Zero-Mock Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center max-w-xl mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center mx-auto">
            <CheckSquare className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">
            {activeTab === 'pending'
              ? 'No Pending Assignments'
              : activeTab === 'submitted'
              ? 'No Submitted Assignments'
              : activeTab === 'graded'
              ? 'No Graded Assignments'
              : 'No Assignments Recorded'}
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
            {activeTab === 'pending'
              ? 'You have completed all active homework and coursework assignments. New tasks will appear here as faculty release them.'
              : 'There are currently no items under this category.'}
          </p>
        </div>
      )}
    </div>
  );
}
