'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Laptop,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

export default function NewAssessmentPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [questionBanks, setQuestionBanks] = useState<any[]>([]);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [assessmentType, setAssessmentType] = useState<'formal_assessment' | 'practice_cbt'>('practice_cbt');
  const [assessmentCategory, setAssessmentCategory] = useState('practice');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [passPercentage, setPassPercentage] = useState('50');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [instructions, setInstructions] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      setIsLoading(true);
      try {
        const [clsRes, subRes, bankRes] = await Promise.all([
          fetch('/api/classes').then((r) => r.json()),
          fetch('/api/subjects').then((r) => r.json()),
          fetch('/api/cbt/banks').then((r) => r.json()),
        ]);

        if (clsRes.success && Array.isArray(clsRes.data)) {
          setClasses(clsRes.data);
          if (clsRes.data.length > 0) setClassId(clsRes.data[0].id);
        }

        if (subRes.success && Array.isArray(subRes.data)) {
          setSubjects(subRes.data);
          if (subRes.data.length > 0) setSubjectId(subRes.data[0].id);
        }

        if (bankRes.success && Array.isArray(bankRes.data)) {
          setQuestionBanks(bankRes.data);
          if (bankRes.data.length > 0) setSelectedBankId(bankRes.data[0].id);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadMeta();
  }, []);

  // Fetch questions when selectedBankId changes
  useEffect(() => {
    if (!selectedBankId) return;

    fetch(`/api/cbt/banks/${selectedBankId}`)
      .then((r) => r.json())
      .then((resData) => {
        if (resData.success && resData.data?.questions) {
          setBankQuestions(resData.data.questions);
          // Auto select all questions by default
          setSelectedQuestions(resData.data.questions.map((q: any) => q.id));
        }
      })
      .catch(() => {});
  }, [selectedBankId]);

  const toggleQuestion = (qId: string) => {
    if (selectedQuestions.includes(qId)) {
      setSelectedQuestions(selectedQuestions.filter((id) => id !== qId));
    } else {
      setSelectedQuestions([...selectedQuestions, qId]);
    }
  };

  const selectAll = () => {
    setSelectedQuestions(bankQuestions.map((q) => q.id));
  };

  const deselectAll = () => {
    setSelectedQuestions([]);
  };

  // Compute total marks
  const totalMarks = bankQuestions
    .filter((q) => selectedQuestions.includes(q.id))
    .reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please enter an assessment title.');
      return;
    }
    if (!classId || !subjectId) {
      setErrorMsg('Please select target class and subject.');
      return;
    }
    if (selectedQuestions.length === 0) {
      setErrorMsg('Please select at least one question for this examination.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/cbt/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          classId,
          subjectId,
          assessmentType,
          assessmentCategory: assessmentType === 'formal_assessment' ? assessmentCategory : 'practice',
          durationMinutes: Number(durationMinutes) || 45,
          totalMarks,
          passPercentage: Number(passPercentage) || 50,
          shuffleQuestions,
          shuffleOptions,
          instructions,
          questionIds: selectedQuestions,
          status: 'published',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Failed to create assessment.');
      } else {
        router.push('/teacher/cbt');
      }
    } catch {
      setErrorMsg('Network communication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/teacher/cbt"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Schedule Examination
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Configure examination parameters and select questions from repository
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Assessment Parameters */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5 text-xs">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-3">
            <Laptop className="w-4 h-4 text-teal-800" />
            <span>Examination Configuration</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Assessment Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mid-Term Mathematics Assessment"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Assessment Type
                </label>
                <select
                  value={assessmentType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setAssessmentType(val);
                    if (val === 'formal_assessment') setAssessmentCategory('exam');
                    else setAssessmentCategory('practice');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  <option value="practice_cbt">Practice CBT (Self-Assessment)</option>
                  <option value="formal_assessment">Formal Assessment (Gradebook)</option>
                </select>
              </div>

              {assessmentType === 'formal_assessment' ? (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Grading Category
                  </label>
                  <select
                    value={assessmentCategory}
                    onChange={(e) => setAssessmentCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  >
                    <option value="ca1">CA 1 Test</option>
                    <option value="ca2">CA 2 Test</option>
                    <option value="exam">Terminal Examination</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Mode
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Revision Practice"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="rounded text-teal-800 focus:ring-teal-700"
                />
                <span>Randomize Question Order for Each Student</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="rounded text-teal-800 focus:ring-teal-700"
                />
                <span>Randomize MCQ Option Order</span>
              </label>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Examination Instructions
              </label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Specific candidate instructions, permitted calculator use, or academic integrity guidelines..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
            </div>
          </div>
        </div>

        {/* Question Bank Selection */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-5 text-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-800" />
              <span>Select Questions from Repository</span>
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-teal-800 font-semibold hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-slate-500 font-semibold hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Source Question Bank
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              >
                {questionBanks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.questions_count || 0} questions) &bull; {b.subject?.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Questions Picker Table */}
            {bankQuestions.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {bankQuestions.map((q, idx) => {
                  const isChecked = selectedQuestions.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-teal-50/60 border-teal-300 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-teal-800 focus:ring-teal-700"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] text-teal-900 uppercase">
                            Question {idx + 1} &bull; {q.question_type}
                          </span>
                          <span className="font-semibold text-slate-700 text-[11px]">
                            {q.marks || 1} Mark{(q.marks || 1) > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="font-medium text-slate-800 text-xs">
                          {q.question_text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic py-4 text-center">
                This question bank has no questions yet. Please add questions to the bank first.
              </p>
            )}

            {/* Summary Bar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between font-semibold">
              <span className="text-slate-600">
                Selected: <strong className="text-slate-900">{selectedQuestions.length}</strong> of {bankQuestions.length} Questions
              </span>
              <span className="text-slate-600">
                Total Assessment Score: <strong className="text-teal-900 text-sm">{totalMarks} Points</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/teacher/cbt"
            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition min-h-[44px] inline-flex items-center justify-center cursor-pointer"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || selectedQuestions.length === 0}
            className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs min-h-[44px] inline-flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Publishing Examination...' : 'Publish Examination'}
          </button>
        </div>
      </form>
    </div>
  );
}
