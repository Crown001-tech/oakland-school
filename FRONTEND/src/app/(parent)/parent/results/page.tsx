'use client';

import React, { useState, useEffect } from 'react';
import { useActiveChild } from '@/context/ParentContext';
import {
  Award,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

export default function ParentResultsPage() {
  const { activeChild } = useActiveChild();
  const [resultsData, setResultsData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeChild) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch official results from /api/results (DEF-078: Pass studentId)
    fetch(`/api/results?studentId=${encodeURIComponent(activeChild.id)}`)
      .then((res) => res.json())
      .then((data) => {
        setResultsData(data.data || data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [activeChild?.id]);

  // Determine if official results are published for the active child's class
  const classResults = React.useMemo(() => {
    if (!resultsData || !activeChild) return null;

    const rc = resultsData.studentReportCard || resultsData.reportCard;
    if (rc && Array.isArray(rc.subjects) && rc.subjects.length > 0) {
      return rc;
    }

    // Check if there are subject scores in legacy studentReports array
    if (Array.isArray(resultsData.studentReports)) {
      const studentResults = resultsData.studentReports.find(
        (sr: any) => sr.studentId === activeChild.id || sr.admissionNumber === activeChild.admissionNumber
      );
      if (studentResults) return studentResults;
    }

    return null;
  }, [resultsData, activeChild]);

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Academic Results
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Official terminal report cards for {activeChild?.name || 'Selected Student'}
          </p>
        </div>

        {classResults && (
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5 self-start print:hidden"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report Card</span>
          </button>
        )}
      </div>

      {/* Student Banner */}
      {activeChild && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary text-amber-300 border border-amber-500/20 font-bold flex items-center justify-center shrink-0">
              {activeChild.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{activeChild.name}</p>
              <p className="text-slate-500">
                Class: <strong className="text-slate-700">{activeChild.currentClass}</strong> &bull; Admission No:{' '}
                <span className="font-mono text-slate-700">{activeChild.admissionNumber}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block">Current Session</span>
            <span className="font-bold text-slate-800">2026/2027 &bull; Term 1</span>
          </div>
        </div>
      )}

      {/* Results Content */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <BrandLoader />
        </div>
      ) : classResults ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-6 p-6">
          {/* Printable Header */}
          <div className="hidden print:block text-center border-b pb-4 mb-4">
            <h2 className="text-xl font-bold font-serif">Oakland International School</h2>
            <p className="text-xs text-slate-600">Official Terminal Report Card</p>
            <p className="text-xs font-mono mt-1">Student: {activeChild?.name} ({activeChild?.admissionNumber}) | Class: {activeChild?.currentClass}</p>
          </div>

          {/* Scores Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-3 text-center">CA 1 (20)</th>
                  <th className="py-3 px-3 text-center">CA 2 (20)</th>
                  <th className="py-3 px-3 text-center">Exam (60)</th>
                  <th className="py-3 px-3 text-center">Total (100)</th>
                  <th className="py-3 px-3 text-center">Grade</th>
                  <th className="py-3 px-4">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(classResults.subjects || []).map((sub: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{sub.name}</td>
                    <td className="py-3 px-3 text-center font-mono">{sub.ca1 ?? '—'}</td>
                    <td className="py-3 px-3 text-center font-mono">{sub.ca2 ?? '—'}</td>
                    <td className="py-3 px-3 text-center font-mono">{sub.exam ?? '—'}</td>
                    <td className="py-3 px-3 text-center font-bold font-mono text-slate-900">{sub.total ?? '—'}</td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                        sub.grade === 'A' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        sub.grade === 'B' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' :
                        sub.grade === 'C' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {sub.grade || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{sub.remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block">Cumulative Score</span>
              <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                {classResults.totalScore ?? '—'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block">Term Average</span>
              <span className="text-lg font-bold text-slate-900 font-mono mt-0.5 block">
                {classResults.average ? `${classResults.average}%` : '—'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block">Endorsement Status</span>
              <span className="text-sm font-bold text-emerald-700 mt-1 inline-flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Officially Endorsed
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Pristine Zero-Mock Empty State */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-10 sm:p-14 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              No Published Results Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              First Term examination scores for <strong>{activeChild?.currentClass || 'this class'}</strong> are currently undergoing academic collation and executive endorsement.
            </p>
          </div>
          <div className="pt-2 text-[11px] text-slate-400 font-medium inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Official terminal broadsheets will appear here upon ratification by the Principal and Proprietor.
          </div>
        </div>
      )}
    </div>
  );
}
