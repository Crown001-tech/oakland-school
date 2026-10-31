'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Download,
  Plus,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Trash2,
  Search,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  options: Array<{ key: string; text: string }>;
  correct_answer: string;
  marks: number;
  explanation?: string;
  difficulty?: string;
}

interface BankDetails {
  id: string;
  title: string;
  class_level: string;
  questions_count: number;
  subject?: { id: string; name: string; code: string };
  questions: Question[];
}

export default function QuestionBankDetailPage() {
  const params = useParams();
  const bankId = params.id as string;

  const [bank, setBank] = useState<BankDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Excel Upload Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string; errors?: string[] } | null>(null);

  // Manual Question Modal
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'mcq' | 'true_false' | 'short_answer'>('mcq');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [marks, setMarks] = useState('1');
  const [explanation, setExplanation] = useState('');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const loadBank = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cbt/banks/${bankId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setBank(data.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (bankId) loadBank();
  }, [bankId]);

  const handleExcelUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await fetch('/api/cbt/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankId,
            mode: 'excel',
            fileBase64: base64Data,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setUploadMessage({
            type: 'error',
            text: data.message || 'Excel import failed.',
            errors: data.errors,
          });
        } else {
          setUploadMessage({
            type: 'success',
            text: data.message || 'Questions successfully imported.',
          });
          setSelectedFile(null);
          await loadBank();
        }
      } catch {
        setUploadMessage({ type: 'error', text: 'Network communication error.' });
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);

    if (!questionText.trim()) {
      setManualError('Question text is required.');
      return;
    }

    let optionsPayload: any[] = [];
    if (questionType === 'mcq') {
      if (!optA.trim() || !optB.trim()) {
        setManualError('Options A and B are required.');
        return;
      }
      optionsPayload = [
        { key: 'A', text: optA.trim() },
        { key: 'B', text: optB.trim() },
        ...(optC.trim() ? [{ key: 'C', text: optC.trim() }] : []),
        ...(optD.trim() ? [{ key: 'D', text: optD.trim() }] : []),
      ];
    } else if (questionType === 'true_false') {
      optionsPayload = [
        { key: 'A', text: 'True' },
        { key: 'B', text: 'False' },
      ];
    }

    setIsSavingQuestion(true);

    try {
      const res = await fetch('/api/cbt/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankId,
          questionText,
          questionType,
          options: optionsPayload,
          correctAnswer,
          marks: Number(marks) || 1,
          explanation,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setManualError(data.message || 'Failed to save question.');
      } else {
        setIsManualOpen(false);
        setQuestionText('');
        setOptA('');
        setOptB('');
        setOptC('');
        setOptD('');
        setExplanation('');
        await loadBank();
      }
    } catch {
      setManualError('Network communication error.');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const questions = bank?.questions || [];
  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery.trim()) return true;
    return q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
              {bank?.title || 'Question Bank'}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Subject: <strong className="text-slate-800">{bank?.subject?.name || '—'}</strong>
              <span className="mx-2 text-slate-300">&bull;</span>
              Level: <span className="text-slate-700">{bank?.class_level || 'All Levels'}</span>
              <span className="mx-2 text-slate-300">&bull;</span>
              Total: <strong className="text-slate-800">{bank?.questions_count || 0} Questions</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/cbt/template"
            download="oakland_cbt_template.xlsx"
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 min-h-[44px] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" />
            <span>Download Template</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setIsUploadOpen(true);
              setUploadMessage(null);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 hover:bg-teal-100 text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 min-h-[44px] cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-teal-700" />
            <span>Bulk Upload Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsManualOpen(true);
              setManualError(null);
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions in this bank..."
            className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20 min-h-[44px]"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredQuestions.length} of {questions.length} Questions
        </span>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <BrandLoader size="lg" />
      ) : filteredQuestions.length > 0 ? (
        <div className="space-y-3">
          {filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 transition space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                    {q.question_type}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-700">{q.marks} Mark{q.marks > 1 ? 's' : ''}</span>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Correct: {q.correct_answer}
                  </span>
                </div>
              </div>

              <p className="font-bold text-slate-900 text-sm leading-relaxed">
                {q.question_text}
              </p>

              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => (
                    <div
                      key={opt.key}
                      className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                        opt.key.toUpperCase() === q.correct_answer.toUpperCase() ||
                        opt.text.toLowerCase() === q.correct_answer.toLowerCase()
                          ? 'bg-emerald-50/70 text-emerald-950 border-emerald-300 font-medium'
                          : 'bg-slate-50/60 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="font-bold text-slate-900 w-5">{opt.key}:</span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {q.explanation && (
                <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                  Explanation: {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center max-w-xl mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No Questions in this Bank</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Populate this bank with questions by uploading a standard Excel spreadsheet or by entering questions manually.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 hover:bg-teal-100 text-xs font-semibold transition cursor-pointer"
            >
              Upload Excel
            </button>
            <button
              type="button"
              onClick={() => setIsManualOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold transition cursor-pointer"
            >
              Add Manually
            </button>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-teal-800" />
                <h3 className="font-bold text-slate-900 text-sm">Bulk Excel Import</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-medium space-y-1 ${
                  uploadMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {uploadMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{uploadMessage.text}</span>
                </div>
                {uploadMessage.errors && (
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5 pt-1">
                    {uploadMessage.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <form onSubmit={handleExcelUpload} className="space-y-4">
              <div className="p-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition text-center space-y-2">
                <Upload className="w-7 h-7 text-teal-800 mx-auto" />
                <div>
                  <input
                    type="file"
                    id="excelFile"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label
                    htmlFor="excelFile"
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer inline-block shadow-xs"
                  >
                    Select .XLSX File
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedFile ? (
                    <strong className="text-teal-900">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</strong>
                  ) : (
                    'Upload formatted spreadsheet workbook'
                  )}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <a
                  href="/api/cbt/template"
                  download="oakland_cbt_template.xlsx"
                  className="text-teal-800 font-semibold hover:underline"
                >
                  Download template structure
                </a>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white font-semibold transition shadow-xs disabled:opacity-50"
                >
                  {isUploading ? 'Importing...' : 'Import Questions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Question Modal */}
      {isManualOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Question Manually</h3>
              <button
                type="button"
                onClick={() => setIsManualOpen(false)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {manualError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <form onSubmit={handleManualCreate} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Question Type
                </label>
                <select
                  value={questionType}
                  onChange={(e) => {
                    setQuestionType(e.target.value as any);
                    if (e.target.value === 'true_false') setCorrectAnswer('True');
                    if (e.target.value === 'mcq') setCorrectAnswer('A');
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="true_false">True or False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the question stem..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              {questionType === 'mcq' && (
                <div className="space-y-2.5 pt-1">
                  <label className="block text-slate-700 font-semibold">Options</label>
                  <input
                    type="text"
                    required
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    placeholder="Option A"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                  <input
                    type="text"
                    required
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    placeholder="Option B"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                  <input
                    type="text"
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    placeholder="Option C (Optional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                  <input
                    type="text"
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    placeholder="Option D (Optional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Correct Answer <span className="text-red-500">*</span>
                  </label>
                  {questionType === 'mcq' ? (
                    <select
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  ) : questionType === 'true_false' ? (
                    <select
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="True">True</option>
                      <option value="False">False</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      placeholder="e.g. Photosynthesis"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Solution Guide
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Optional explanatory note shown during practice review..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuestion}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white font-semibold transition shadow-xs min-h-[44px] cursor-pointer disabled:opacity-50"
                >
                  {isSavingQuestion ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
