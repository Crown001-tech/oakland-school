'use client';

import React, { useState, useEffect } from 'react';
import { useStudent } from '@/context/StudentContext';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface SubjectScore {
  name?: string;
  subject?: string;
  ca1?: number;
  ca2?: number;
  exam?: number;
  total?: number;
  grade?: string;
  remark?: string;
}

export default function StudentResultsPage() {
  const { student } = useStudent();
  const [reportCard, setReportCard] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!student?.id) return;

    setIsLoading(true);
    fetch(`/api/results?studentId=${student.id}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data?.studentReportCard) {
          setReportCard(resData.data.studentReportCard);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [student?.id]);

  const hasOfficialReport = Boolean(reportCard && reportCard.hasScores && reportCard.isEndorsed);
  const subjects: SubjectScore[] = reportCard?.subjects || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Results
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Your term grades and official report card
          </p>
        </div>

        {hasOfficialReport && (
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-2 self-start print:hidden cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report Card</span>
          </button>
        )}
      </div>

      {/* Student Academic Identity Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#0f3a3e] text-amber-300 border border-amber-500/20 font-bold flex items-center justify-center text-base shrink-0 shadow-xs">
            {student?.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              {student?.name || 'Enrolled Student'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Class: <strong className="text-slate-800 font-semibold">{student?.currentClass || '—'}</strong>
              <span className="mx-2 text-slate-300">&bull;</span>
              Admission Number: <span className="font-mono text-slate-700 font-semibold">{student?.admissionNumber || '—'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Academic Term
            </span>
            <span className="font-bold text-slate-800">2026/2027 &bull; Term 1</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              hasOfficialReport
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {hasOfficialReport ? 'Endorsed' : 'Scores Pending'}
          </div>
        </div>
      </div>

      {/* Results Content */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <BrandLoader />
        </div>
      ) : hasOfficialReport && subjects.length > 0 ? (
        <div className="space-y-6">
          {/* Printable Official Header */}
          <div className="hidden print:block text-center border-b pb-6 mb-6">
            <h2 className="text-2xl font-bold font-serif text-slate-900">Oakland International School</h2>
            <p className="text-xs uppercase tracking-widest text-slate-600 mt-1">Excellence and Integrity</p>
            <p className="text-sm font-semibold text-slate-800 mt-3">Official Terminal Report Card</p>
            <div className="mt-3 text-xs text-slate-600 flex justify-center gap-6">
              <span>Student: <strong>{student?.name}</strong></span>
              <span>Admission No: <strong>{student?.admissionNumber}</strong></span>
              <span>Class: <strong>{student?.currentClass}</strong></span>
              <span>Session: <strong>2026/2027 Term 1</strong></span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Average Score
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {reportCard.averageScore !== null ? `${reportCard.averageScore}%` : '—'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Subjects Evaluated
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {subjects.length}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Class Position
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {reportCard.position || '—'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Status
              </span>
              <p
                className={`text-xl font-bold mt-1 ${
                  reportCard.status === 'Passed' || (typeof reportCard.average === 'number' && reportCard.average >= 50)
                    ? 'text-emerald-700'
                    : reportCard.status === 'Needs Improvement' || (typeof reportCard.average === 'number' && reportCard.average < 50)
                    ? 'text-amber-700'
                    : 'text-slate-500'
                }`}
              >
                {reportCard.status ||
                  (typeof reportCard.average === 'number'
                    ? reportCard.average >= 50
                      ? 'Passed'
                      : 'Needs Improvement'
                    : '—')}
              </p>
            </div>
          </div>

          {/* Subject Scores Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#0f3a3e]" />
                <h3 className="font-bold text-sm text-slate-900">Terminal Subject Breakdown</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Grading Standard: WAEC Standard Scale</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">CA 1 (20)</th>
                    <th className="py-3 px-4 text-center">CA 2 (20)</th>
                    <th className="py-3 px-4 text-center">Exam (60)</th>
                    <th className="py-3 px-4 text-center font-bold text-slate-900">Total (100)</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {sub.name || sub.subject}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                        {sub.ca1 !== undefined ? sub.ca1 : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                        {sub.ca2 !== undefined ? sub.ca2 : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                        {sub.exam !== undefined ? sub.exam : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 font-mono">
                        {sub.total !== undefined ? sub.total : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                          {sub.grade || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {sub.remark || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Comments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Class Teacher Remark
              </span>
              <p className="text-xs text-slate-700 italic">
                {reportCard.teacherRemark || '—'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Principal Endorsement &bull; Mr Seyi Bankole
              </span>
              <p className="text-xs text-slate-700 italic">
                {reportCard.principalRemark || '—'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Clean Zero-Mock Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0f3a3e]/10 border border-[#0f3a3e]/20 text-[#0f3a3e] flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Results Pending
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-md mx-auto">
              Scores for Term 1 are currently being prepared by your teachers. Your report card will appear here once approved by the Principal.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Current Session: 2026/2027</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>Class: {student?.currentClass || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
