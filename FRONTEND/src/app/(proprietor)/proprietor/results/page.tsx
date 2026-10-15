'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Lock,
  Download,
  Share2,
  Eye,
  X,
  FileText,
  AlertCircle,
  TrendingUp,
  Mail,
  Send,
  Printer,
  Check,
  Shield,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface ClassResultSummary {
  class: 'JSS 1' | 'JSS 2' | 'JSS 3' | 'SS 1' | 'SS 2' | 'SS 3';
  classTeacher: string;
  totalStudents: number;
  averageScore: number;
  passRate: number;
  topStudents: string[];
  status: 'Dispatched to Parents' | 'Pending Proprietor Sign-off' | 'Scores Pending';
  scoresSubmitted: number;
}

interface ParentEmailDelivery {
  id: string;
  studentName: string;
  admissionNo: string;
  class: string;
  parentName: string;
  parentEmail: string;
  status: 'Delivered' | 'Opened by Parent';
  sentTime: string;
  totalScore: string;
}

const DEFAULT_CLASSES: ClassResultSummary[] = [
  { class: 'JSS 1', classTeacher: 'Unassigned', totalStudents: 0, averageScore: 0, passRate: 0, topStudents: [], status: 'Scores Pending', scoresSubmitted: 0 },
  { class: 'JSS 2', classTeacher: 'Unassigned', totalStudents: 0, averageScore: 0, passRate: 0, topStudents: [], status: 'Scores Pending', scoresSubmitted: 0 },
  { class: 'JSS 3', classTeacher: 'Unassigned', totalStudents: 0, averageScore: 0, passRate: 0, topStudents: [], status: 'Scores Pending', scoresSubmitted: 0 },
  { class: 'SS 1', classTeacher: 'Unassigned', totalStudents: 0, averageScore: 0, passRate: 0, topStudents: [], status: 'Scores Pending', scoresSubmitted: 0 },
  { class: 'SS 2', classTeacher: 'Unassigned', totalStudents: 0, averageScore: 0, passRate: 0, topStudents: [], status: 'Scores Pending', scoresSubmitted: 0 },
  { class: 'SS 3', classTeacher: 'Unassigned', totalStudents: 0, averageScore: 0, passRate: 0, topStudents: [], status: 'Scores Pending', scoresSubmitted: 0 },
];

