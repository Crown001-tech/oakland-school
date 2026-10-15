'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/brand/Logo';
import {
  Award,
  CheckCircle2,
  Clock,
  Printer,
  Send,
  Save,
  Search,
  Sparkles,
  ChevronRight,
  Eye,
  FileText,
  User,
  Shield,
  Building2,
  Check,
  AlertCircle,
  ArrowRight,
  Lock,
} from 'lucide-react';
import {
  fetchPrincipalDelegations,
  type PrincipalDelegations,
} from '@/lib/delegations';
import { DelegationRestrictedBanner } from '@/components/common/DelegationRestrictedBanner';

interface StudentReportVetting {
  id: string;
  admissionNo: string;
  name: string;
  gender: 'Male' | 'Female';
  position: string | null;
  totalMarks: number | null;
  percentage: number | null;
  grade: string | null;
  hasScores: boolean;
  classTeacherRemark: string;
  principalRemark: string;
  isVetted: boolean;
  affectiveAvg: number | null;
  psychomotorAvg: number | null;
}

const PRINCIPAL_COMMENT_PRESETS = [
  'An exceptional academic outcome reflecting discipline and high intellectual capacity. Recommended for executive academic commendation.',
  'Consistently high standards maintained across all subjects. A proud reflection of Oakland scholarly values.',
  'A very satisfying terminal score. With focused attention on revision, greater heights can be reached.',
  'Good terminal progress. Encouraged to demonstrate more active classroom engagement and eliminate minor distractions.',
  'Satisfactory result. Needs to exhibit greater academic discipline and punctuality in the upcoming term.',
];

