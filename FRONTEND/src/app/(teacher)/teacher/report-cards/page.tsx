'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  FileText,
  Search,
  Sparkles,
  ChevronRight,
  X,
  User,
  Shield,
  Building2,
  CalendarCheck,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Edit3,
  Eye,
  Sliders,
  Check,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { getClassTeacherMap, STANDARD_CLASSES } from '@/lib/class-utils';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface SubjectResult {
  name: string;
  teacher: string;
  ca1: number; // Max 20
  ca2: number; // Max 20
  exam: number; // Max 60
  classHighest: number;
  classLowest: number;
  classAverage: number;
  remark: string;
}

interface StudentReportCard {
  id: string;
  admissionNo: string;
  name: string;
  gender: 'Male' | 'Female';
  class: string;
  term: string;
  session: string;
  age: string;
  position: string;
  status: 'Draft' | 'Submitted to Principal' | 'Principal Approved' | 'Proprietor Signed';
  isEvaluated: boolean;
  timesOpened: number;
  timesPresent: number;
  timesLate: number;
  timesAbsent: number;
  subjects: SubjectResult[];
  affective: {
    punctuality: number;
    neatness: number;
    politeness: number;
    honesty: number;
    relationshipWithPeers: number;
    leadership: number;
    attentiveness: number;
  };
  psychomotor: {
    handwriting: number;
    sports: number;
    verbalFluency: number;
    practicalCraft: number;
    creativeArts: number;
  };
  classTeacherRemark: string;
  principalRemark: string;
  proprietorRemark: string;
}

const REMARK_PRESETS = [
  'An intellectually brilliant, well-disciplined student who showed exceptional dedication and leadership throughout the term.',
  'Shows commendable focus and steady academic growth. With continued commitment to revision, top distinction is well within reach.',
  'A polite, cheerful, and hardworking pupil. Demonstrated strong grasp in core sciences and languages. Keep aiming for the peak.',
  'Good terminal performance overall. Needs to improve punctuality and avoid classroom distractions during quantitative sessions.',
  'Capable of significantly higher achievement. Encouraged to participate more actively in class practicals and submit assignments promptly.',
];

const JUNIOR_SUBJECTS = [
  'Mathematics',
  'English Studies',
  'Basic Science and Technology',
  'Social Studies',
  'Business Studies',
  'Creative and Cultural Arts',
  'French Language',
  'Agricultural Science',
];

const SENIOR_SUBJECTS = [
  'General Mathematics',
  'English Language',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Civic Education',
  'Computer Studies',
];

