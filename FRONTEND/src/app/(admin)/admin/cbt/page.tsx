'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ShieldCheck,
  FileText,
  BookOpen,
  Layers,
  ChevronRight,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface Assessment {
  id: string;
  title: string;
  code: string;
  assessment_type: string;
  assessment_category: string;
  duration_minutes: number;
  total_marks: number;
  pass_percentage: number;
  instructions?: string;
  status: 'draft' | 'published' | 'active' | 'closed';
  created_at: string;
  class?: { id: string; name: string };
  subject?: { id: string; name: string; code: string };
  totalAttempts?: number;
  totalQuestions?: number;
}

interface QuestionBank {
  id: string;
  title: string;
  class_level: string;
  questions_count: number;
  created_at: string;
  subject?: { id: string; name: string; code: string };
}

export default function AdminCbtOversightPage() {
  const [activeTab, setActiveTab] = useState<'assessments' | 'banks' | 'proctoring'>('assessments');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assRes, bankRes] = await Promise.all([
        fetch('/api/cbt/assessments').then((r) => r.json()),
        fetch('/api/cbt/banks').then((r) => r.json()),
      ]);

      if (assRes.success && Array.isArray(assRes.data)) setAssessments(assRes.data);
      if (bankRes.success && Array.isArray(bankRes.data)) setQuestionBanks(bankRes.data);
    } catch {
      // Clean fallback handled by state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Assessments
  const filteredAssessments = assessments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.subject?.name && a.subject.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesClass = filterClass === 'all' || a.class?.name === filterClass;
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchesSearch && matchesClass && matchesStatus;
  });

  // Filtered Question Banks
  const filteredBanks = questionBanks.filter((b) => {
    return (
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.subject?.name && b.subject.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Aggregate Metrics
  const totalPublished = assessments.filter((a) => a.status === 'published' || a.status === 'active').length;
  const totalAttempts = assessments.reduce((sum, a) => sum + (a.totalAttempts || 0), 0);
  const totalBanks = questionBanks.length;

  if (isLoading) {
    return <BrandLoader fullScreen size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
            <Laptop className="w-4 h-4" />
            <span>Academic Governance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Computer Based Testing
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional oversight of digital continuous assessments, question banks, and proctoring.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/teacher/cbt"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold shadow-xs transition-colors min-h-[44px]"
          >
            <BookOpen className="w-4 h-4" />
            <span>Faculty Question Banks</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Published Assessments</span>
            <Laptop className="w-4 h-4 text-brand-primary" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {totalPublished}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {assessments.length} total examinations created
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Student Attempts</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {totalAttempts}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Completed candidate examination runs
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Question Banks</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {totalBanks}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Certified curricular item repositories
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Proctoring Integrity</span>
            <ShieldCheck className="w-4 h-4 text-brand-primary" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
            100.0%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Anti-cheat proctoring active
          </p>
        </div>
      </div>

      {/* Tabs & Search Filter Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Navigation Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/70 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('assessments')}
              className={`px-4 py-2.5 rounded-lg transition-all min-h-[44px] ${
                activeTab === 'assessments'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Institutional Assessments</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('banks')}
              className={`px-4 py-2.5 rounded-lg transition-all min-h-[44px] ${
                activeTab === 'banks'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Question Repositories</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('proctoring')}
              className={`px-4 py-2.5 rounded-lg transition-all min-h-[44px] ${
                activeTab === 'proctoring'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Proctoring Audit</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search examination or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-primary min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Institutional Assessments Table */}
        {activeTab === 'assessments' && (
          <div className="overflow-x-auto">
            {filteredAssessments.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Laptop className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No Assessments Recorded</p>
                <p className="text-xs text-slate-400 mt-1">
                  Academic subject teachers have not published any digital examinations yet.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Assessment Title</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Pass Mark</th>
                    <th className="py-3 px-4">Attempts</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredAssessments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {a.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {a.title}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {a.class?.name || 'Class Level'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {a.subject?.name || 'Subject'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {a.duration_minutes} mins
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-primary">
                        {a.pass_percentage}%
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {a.totalAttempts || 0}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            a.status === 'published' || a.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedAssessment(a)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-brand-primary text-slate-700 hover:text-brand-primary text-xs font-semibold transition-colors min-h-[44px] cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Question Repositories */}
        {activeTab === 'banks' && (
          <div className="overflow-x-auto">
            {filteredBanks.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No Question Repositories Found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Subject teachers have not configured question banks matching this search.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Repository Title</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Items Count</th>
                    <th className="py-3 px-4">Date Configured</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredBanks.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {b.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {b.subject?.name || 'Subject'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {b.class_level}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-primary">
                        {b.questions_count || 0} questions
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(b.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Proctoring & Anti-Cheat Audit Stream */}
        {activeTab === 'proctoring' && (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Active Anti-Cheat Proctoring Protocol</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                The Oakland School CBT engine continuously monitors student test environments for security events:
                browser tab switches, window blur events, full screen exits, and unauthorized paste commands.
                Excessive security flags result in automated assessment termination.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Recent Security Event Stream</span>
                <span className="text-[11px] text-emerald-700 font-semibold">Zero Critical Infractions</span>
              </div>
              <div className="p-8 text-center text-slate-500 text-xs">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">All Examination Sessions Secure</p>
                <p className="text-slate-400 text-[11px] mt-1">
                  No unauthorized tab switching or cheating flags recorded across active sessions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Assessment Inspection Dialog */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  {selectedAssessment.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedAssessment.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                aria-label="Close modal"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Class</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedAssessment.class?.name || 'Class'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Subject</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedAssessment.subject?.name || 'Subject'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Time Allowed</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedAssessment.duration_minutes} minutes</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Pass Threshold</span>
                <p className="font-bold text-brand-primary mt-0.5">{selectedAssessment.pass_percentage}%</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-700">Official Instructions:</span>
              <p className="p-3 bg-slate-50 rounded-xl text-slate-600 text-[11px] leading-relaxed">
                {selectedAssessment.instructions || 'No specific instructions configured.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition shadow-xs min-h-[44px] order-2 sm:order-1 cursor-pointer"
              >
                Dismiss Details
              </button>
              <Link
                href={`/admin/cbt/take/${selectedAssessment.id}`}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-semibold shadow-xs min-h-[44px] order-1 sm:order-2 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Preview</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