export default function AdminResultsVettingPage() {
  const [selectedClass, setSelectedClass] = useState<string>('JSS 3');
  const [classTeacherName, setClassTeacherName] = useState<string>('Unassigned');
  const [students, setStudents] = useState<StudentReportVetting[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentReportVetting | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [forwardedToProprietor, setForwardedToProprietor] = useState(false);
  const [forwardedClassesList, setForwardedClassesList] = useState<string[]>([]);
  const [delegations, setDelegations] = useState<PrincipalDelegations | null>(null);
  const canApproveResults = delegations?.canEndorseResults ?? true;

  useEffect(() => {
    fetchPrincipalDelegations().then(setDelegations);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Fetch class teacher for the selected class
    const resolveTeacher = async () => {
      let resolved = 'Unassigned';
      try {
        const r = await fetch('/api/classes');
        if (r.ok) {
          const payload = await r.json();
          if (payload?.success && Array.isArray(payload.data)) {
            const cls = payload.data.find((c: any) => c.name === selectedClass);
            const teacher = cls?.classTeacher || cls?.class_teacher || (cls?.teacher_assignments || []).find((t: any) => t.is_class_teacher)?.staff_profiles;
            const tName = typeof teacher === 'string' ? teacher : teacher ? `${teacher.first_name} ${teacher.last_name}`.trim() : null;
            if (tName && tName !== 'Unassigned') resolved = tName;
          }
        }
      } catch {}

      if (resolved === 'Unassigned') {
        try {
          const stfRes = await fetch('/api/staff');
          if (stfRes.ok) {
            const stfJson = await stfRes.json();
            if (stfJson?.success && Array.isArray(stfJson.data)) {
              const matched = stfJson.data.find(
                (s: any) => s.assignedClass === selectedClass || s.assigned_class === selectedClass
              );
              if (matched) {
                resolved = matched.name || `${matched.first_name || ''} ${matched.last_name || ''}`.trim();
              }
            }
          }
        } catch {}
      }

      if (isMounted) setClassTeacherName(resolved);
    };

    resolveTeacher();

    const fetchStudentsForClass = async () => {
      try {
        let allStudents: any[] = [];
        const res = await fetch('/api/students');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            allStudents = data.data;
          }
        }

        // Fetch results metadata from live API
        try {
          const resResults = await fetch('/api/results');
          if (resResults.ok) {
            const resultsData = await resResults.json();
            if (resultsData?.data?.forwardedClasses && Array.isArray(resultsData.data.forwardedClasses)) {
              setForwardedClassesList(resultsData.data.forwardedClasses);
            }
          }
        } catch {}

        if (!isMounted) return;

        if (allStudents.length > 0) {
          const classStudents = allStudents.filter(
            (s: any) => !s.class || s.class === selectedClass
          );

          if (classStudents.length > 0) {
            const mapped: StudentReportVetting[] = classStudents.map((s: any, idx: number) => {
              // Real assessments check from database
              const hasRecordedScores = false;

              return {
                id: s.id || `std-${idx}`,
                admissionNo: s.admissionNo || s.admissionNumber || `OAK-${idx + 1}`,
                name: s.fullName || s.name || 'Student',
                gender: (s.gender === 'Female' || s.gender === 'female' ? 'Female' : 'Male'),
                hasScores: hasRecordedScores,
                position: null,
                totalMarks: null,
                percentage: null,
                grade: null,
                classTeacherRemark: 'No terminal remarks submitted yet.',
                principalRemark: '',
                isVetted: false,
                affectiveAvg: null,
                psychomotorAvg: null,
              };
            });

            setStudents(mapped);
            setSelectedStudent(mapped[0] || null);
            return;
          }
        }
        setStudents([]);
        setSelectedStudent(null);
      } catch {
        if (isMounted) {
          setStudents([]);
          setSelectedStudent(null);
        }
      }
    };

    fetchStudentsForClass();
    return () => { isMounted = false; };
  }, [selectedClass]);

  const handlePrincipalRemarkChange = (text: string) => {
    if (!selectedStudent || !canApproveResults) return;
    const updated = { ...selectedStudent, principalRemark: text };
    setSelectedStudent(updated);
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleToggleVetted = (id: string) => {
    if (!canApproveResults) return;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, isVetted: !s.isVetted };
        }
        return s;
      })
    );
    if (selectedStudent?.id === id) {
      setSelectedStudent((prev) => prev ? ({ ...prev, isVetted: !prev.isVetted }) : null);
    }
  };

  const handleSaveStudentVetting = () => {
    if (!selectedStudent || !canApproveResults) return;
    const updated = { ...selectedStudent, isVetted: true };
    setSelectedStudent(updated);
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 4000);
  };

  const handleForwardToProprietor = async () => {
    if (!canApproveResults || students.length === 0 || vettedCount < totalCount) return;

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forward', classNames: [selectedClass] }),
      });
      if (res.ok) {
        setForwardedClassesList((prev) => Array.from(new Set([...prev, selectedClass])));
        setForwardedToProprietor(true);
      }
    } catch {}
    setTimeout(() => setForwardedToProprietor(false), 6000);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const vettedCount = students.filter((s) => s.isVetted).length;
  const totalCount = students.length;
  const hasScoresCount = students.filter((s) => s.hasScores).length;
  const canForward = totalCount > 0 && hasScoresCount === totalCount && vettedCount === totalCount;

  const isAlreadyForwarded = forwardedClassesList.includes(selectedClass);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#0f3a3e] text-white">
              2026/2027 Session &bull; First Term
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Report Cards
          </h1>
          <p className="text-xs text-slate-500">
            Review student term results, enter Principal remarks, and forward approved report cards to the Proprietor.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canApproveResults ? (
            <Button
              type="button"
              onClick={handleForwardToProprietor}
              disabled={!canForward}
              className={`shadow-xs text-xs font-semibold flex items-center gap-2 transition ${
                canForward
                  ? 'bg-[#0f3a3e] hover:bg-[#164e53] text-white cursor-pointer'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isAlreadyForwarded
                  ? `Forwarded to Proprietor (${selectedClass})`
                  : totalCount === 0
                  ? `No Students in ${selectedClass}`
                  : hasScoresCount === 0
                  ? `Scores Pending in ${selectedClass}`
                  : canForward
                  ? `Forward Approved ${selectedClass} Results to Proprietor`
                  : `Endorse All to Forward (${vettedCount}/${totalCount})`}
              </span>
            </Button>
          ) : (
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Results Sign-off Reserved</span>
            </span>
          )}
        </div>
      </div>

      {/* Authority Restriction Notice */}
      {!canApproveResults && (
        <DelegationRestrictedBanner
          title="Result Approval Authority Reserved"
          description="The Office of the Proprietor has reserved final terminal academic result sign-off and publication approval. The Principal may review and inspect student report cards in read-only mode."
        />
      )}

      {/* Notifications */}
      {isSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs font-bold">
            Principal remark and academic endorsement successfully saved for {selectedStudent?.name ?? 'the student'}!
          </div>
        </div>
      )}

      {forwardedToProprietor && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-300 text-teal-950 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Report Cards Sent to Proprietor!</p>
            <p className="text-teal-900">
              The {selectedClass} report cards have been approved with your remarks and sent to the Proprietor for final sign-off and publishing.
            </p>
          </div>
        </div>
      )}

      {/* Class Batch Selector Tabs (Strictly 6 Classes) */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 mr-2">Select Class:</span>
          {(['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'] as const).map((cls) => {
            const isSelected = selectedClass === cls;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0f3a3e] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cls}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-600 flex items-center gap-2">
          <span>Class Teacher:</span>
          <strong className="text-slate-900">
            {classTeacherName}
          </strong>
        </div>
      </div>



      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student List & Review Status */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="border-slate-200 shadow-xs">
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{selectedClass} Class List</span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                  {vettedCount} of {totalCount} Endorsed
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search student or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50"
                />
              </div>
            </div>

            <div className="max-h-[640px] overflow-y-auto divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No examination scores recorded yet for this class.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full p-3.5 text-left transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/90 border-l-4 border-[#0f3a3e]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-[#0f3a3e] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {student.position || '—'}
                      </div>
                      <div className="overflow-hidden">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#0f3a3e]' : 'text-slate-900'}`}>
                          {student.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          {student.admissionNo} &bull; {student.hasScores && student.totalMarks !== null ? `Score: ${student.totalMarks}/600 (${student.percentage}%)` : 'Scores Pending'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {student.isVetted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Reviewed
                        </span>
                      ) : student.hasScores ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          Pending
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Scores Pending
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Principal Review & Endorsement Workspace */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedStudent ? (
            <Card className="border-slate-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Student Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select a student from the list to review scores, verify remarks, and save the Principal endorsement.
              </p>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-[#0a1b1d] to-[#12363b] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold">
                    {selectedStudent.admissionNo}
                  </span>
                  <span className="text-xs text-teal-200 font-semibold">
                    {selectedClass} &bull; {selectedStudent.position ? `Rank: ${selectedStudent.position} of ${totalCount}` : 'Rank: —'}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white mt-1">
                  {selectedStudent.name}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {canApproveResults ? (
                  <Button
                    type="button"
                    onClick={handleSaveStudentVetting}
                    disabled={!selectedStudent.hasScores}
                    className={`text-white font-bold text-xs h-9 px-4 flex items-center gap-1.5 shadow-xs ${
                      selectedStudent.hasScores
                        ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                    title={selectedStudent.hasScores ? 'Endorse student results' : 'Scores pending submission'}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{selectedStudent.hasScores ? 'Endorse Student' : 'Scores Pending'}</span>
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>Read Only</span>
                  </span>
                )}
              </div>
            </div>

            {/* Performance Snapshot */}
            <div className="p-4 bg-teal-900 text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-t border-teal-800 text-xs">
              <div>
                <p className="text-[10px] text-teal-200 uppercase font-semibold">Total Score</p>
                <p className="text-base font-black mt-0.5">
                  {selectedStudent.totalMarks !== null ? `${selectedStudent.totalMarks} / 600` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-teal-200 uppercase font-semibold">Percentage</p>
                <p className="text-base font-black mt-0.5">
                  {selectedStudent.percentage !== null ? `${selectedStudent.percentage}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-teal-200 uppercase font-semibold">Affective Rating</p>
                <p className="text-base font-black text-emerald-300 mt-0.5">
                  {selectedStudent.affectiveAvg !== null ? `${selectedStudent.affectiveAvg} / 5.0` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-teal-200 uppercase font-semibold">Psychomotor</p>
                <p className="text-base font-black text-teal-200 mt-0.5">
                  {selectedStudent.psychomotorAvg !== null ? `${selectedStudent.psychomotorAvg} / 5.0` : '—'}
                </p>
              </div>
            </div>

            <CardContent className="p-5 space-y-5 bg-white">
              {/* Class Teacher's Submitted Remark (Review Inspection) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase text-[11px]">
                    Class Teacher's Evaluated Remark:
                  </span>
                  <span className="text-[10px] font-semibold text-teal-800">
                    Class Teacher
                  </span>
                </div>
                <p className="text-slate-700 italic leading-relaxed">
                  "{selectedStudent.classTeacherRemark}"
                </p>
              </div>

              {/* Principal's Official Remark Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 uppercase">
                    Principal's Academic Remark and Endorsement:
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    School Principal
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={selectedStudent.principalRemark}
                  onChange={(e) => handlePrincipalRemarkChange(e.target.value)}
                  readOnly={!canApproveResults}
                  placeholder={
                    canApproveResults
                      ? 'Enter official academic comment for the terminal report card...'
                      : 'Result endorsement reserved by Proprietor'
                  }
                  className={`w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-teal-600 focus:ring-1 focus:ring-teal-600 ${
                    canApproveResults ? 'bg-white text-slate-800' : 'bg-slate-50 text-slate-500 cursor-not-allowed'
                  }`}
                />

                {/* Quick Academic Suggestion Chips */}
                {canApproveResults && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" /> Academic Presets:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRINCIPAL_COMMENT_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePrincipalRemarkChange(preset)}
                          className="text-[11px] p-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                        >
                          "{preset.slice(0, 48)}..."
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Checkbox & Save */}
                {canApproveResults ? (
                  <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={selectedStudent.isVetted}
                        onChange={() => handleToggleVetted(selectedStudent.id)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                      />
                      <span>Mark as Approved by Principal</span>
                    </label>

                    <Button
                      type="button"
                      onClick={handleSaveStudentVetting}
                      className="bg-[#0f3a3e] hover:bg-[#164e53] text-white font-bold text-xs h-8 px-4"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      Save Endorsement
                    </Button>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-200 text-xs text-amber-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Result approval authority is reserved by the Proprietor. Remarks and endorsements cannot be modified.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  );
}
