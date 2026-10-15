'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  CheckCircle2,
  Send,
  BookOpen,
  Users,
  Award,
  BarChart3,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Lock,
  AlertTriangle,
  X,
  ShieldCheck,
} from 'lucide-react';
import { getClassTeacherMap, STANDARD_CLASSES } from '@/lib/class-utils';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface StudentScore {
  id: string;
  admissionNo: string;
  name: string;
  ca1: number; // Max 20
  ca2: number; // Max 20
  exam: number; // Max 60
  remark: string;
}

export default function SubjectScoresPage() {
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [classTeacherMap, setClassTeacherMap] = useState<Record<string, string>>({});
  const [availableClasses, setAvailableClasses] = useState<string[]>(['JSS 1', 'JSS 2', 'JSS 3']);
  const [selectedClass, setSelectedClass] = useState<string>('JSS 2');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(['Mathematics']);
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');

  const [scores, setScores] = useState<StudentScore[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [submittedBy, setSubmittedBy] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionMsg, setSubmissionMsg] = useState('');
  const [showCrosscheckModal, setShowCrosscheckModal] = useState(false);

  // 1. Load active teacher and class teacher mapping from live endpoints
  useEffect(() => {
    let isMounted = true;

    const initTeacherData = async () => {
      try {
        let staffList: any[] = [];
        try {
          const res = await fetch('/api/staff');
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) staffList = json.data;
          }
        } catch {}

        if (staffList.length > 0 && isMounted) {
          const ctMap = getClassTeacherMap(staffList);
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
            let subs: string[] = [];
            if (Array.isArray(assignments) && assignments.length > 0) {
              subs = Array.from(new Set(assignments.map((ta: any) => ta.subject))).filter(Boolean) as string[];
            }
            if (subs.length === 0 && Array.isArray(p.subjects) && p.subjects.length > 0) {
              subs = p.subjects;
            }
            if (subs.length === 0 && typeof p.subject === 'string' && p.subject.trim()) {
              subs = p.subject.split(/[;,|/]/).map((s: string) => s.trim()).filter(Boolean);
            }
            if (subs.length === 0) {
              subs = ['Agricultural Science'];
            }

            setAvailableSubjects(subs);
            const initialSub = subs[0] || 'Agricultural Science';
            setSelectedSubject(initialSub);

            // Determine classes for this initial subject
            let classes: string[] = [];
            const matchedAssignment = assignments.find((ta: any) => ta.subject === initialSub);
            if (matchedAssignment && Array.isArray(matchedAssignment.classes) && matchedAssignment.classes.length > 0) {
              classes = matchedAssignment.classes;
            } else if (p.assignedClass) {
              classes = [p.assignedClass];
            } else {
              classes = Array.from(new Set(assignments.flatMap((ta: any) => ta.classes || []))).filter(Boolean) as string[];
            }

            const uniqueClasses = STANDARD_CLASSES.filter((c) => classes.includes(c));
            const finalClasses = uniqueClasses.length > 0 ? uniqueClasses : classes;
            setAvailableClasses(finalClasses);

            const defaultCls =
              p.assignedClass && finalClasses.includes(p.assignedClass)
                ? p.assignedClass
                : finalClasses.length > 0
                ? finalClasses[0]
                : (p.assignedClass || '');
            setSelectedClass(defaultCls);
          }
        }
      } catch (err) {
        console.error('Failed to init teacher scores data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initTeacherData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load scores strictly for selectedClass & selectedSubject from live database
  useEffect(() => {
    if (!selectedClass || !selectedSubject) {
      setScores([]);
      setIsLocked(false);
      return;
    }

    let isMounted = true;

    const loadClassScores = async () => {
      try {
        // 1. Fetch live roster of ENROLLED students for selectedClass from /api/students
        const stRes = await fetch('/api/students');
        let enrolledStudents: any[] = [];
        if (stRes.ok) {
          const stJson = await stRes.json();
          if (stJson.success && Array.isArray(stJson.data)) {
            enrolledStudents = stJson.data.filter((s: any) => s.class === selectedClass);
          }
        }

        // 2. Fetch saved scores for selectedClass & selectedSubject
        const res = await fetch(`/api/scores?class=${encodeURIComponent(selectedClass)}&subject=${encodeURIComponent(selectedSubject)}`);
        let savedScores: any[] = [];
        let locked = false;
        let subAt: string | null = null;
        let subBy: string | null = null;

        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            locked = Boolean(json.isLocked);
            subAt = json.submittedAt || null;
            subBy = json.submittedBy || null;
            savedScores = Array.isArray(json.data) ? json.data : [];
          }
        }

        if (isMounted) {
          setIsLocked(locked);
          setSubmittedAt(subAt);
          setSubmittedBy(subBy);
        }

        // 3. STRICT ENROLLMENT RECONCILIATION:
        // ONLY students who are actually enrolled in selectedClass can appear in the score sheet!
        // Stale or mock records (like "Chinedu Okafor" in JSS 2) are automatically discarded.
        const scoreLookup = new Map<string, any>();
        savedScores.forEach((s: any) => {
          if (s.id) scoreLookup.set(s.id, s);
          if (s.admissionNo) scoreLookup.set(s.admissionNo, s);
        });

        const reconciledScores: StudentScore[] = enrolledStudents.map((s: any, idx: number) => {
          const existing = scoreLookup.get(s.id) || scoreLookup.get(s.admissionNo);
          return {
            id: s.id || `std-${idx}`,
            admissionNo: s.admissionNo || `OAK-${idx + 1}`,
            name: s.fullName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
            ca1: typeof existing?.ca1 === 'number' ? existing.ca1 : 0,
            ca2: typeof existing?.ca2 === 'number' ? existing.ca2 : 0,
            exam: typeof existing?.exam === 'number' ? existing.exam : 0,
            remark: existing?.remark || '',
          };
        });

        if (isMounted) {
          setScores(reconciledScores);
        }
      } catch (err) {
        console.error('Error loading class scores:', err);
        if (isMounted) {
          setScores([]);
          setIsLocked(false);
        }
      }
    };

    loadClassScores();
    return () => {
      isMounted = false;
    };
  }, [selectedClass, selectedSubject]);

  // Derived homeroom and class teacher info
  const isClassTeacher = currentTeacher?.role === 'Class Teacher' || Boolean(currentTeacher?.assignedClass);
  const homeroomClass = currentTeacher?.assignedClass;
  const isHomeroom = isClassTeacher && selectedClass === homeroomClass;

  const assignedClassTeacher = isHomeroom
    ? `${currentTeacher?.name || 'Adesayan Peter'} (You)`
    : classTeacherMap[selectedClass] || 'Unassigned Class Teacher';

  // Automated Grade derivation
  const calculateGrade = (total: number) => {
    if (total >= 90) return { grade: 'A+', points: 4.0, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (total >= 80) return { grade: 'A', points: 4.0, color: 'text-teal-700 bg-teal-50 border-teal-200' };
    if (total >= 70) return { grade: 'B', points: 3.0, color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (total >= 60) return { grade: 'C', points: 2.0, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    if (total >= 50) return { grade: 'D', points: 1.0, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { grade: 'F', points: 0.0, color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const handleScoreChange = (
    id: string,
    field: 'ca1' | 'ca2' | 'exam',
    value: string
  ) => {
    if (isLocked) return;
    const num = Math.max(0, parseInt(value, 10) || 0);
    const max = field === 'exam' ? 60 : 20;
    const capped = Math.min(num, max);

    setScores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: capped } : s))
    );
    setIsSubmitted(false);
  };

  const handleRemarkChange = (id: string, remark: string) => {
    if (isLocked) return;
    setScores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, remark } : s))
    );
    setIsSubmitted(false);
  };

  // Automated System Statistics with Zero-Placeholder Compliance
  const totals = scores.map((s) => s.ca1 + s.ca2 + s.exam);
  const evaluatedPupils = scores.filter((s) => s.ca1 > 0 || s.ca2 > 0 || s.exam > 0).length;
  const hasEnteredScores = scores.length > 0 && totals.some((t) => t > 0);
  const classAvg = hasEnteredScores
    ? `${(totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)} / 100`
    : '—';
  const highest = hasEnteredScores ? `${Math.max(...totals)} / 100` : '—';
  const lowest = hasEnteredScores ? `${Math.min(...totals)} / 100` : '—';

  // Trigger modal when teacher clicks synchronize
  const handleOpenCrosscheckModal = () => {
    if (scores.length === 0 || isLocked || isSubmitting) return;
    setShowCrosscheckModal(true);
  };

  // Final Confirmation: Synchronize and permanently lock against further edits
  const handleConfirmSynchronization = async () => {
    setIsSubmitting(true);
    setShowCrosscheckModal(false);

    try {
      const teacherName = currentTeacher?.name || 'Teacher';
      const timestamp = new Date().toISOString();

      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class: selectedClass,
          subject: selectedSubject,
          scores: scores,
          isLocked: true,
          submittedBy: teacherName,
          submittedAt: timestamp,
        }),
      });

      if (res.ok) {
        setIsLocked(true);
        setSubmittedAt(timestamp);
        setSubmittedBy(teacherName);

        if (isHomeroom) {
          setSubmissionMsg(
            `${selectedSubject} scores for ${selectedClass} successfully synchronized and locked. These marks are finalized and updated in ${selectedClass} terminal report cards.`
          );
        } else {
          setSubmissionMsg(
            `${selectedSubject} scores for ${selectedClass} successfully synchronized to Class Teacher (${assignedClassTeacher}). The results are now officially locked and cannot be edited.`
          );
        }
        setIsSubmitted(true);
        setTimeout(() => setIsSubmitted(false), 8000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.message || 'Failed to synchronize scores.');
      }
    } catch (err) {
      console.error('Failed to synchronize and lock scores', err);
      alert('An unexpected error occurred while synchronizing scores.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <BrandLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Hero Surface */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/70 to-teal-50/30 p-6 sm:p-7 shadow-xs">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0f3a3e] via-teal-600 to-emerald-500" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#0f3a3e] text-white tracking-wide shadow-xs">
                <BookOpen className="w-3.5 h-3.5 text-teal-300" />
                <span>{isHomeroom ? 'Homeroom Gradebook' : 'Subject Teacher Gradebook'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Subject: {selectedSubject}
              </span>
              {isLocked && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <Lock className="w-3 h-3 text-amber-700" />
                  <span>Locked</span>
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Subject Scores
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-1 leading-relaxed">
                {isHomeroom
                  ? `Recording Continuous Assessment and examination scores for ${selectedClass}. Synchronizing officially locks marks and forwards them to terminal report cards.`
                  : `Recording scores as subject specialist for ${selectedClass}. Synchronizing securely delivers and locks marks for Class Teacher (${assignedClassTeacher}).`}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            {isLocked ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold shadow-2xs">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Synchronized and Locked</span>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleOpenCrosscheckModal}
                disabled={scores.length === 0 || isSubmitting}
                className={`text-xs font-bold h-10 px-5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  scores.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-[#0f3a3e] to-[#164e53] hover:from-[#13484d] hover:to-[#1b5e64] text-white shadow-xs hover:shadow'
                }`}
              >
                <Send className="w-3.5 h-3.5 text-teal-300" />
                <span>
                  {isSubmitting
                    ? 'Synchronizing...'
                    : isHomeroom
                    ? `Synchronize to ${selectedClass} Report Cards`
                    : `Synchronize to Class Teacher (${assignedClassTeacher})`}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Locked Status Banner */}
      {isLocked && (
        <div className="p-4 sm:p-5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Lock className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <p className="font-bold text-sm text-teal-950">Scores Synchronized and Locked</p>
              <p className="text-xs text-teal-800 mt-0.5">
                These {selectedSubject} results have been synchronized to Class Teacher ({assignedClassTeacher})
                {submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString()}` : ''}
                {submittedBy ? ` by ${submittedBy}` : ''}. The marks are now finalized and cannot be edited.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-300 self-start sm:self-center">
            Read-Only Mode
          </span>
        </div>
      )}

      {/* Success Notification */}
      {isSubmitted && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Scores Synchronized Successfully</p>
            <p className="text-emerald-700 mt-0.5">{submissionMsg}</p>
          </div>
        </div>
      )}

      {/* Control Bar: Class Tabs & Subject Switcher */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Class Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Class:</span>
          </span>
          {availableClasses.length > 0 ? (
            availableClasses.map((cls) => {
              const isSelected = selectedClass === cls;
              const isHome = isClassTeacher && cls === homeroomClass;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0f3a3e] text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  <span>{cls}</span>
                  {isHome && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        isSelected ? 'bg-teal-700 text-teal-100' : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      My Class
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <span className="text-xs text-slate-500 italic bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
              No classes allocated for {selectedSubject}
            </span>
          )}
        </div>

        {/* Subject Switcher and Responsible Class Teacher */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs">
          {availableSubjects.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Subject:</span>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  const newSub = e.target.value;
                  setSelectedSubject(newSub);
                  const assignments = currentTeacher?.teachingAssignments || [];
                  const matchedAssignment = assignments.find((ta: any) => ta.subject === newSub);
                  let classesForSub: string[] = [];
                  if (matchedAssignment && Array.isArray(matchedAssignment.classes) && matchedAssignment.classes.length > 0) {
                    classesForSub = matchedAssignment.classes;
                  } else if (currentTeacher?.assignedClass) {
                    classesForSub = [currentTeacher.assignedClass];
                  }
                  const final = STANDARD_CLASSES.filter((c) => classesForSub.includes(c));
                  const resolved = final.length > 0 ? final : classesForSub;
                  setAvailableClasses(resolved);
                  if (resolved.length > 0) {
                    if (!resolved.includes(selectedClass)) {
                      setSelectedClass(resolved[0]);
                    }
                  } else {
                    setSelectedClass('');
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:outline-hidden cursor-pointer"
              >
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedClass && (
            <div className="text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Class Teacher ({selectedClass}):</span>
              <strong className="text-slate-900 ml-1">{assignedClassTeacher}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Automated System Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assessment</p>
            <Award className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xs font-extrabold text-slate-900">
            CA 1 (20) + CA 2 (20) + Exam (60)
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class Average</p>
            <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <p className="text-base sm:text-lg font-extrabold text-slate-900">{classAvg}</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Highest Score</p>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-base sm:text-lg font-extrabold text-emerald-700">{highest}</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lowest Score</p>
            <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-base sm:text-lg font-extrabold text-amber-700">{lowest}</p>
        </div>
      </div>

      {/* Gradebook Table */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden rounded-2xl">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900">
                {selectedClass} &bull; {selectedSubject} Gradebook
              </CardTitle>
              {isLocked && (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 text-slate-700 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-600" /> Locked
                </span>
              )}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              {isLocked
                ? 'These scores are officially locked and cannot be edited. They have been synchronized to the Class Teacher.'
                : 'Enter marks into CA 1, CA 2, and Exam. Total score and grade letter update automatically.'}
            </CardDescription>
          </div>

          <div className="text-xs">
            {isHomeroom ? (
              <span className="bg-teal-50 text-teal-900 border border-teal-200 px-3 py-1 rounded-lg font-semibold inline-flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Assigned Class Teacher</span>
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-lg font-semibold inline-flex items-center gap-1.5 shadow-2xs">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                <span>Subject Teaching &bull; Class Teacher: {assignedClassTeacher}</span>
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-10">#</th>
                <th className="py-3 px-4 min-w-[180px]">Student Name and ID</th>
                <th className="py-3 px-3 text-center w-24">CA 1 (20)</th>
                <th className="py-3 px-3 text-center w-24">CA 2 (20)</th>
                <th className="py-3 px-3 text-center w-24">Exam (60)</th>
                <th className="py-3 px-3 text-center w-24">Total (100)</th>
                <th className="py-3 px-3 text-center w-20">Grade</th>
                <th className="py-3 px-4 min-w-[200px]">Subject Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {scores.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-500 text-xs italic">
                    {!selectedClass
                      ? `No class allocated for ${selectedSubject}. Please select an allocated class above.`
                      : `No students currently enrolled in ${selectedClass}. Admitted students will appear here automatically.`}
                  </td>
                </tr>
              )}
              {scores.map((student, idx) => {
                const total = student.ca1 + student.ca2 + student.exam;
                const hasScore = student.ca1 > 0 || student.ca2 > 0 || student.exam > 0;
                const { grade, color } = calculateGrade(total);

                return (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-center">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{student.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{student.admissionNo}</p>
                    </td>

                    {/* CA 1 */}
                    <td className="py-3 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        disabled={isLocked}
                        value={student.ca1 === 0 ? '' : student.ca1}
                        placeholder="0"
                        onChange={(e) => handleScoreChange(student.id, 'ca1', e.target.value)}
                        className="h-8 text-center text-xs font-bold w-16 mx-auto bg-slate-50 border-slate-300 focus:bg-white disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-700"
                      />
                    </td>

                    {/* CA 2 */}
                    <td className="py-3 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        disabled={isLocked}
                        value={student.ca2 === 0 ? '' : student.ca2}
                        placeholder="0"
                        onChange={(e) => handleScoreChange(student.id, 'ca2', e.target.value)}
                        className="h-8 text-center text-xs font-bold w-16 mx-auto bg-slate-50 border-slate-300 focus:bg-white disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-700"
                      />
                    </td>

                    {/* Exam */}
                    <td className="py-3 px-3 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        disabled={isLocked}
                        value={student.exam === 0 ? '' : student.exam}
                        placeholder="0"
                        onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                        className="h-8 text-center text-xs font-bold w-16 mx-auto bg-slate-50 border-slate-300 focus:bg-white disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-700"
                      />
                    </td>

                    {/* Automated Total */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-extrabold text-sm text-slate-900">
                        {hasScore ? total : '—'}
                      </span>
                    </td>

                    {/* Automated Grade Letter */}
                    <td className="py-3 px-3 text-center">
                      {hasScore ? (
                        <span className={`px-2.5 py-0.5 rounded-md font-extrabold text-xs inline-block border ${color}`}>
                          {grade}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">—</span>
                      )}
                    </td>

                    {/* Subject Remark */}
                    <td className="py-3 px-4">
                      <Input
                        type="text"
                        disabled={isLocked}
                        value={student.remark}
                        onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                        className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-700"
                        placeholder={isLocked ? '—' : 'Subject specific remark...'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-600">
              {isLocked
                ? 'These results are permanently synchronized and locked against further edits.'
                : 'Please verify all continuous assessment and exam marks before synchronizing to the Class Teacher.'}
            </span>

            {isLocked ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200/80 text-slate-600 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Locked Against Edits</span>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleOpenCrosscheckModal}
                disabled={scores.length === 0 || isSubmitting}
                className={`font-semibold text-xs h-9 px-4 rounded-xl cursor-pointer ${
                  scores.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-[#0f3a3e] hover:bg-[#164e53] text-white shadow-xs'
                }`}
              >
                <Send className="w-3.5 h-3.5 mr-1.5 text-teal-300" />
                {isHomeroom
                  ? `Synchronize with ${selectedClass} Homeroom Report Cards`
                  : `Synchronize to Class Teacher (${assignedClassTeacher})`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Crosscheck & Final Confirmation Modal */}
      {showCrosscheckModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Top brand accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0f3a3e] via-amber-500 to-teal-500" />

            {/* Header with Close */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Confirm Scores Synchronization
                  </h3>
                  <p className="text-xs text-slate-500">
                    Final submission review for {selectedSubject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCrosscheckModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Capsule */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Target Class and Subject</p>
                <p className="font-extrabold text-slate-900">{selectedClass} &bull; {selectedSubject}</p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Recipient</p>
                <p className="font-bold text-teal-800">{assignedClassTeacher}</p>
              </div>
            </div>

            {/* Crucial Lock Warning Callout */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Permanent Lock Notice</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Once you synchronize these results to Class Teacher <strong>{assignedClassTeacher}</strong>, <strong>they will be officially locked and cannot be edited again</strong>.
              </p>
            </div>

            {/* Verification Stats Summary */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-500 font-semibold">Pupils Entered</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {evaluatedPupils} of {scores.length}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-500 font-semibold">Class Average</p>
                <p className="text-sm font-extrabold text-teal-800 mt-0.5">{classAvg}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-500 font-semibold">Highest Score</p>
                <p className="text-sm font-extrabold text-emerald-700 mt-0.5">{highest}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Please crosscheck all marks and remarks before finalizing this submission.
            </p>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCrosscheckModal(false)}
                className="w-full sm:w-auto text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 h-10 px-4 rounded-xl cursor-pointer"
              >
                Go Back and Crosscheck
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSynchronization}
                disabled={isSubmitting}
                className="w-full sm:w-auto text-xs font-bold bg-gradient-to-r from-[#0f3a3e] to-[#164e53] hover:from-[#13484d] hover:to-[#1b5e64] text-white h-10 px-5 rounded-xl shadow-xs hover:shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-teal-300" />
                <span>{isSubmitting ? 'Synchronizing...' : 'Confirm and Synchronize'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