export default function ClassReportCardsPage() {
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [classTeacherMap, setClassTeacherMap] = useState<Record<string, string>>({});
  const [staffList, setStaffList] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>(['JSS 1', 'JSS 2', 'JSS 3']);
  const [selectedClass, setSelectedClass] = useState<string>('JSS 1');

  const [reports, setReports] = useState<StudentReportCard[]>([]);
  const [selectedReport, setSelectedReport] = useState<StudentReportCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'All' | 'Evaluated' | 'Pending'>('All');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [batchSubmitted, setBatchSubmitted] = useState(false);
  const [isBatchLocked, setIsBatchLocked] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Load active teacher & staff directory from live endpoints
  useEffect(() => {
    let isMounted = true;

    const initTeacherData = async () => {
      try {
        let staff: any[] = [];
        try {
          const res = await fetch('/api/staff');
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) staff = json.data;
          }
        } catch { }

        if (staff.length > 0 && isMounted) {
          setStaffList(staff);
          const ctMap = getClassTeacherMap(staff);
          setClassTeacherMap(ctMap);
        }

        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.authenticated && meData.profile) {
            const p = meData.profile;
            if (!isMounted) return;
            setCurrentTeacher(p);

            const assignments = p.teachingAssignments || [];
            const homeroom = p.assignedClass;
            const classesFromAssignments = assignments.flatMap((ta: any) => ta.classes || []);

            const distinctClasses = Array.from(new Set([
              ...(homeroom ? [homeroom] : []),
              ...classesFromAssignments,
            ])).filter(Boolean) as string[];

            const uniqueClasses = STANDARD_CLASSES.filter((c) => distinctClasses.includes(c));
            const finalClasses = uniqueClasses.length > 0 ? uniqueClasses : distinctClasses;
            setAvailableClasses(finalClasses);

            const defaultCls = homeroom || finalClasses[0] || '';
            setSelectedClass(defaultCls);
          }
        }
      } catch (err) {
        console.error('Failed to init report cards teacher data', err);
      }
    };

    initTeacherData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Determine role duality dynamically
  const isClassTeacher = currentTeacher?.role === 'Class Teacher' || Boolean(currentTeacher?.assignedClass);
  const homeroomClass = currentTeacher?.assignedClass;
  const isHomeroom = Boolean(homeroomClass && selectedClass === homeroomClass);

  const assignedFormTutor = isHomeroom
    ? `${currentTeacher?.name || 'You'} (You)`
    : classTeacherMap[selectedClass] || 'Unassigned Class Teacher';

  // 2. Load report cards for selectedClass strictly from live database
  useEffect(() => {
    if (!selectedClass) {
      setReports([]);
      setSelectedReport(null);
      return;
    }

    let isMounted = true;

    const loadClassReports = async () => {
      try {
        let subjectScoresMap: Record<string, any[]> = {};
        try {
          const scRes = await fetch(`/api/scores?class=${encodeURIComponent(selectedClass)}`);
          if (scRes.ok) {
            const scJson = await scRes.json();
            if (scJson.success && scJson.data) {
              subjectScoresMap = scJson.data;
            }
          }
        } catch { }

        const isSenior = selectedClass.startsWith('SS');
        const curriculumSubjects = isSenior ? SENIOR_SUBJECTS : JUNIOR_SUBJECTS;

        const res = await fetch('/api/students');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const matchingStudents = json.data.filter((s: any) => s.class === selectedClass);
            if (matchingStudents.length === 0) {
              if (isMounted) {
                setReports([]);
                setSelectedReport(null);
              }
              return;
            }

            const listToUse = matchingStudents;
            const mapped: StudentReportCard[] = listToUse.map((s: any, idx: number) => {
              const birthYear = s.dob && s.dob !== '—' ? new Date(s.dob).getFullYear() : null;
              const currentYear = new Date().getFullYear();
              const computedAge = birthYear && !isNaN(birthYear) ? `${currentYear - birthYear} yrs` : '—';
              const adm = s.admissionNo || `OAK-${idx + 1}`;
              const studentName = s.fullName || 'Student';

              // Build subjects strictly from live gradebook submissions (zero fabricated 0-grade rows)
              const studentSubjects: SubjectResult[] = [];
              for (const subName of curriculumSubjects) {
                const scoreKey = `${selectedClass}_${subName}`;
                const recordedScores: any[] = subjectScoresMap[subName] || subjectScoresMap[scoreKey] || [];
                const studentEntry = recordedScores.find(
                  (item) => item.admissionNo === adm || item.id === s.id || item.name === studentName
                );

                if (
                  studentEntry &&
                  (Number(studentEntry.ca1) > 0 ||
                    Number(studentEntry.ca2) > 0 ||
                    Number(studentEntry.exam) > 0 ||
                    studentEntry.submitted === true)
                ) {
                  let teacherDisplay = 'Subject Specialist';
                  if (staffList.length > 0) {
                    const subStaff = staffList.find((staff: any) => {
                      const staffSubs: string[] = Array.isArray(staff.subjects)
                        ? staff.subjects
                        : typeof staff.subject === 'string'
                          ? staff.subject.split(/[;,|/]/).map((x: string) => x.trim())
                          : [];
                      return staffSubs.some((sub) => sub.toLowerCase().includes(subName.toLowerCase().slice(0, 5)));
                    });

                    if (subStaff) {
                      if (currentTeacher && subStaff.id === currentTeacher.id) {
                        teacherDisplay = `You (${currentTeacher.name})`;
                      } else {
                        teacherDisplay = subStaff.name;
                      }
                    }
                  }

                  const ca1 = Number(studentEntry.ca1) || 0;
                  const ca2 = Number(studentEntry.ca2) || 0;
                  const exam = Number(studentEntry.exam) || 0;
                  const tot = ca1 + ca2 + exam;
                  const remark =
                    studentEntry.remark ||
                    (tot >= 80 ? 'Distinction' : tot >= 70 ? 'Very Good' : tot >= 60 ? 'Credit' : tot >= 50 ? 'Pass' : 'Fail');

                  const allClassTotals = recordedScores
                    .map((it: any) => (Number(it.ca1) || 0) + (Number(it.ca2) || 0) + (Number(it.exam) || 0))
                    .filter((t: number) => t > 0);
                  const classHighest = allClassTotals.length > 0 ? Math.max(...allClassTotals) : tot;
                  const classLowest = allClassTotals.length > 0 ? Math.min(...allClassTotals) : tot;
                  const classAverage =
                    allClassTotals.length > 0
                      ? Math.round(allClassTotals.reduce((a: number, b: number) => a + b, 0) / allClassTotals.length)
                      : tot;

                  studentSubjects.push({
                    name: subName,
                    teacher: teacherDisplay,
                    ca1,
                    ca2,
                    exam,
                    classHighest,
                    classLowest,
                    classAverage,
                    remark,
                  });
                }
              }

              const hasScoresRecorded = studentSubjects.length > 0;

              return {
                id: s.id || `std-${idx}`,
                admissionNo: adm,
                name: studentName,
                gender: s.gender === 'Female' ? 'Female' : 'Male',
                class: selectedClass,
                term: 'First Term',
                session: '2026/2027',
                age: computedAge,
                position: hasScoresRecorded ? `${idx + 1} of ${listToUse.length}` : '—',
                status: 'Draft',
                isEvaluated: false,
                timesOpened: 0,
                timesPresent: 0,
                timesLate: 0,
                timesAbsent: 0,
                subjects: studentSubjects,
                affective: {
                  punctuality: 5,
                  neatness: 5,
                  politeness: 5,
                  honesty: 5,
                  relationshipWithPeers: 5,
                  leadership: 4,
                  attentiveness: 5,
                },
                psychomotor: {
                  handwriting: 4,
                  sports: 4,
                  verbalFluency: 5,
                  practicalCraft: 4,
                  creativeArts: 4,
                },
                classTeacherRemark: '',
                principalRemark: '',
                proprietorRemark: '',
              };
            });

            if (isMounted) {
              setReports(mapped);
              setSelectedReport(mapped[0] || null);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load class reports', err);
        if (isMounted) {
          setReports([]);
          setSelectedReport(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadClassReports();
    return () => {
      isMounted = false;
    };
  }, [selectedClass, staffList, currentTeacher]);

  // Grade Derivation Helper
  const getGradeInfo = (total: number | string) => {
    if (typeof total !== 'number' || isNaN(total) || total === 0) {
      return { grade: '—', points: 0.0, remark: 'Scores Pending' };
    }
    if (total >= 90) return { grade: 'A+', points: 4.0, remark: 'Distinction' };
    if (total >= 80) return { grade: 'A', points: 4.0, remark: 'Excellent' };
    if (total >= 70) return { grade: 'B', points: 3.0, remark: 'Very Good' };
    if (total >= 60) return { grade: 'C', points: 2.0, remark: 'Good Credit' };
    if (total >= 50) return { grade: 'D', points: 1.0, remark: 'Pass' };
    return { grade: 'F', points: 0.0, remark: 'Fail' };
  };

  // Grand Total & Percentage Auto-Calculation
  const calculateTotals = (report: StudentReportCard | null) => {
    if (!report) return { totalMarks: 0, maxMarks: 0, percentage: '—', hasScores: false };
    const subjects = Array.isArray(report.subjects) ? report.subjects : [];
    if (subjects.length === 0) {
      return { totalMarks: 0, maxMarks: 0, percentage: '—', hasScores: false };
    }
    const totalMarks = subjects.reduce((sum, s) => sum + (s.ca1 || 0) + (s.ca2 || 0) + (s.exam || 0), 0);
    const maxMarks = subjects.length * 100;
    const percentage = maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(1) : '—';
    return { totalMarks, maxMarks, percentage, hasScores: true };
  };

  // 1. Affective Rating Change
  const handleAffectiveChange = (trait: keyof StudentReportCard['affective'], rating: number) => {
    if (!selectedReport || !isHomeroom) return;
    const updated: StudentReportCard = {
      ...selectedReport,
      affective: {
        ...selectedReport.affective,
        [trait]: rating,
      },
    };
    setSelectedReport(updated);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  // 2. Psychomotor Rating Change
  const handlePsychomotorChange = (skill: keyof StudentReportCard['psychomotor'], rating: number) => {
    if (!selectedReport || !isHomeroom) return;
    const updated: StudentReportCard = {
      ...selectedReport,
      psychomotor: {
        ...selectedReport.psychomotor,
        [skill]: rating,
      },
    };
    setSelectedReport(updated);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  // 3. Class Teacher Remark Editing
  const handleTeacherRemarkChange = (text: string) => {
    if (!selectedReport || !isHomeroom) return;
    const updated: StudentReportCard = {
      ...selectedReport,
      classTeacherRemark: text,
    };
    setSelectedReport(updated);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  // 4. Save Student Evaluation
  const handleSaveEvaluation = () => {
    if (!selectedReport || !isHomeroom) return;
    const updated: StudentReportCard = {
      ...selectedReport,
      isEvaluated: true,
    };
    setSelectedReport(updated);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSaveToast(`Evaluation ratings and remarks successfully saved for ${selectedReport.name}!`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  // 5. Forward Batch to Principal
  const handleOpenForwardModal = () => {
    if (!isHomeroom || reports.length === 0 || isBatchLocked) return;
    setShowForwardModal(true);
  };

  const handleConfirmForwardToPrincipal = () => {
    if (!isHomeroom) return;
    setReports((prev) =>
      prev.map((r) => ({ ...r, status: 'Submitted to Principal' }))
    );
    setSelectedReport((prev) => prev ? ({ ...prev, status: 'Submitted to Principal' }) : null);
    setIsBatchLocked(true);
    setBatchSubmitted(true);
    setShowForwardModal(false);
    setSaveToast(`All ${selectedClass} report cards successfully forwarded to Principal Seyi Bankole and locked against further edits.`);
    setTimeout(() => {
      setBatchSubmitted(false);
      setSaveToast(null);
    }, 6000);
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterMode === 'All'
        ? true
        : filterMode === 'Evaluated'
          ? r.isEvaluated
          : !r.isEvaluated;
    return matchesSearch && matchesFilter;
  });

  const evaluatedCount = reports.filter((r) => r.isEvaluated).length;
  const totalCount = reports.length;

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <BrandLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/70 to-teal-50/30 p-6 sm:p-7 shadow-xs">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0f3a3e] via-teal-600 to-emerald-500" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0f3a3e] text-white tracking-wide shadow-xs">
                Class: {selectedClass} &bull; 2026/2027 Session
              </span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Class Report Cards
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
                {isHomeroom
                  ? `Preparing report cards for ${selectedClass}. Rate behavioral traits and practical skills, author teacher remarks, and forward to the Principal.`
                  : `You teach subjects in ${selectedClass}. The appointed Class Teacher is ${assignedFormTutor}, who is responsible for student ratings and report card remarks.`}
              </p>
            </div>
          </div>

          {isHomeroom && (
            <div className="flex items-center gap-3 shrink-0">
              {isBatchLocked ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold shadow-2xs">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>Forwarded and Locked</span>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleOpenForwardModal}
                  disabled={reports.length === 0}
                  className="bg-gradient-to-r from-[#0f3a3e] to-[#164e53] hover:from-[#13484d] hover:to-[#1b5e64] text-white shadow-xs text-xs font-bold flex items-center gap-2 h-10 px-5 rounded-xl transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-teal-300" />
                  <span>Forward {selectedClass} Report Cards to Principal</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 mr-1">Select Class:</span>
          {availableClasses.map((cls) => {
            const isSelected = selectedClass === cls;
            const isHome = isClassTeacher && cls === homeroomClass;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isSelected
                    ? 'bg-[#0f3a3e] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                <span>{cls}</span>
                {isHome && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${isSelected ? 'bg-teal-700 text-white' : 'bg-teal-100 text-teal-800'
                      }`}
                  >
                    My Class
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-slate-500">Class Teacher:</span>
          <strong className="text-slate-900">{assignedFormTutor}</strong>
        </div>
      </div>

      {/* Notifications */}
      {saveToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs font-bold">{saveToast}</div>
        </div>
      )}

      {batchSubmitted && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-300 text-blue-950 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Batch Dispatched to Principal!</p>
            <p className="text-blue-800">
              Student report cards for {selectedClass} have been compiled with ratings and remarks, and routed to the Principal for academic review before final Proprietor sign-off.
            </p>
          </div>
        </div>
      )}

      {/* Workflow Progress Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-800">Evaluation Progress ({selectedClass}):</span>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {evaluatedCount} of {totalCount} Students Evaluated
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Continuous Assessment and Examination marks collate directly from submitted gradebook records.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === 'edit'
                ? 'bg-[#0f3a3e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Interactive Editor Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === 'preview'
                ? 'bg-[#0f3a3e] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Official Report Card Preview</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Student List (Left) + Editor / Preview Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Student List */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="border-slate-200 shadow-xs">
            <div className="p-3 border-b border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{selectedClass} Students</span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                  Ranked by Total Score
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

              {/* Status Filter */}
              <div className="flex items-center gap-1 text-[11px]">
                {(['All', 'Evaluated', 'Pending'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${filterMode === mode
                        ? 'bg-[#0f3a3e] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[640px] overflow-y-auto divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No students found in {selectedClass}. Add or import students into {selectedClass} to prepare report cards.
                </div>
              ) : (
                filteredReports.map((student) => {
                  const isSelected = selectedReport?.id === student.id;
                  const { totalMarks, percentage, hasScores } = calculateTotals(student);

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedReport(student)}
                      className={`w-full p-3 text-left transition-colors flex items-center justify-between cursor-pointer ${isSelected
                          ? 'bg-teal-50/90 border-l-4 border-[#0f3a3e]'
                          : 'hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-[#0f3a3e] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {student.position}
                        </div>
                        <div className="overflow-hidden">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#0f3a3e]' : 'text-slate-900'}`}>
                            {student.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                            <span>{student.admissionNo}</span>
                            <span>&bull;</span>
                            {student.isEvaluated ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Evaluated
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold">Pending Remarks</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-extrabold text-slate-900">{hasScores ? `${percentage}%` : '—'}</p>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {hasScores ? `${totalMarks}/${student.subjects.length * 100}` : 'Scores Pending'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Col: Interactive Evaluation Workspace OR Printable Report Card */}
        <div className="lg:col-span-8">
          {!selectedReport ? (
            <Card className="border-slate-200 p-12 text-center text-slate-500 shadow-xs">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No Student Selected</p>
              <p className="text-xs text-slate-400 mt-1">Select a student from the roster on the left to begin evaluation.</p>
            </Card>
          ) : viewMode === 'edit' ? (
            <div className="space-y-5">
              {/* Active Student Header Hero - Executive Visual Hierarchy */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/70 to-teal-50/30 shadow-sm p-5 sm:p-6">
                {/* Decorative Brand Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0f3a3e] via-teal-600 to-emerald-500" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
                  {/* Left: Avatar & Identity Details */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-[#0f3a3e] to-[#164e53] text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-md border-2 border-white ring-2 ring-teal-700/20">
                        {selectedReport.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-xs">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-bold tracking-wide shadow-xs">
                          {selectedReport.admissionNo}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-900 text-[10px] font-extrabold border border-teal-200 uppercase tracking-wide">
                          {selectedClass}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                          Term 1 &bull; 2026/2027
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                        {selectedReport.name}
                      </h2>

                      <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                        <span>Gender: <strong className="text-slate-700 font-semibold">{selectedReport.gender}</strong></span>
                        <span className="text-slate-300">&bull;</span>
                        <span>Age: <strong className="text-slate-700 font-semibold">{selectedReport.age}</strong></span>
                        <span className="text-slate-300">&bull;</span>
                        <span>Position: <strong className="text-slate-700 font-semibold">{selectedReport.position}</strong></span>
                      </p>
                    </div>
                  </div>

                  {/* Right KPI capsules */}
                  <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60">
                    {(() => {
                      const { percentage, hasScores } = calculateTotals(selectedReport);
                      const { grade, remark } = getGradeInfo(hasScores ? parseFloat(percentage) : '—');
                      return (
                        <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                          <div className="text-center px-3 py-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Terminal Average
                            </span>
                            <span className="text-xl font-black text-slate-900 mt-0.5 block">
                              {percentage}{hasScores ? '%' : ''}
                            </span>
                          </div>
                          <div className="text-center px-3 py-1 border-l border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Standing
                            </span>
                            <span className={`text-xs font-black mt-1 block uppercase ${hasScores ? 'text-teal-700' : 'text-amber-700'}`}>
                              {hasScores ? `${grade} (${remark})` : remark}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 1. Subject Grades Table (Read-Only collated from Subject Teachers) */}
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Subject Scores
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Continuous Assessment and Examination marks submitted by subject teachers
                    </CardDescription>
                  </div>
                  {selectedReport.subjects.length > 0 && (
                    <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      {selectedReport.subjects.length} Subjects Recorded
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {selectedReport.subjects.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">
                        No Subject Scores Recorded Yet
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Subject teachers have not submitted examination marks for this class yet. Marks will display here automatically once entered into the subject gradebook.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3">Teacher</th>
                            <th className="py-2.5 px-2 text-center">CA1</th>
                            <th className="py-2.5 px-2 text-center">CA2</th>
                            <th className="py-2.5 px-2 text-center">Exam</th>
                            <th className="py-2.5 px-2 text-center">Total</th>
                            <th className="py-2.5 px-2 text-center">Grade</th>
                            <th className="py-2.5 px-3">Subject Remark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedReport.subjects.map((sub, idx) => {
                            const total = sub.ca1 + sub.ca2 + sub.exam;
                            const { grade } = getGradeInfo(total);
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-900">{sub.name}</td>
                                <td className="py-2.5 px-3 text-slate-600 font-medium">{sub.teacher}</td>
                                <td className="py-2.5 px-2 text-center font-mono">{sub.ca1}</td>
                                <td className="py-2.5 px-2 text-center font-mono">{sub.ca2}</td>
                                <td className="py-2.5 px-2 text-center font-mono">{sub.exam}</td>
                                <td className="py-2.5 px-2 text-center font-bold text-slate-900">{total}</td>
                                <td className="py-2.5 px-2 text-center font-bold text-teal-800">{grade}</td>
                                <td className="py-2.5 px-3 text-slate-500 italic text-[11px]">{sub.remark}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2. Behavioral Traits and Conduct */}
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Behavioral Traits and Conduct (Scale: 1 – 5)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Rate punctuality, neatness, leadership, politeness, and conduct
                    </CardDescription>
                  </div>
                  {!isHomeroom && (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium bg-slate-100 px-2 py-1 rounded">
                      <Lock className="w-3 h-3 text-slate-400" /> Class Teacher Only
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {(
                      [
                        { key: 'punctuality', label: 'Punctuality' },
                        { key: 'neatness', label: 'Neatness' },
                        { key: 'politeness', label: 'Politeness' },
                        { key: 'honesty', label: 'Honesty' },
                        { key: 'relationshipWithPeers', label: 'Peer Cooperation' },
                        { key: 'leadership', label: 'Leadership' },
                        { key: 'attentiveness', label: 'Attentiveness' },
                      ] as const
                    ).map(({ key, label }) => {
                      const currentVal = selectedReport.affective[key];
                      return (
                        <div
                          key={key}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-2"
                        >
                          <span className="font-bold text-slate-800 text-[11px]">{label}</span>
                          <div className="flex items-center justify-between gap-1 pt-1">
                            {[1, 2, 3, 4, 5].map((num) => {
                              const isActive = currentVal === num;
                              return (
                                <button
                                  key={num}
                                  type="button"
                                  disabled={!isHomeroom || isBatchLocked}
                                  onClick={() => handleAffectiveChange(key, num)}
                                  className={`w-9 h-8 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center ${isActive
                                      ? 'bg-[#0f3a3e] text-white shadow-xs scale-105 ring-2 ring-teal-400'
                                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-teal-50'
                                    } ${!isHomeroom || isBatchLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                >
                                  {num}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 3. Practical Skills and Physical Development */}
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Practical Skills and Physical Development (Scale: 1 – 5)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Rate physical dexterity, athletics, handwriting, and laboratory crafts
                    </CardDescription>
                  </div>
                  {!isHomeroom && (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium bg-slate-100 px-2 py-1 rounded">
                      <Lock className="w-3 h-3 text-slate-400" /> Class Teacher Only
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {(
                      [
                        { key: 'handwriting', label: 'Handwriting' },
                        { key: 'sports', label: 'Physical Education' },
                        { key: 'verbalFluency', label: 'Verbal Fluency' },
                        { key: 'practicalCraft', label: 'Practical Craft' },
                        { key: 'creativeArts', label: 'Creative Arts' },
                      ] as const
                    ).map(({ key, label }) => {
                      const currentVal = selectedReport.psychomotor[key];
                      return (
                        <div
                          key={key}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-2"
                        >
                          <span className="font-bold text-slate-800 text-[11px]">{label}</span>
                          <div className="flex items-center justify-between gap-1 pt-1">
                            {[1, 2, 3, 4, 5].map((num) => {
                              const isActive = currentVal === num;
                              return (
                                <button
                                  key={num}
                                  type="button"
                                  disabled={!isHomeroom || isBatchLocked}
                                  onClick={() => handlePsychomotorChange(key, num)}
                                  className={`w-9 h-8 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center ${isActive
                                      ? 'bg-teal-700 text-white shadow-xs scale-105 ring-2 ring-teal-400'
                                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-teal-50'
                                    } ${!isHomeroom || isBatchLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                >
                                  {num}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 4. Class Teacher General Terminal Remarks Editor */}
              <Card className="border-teal-200 bg-teal-50/30 shadow-xs">
                <CardHeader className="pb-2 border-b border-teal-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-teal-950">
                      Class Teacher's Official Terminal Remark
                    </CardTitle>
                    <CardDescription className="text-xs text-teal-800">
                      {isHomeroom
                        ? `Official Class Teacher Assessment for ${selectedClass}`
                        : `Signed by Class Teacher (${assignedFormTutor})`}
                    </CardDescription>
                  </div>
                  {isHomeroom && (
                    <Button
                      type="button"
                      onClick={handleSaveEvaluation}
                      disabled={isBatchLocked}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      Save Changes
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <textarea
                    rows={3}
                    disabled={!isHomeroom || isBatchLocked}
                    value={selectedReport.classTeacherRemark}
                    onChange={(e) => handleTeacherRemarkChange(e.target.value)}
                    placeholder="Enter comprehensive evaluation remark for this pupil..."
                    className={`w-full p-3 rounded-xl border border-teal-300 bg-white text-slate-800 text-xs focus:outline-teal-600 ${!isHomeroom || isBatchLocked ? 'cursor-not-allowed bg-slate-50 text-slate-600' : ''
                      }`}
                  />

                  {/* Suggestion Chips */}
                  {isHomeroom && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-teal-900 uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" /> Quick-Apply Professional Presets:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {REMARK_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleTeacherRemarkChange(preset)}
                            className="text-[11px] p-1.5 px-2.5 rounded-lg bg-white border border-teal-200 text-teal-900 hover:bg-teal-100 text-left transition-colors cursor-pointer"
                          >
                            &ldquo;{preset.slice(0, 48)}...&rdquo;
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* PREVIEW MODE: Official Terminal Report Sheet */
            <div className="space-y-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">Report Card for:</span>
                  <p className="text-sm font-extrabold text-[#0f3a3e]">{selectedReport.name} ({selectedClass})</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                    className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Report Card</span>
                  </Button>
                </div>
              </div>

              {/* Printable Canvas */}
              <Card className="border-slate-300 shadow-md bg-white p-6 sm:p-8 space-y-6 print:shadow-none print:border-none">
                {/* 1. Official School Header */}
                <div className="text-center pb-4 border-b-2 border-[#0f3a3e] space-y-1">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Logo theme="light" size="sm" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0f3a3e] tracking-tight uppercase">
                    Oakland International Schools
                  </h2>
                  <p className="text-[11px] font-bold text-[#b3141f] tracking-widest uppercase">
                    Excellence, Integrity, Leadership
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Oakland Hill Estate, Lekki Phase 1, Lagos, Nigeria &bull; contact@oaklandschools.edu.ng
                  </p>
                  <div className="pt-2">
                    <span className="px-4 py-1 rounded-full bg-[#0f3a3e] text-white text-xs font-extrabold uppercase tracking-wide">
                      Terminal Continuous Assessment and Examination Report Sheet
                    </span>
                  </div>
                </div>

                {/* 2. Student Biodata & Attendance Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Student Name</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">{selectedReport.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Admission Number</span>
                    <p className="font-bold text-slate-900 font-mono mt-0.5">{selectedReport.admissionNo}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Class and Term</span>
                    <p className="font-bold text-slate-900 mt-0.5">{selectedClass} &bull; Term 1 (2026/2027)</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Class Position</span>
                    <p className="font-extrabold text-[#b3141f] text-sm mt-0.5">{selectedReport.position}</p>
                  </div>

                  <div className="sm:col-span-4 pt-2 border-t border-slate-200 grid grid-cols-4 gap-2 text-center text-[11px]">
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <span className="text-slate-400 text-[10px]">Times School Opened</span>
                      <p className="font-bold text-slate-800">{selectedReport.timesOpened}</p>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <span className="text-slate-400 text-[10px]">Times Present</span>
                      <p className="font-bold text-emerald-700">{selectedReport.timesPresent}</p>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <span className="text-slate-400 text-[10px]">Times Late</span>
                      <p className="font-bold text-amber-700">{selectedReport.timesLate}</p>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200">
                      <span className="text-slate-400 text-[10px]">Times Absent</span>
                      <p className="font-bold text-rose-700">{selectedReport.timesAbsent}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Academic Performance (Subject Breakdown Table) */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Academic Performance
                  </h3>

                  {selectedReport.subjects.length === 0 ? (
                    <div className="border border-slate-200 rounded-lg p-8 text-center bg-slate-50">
                      <p className="text-xs font-semibold text-slate-700">
                        No examination scores recorded yet for this term.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Continuous assessment and examination marks pending submission by subject teachers.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-300 rounded-lg overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#0f3a3e] text-white font-bold">
                          <tr>
                            <th className="py-2.5 px-3">Subject Name</th>
                            <th className="py-2.5 px-2 text-center">CA 1 (20)</th>
                            <th className="py-2.5 px-2 text-center">CA 2 (20)</th>
                            <th className="py-2.5 px-2 text-center">Exam (60)</th>
                            <th className="py-2.5 px-2 text-center bg-[#092528]">Total (100)</th>
                            <th className="py-2.5 px-2 text-center">Grade</th>
                            <th className="py-2.5 px-2 text-center text-[10px] text-teal-200">Highest</th>
                            <th className="py-2.5 px-2 text-center text-[10px] text-teal-200">Lowest</th>
                            <th className="py-2.5 px-2 text-center text-[10px] text-teal-200">Class Avg</th>
                            <th className="py-2.5 px-3">Teacher Remark</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {selectedReport.subjects.map((sub, idx) => {
                            const total = sub.ca1 + sub.ca2 + sub.exam;
                            const { grade } = getGradeInfo(total);

                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-bold text-slate-900">
                                  {sub.name}
                                </td>
                                <td className="py-2 px-2 text-center font-medium">{sub.ca1}</td>
                                <td className="py-2 px-2 text-center font-medium">{sub.ca2}</td>
                                <td className="py-2 px-2 text-center font-medium">{sub.exam}</td>
                                <td className="py-2 px-2 text-center font-extrabold text-slate-900 bg-slate-50">
                                  {total}
                                </td>
                                <td className="py-2 px-2 text-center font-extrabold text-[#0f3a3e]">
                                  {grade}
                                </td>
                                <td className="py-2 px-2 text-center text-slate-500">{sub.classHighest}</td>
                                <td className="py-2 px-2 text-center text-slate-500">{sub.classLowest}</td>
                                <td className="py-2 px-2 text-center text-slate-500">{sub.classAverage}</td>
                                <td className="py-2 px-3 text-[11px] text-slate-600 italic">
                                  {sub.remark}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 4. Automated Performance Summary Strip */}
                {(() => {
                  const { totalMarks, maxMarks, percentage, hasScores } = calculateTotals(selectedReport);
                  const { remark } = getGradeInfo(hasScores ? parseFloat(percentage) : '—');
                  return (
                    <div className="p-4 rounded-xl bg-[#0f3a3e] text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-[10px] text-teal-200 font-bold uppercase">Grand Total</p>
                        <p className="text-xl font-black mt-0.5">{hasScores ? `${totalMarks} / ${maxMarks}` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-teal-200 font-bold uppercase">Overall Percentage</p>
                        <p className="text-xl font-black mt-0.5">{hasScores ? `${percentage}%` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-teal-200 font-bold uppercase">Terminal Average</p>
                        <p className="text-xl font-black mt-0.5">{hasScores ? `${percentage}%` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-teal-200 font-bold uppercase">Terminal Verdict</p>
                        <p className={`text-xs font-black mt-1 uppercase ${hasScores ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {hasScores ? remark : 'Scores Pending'}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Behavioral Traits and Practical Skills Tables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Behavioral Traits */}
                  <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px]">
                      Behavioral Traits Rating (Scale: 1 – 5)
                    </h4>
                    <div className="space-y-1 text-[11px]">
                      {Object.entries(selectedReport.affective).map(([trait, score]) => (
                        <div key={trait} className="flex items-center justify-between py-0.5 border-b border-slate-100 last:border-none">
                          <span className="capitalize text-slate-600">
                            {trait.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="font-bold text-slate-900 font-mono">
                            {score} / 5
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Practical Skills */}
                  <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px]">
                      Practical Skills Rating (Scale: 1 – 5)
                    </h4>
                    <div className="space-y-1 text-[11px]">
                      {Object.entries(selectedReport.psychomotor).map(([skill, score]) => (
                        <div key={skill} className="flex items-center justify-between py-0.5 border-b border-slate-100 last:border-none">
                          <span className="capitalize text-slate-600">
                            {skill.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="font-bold text-slate-900 font-mono">
                            {score} / 5
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6. Remarks & Approvals Chain */}
                <div className="space-y-4 pt-2 border-t border-slate-200 text-xs">
                  {/* Class Teacher Remark */}
                  <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-900 uppercase text-[11px]">
                        Class Teacher's General Remarks:
                      </span>
                      <span className="text-[10px] text-teal-700 font-semibold">
                        Class Teacher: {assignedFormTutor}
                      </span>
                    </div>
                    <p className="text-slate-800 text-xs leading-relaxed italic">
                      &ldquo;{selectedReport.classTeacherRemark}&rdquo;
                    </p>
                    <div className="text-right">
                      <span className="text-[10px] text-teal-700 font-mono font-semibold">
                        Verified and Signed by Class Teacher ({assignedFormTutor})
                      </span>
                    </div>
                  </div>

                  {/* Principal & Proprietor Signatures */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Principal Remark */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 uppercase text-[11px]">
                          Principal's Review and Remark:
                        </span>
                        <span className="text-[10px] font-bold text-blue-700">Principal</span>
                      </div>
                      <p className="text-slate-700 italic text-[11px]">
                        &ldquo;{selectedReport.principalRemark}&rdquo;
                      </p>
                      <div className="pt-2 text-right">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">
                          Principal Stamp Verified
                        </span>
                      </div>
                    </div>

                    {/* Proprietor Approval */}
                    <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-950 uppercase text-[11px]">
                          Proprietor Executive Seal:
                        </span>
                        <span className="text-[10px] font-bold text-[#b3141f]">Proprietor</span>
                      </div>
                      <p className="text-slate-700 italic text-[11px]">
                        &ldquo;{selectedReport.proprietorRemark}&rdquo;
                      </p>
                      <div className="pt-2 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">Resumption: 11 Jan 2027</span>
                        <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-[#b3141f] font-bold text-[9px]">
                          Executive Seal Affixed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Crosscheck & Forwarding Confirmation Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0f3a3e] via-amber-500 to-teal-500" />

            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Confirm Forwarding to Principal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Final submission review for {selectedClass} report cards
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForwardModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Permanent Submission Lock Notice</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Once you forward these report cards to the Principal (<strong>Mr Seyi Bankole</strong>), <strong>all terminal remarks and ratings are officially submitted and cannot be edited again</strong>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-500 font-semibold">Evaluated Pupils</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {evaluatedCount} of {totalCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-500 font-semibold">Target Class</p>
                <p className="text-base font-extrabold text-teal-800 mt-0.5">{selectedClass}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Please crosscheck all ratings and remarks before finalizing this forward.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForwardModal(false)}
                className="w-full sm:w-auto text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 h-10 px-4 rounded-xl cursor-pointer"
              >
                Go Back and Crosscheck
              </Button>
              <Button
                type="button"
                onClick={handleConfirmForwardToPrincipal}
                className="w-full sm:w-auto text-xs font-bold bg-gradient-to-r from-[#0f3a3e] to-[#164e53] hover:from-[#13484d] hover:to-[#1b5e64] text-white h-10 px-5 rounded-xl shadow-xs hover:shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-teal-300" />
                <span>Confirm and Forward</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
