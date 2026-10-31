'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Users,
  Search,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface RosterItem {
  studentId: string;
  name: string;
  admissionNumber: string;
  photoUrl: string | null;
  status: 'pending' | 'submitted' | 'late' | 'graded' | 'missing';
  submission: {
    id: string;
    submission_text?: string;
    file_url?: string;
    file_name?: string;
    file_size_bytes?: number;
    submitted_at?: string;
    status: string;
    marks_awarded?: number;
    teacher_feedback?: string;
  } | null;
  marksAwarded: number | null;
  submittedAt: string | null;
  teacherFeedback: string | null;
}

interface AssignmentData {
  id: string;
  title: string;
  description: string;
  instructions: string;
  total_marks: number;
  due_date: string;
  status: 'draft' | 'published' | 'closed';
  submission_type: 'text' | 'file' | 'both';
  class?: { id: string; name: string; code: string };
  subject?: { id: string; name: string; code: string };
  teacher?: { id: string; first_name: string; last_name: string };
  roster: RosterItem[];
  totalEnrolled: number;
  totalSubmitted: number;
  totalGraded: number;
}

export default function TeacherAssignmentReviewPage() {
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Grading Drawer State
  const [activeItem, setActiveItem] = useState<RosterItem | null>(null);
  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const loadAssignment = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAssignment(data.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (assignmentId) loadAssignment();
  }, [assignmentId]);

  const handleOpenGrading = (item: RosterItem) => {
    setActiveItem(item);
    setGradeInput(item.submission?.marks_awarded !== undefined && item.submission?.marks_awarded !== null ? String(item.submission.marks_awarded) : '');
    setFeedbackInput(item.submission?.teacher_feedback || '');
    setGradeError(null);
  };

  const handleCloseGrading = () => {
    setActiveItem(null);
    setGradeError(null);
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem?.submission?.id || !assignment) return;

    const numeric = Number(gradeInput);
    if (isNaN(numeric) || numeric < 0 || numeric > assignment.total_marks) {
      setGradeError(`Marks must be a number between 0 and ${assignment.total_marks}.`);
      return;
    }

    setIsSubmittingGrade(true);
    setGradeError(null);

    try {
      const res = await fetch(`/api/assignments/${assignment.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: activeItem.submission.id,
          marksAwarded: numeric,
          teacherFeedback: feedbackInput,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setGradeError(resData.message || 'Failed to save grade.');
      } else {
        handleCloseGrading();
        await loadAssignment();
      }
    } catch {
      setGradeError('Network communication error. Please try again.');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const roster = assignment?.roster || [];
  const filteredRoster = roster.filter((item) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchAdm = item.admissionNumber.toLowerCase().includes(q);
      if (!matchName && !matchAdm) return false;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/assignments"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
              {assignment?.title || 'Review Assignment Submissions'}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Class: <strong className="text-slate-800">{assignment?.class?.name || '—'}</strong>
              <span className="mx-2 text-slate-300">&bull;</span>
              Subject: <strong className="text-slate-800">{assignment?.subject?.name || '—'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          <span
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize ${
              assignment?.status === 'published'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : assignment?.status === 'draft'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {assignment?.status || 'Active'}
          </span>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Class Enrolled
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {assignment?.totalEnrolled || 0} Students
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Submissions Received
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {assignment?.totalSubmitted || 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Graded
          </span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {assignment?.totalGraded || 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Marks
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {assignment?.total_marks || 100} Points
          </p>
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
            {(['all', 'submitted', 'graded', 'late', 'missing'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition capitalize cursor-pointer ${
                  filterStatus === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by student name..."
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20 text-xs"
            />
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-20 flex items-center justify-center">
            <BrandLoader />
          </div>
        ) : filteredRoster.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Admission Number</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Marks Awarded</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((item) => (
                  <tr key={item.studentId} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {item.admissionNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                          item.status === 'graded'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : item.status === 'submitted'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : item.status === 'late'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {item.marksAwarded !== null ? `${item.marksAwarded} / ${assignment?.total_marks}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {item.submission ? (
                        <button
                          type="button"
                          onClick={() => handleOpenGrading(item)}
                          className="px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-white font-semibold text-[11px] transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>{item.status === 'graded' ? 'Edit Grade' : 'Grade Submission'}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No submission</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-500">
            No students found matching your filter criteria.
          </div>
        )}
      </div>

      {/* Grading Drawer / Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Grading Submission: {activeItem.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Admission No: <span className="font-mono">{activeItem.admissionNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseGrading}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {gradeError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{gradeError}</span>
                </div>
              )}

              {/* Student Submitted Answer */}
              {activeItem.submission?.submission_text && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Written Answer Text
                  </span>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {activeItem.submission.submission_text}
                  </div>
                </div>
              )}

              {/* Student Attached File */}
              {activeItem.submission?.file_url && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Attached File
                  </span>
                  <a
                    href={activeItem.submission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-50 text-teal-900 font-semibold inline-flex items-center gap-2 transition"
                  >
                    <Download className="w-4 h-4 text-teal-700" />
                    <span>{activeItem.submission.file_name || 'Download Submission File'}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-teal-600 ml-1" />
                  </a>
                </div>
              )}

              {/* Grading Form */}
              <form id="gradeForm" onSubmit={handleSaveGrade} className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Marks Awarded (Out of {assignment?.total_marks}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={assignment?.total_marks || 100}
                    required
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    placeholder="Enter score"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Teacher Feedback
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Enter feedback for student..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 leading-relaxed"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/50">
              <button
                type="button"
                onClick={handleCloseGrading}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="submit"
                form="gradeForm"
                disabled={isSubmittingGrade}
                className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingGrade ? 'Saving Grade...' : 'Save Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
