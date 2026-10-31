'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Laptop,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Eye,
  BookOpen,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

export default function AdminTakeCbtAssessmentPage() {
  const params = useParams();
  const id = params?.id as string;

  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadAssessment = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/cbt/assessments/${id}`);
        const data = await res.json();
        if (data.success && data.data) {
          setAssessment(data.data.assessment || data.data);
          setQuestions(data.data.questions || data.data.assessment?.questions || []);
        } else {
          setErrorMessage(data.message || 'Assessment not found.');
        }
      } catch {
        setErrorMessage('Failed to load examination details.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAssessment();
  }, [id]);

  if (isLoading) {
    return <BrandLoader fullScreen size="lg" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          href="/admin/cbt"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0f3a3e] transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to CBT Dashboard</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
          <Eye className="w-3.5 h-3.5 text-amber-600" />
          <span>Administrative Preview Mode</span>
        </div>
      </div>

      {errorMessage ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">{errorMessage}</p>
          <Link
            href="/admin/cbt"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#0f3a3e] text-white text-xs font-semibold min-h-[44px]"
          >
            Return to Examinations
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  {assessment?.code || 'CBT'}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                  {assessment?.title}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {assessment?.class?.name} &bull; {assessment?.subject?.name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase">
                  {assessment?.status || 'Active'}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Duration</span>
                <p className="font-bold text-slate-900 mt-0.5">{assessment?.duration_minutes} minutes</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Pass Threshold</span>
                <p className="font-bold text-[#0f3a3e] mt-0.5">{assessment?.pass_percentage}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Questions</span>
                <p className="font-bold text-slate-900 mt-0.5">{questions.length} items</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Security Mode</span>
                <p className="font-bold text-emerald-700 mt-0.5">Proctored</p>
              </div>
            </div>

            {/* Proctor Notice */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Proctoring Notice: </span>
              Live examination attempts are strictly executed through authenticated student profiles (`/student/cbt/[id]`). This administrative view displays item composition, correct response keys, and assessment parameters for supervisory validation.
            </div>
          </div>

          {/* Question Items Preview */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Curricular Examination Items ({questions.length})
            </h2>

            {questions.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No items attached to this assessment.
              </div>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Question {idx + 1}</span>
                    <span className="text-[11px] font-mono font-semibold text-slate-400">
                      {q.marks || 1} mark(s)
                    </span>
                  </div>

                  <p className="text-sm text-slate-800 leading-relaxed font-medium">
                    {q.question_text || q.text}
                  </p>

                  {/* Options */}
                  {Array.isArray(q.options) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      {q.options.map((opt: any, optIdx: number) => {
                        const optKey = typeof opt === 'string' ? opt : opt.key || opt.id || opt.text;
                        const optText = typeof opt === 'string' ? opt : opt.text || opt.label || opt.key;
                        const correctVal = String(q.correct_answer || q.correctAnswer || '').trim().toLowerCase();
                        const isCorrect =
                          correctVal === String(optKey).trim().toLowerCase() ||
                          correctVal === String(optText).trim().toLowerCase();

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {typeof opt === 'object' && opt.key ? (
                                <strong className="text-slate-500 font-mono">{opt.key}.</strong>
                              ) : null}
                              <span>{optText}</span>
                            </span>
                            {isCorrect && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                                Correct Key
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
