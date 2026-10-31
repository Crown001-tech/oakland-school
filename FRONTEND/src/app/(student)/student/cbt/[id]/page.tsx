'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Laptop,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  Flag,
  Sparkles,
  BookOpen,
  Check,
  X,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface Question {
  id: string;
  questionId: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'short_answer';
  options: Array<{ key: string; text: string }>;
  marks: number;
}

interface ReviewItem {
  questionText: string;
  questionType: string;
  options: any[];
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  explanation?: string;
}

export default function StudentCBTExamRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Runner state
  const [phase, setPhase] = useState<'intro' | 'running' | 'result'>('intro');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  // Submission & Result state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultData, setResultData] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!assessmentId) return;

    fetch(`/api/cbt/assessments/${assessmentId}`)
      .then((r) => r.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setAssessment(resData.data);
          if (resData.data.attempt && resData.data.attempt.status === 'submitted') {
            setPhase('result');
            setResultData({
              totalScore: resData.data.attempt.total_score,
              percentage: resData.data.attempt.percentage,
              passed: resData.data.attempt.passed,
              isPractice: resData.data.assessment_type === 'practice_cbt',
            });
          }
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [assessmentId]);

  const submitExam = async () => {
    if (!attemptId || isSubmitting) return;

    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const timeSpent = totalSeconds - secondsRemaining;
      const res = await fetch(`/api/cbt/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          answers,
          timeSpentSeconds: timeSpent,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        alert(resData.message || 'Failed to submit examination.');
      } else {
        setResultData(resData.data);
        setPhase('result');
      }
    } catch {
      alert('Network error during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    submitExam();
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (phase !== 'running' || secondsRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, secondsRemaining]);

  const handleStartExam = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cbt/assessments/${assessmentId}/start`, {
        method: 'POST',
      });
      const resData = await res.json();

      if (!res.ok || !resData.success) {
        alert(resData.message || 'Failed to start examination.');
        setIsLoading(false);
        return;
      }

      setAttemptId(resData.data.attemptId);
      setQuestions(resData.data.questions || []);
      const secs = (resData.data.durationMinutes || 45) * 60;
      setTotalSeconds(secs);
      setSecondsRemaining(secs);
      setPhase('running');
      setCurrentIndex(0);
      setIsLoading(false);
    } catch {
      alert('Network communication error.');
      setIsLoading(false);
    }
  };

  const handleSelectOption = (key: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: key,
    }));
  };

  const handleToggleFlag = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setFlagged((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };



  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <BrandLoader size="lg" />;
  }

  // -----------------------------------------------------------------------------
  // PHASE 1: INTRO / INSTRUCTIONS
  // -----------------------------------------------------------------------------
  if (phase === 'intro') {
    const isFormal = assessment?.assessment_type === 'formal_assessment';

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/student/cbt"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
              {assessment?.title}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Subject: <strong className="text-slate-800">{assessment?.subject?.name || '—'}</strong>
              <span className="mx-2 text-slate-300">&bull;</span>
              Candidate: <span className="font-mono text-slate-700">{assessment?.code}</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
              <p className="font-bold text-slate-900 text-base mt-1">{assessment?.duration_minutes} Minutes</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Questions</span>
              <p className="font-bold text-slate-900 text-base mt-1">{assessment?.totalQuestions || 0}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Marks</span>
              <p className="font-bold text-slate-900 text-base mt-1">{assessment?.total_marks} Points</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pass Mark</span>
              <p className="font-bold text-emerald-700 text-base mt-1">{assessment?.pass_percentage}%</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Examination Instructions</h3>
            <div className="text-slate-700 leading-relaxed space-y-2">
              <p>
                {assessment?.instructions || 'Read every question carefully before selecting your answer. You can navigate between questions and flag items for review at any time before final submission.'}
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 pt-1">
                <li>Once started, the timer will countdown continuously.</li>
                <li>When the timer expires, all answered questions will be automatically submitted.</li>
                <li>Do not refresh or close your browser tab during an active examination session.</li>
                {isFormal ? (
                  <li className="font-semibold text-purple-900">This is an official formal assessment and will contribute to your continuous assessment records.</li>
                ) : (
                  <li className="text-slate-700">This is a practice self-assessment. Full explanations will be displayed immediately after submission.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/student/cbt"
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold min-h-[44px] inline-flex items-center justify-center cursor-pointer"
            >
              Return
            </Link>

            <button
              type="button"
              onClick={handleStartExam}
              className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white font-semibold transition shadow-xs inline-flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <Laptop className="w-4 h-4" />
              <span>Start Examination</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------------
  // PHASE 2: ACTIVE TIMED EXAMINATION RUNNER
  // -----------------------------------------------------------------------------
  if (phase === 'running') {
    const currentQ = questions[currentIndex];
    const answeredCount = Object.keys(answers).length;
    const isUrgent = secondsRemaining < 300; // less than 5 mins

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Floating Timer & Status Banner */}
        <div className="sticky top-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-md p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm truncate max-w-xs sm:max-w-md">
                {assessment?.title}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Answered: <strong className="text-slate-800">{answeredCount} of {questions.length}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`px-4 py-2 rounded-xl border font-mono font-bold text-sm sm:text-base flex items-center gap-2 ${
                isUrgent
                  ? 'bg-red-50 text-red-800 border-red-300 animate-pulse'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-700' : 'text-slate-500'}`} />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition shadow-xs min-h-[44px] inline-flex items-center justify-center cursor-pointer"
            >
              Submit Exam
            </button>
          </div>
        </div>

        {/* Question Area & Navigator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Display (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6 text-xs min-h-[420px] flex flex-col justify-between">
              <div className="space-y-4">
                {/* Question Header */}
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="font-bold text-slate-900 text-sm">
                    Question {currentIndex + 1} of {questions.length}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">
                      {currentQ?.marks || 1} Point{(currentQ?.marks || 1) > 1 ? 's' : ''}
                    </span>

                    <button
                      type="button"
                      onClick={handleToggleFlag}
                      className={`px-3 py-2 rounded-xl border text-[11px] font-semibold transition inline-flex items-center gap-1.5 min-h-[44px] cursor-pointer ${
                        flagged[currentQ?.id]
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>{flagged[currentQ?.id] ? 'Flagged' : 'Flag'}</span>
                    </button>
                  </div>
                </div>

                {/* Question Stem */}
                <p className="font-bold text-slate-900 text-base leading-relaxed">
                  {currentQ?.questionText}
                </p>

                {/* Options List */}
                {currentQ?.questionType === 'mcq' && currentQ.options && (
                  <div className="space-y-2.5 pt-2">
                    {currentQ.options.map((opt) => {
                      const isSelected = answers[currentQ.id] === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => handleSelectOption(opt.key)}
                          className={`p-4 rounded-xl border text-xs flex items-center gap-3 transition cursor-pointer ${
                            isSelected
                              ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center border ${
                              isSelected
                                ? 'bg-brand-primary text-white border-brand-primary'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="text-sm">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentQ?.questionType === 'true_false' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {['True', 'False'].map((val) => {
                      const isSelected = answers[currentQ.id]?.toLowerCase() === val.toLowerCase();
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleSelectOption(val)}
                          className={`py-4 rounded-xl border text-sm font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQ?.questionType === 'short_answer' && (
                  <div className="pt-2">
                    <label className="block text-slate-700 font-semibold mb-1">
                      Type your solution or answer:
                    </label>
                    <input
                      type="text"
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => handleSelectOption(e.target.value)}
                      placeholder="Enter answer..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                    />
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold transition disabled:opacity-30 inline-flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white font-semibold transition disabled:opacity-30 inline-flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Question Grid Sidebar (1 col) */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Question Navigator
              </h3>

              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = Boolean(answers[q.id]);
                  const isFlagged = Boolean(flagged[q.id]);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-11 min-h-[44px] rounded-xl font-bold text-xs transition border flex items-center justify-center cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-brand-primary border-brand-primary bg-brand-primary/15 text-brand-primary font-extrabold'
                          : isFlagged
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : isAnswered
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-brand-primary shrink-0" />
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300 shrink-0" />
                  <span>Flagged for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200 shrink-0" />
                  <span>Unanswered ({questions.length - answeredCount})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-xs text-center">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center mx-auto">
                <Laptop className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-slate-900 text-base">Submit Examination?</h3>

              <p className="text-slate-600 leading-relaxed">
                You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
                {questions.length - answeredCount > 0 && (
                  <span className="text-amber-800 font-semibold block mt-1">
                    Notice: {questions.length - answeredCount} question(s) remain unanswered!
                  </span>
                )}
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold min-h-[44px] inline-flex items-center justify-center cursor-pointer"
                >
                  Continue Testing
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={submitExam}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold transition shadow-xs min-h-[44px] inline-flex items-center justify-center disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Submitting...' : 'Yes, Submit Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------------
  // PHASE 3: SUBMISSION RESULT & PRACTICE REVIEW BREAKDOWN
  // -----------------------------------------------------------------------------
  const isPractice = resultData?.isPractice;
  const reviewBreakdown: ReviewItem[] = resultData?.reviewBreakdown || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/student/cbt"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Examination Complete
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {assessment?.title} &bull; {assessment?.subject?.name}
          </p>
        </div>
      </div>

      {/* Result Hero Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 text-center space-y-4">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xs ${
            resultData?.passed
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}
        >
          <Award className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Overall Score
          </span>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif">
            {resultData?.totalScore !== undefined ? resultData.totalScore : '—'} <span className="text-lg font-normal text-slate-500">Points</span>
          </p>
          <p className="text-sm font-semibold text-slate-600">
            Percentage: <strong className={resultData?.passed ? 'text-emerald-700' : 'text-amber-800'}>{resultData?.percentage}%</strong>
          </p>
        </div>

        <div className="pt-2">
          <span
            className={`px-4 py-1.5 rounded-lg text-xs font-bold border uppercase tracking-wider inline-block ${
              resultData?.passed
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {resultData?.passed ? 'Passed' : 'Needs Review'}
          </span>
        </div>
      </div>

      {/* Practice Test Questions Breakdown */}
      {isPractice && reviewBreakdown.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-base text-slate-900 font-serif">
            Question Review
          </h2>

          <div className="space-y-3 text-xs">
            {reviewBreakdown.map((item, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl bg-white border shadow-xs space-y-3 ${
                  item.isCorrect ? 'border-emerald-200' : 'border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">
                    Question {idx + 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      item.isCorrect
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-red-100 text-red-900'
                    }`}
                  >
                    {item.isCorrect ? `+${item.marksAwarded} Marks` : '0 Marks'}
                  </span>
                </div>

                <p className="font-semibold text-slate-900 text-sm leading-relaxed">
                  {item.questionText}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Answer</span>
                    <span className={`font-semibold ${item.isCorrect ? 'text-emerald-800' : 'text-red-700'}`}>
                      {item.studentAnswer || 'No answer'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Correct Answer</span>
                    <span className="font-bold text-emerald-900">{item.correctAnswer}</span>
                  </div>
                </div>

                {item.explanation && (
                  <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-100 leading-relaxed">
                    Explanation: {item.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center pt-4">
        <Link
          href="/student/cbt"
          className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs min-h-[44px] inline-flex items-center justify-center cursor-pointer"
        >
          Return to Examinations
        </Link>
      </div>
    </div>
  );
}
