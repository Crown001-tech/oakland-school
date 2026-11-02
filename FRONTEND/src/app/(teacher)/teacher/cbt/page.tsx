'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Plus,
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  BookOpen,
  X,
  Search,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface QuestionBank {
  id: string;
  title: string;
  class_level: string;
  questions_count: number;
  created_at: string;
  subject?: { id: string; name: string; code: string };
  creator?: { id: string; first_name: string; last_name: string };
}

interface Assessment {
  id: string;
  title: string;
  code: string;
  assessment_type: 'formal_assessment' | 'practice_cbt';
  assessment_category: string;
  duration_minutes: number;
  total_marks: number;
  pass_percentage: number;
  status: 'draft' | 'published' | 'active' | 'closed';
  created_at: string;
  class?: { id: string; name: string };
  subject?: { id: string; name: string; code: string };
  totalAttempts?: number;
  totalQuestions?: number;
}

export default function TeacherCBTOverviewPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'banks' ? 'banks' : 'assessments';
  const [activeTab, setActiveTab] = useState<'assessments' | 'banks'>(initialTab);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Bank Modal State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankTitle, setBankTitle] = useState('');
  const [bankSubjectId, setBankSubjectId] = useState('');
  const [bankClassLevel, setBankClassLevel] = useState('All Levels');
  const [isCreatingBank, setIsCreatingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assRes, bankRes, subRes] = await Promise.all([
        fetch('/api/cbt/assessments').then((r) => r.json()),
        fetch('/api/cbt/banks').then((r) => r.json()),
        fetch('/api/subjects').then((r) => r.json()),
      ]);

      if (assRes.success && Array.isArray(assRes.data)) setAssessments(assRes.data);
      if (bankRes.success && Array.isArray(bankRes.data)) setQuestionBanks(bankRes.data);
      if (subRes.success && Array.isArray(subRes.data)) {
        setSubjects(subRes.data);
        if (subRes.data.length > 0 && !bankSubjectId) setBankSubjectId(subRes.data[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'banks' || t === 'assessments') {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankTitle.trim() || !bankSubjectId) {
      setBankError('Title and Subject are required.');
      return;
    }

    setIsCreatingBank(true);
    setBankError(null);

    try {
      const res = await fetch('/api/cbt/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bankTitle,
          subjectId: bankSubjectId,
          classLevel: bankClassLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setBankError(data.message || 'Failed to create question bank.');
      } else {
        setIsBankModalOpen(false);
        setBankTitle('');
        await loadData();
      }
    } catch {
      setBankError('Network communication error.');
    } finally {
      setIsCreatingBank(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Examinations
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Question bank repositories, bulk Excel imports, and timed CBT assessment management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/cbt/template"
            download="cbt_template.xlsx"
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs inline-flex items-center gap-2 min-h-[44px] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" />
            <span>Excel Template</span>
          </a>

          <button
            type="button"
            onClick={() => setIsBankModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs inline-flex items-center gap-2 min-h-[44px] cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-teal-700" />
            <span>New Bank</span>
          </button>

          <Link
            href="/teacher/cbt/assessments/new"
            className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-2 min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Exam</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-1.5 flex items-center gap-1.5 text-xs max-w-sm">
        <button
          onClick={() => setActiveTab('assessments')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold transition text-center min-h-[44px] flex items-center justify-center cursor-pointer ${
            activeTab === 'assessments'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Scheduled Exams ({assessments.length})
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-semibold transition text-center min-h-[44px] flex items-center justify-center cursor-pointer ${
            activeTab === 'banks'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Question Banks ({questionBanks.length})
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <BrandLoader size="lg" />
      ) : activeTab === 'assessments' ? (
        /* Assessments View */
        assessments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((ass) => (
              <div
                key={ass.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-teal-900 border border-teal-200">
                        {ass.class?.name || 'Class'}
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {ass.subject?.name || 'Subject'}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase ${
                        ass.assessment_type === 'formal_assessment'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}
                    >
                      {ass.assessment_type === 'formal_assessment' ? 'Formal Exam' : 'Practice CBT'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm hover:text-teal-800 transition">
                      <Link href={`/teacher/cbt/assessments/${ass.id}`}>{ass.title}</Link>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {ass.code}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs space-y-3">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ass.duration_minutes} Minutes</span>
                    </span>
                    <span>Total Marks: <strong className="text-slate-800 font-semibold">{ass.total_marks}</strong></span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Questions
                      </span>
                      <span className="font-bold text-slate-800 text-xs">
                        {ass.totalQuestions || 0} Questions
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Attempts
                      </span>
                      <span className="font-bold text-teal-800 text-xs">
                        {ass.totalAttempts || 0} Submitted
                      </span>
                    </div>

                    <Link
                      href={`/teacher/cbt/assessments/${ass.id}`}
                      className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 shadow-xs min-h-[44px] cursor-pointer"
                    >
                      <span>Results</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center max-w-xl mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center mx-auto">
              <Laptop className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-slate-900">No Examinations Scheduled</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Create and schedule a continuous assessment test or practice exam for your students.
            </p>
            <div className="pt-2">
              <Link
                href="/teacher/cbt/assessments/new"
                className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Exam</span>
              </Link>
            </div>
          </div>
        )
      ) : (
        /* Question Banks View */
        questionBanks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {questionBanks.map((bank) => (
              <div
                key={bank.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-teal-900 border border-teal-200">
                      {bank.subject?.name || 'Subject'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{bank.class_level}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">
                    <Link href={`/teacher/cbt/banks/${bank.id}`} className="hover:text-teal-800 transition">
                      {bank.title}
                    </Link>
                  </h3>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Repository
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {bank.questions_count || 0} Questions
                    </span>
                  </div>

                  <Link
                    href={`/teacher/cbt/banks/${bank.id}`}
                    className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 shadow-xs min-h-[44px] cursor-pointer"
                  >
                    <span>Manage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center max-w-xl mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center mx-auto">
              <Layers className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-slate-900">No Question Banks Created</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Create a question bank to organize your curriculum questions and import bulk questions from Excel spreadsheets.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsBankModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Question Bank</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* New Question Bank Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Create Question Bank</h3>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bankError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bankError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBank} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Bank Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bankTitle}
                  onChange={(e) => setBankTitle(e.target.value)}
                  placeholder="e.g. Senior Secondary Mathematics Bank"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={bankSubjectId}
                  onChange={(e) => setBankSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Target Class Level
                </label>
                <select
                  value={bankClassLevel}
                  onChange={(e) => setBankClassLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  <option value="All Levels">All Levels</option>
                  <option value="Junior Secondary">Junior Secondary (JSS 1 - 3)</option>
                  <option value="Senior Secondary">Senior Secondary (SS 1 - 3)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBank}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white font-semibold transition shadow-xs min-h-[44px] cursor-pointer disabled:opacity-50"
                >
                  {isCreatingBank ? 'Creating...' : 'Create Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
