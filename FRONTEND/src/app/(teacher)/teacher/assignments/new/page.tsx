'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenCheck,
  Calendar,
  Clock,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

export default function NewAssignmentPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submissionType, setSubmissionType] = useState<'text' | 'file' | 'both'>('both');
  const [allowedFormats, setAllowedFormats] = useState<string[]>(['pdf', 'docx', 'jpg', 'png']);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState('10');
  const [latePolicy, setLatePolicy] = useState<'allow_with_flag' | 'disallow'>('allow_with_flag');
  const [status, setStatus] = useState<'published' | 'draft'>('published');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      setIsLoadingMeta(true);
      try {
        const [clsRes, subRes] = await Promise.all([
          fetch('/api/classes').then((r) => r.json()),
          fetch('/api/subjects').then((r) => r.json()),
        ]);

        if (clsRes.success && Array.isArray(clsRes.data)) {
          setClasses(clsRes.data);
          if (clsRes.data.length > 0) setClassId(clsRes.data[0].id);
        }

        if (subRes.success && Array.isArray(subRes.data)) {
          setSubjects(subRes.data);
          if (subRes.data.length > 0) setSubjectId(subRes.data[0].id);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoadingMeta(false);
      }
    }

    loadMeta();

    // Default due date to 7 days in future at 23:59
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    defaultDate.setHours(23, 59, 0, 0);
    const localIso = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDueDate(localIso);
  }, []);

  const handleFormatToggle = (fmt: string) => {
    if (allowedFormats.includes(fmt)) {
      if (allowedFormats.length > 1) {
        setAllowedFormats(allowedFormats.filter((f) => f !== fmt));
      }
    } else {
      setAllowedFormats([...allowedFormats, fmt]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please enter an assignment title.');
      return;
    }
    if (!classId) {
      setErrorMsg('Please select a target class.');
      return;
    }
    if (!subjectId) {
      setErrorMsg('Please select a subject.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('Please set a due date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          instructions,
          classId,
          subjectId,
          totalMarks: Number(totalMarks) || 100,
          dueDate,
          submissionType,
          allowedFormats,
          maxFileSizeMb: Number(maxFileSizeMb) || 10,
          latePolicy,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Failed to create assignment.');
      } else {
        router.push('/teacher/assignments');
      }
    } catch {
      setErrorMsg('Network communication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/teacher/assignments"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            New Assignment
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create and publish coursework or homework for your students
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Assignment Information */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5 text-xs">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-3">
            <BookOpenCheck className="w-4 h-4 text-teal-800" />
            <span>Core Details</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Assignment Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter assignment title"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Target Class <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Total Marks <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Submission Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Detailed Instructions
              </label>
              <textarea
                rows={5}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Enter instructions, questions, or guidelines for students..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Submission Policies */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5 text-xs">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-3">
            <FileText className="w-4 h-4 text-teal-800" />
            <span>Submission Policies</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-2">
                Allowed Submission Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'both', label: 'Text or File' },
                  { value: 'text', label: 'Text Entry Only' },
                  { value: 'file', label: 'File Attachment Only' },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setSubmissionType(mode.value as any)}
                    className={`py-2.5 px-3 rounded-xl border text-center font-semibold transition cursor-pointer ${
                      submissionType === mode.value
                        ? 'bg-teal-50 text-teal-900 border-teal-300 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {submissionType !== 'text' && (
              <div>
                <label className="block text-slate-700 font-semibold mb-2">
                  Permitted File Formats
                </label>
                <div className="flex flex-wrap gap-2">
                  {['pdf', 'docx', 'jpg', 'png'].map((fmt) => {
                    const active = allowedFormats.includes(fmt);
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => handleFormatToggle(fmt)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase transition cursor-pointer ${
                          active
                            ? 'bg-teal-800 text-white border-teal-800'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Late Submission Policy
                </label>
                <select
                  value={latePolicy}
                  onChange={(e) => setLatePolicy(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  <option value="allow_with_flag">Permit late submission with flag</option>
                  <option value="disallow">Strict deadline (No late submissions)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Initial Publication Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  <option value="published">Publish Immediately to Students</option>
                  <option value="draft">Save as Draft (Private)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/teacher/assignments"
            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || isLoadingMeta}
            className="px-6 py-2.5 rounded-xl bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold transition shadow-xs disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Saving Assignment...</span>
            ) : (
              <span>{status === 'published' ? 'Publish Assignment' : 'Save Draft'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
