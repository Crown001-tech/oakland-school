'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Download,
  ExternalLink,
  Award,
  Sparkles,
  Lock,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface AssignmentDetails {
  id: string;
  title: string;
  description: string;
  instructions: string;
  total_marks: number;
  due_date: string;
  status: 'published' | 'closed';
  submission_type: 'text' | 'file' | 'both';
  allowed_formats: string[];
  max_file_size_mb: number;
  late_policy: 'allow_with_flag' | 'disallow' | 'penalty';
  class?: { id: string; name: string; code: string };
  subject?: { id: string; name: string; code: string };
  teacher?: { id: string; first_name: string; last_name: string };
  submission?: {
    id: string;
    submission_text?: string;
    file_url?: string;
    file_name?: string;
    file_size_bytes?: number;
    submitted_at: string;
    status: 'submitted' | 'graded' | 'late' | 'returned';
    marks_awarded: number | null;
    teacher_feedback: string | null;
  } | null;
  isSubmitted: boolean;
  isPastDue: boolean;
}

export default function StudentAssignmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Submission Form State
  const [writtenText, setWrittenText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadAssignment = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAssignment(data.data);
        if (data.data.submission?.submission_text) {
          setWrittenText(data.data.submission.submission_text);
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!assignment) return;

    if (assignment.submission_type === 'text' && !writtenText.trim()) {
      setSubmitError('Please enter your written answer.');
      return;
    }

    if (assignment.submission_type === 'file' && !selectedFile) {
      setSubmitError('Please attach a document file.');
      return;
    }

    if (assignment.submission_type === 'both' && !writtenText.trim() && !selectedFile) {
      setSubmitError('Please provide either written answer text or attach a file.');
      return;
    }

    setIsSubmitting(true);

    try {
      // If file attached, simulate upload or save
      let fileUrl = null;
      let fileName = null;
      let fileSizeBytes = null;

      if (selectedFile) {
        fileName = selectedFile.name;
        fileSizeBytes = selectedFile.size;
        fileUrl = `/uploads/assignments/${Date.now()}_${encodeURIComponent(selectedFile.name)}`;
      }

      const res = await fetch(`/api/assignments/${assignment.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionText: writtenText,
          fileUrl,
          fileName,
          fileSizeBytes,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        setSubmitError(resData.message || 'Submission failed.');
      } else {
        setSubmitSuccess(resData.message || 'Assignment submitted successfully.');
        await loadAssignment();
      }
    } catch {
      setSubmitError('Network communication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <BrandLoader />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-md mx-auto text-center p-12 bg-white rounded-2xl border border-slate-200 space-y-3">
        <h2 className="text-base font-bold text-slate-900">Assignment Not Found</h2>
        <p className="text-xs text-slate-500">The requested assignment does not exist or has been removed.</p>
        <Link
          href="/student/assignments"
          className="inline-block px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold cursor-pointer"
        >
          Return to Assignments
        </Link>
      </div>
    );
  }

  const dueDate = new Date(assignment.due_date);
  const isPastDue = new Date() > dueDate;
  const isGraded = assignment.submission?.status === 'graded';
  const isSubmitted = assignment.isSubmitted;
  const isLateDisallowed = isPastDue && assignment.late_policy === 'disallow' && !isSubmitted;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/student/assignments"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            {assignment.title}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Subject: <strong className="text-slate-800">{assignment.subject?.name || '—'}</strong>
            <span className="mx-2 text-slate-300">&bull;</span>
            Instructor: <span className="text-slate-700">{assignment.teacher ? `${assignment.teacher.first_name} ${assignment.teacher.last_name}` : 'Subject Teacher'}</span>
          </p>
        </div>
      </div>

      {/* Overview Identity Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Deadline
            </span>
            <p className={`font-bold text-sm ${isPastDue && !isSubmitted ? 'text-red-700' : 'text-slate-900'}`}>
              {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Marks
            </span>
            <p className="font-bold text-slate-900 text-sm">
              {assignment.total_marks} Points
            </p>
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase ${
              isGraded
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : isSubmitted
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : isPastDue
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isGraded
              ? 'Graded'
              : isSubmitted
              ? assignment.submission?.status === 'late'
                ? 'Submitted Late'
                : 'Submitted'
              : isPastDue
              ? 'Overdue'
              : 'Pending'}
          </div>
        </div>
      </div>

      {/* Graded Feedback Banner (If Graded) */}
      {isGraded && (
        <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
              <Award className="w-5 h-5 text-emerald-700" />
              <span>Assessment Grade Released</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">
                Score
              </span>
              <p className="text-2xl font-bold text-emerald-900">
                {assignment.submission?.marks_awarded} <span className="text-sm font-normal text-emerald-700">/ {assignment.total_marks}</span>
              </p>
            </div>
          </div>

          {assignment.submission?.teacher_feedback && (
            <div className="pt-2 border-t border-emerald-200/80">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Teacher Feedback
              </span>
              <p className="text-xs text-emerald-950 italic mt-1 leading-relaxed">
                &ldquo;{assignment.submission.teacher_feedback}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4 text-xs">
        <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-3">
          <BookOpenCheck className="w-4 h-4 text-brand-primary" />
          <span>Task Instructions</span>
        </h2>

        <div className="text-slate-700 leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
          {assignment.instructions || assignment.description || 'No specific instructions provided.'}
        </div>
      </div>

      {/* Submission Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5 text-xs">
        <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-3">
          <FileText className="w-4 h-4 text-brand-primary" />
          <span>Your Submission</span>
        </h2>

        {submitError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {submitSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{submitSuccess}</span>
          </div>
        )}

        {isLateDisallowed ? (
          <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-center space-y-2">
            <Lock className="w-6 h-6 text-red-700 mx-auto" />
            <h3 className="font-bold text-red-900 text-sm">Submission Closed</h3>
            <p className="text-xs text-red-800 max-w-md mx-auto">
              The submission deadline has expired. This assignment does not permit late submissions.
            </p>
          </div>
        ) : isSubmitted ? (
          /* Read-only submitted record */
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                <span>Submitted on {new Date(assignment.submission!.submitted_at).toLocaleDateString()} at {new Date(assignment.submission!.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {assignment.submission?.status === 'late' && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                  Late Flag
                </span>
              )}
            </div>

            {assignment.submission?.submission_text && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Submitted Answer
                </span>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {assignment.submission.submission_text}
                </div>
              </div>
            )}

            {assignment.submission?.file_url && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Attached File
                </span>
                <a
                  href={assignment.submission.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl border border-brand-primary/20 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary font-semibold inline-flex items-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-brand-primary" />
                  <span>{assignment.submission.file_name || 'Download Submitted Document'}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-brand-primary ml-1" />
                </a>
              </div>
            )}
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {isPastDue && assignment.late_policy === 'allow_with_flag' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Notice: The official deadline has passed. Your submission will be recorded with a late flag.</span>
              </div>
            )}

            {assignment.submission_type !== 'file' && (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Written Answer
                </label>
                <textarea
                  rows={6}
                  value={writtenText}
                  onChange={(e) => setWrittenText(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary leading-relaxed text-xs"
                />
              </div>
            )}

            {assignment.submission_type !== 'text' && (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Attach File
                </label>
                <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition text-center space-y-2">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <div>
                    <input
                      type="file"
                      id="assignmentFile"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                    <label
                      htmlFor="assignmentFile"
                      className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer inline-block shadow-xs"
                    >
                      Browse Files
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {selectedFile ? (
                      <strong className="text-brand-primary">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</strong>
                    ) : (
                      `Supported formats: ${(assignment.allowed_formats || ['pdf', 'docx']).join(', ').toUpperCase()} (Max: ${assignment.max_file_size_mb || 10}MB)`
                    )}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white font-semibold text-xs transition shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Submitting Assignment...</span>
              ) : (
                <span>Submit Assignment</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
