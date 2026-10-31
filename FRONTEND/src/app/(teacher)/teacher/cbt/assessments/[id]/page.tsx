'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Laptop,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Users,
  Award,
  Sparkles,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface AttemptItem {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number;
  total_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  is_synced_to_gradebook: boolean;
  status: 'in_progress' | 'submitted' | 'abandoned';
}

interface AssessmentDetail {
  id: string;
  title: string;
  code: string;
  assessment_type: 'formal_assessment' | 'practice_cbt';
  assessment_category: string;
  duration_minutes: number;
  total_marks: number;
  pass_percentage: number;
  status: string;
  class?: { id: string; name: string };
  subject?: { id: string; name: string; code: string };
  totalQuestions: number;
  attempts: AttemptItem[];
}

export default function TeacherAssessmentResultsPage() {
  const params = useParams();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAssessment = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cbt/assessments/${assessmentId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAssessment(data.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (assessmentId) loadAssessment();
  }, [assessmentId]);

  const handleSyncGradebook = async () => {
    if (!assessment) return;
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch(`/api/cbt/assessments/${assessment.id}/sync-gradebook`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSyncMessage({ type: 'error', text: data.message || 'Sync failed.' });
      } else {
        setSyncMessage({ type: 'success', text: data.message || 'Scores synced to gradebook successfully.' });
        await loadAssessment();
      }
    } catch {
      setSyncMessage({ type: 'error', text: 'Network communication error.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const attempts = assessment?.attempts || [];
  const submittedAttempts = attempts.filter((a) => a.status === 'submitted');
  const passCount = submittedAttempts.filter((a) => a.passed).length;
  const passRate = submittedAttempts.length > 0 ? Math.round((passCount / submittedAttempts.length) * 100) : 0;
  const averageScore = submittedAttempts.length > 0
    ? (submittedAttempts.reduce((sum, a) => sum + (Number(a.total_score) || 0), 0) / submittedAttempts.length).toFixed(1)
    : '—';

  const isFormal = assessment?.assessment_type === 'formal_assessment';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/cbt"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
              {assessment?.title || 'Examination Results'}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Class: <strong className="text-slate-800">{assessment?.class?.name || '—'}</strong>
              <span className="mx-2 text-slate-300">&bull;</span>
              Subject: <strong className="text-slate-800">{assessment?.subject?.name || '—'}</strong>
              <span className="mx-2 text-slate-300">&bull;</span>
              Code: <span className="font-mono text-slate-700">{assessment?.code || '—'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize ${
              isFormal
                ? 'bg-purple-50 text-purple-800 border-purple-200'
                : 'bg-teal-50 text-teal-800 border-teal-200'
            }`}
          >
            {isFormal ? 'Formal Assessment' : 'Practice CBT'}
          </span>

          {isFormal && submittedAttempts.length > 0 && (
            <button
              type="button"
              onClick={handleSyncGradebook}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Syncing...' : 'Sync to Gradebook'}</span>
            </button>
          )}
        </div>
      </div>

      {syncMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            syncMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {syncMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{syncMessage.text}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Submissions
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {submittedAttempts.length} Candidates
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Average Score
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {averageScore} / {assessment?.total_marks || 0}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Pass Rate
          </span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {passRate}%
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Questions
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {assessment?.totalQuestions || 0} Questions
          </p>
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-800" />
            <h3 className="font-bold text-sm text-slate-900">Student Examination Attempts</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{attempts.length} Total Records</span>
        </div>

        {isLoading ? (
          <BrandLoader size="lg" />
        ) : attempts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Admission Number</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Time Spent</th>
                  {isFormal && <th className="py-3 px-4 text-center">Gradebook Sync</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {att.studentName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {att.admissionNumber}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {att.total_score !== null ? `${att.total_score} / ${assessment?.total_marks}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          att.passed
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {att.percentage !== null ? `${att.percentage}%` : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase border ${
                          att.status === 'submitted'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {att.status === 'submitted' ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                      {att.time_spent_seconds ? `${Math.floor(att.time_spent_seconds / 60)}m ${att.time_spent_seconds % 60}s` : '—'}
                    </td>
                    {isFormal && (
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                            att.is_synced_to_gradebook
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {att.is_synced_to_gradebook ? 'Synced' : 'Pending'}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-500">
            No candidates have attempted this examination yet.
          </div>
        )}
      </div>
    </div>
  );
}