export default function ProprietorResultsPage() {
  const [classesResults, setClassesResults] = useState<ClassResultSummary[]>(DEFAULT_CLASSES);
  const [parentEmailDeliveries, setParentEmailDeliveries] = useState<ParentEmailDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspectClass, setSelectedInspectClass] = useState<string>('JSS 3');
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccessToast, setDispatchSuccessToast] = useState<string | null>(null);

  const fetchResultsData = async () => {
    try {
      const res = await fetch('/api/results');
      const json = await res.json();
      if (json.success && json.data) {
        if (Array.isArray(json.data.classes) && json.data.classes.length > 0) {
          setClassesResults(json.data.classes);
        }
        if (Array.isArray(json.data.parentEmailDeliveries)) {
          setParentEmailDeliveries(json.data.parentEmailDeliveries);
        }
      }
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResultsData();
  }, []);

  const pendingSignoffCount = classesResults.filter((c) => c.status === 'Pending Proprietor Sign-off').length;

  const handleSealAndDispatch = async () => {
    setIsDispatching(true);
    const pendingClasses = classesResults
      .filter((c) => c.status === 'Pending Proprietor Sign-off')
      .map((c) => c.class);

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'endorse', classNames: pendingClasses }),
      });
      const json = await res.json();

      if (json.success) {
        // Also update local storage for any client tabs
        try {
          const stored = localStorage.getItem('oakland_results_endorsed_by_proprietor');
          const list: string[] = stored ? JSON.parse(stored) : [];
          pendingClasses.forEach((cls) => {
            if (!list.includes(cls)) list.push(cls);
          });
          localStorage.setItem('oakland_results_endorsed_by_proprietor', JSON.stringify(list));
          window.dispatchEvent(new Event('storage'));
        } catch {}

        setClassesResults((prev) =>
          prev.map((c) =>
            pendingClasses.includes(c.class) ? { ...c, status: 'Dispatched to Parents' } : c
          )
        );

        setDispatchSuccessToast('Proprietor endorsement applied to all classes. Report cards approved and dispatched to parents.');
        setTimeout(() => setDispatchSuccessToast(null), 5000);
        await fetchResultsData();
      } else {
        alert(json.error || 'Failed to endorse classes');
      }
    } catch {
      alert('Network error while endorsing results');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleApproveClass = async (className: string) => {
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'endorse', classNames: [className] }),
      });
      const json = await res.json();

      if (json.success) {
        try {
          const stored = localStorage.getItem('oakland_results_endorsed_by_proprietor');
          const list: string[] = stored ? JSON.parse(stored) : [];
          if (!list.includes(className)) {
            list.push(className);
            localStorage.setItem('oakland_results_endorsed_by_proprietor', JSON.stringify(list));
            window.dispatchEvent(new Event('storage'));
          }
        } catch {}

        setClassesResults((prev) =>
          prev.map((c) => (c.class === className ? { ...c, status: 'Dispatched to Parents' } : c))
        );

        setDispatchSuccessToast(`${className} report cards officially endorsed and published.`);
        setTimeout(() => setDispatchSuccessToast(null), 4000);
        await fetchResultsData();
      } else {
        alert(json.error || 'Failed to endorse class');
      }
    } catch {
      alert('Network error while endorsing class');
    }
  };

  const handlePrintBroadsheet = () => {
    const inspectClassData = classesResults.find((c) => c.class === selectedInspectClass);
    const printWin = window.open('', '_blank', 'width=900,height=900');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Terminal Broadsheet - ${selectedInspectClass}</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; line-height: 1.4; }
            .header { border-bottom: 2px solid #0f3a3e; padding-bottom: 12px; margin-bottom: 16px; text-align: center; }
            .title { font-size: 20px; font-weight: 800; color: #0f3a3e; text-transform: uppercase; margin: 0; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; font-size: 12px; }
            .meta-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block; }
            .meta-value { font-weight: 700; color: #0f172a; font-size: 13px; }
            .notice-box { padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; font-size: 13px; color: #475569; background: #f8fafc; margin: 24px 0; }
            .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .sig-line { border-top: 1px solid #94a3b8; margin-top: 32px; padding-top: 4px; font-size: 11px; color: #475569; }
            .sig-title { font-size: 11px; font-weight: 700; color: #0f172a; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Oakland International School</h1>
            <p class="subtitle">Official Terminal Examination Broadsheet &bull; First Term 2026/2027 Academic Session</p>
          </div>
          <div class="meta-grid">
            <div>
              <span class="meta-label">Class</span>
              <span class="meta-value">${selectedInspectClass}</span>
            </div>
            <div>
              <span class="meta-label">Class Teacher</span>
              <span class="meta-value">${inspectClassData?.classTeacher || 'Unassigned'}</span>
            </div>
            <div>
              <span class="meta-label">Enrolled Students</span>
              <span class="meta-value">${inspectClassData?.totalStudents || 0} Pupils</span>
            </div>
            <div>
              <span class="meta-label">Ratification Status</span>
              <span class="meta-value">${inspectClassData?.status || 'Scores Pending'}</span>
            </div>
          </div>
          <div class="notice-box">
            <p style="margin: 0; font-weight: 700; color: #0f3a3e;">Terminal Assessment Summary</p>
            <p style="margin: 6px 0 0; font-size: 12px; color: #64748b;">
              ${
                (inspectClassData?.scoresSubmitted || 0) > 0
                  ? `Continuous assessment marks recorded for ${inspectClassData?.scoresSubmitted} student(s). Class Average: ${inspectClassData?.averageScore}%.`
                  : `Subject teachers have not submitted examination marks for ${selectedInspectClass} yet. Terminal assessment records are pending.`
              }
            </p>
          </div>
          <div class="signatures">
            <div>
              <div class="sig-title">Class Teacher</div>
              <div class="sig-line">${inspectClassData?.classTeacher || 'Unassigned'}</div>
            </div>
            <div>
              <div class="sig-title">Head of School</div>
              <div class="sig-line">Mr Seyi Bankole</div>
            </div>
            <div>
              <div class="sig-title">Executive Ratification</div>
              <div class="sig-line">Office of the Proprietor</div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Results Endorsement</h1>
            <Badge variant="teal" size="sm">2026/2027 Session &bull; Term 1</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review terminal assessment broadsheets, inspect student marks, and apply executive endorsement to publish report cards to parents.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedInspectClass('JSS 3');
              setShowSampleModal(true);
            }}
            className="text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Inspect Sample
          </Button>

          <Button
            size="sm"
            onClick={handleSealAndDispatch}
            disabled={isDispatching || pendingSignoffCount === 0}
            className={`text-xs font-semibold gap-1.5 whitespace-nowrap shrink-0 ${
              pendingSignoffCount === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300'
                : 'bg-[#0f3a3e] hover:bg-[#134b50] text-white cursor-pointer'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isDispatching ? 'Endorsing...' : 'Endorse All Classes'}</span>
          </Button>
        </div>
      </div>

      {/* Dispatch Success Alert */}
      {dispatchSuccessToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold">{dispatchSuccessToast}</p>
          </div>
        </div>
      )}

      {/* Class Results Table - Approval Workflow */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Class Teacher</th>
                <th className="px-4 py-3 text-center">Enrolled</th>
                <th className="px-4 py-3 text-center">Class Average</th>
                <th className="px-4 py-3">Principal Vetting</th>
                <th className="px-4 py-3">Status Flags</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Approval Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {classesResults.map((cls) => {
                const hasIssue = cls.totalStudents > 0 && cls.scoresSubmitted < cls.totalStudents;
                const isApproved = cls.status === 'Dispatched to Parents';
                const isPendingSignoff = cls.status === 'Pending Proprietor Sign-off';

                return (
                  <tr key={cls.class} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 text-sm">{cls.class}</p>
                      <p className="text-[10px] text-slate-400">Term 1 2026/2027</p>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{cls.classTeacher}</span>
                    </td>

                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                      {cls.totalStudents}
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      {cls.averageScore > 0 ? `${cls.averageScore}%` : '—'}
                    </td>

                    <td className="px-4 py-3">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Endorsed
                        </span>
                      ) : isPendingSignoff ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          Vetted by Principal
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Awaiting Principal</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {cls.totalStudents === 0 ? (
                        <span className="text-slate-400 text-[11px]">0 Enrolled</span>
                      ) : cls.scoresSubmitted === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          Marks pending
                        </span>
                      ) : cls.scoresSubmitted < cls.totalStudents ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertCircle className="w-3 h-3" />
                          {cls.totalStudents - cls.scoresSubmitted} pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          All Submitted
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isPendingSignoff
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {isApproved ? 'Dispatched to Parents' : isPendingSignoff ? 'Pending Sign-off' : 'Scores Pending'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInspectClass(cls.class);
                            setShowSampleModal(true);
                          }}
                          className="h-7 px-2.5 text-[11px] font-semibold text-slate-700"
                        >
                          <Eye className="w-3 h-3 mr-1" /> Inspect
                        </Button>

                        {isApproved ? (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 ml-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Endorsed
                          </span>
                        ) : isPendingSignoff ? (
                          <Button
                            size="sm"
                            onClick={() => handleApproveClass(cls.class)}
                            className="bg-[#0f3a3e] hover:bg-[#134b50] text-white text-[11px] font-semibold h-7 px-3 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Endorse</span>
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">
                            Pending
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parent Email Delivery Audit Stream */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Live Parent Email Dispatch Stream
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Automated delivery records to registered parental email addresses upon official endorsement.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowEmailPreviewModal(true)}
            className="text-xs font-semibold text-teal-800 border-teal-300 hover:bg-teal-50"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Inspect Sample Email
          </Button>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Student and ID</th>
                <th className="py-2.5 px-3 text-center">Class</th>
                <th className="py-2.5 px-4">Guardian</th>
                <th className="py-2.5 px-4">Recipient Email Address</th>
                <th className="py-2.5 px-3">Result Summary</th>
                <th className="py-2.5 px-3">Sent Time</th>
                <th className="py-2.5 px-3 text-center">Email Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {parentEmailDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No parent email notifications dispatched yet. Endorse classes above to trigger automated dispatch.
                  </td>
                </tr>
              ) : (
                parentEmailDeliveries.map((em) => (
                  <tr key={em.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-extrabold text-slate-900">{em.studentName}</p>
                      <p className="text-[10px] text-teal-800 font-mono">{em.admissionNo}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {em.class}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {em.parentName}
                    </td>
                    <td className="py-3 px-4 font-mono text-teal-900 text-[11px]">
                      {em.parentEmail}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-800">
                      {em.totalScore}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {em.sentTime}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          em.status === 'Opened by Parent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {em.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ==================================================================== */}
      {/* MODAL 1: SAMPLE REPORT CARD INSPECTOR (OFFICIAL SEALED VIEW)          */}
      {/* ==================================================================== */}
      {showSampleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b-2 border-[#0f3a3e]">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">
                  Oakland International School &bull; Terminal Examination Broadsheet
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Inspecting: {selectedInspectClass} &bull; First Term 2026/2027 Academic Session
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintBroadsheet}
                  className="text-xs whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 h-8 px-3 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                  <span>Print Report Sheet</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setShowSampleModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Class Inspection State */}
            {(() => {
              const inspectClassData = classesResults.find((c) => c.class === selectedInspectClass);
              const studentName = inspectClassData?.topStudents[0] || 'Enrolled Student';
              const hasScores = (inspectClassData?.scoresSubmitted || 0) > 0;
              const hasPupils = (inspectClassData?.totalStudents || 0) > 0;

              if (!hasPupils) {
                return (
                  <div className="py-12 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">
                      No Students Enrolled in {selectedInspectClass}
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      There are currently no active student enrollments for this class in the 2026/2027 First Term session.
                    </p>
                  </div>
                );
              }

              if (!hasScores) {
                return (
                  <div className="py-12 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">
                      Examination Marks Pending Submission
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Subject teachers have not yet submitted continuous assessment and terminal examination scores for {selectedInspectClass}. The broadsheet will automatically populate as teachers submit scores.
                    </p>
                    <div className="pt-2 text-xs text-slate-400 font-mono">
                      Class Teacher: {inspectClassData?.classTeacher} &bull; Enrolled: {inspectClassData?.totalStudents} pupils
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Student Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Student Name</span>
                      <span className="font-extrabold text-slate-900">{studentName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Enrolled Class</span>
                      <span className="font-bold text-slate-900">{selectedInspectClass}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Class Average</span>
                      <span className="font-black text-[#b3141f]">{inspectClassData?.averageScore}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Submission State</span>
                      <span className="font-black text-emerald-800">{inspectClassData?.status}</span>
                    </div>
                  </div>

                  {/* Remarks & Sign-off */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <p>
                      <strong className="text-slate-800">Class Teacher Remark:</strong>{' '}
                      <span className="italic">Class assessments vetted and ready for administrative review.</span>
                    </p>
                    <p>
                      <strong className="text-blue-900">Principal Vetting Remark:</strong>{' '}
                      <span className="italic text-blue-950">Vetted and verified by Mr Seyi Bankole (Head of School). Recommended for executive endorsement.</span>
                    </p>
                    <p className="pt-2 border-t border-slate-200 text-[#0f3a3e]">
                      <strong>Proprietor Endorsement:</strong>{' '}
                      <span className="font-semibold">{inspectClassData?.status === 'Dispatched to Parents' ? 'OFFICIALLY RATIFIED & DISPATCHED TO PARENTS.' : 'AWAITING PROPRIETOR RATIFICATION.'}</span>
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: PARENT EMAIL DISPATCH PREVIEW                                */}
      {/* ==================================================================== */}
      {showEmailPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-teal-800" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Parent Email Dispatch Sample
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Sample electronic notification delivered to registered guardian email
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailPreviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Shell */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs text-xs bg-slate-50">
              {/* Header metadata */}
              <div className="p-3 bg-white border-b border-slate-200 space-y-1 font-mono text-[11px] text-slate-600">
                <p><strong className="text-slate-900">From:</strong> Oakland International School &lt;results@oaklandschools.edu.ng&gt;</p>
                <p><strong className="text-slate-900">To:</strong> Registered Guardian &lt;guardian.contact@gmail.com&gt;</p>
                <p><strong className="text-slate-900">Date:</strong> 26 September 2026, 02:15 PM</p>
                <p><strong className="text-slate-900">Subject:</strong> Official Terminal Report Card &bull; First Term 2026/2027</p>
              </div>

              {/* Body */}
              <div className="p-5 bg-white space-y-3.5 text-slate-800 leading-relaxed">
                <div className="text-center pb-3 border-b border-slate-100">
                  <span className="font-extrabold text-sm text-[#0f3a3e] tracking-tight uppercase block">
                    Oakland International School
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Office of the Principal and Academic Directorate
                  </span>
                </div>

                <p>Dear <strong>Guardian</strong>,</p>

                <p>
                  We are pleased to present the official First Term 2026/2027 Terminal Report Card for your ward.
                </p>

                {/* Performance Summary Banner */}
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1 text-teal-950">
                  <div className="flex justify-between items-center font-bold">
                    <span>Overall Class Standing:</span>
                    <span className="text-xs font-semibold text-teal-800">[Class Standing]</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Composite Terminal Score:</span>
                    <span className="font-mono text-xs font-semibold text-teal-800">[Terminal Score % &bull; Grade]</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 italic">
                  &quot;Consistently demonstrates high intellectual capacity and leadership in academics.&quot; — <strong>Mr Seyi Bankole (Head of School)</strong>
                </p>

                {/* PDF Attachment Box */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        Official_Terminal_Report_Card.pdf
                      </p>
                      <p className="text-[10px] text-slate-400">142 KB &bull; Digitally Endorsed with Proprietor Seal</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowEmailPreviewModal(false);
                      setShowSampleModal(true);
                    }}
                    className="text-xs font-bold text-[#0f3a3e] border-[#0f3a3e] hover:bg-[#0f3a3e]/5"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Inspect Report
                  </Button>
                </div>

                <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  Resumption for Second Term is scheduled for <strong>Monday, 11 January 2027</strong>. Parents may also view results anytime on the Parent Portal.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
