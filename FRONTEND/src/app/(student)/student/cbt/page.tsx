'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface Assessment {
  id: string;
  title: string;
  code: string;
  assessment_type: 'formal_assessment' | 'practice_cbt';
  assessment_category: string;
  duration_minutes: number;
  total_marks: number;
  pass_percentage: number;
  instructions: string;
  status: 'published' | 'active' | 'closed';
  class?: { id: string; name: string };
  subject?: { id: string; name: string; code: string };
  attempt?: {
    id: string;
    total_score: number | null;
    percentage: number | null;
    passed: boolean | null;
    status: string;
    submitted_at: string | null;
  } | null;
  hasAttempted: boolean;
  attemptStatus: 'not_started' | 'in_progress' | 'submitted';
}

export default function StudentCBTOverviewPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'formal_assessment' | 'practice_cbt'>('all');

  const loadAssessments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cbt/assessments');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAssessments(data.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const formalExams = assessments.filter((a) => a.assessment_type === 'formal_assessment');
  const practiceTests = assessments.filter((a) => a.assessment_type === 'practice_cbt');

  const filtered = assessments.filter((a) => {
    if (filterType === 'all') return true;
    return a.assessment_type === filterType;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          Examinations
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          School examinations and practice tests
        </p>
      </div>

      {/* Tabs Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-1.5 flex flex-wrap items-center gap-1.5 text-xs max-w-md">
        <button
          onClick={() => setFilterType('all')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold transition text-center min-h-[44px] flex items-center justify-center cursor-pointer ${
            filterType === 'all'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({assessments.length})
        </button>
        <button
          onClick={() => setFilterType('formal_assessment')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold transition text-center min-h-[44px] flex items-center justify-center cursor-pointer ${
            filterType === 'formal_assessment'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Formal Exams ({formalExams.length})
        </button>
        <button
          onClick={() => setFilterType('practice_cbt')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold transition text-center min-h-[44px] flex items-center justify-center cursor-pointer ${
            filterType === 'practice_cbt'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Practice ({practiceTests.length})
        </button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <BrandLoader size="lg" />
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((ass) => {
            const isFormal = ass.assessment_type === 'formal_assessment';
            const isCompleted = ass.hasAttempted;
            const attempt = ass.attempt;

            return (
              <div
                key={ass.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      {ass.subject?.name || 'Subject'}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                        isFormal
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                      }`}
                    >
                      {isFormal ? 'Formal Assessment' : 'Practice Test'}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : ass.attemptStatus === 'in_progress'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isCompleted
                        ? 'Completed'
                        : ass.attemptStatus === 'in_progress'
                        ? 'In Progress'
                        : 'Available'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">
                    {ass.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ass.duration_minutes} Minutes Duration</span>
                    </span>

                    <span>&bull;</span>

                    <span>Total Marks: <strong className="text-slate-800 font-semibold">{ass.total_marks} Points</strong></span>

                    <span>&bull;</span>

                    <span>Pass Mark: <strong className="text-slate-800 font-semibold">{ass.pass_percentage}%</strong></span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {isCompleted && attempt && (
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Your Score
                      </span>
                      <span className={`font-bold text-sm ${attempt.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                        {attempt.total_score} Points ({attempt.percentage}%)
                      </span>
                    </div>
                  )}

                  <Link
                    href={`/student/cbt/${ass.id}`}
                    className={`px-4 py-2.5 rounded-xl text-white text-xs font-semibold transition shadow-xs inline-flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                      isCompleted
                        ? 'bg-slate-700 hover:bg-slate-800'
                        : 'bg-brand-primary hover:bg-brand-primary-light'
                    }`}
                  >
                    <span>{isCompleted ? 'Review Assessment' : 'Take Examination'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center max-w-xl mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center mx-auto">
            <Laptop className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No Examinations Scheduled</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            There are currently no active formal or practice examinations assigned to your class.
          </p>
        </div>
      )}
    </div>
  );
}
