'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  BookOpen,
  Users,
  GraduationCap,
  UserCheck,
  Shield,
  ArrowRight,
  TrendingUp,
  X,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { normalizeClass, getClassTeacherMap } from '@/lib/class-utils';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { BulkImportModal } from '@/components/common/BulkImportModal';
import { ARM_SUGGESTIONS, LEVEL_LADDER, buildClassName, splitClassName } from '@/lib/class-levels';
import { tuitionGroup } from '@/lib/tuition';

interface ClassData {
  id: string;
  name: string;
  level: string;
  levelName: string;
  enrolled: number;
  capacity: number;
  classTeacher: string;
  classTeacherId: string;
  subjectsCount: number;
  attendanceToday: string;
}

export default function ProprietorClassesPage() {
  const [classesList, setClassesList] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assigningClass, setAssigningClass] = useState<ClassData | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const OTHER = '__other';
  const [freeMode, setFreeMode] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [newLevelText, setNewLevelText] = useState('');
  const [newArm, setNewArm] = useState('');
  const [newArmText, setNewArmText] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newTuition, setNewTuition] = useState('');
  const [addError, setAddError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadState = async () => {
      try {
        const [clsRes, stuRes, setRes, attRes, staffRes, subRes] = await Promise.all([
          fetch('/api/classes').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/students').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/schools/settings').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/attendance').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/staff').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/subjects').then((r) => (r.ok ? r.json() : null)),
        ]);

        const dbClasses = clsRes?.success && Array.isArray(clsRes.data) ? clsRes.data : [];
        const dbStudents = stuRes?.success && Array.isArray(stuRes.data) ? stuRes.data : [];
        const defaultCapacity = setRes?.data?.classCapacity || 0;
        const liveAttClasses = attRes?.data?.classes || [];
        const dbSubjects = subRes?.success && Array.isArray(subRes.data) ? subRes.data : [];

        if (isMounted) {
          if (staffRes?.success && Array.isArray(staffRes.data)) {
            const teachingStaff = staffRes.data.filter((s: any) =>
              s.role?.includes('Teacher') || s.role === 'Class Teacher' || s.role === 'Subject Teacher'
            );
            setTeachers(teachingStaff);
          }

          setClassesList(
            dbClasses.map((dbMatch: any): ClassData => {
              const enrolledCount = dbStudents.filter((st: any) => normalizeClass(st.class) === dbMatch.name).length;
              const attMatch = liveAttClasses.find((a: any) => a.class === dbMatch.name);
              const attToday = attMatch && attMatch.attendanceRate !== null && attMatch.attendanceRate !== undefined
                ? `${attMatch.attendanceRate}%`
                : '—';

              return {
                id: dbMatch.id,
                name: dbMatch.name,
                level: dbMatch.arm ? dbMatch.level : typeof dbMatch.gradeLevel === 'number' ? `Level ${dbMatch.gradeLevel}` : '',
                levelName: dbMatch.level || dbMatch.name,
                capacity: dbMatch.capacity || defaultCapacity,
                enrolled: enrolledCount,
                classTeacher: dbMatch.classTeacher && dbMatch.classTeacher !== 'Unassigned' ? dbMatch.classTeacher : 'Unassigned',
                classTeacherId: dbMatch.teacherId ? dbMatch.teacherId.slice(0, 8) : '—',
                subjectsCount: dbSubjects.length,
                attendanceToday: attToday,
              };
            })
          );
        }
      } catch {} finally {
        if (isMounted) setLoading(false);
      }
    };

    loadState();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!assigningClass) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAssigningClass(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assigningClass]);

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningClass || !selectedTeacherId) return;

    setIsSavingTeacher(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: assigningClass.id,
          teacherId: selectedTeacherId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const appointed = teachers.find((t) => t.id === selectedTeacherId);
        const appointedName = appointed ? appointed.name : 'Assigned Teacher';
        const appointedId = appointed ? appointed.employeeId : selectedTeacherId.slice(0, 8);

        setClassesList((prev) =>
          prev.map((c) =>
            c.id === assigningClass.id
              ? {
                  ...c,
                  classTeacher: appointedName,
                  classTeacherId: appointedId,
                }
              : c
          )
        );
        setToastMsg(`Appointed ${appointedName} as Class Teacher for ${assigningClass.name}`);
        setTimeout(() => setToastMsg(null), 4000);
        setAssigningClass(null);
        setSelectedTeacherId('');
      } else {
        alert(json.error || 'Failed to assign class teacher');
      }
    } catch (err: any) {
      alert(err?.message || 'Error updating class teacher');
    } finally {
      setIsSavingTeacher(false);
    }
  };

  const totalEnrolled = classesList.reduce((acc, c) => acc + c.enrolled, 0);
  const totalCapacity = classesList.reduce((acc, c) => acc + c.capacity, 0);

  const handleImportClasses = async (rows: { name: string; capacity?: number }[]) => {
    try {
      const res = await fetch('/api/classes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: rows }),
      });
      const json = await res.json();
      if (json.success) {
        setToastMsg(`Added ${json.count} ${json.count === 1 ? 'class' : 'classes'}`);
        setTimeout(() => setToastMsg(null), 4000);
        setReloadKey((k) => k + 1);
      } else {
        alert(json.message || 'Failed to add classes');
      }
    } catch {
      alert('Network error adding classes');
    }
  };

  // The levels offered: the school's own first, then the usual ones it does not have yet
  const schoolLevels = Array.from(new Set(classesList.map((c) => c.levelName)));
  const levelOptions = [...schoolLevels, ...LEVEL_LADDER.filter((l) => !schoolLevels.some((x) => x.toLowerCase() === l.toLowerCase()))];

  const chosenLevel = newLevel === OTHER ? newLevelText.trim() : newLevel;
  const chosenArm = newArm === OTHER ? newArmText.trim() : newArm;
  const previewName = freeMode ? newFullName.trim() : chosenLevel ? buildClassName(chosenLevel, chosenArm) : '';
  const feeLevel = freeMode ? splitClassName(newFullName).level : chosenLevel;
  const showTuition = Boolean(feeLevel) && tuitionGroup(feeLevel) === null;

  const resetAddForm = () => {
    setFreeMode(false);
    setNewFullName('');
    setNewLevel('');
    setNewLevelText('');
    setNewArm('');
    setNewArmText('');
    setNewCapacity('');
    setNewTuition('');
    setAddError('');
  };

  const handleDeleteClass = async (cls: ClassData) => {
    if (!window.confirm(`Delete ${cls.name}? Its timetable and teacher assignment are removed too. This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/classes?id=${encodeURIComponent(cls.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setToastMsg(json.message || `${cls.name} deleted`);
        setTimeout(() => setToastMsg(null), 4000);
        setReloadKey((k) => k + 1);
      } else {
        alert(json.message || 'Could not delete the class');
      }
    } catch {
      alert('Network error deleting the class');
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewName) return setAddError(freeMode ? 'Enter the class name.' : 'Choose or type a level.');
    if (classesList.some((c) => c.name.toLowerCase() === previewName.toLowerCase())) return setAddError(`${previewName} already exists.`);
    const capacity = newCapacity.trim() ? Number(newCapacity) : undefined;
    if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1)) return setAddError('Capacity must be a whole number above 0.');
    const tuition = showTuition && newTuition.trim() ? Number(newTuition.replace(/,/g, '')) : undefined;
    if (tuition !== undefined && (!Number.isFinite(tuition) || tuition <= 0)) return setAddError('Tuition must be an amount above 0.');
    setAddError('');
    await handleImportClasses([freeMode ? { name: previewName, capacity, tuition } : { level: chosenLevel, arm: chosenArm, capacity, tuition }] as any);
    setShowAdd(false);
    resetAddForm();
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Classes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {classesList.length} {classesList.length === 1 ? 'class' : 'classes'} with student capacity and appointed Class Teachers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="teal" size="sm">
            Enrolled: {totalEnrolled} of {totalCapacity} Capacity
          </Badge>
          <Button size="sm" onClick={() => setShowAdd(true)} className="min-h-[44px] sm:min-h-0">
            Add Class
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="min-h-[44px] sm:min-h-0">
            Import Classes
          </Button>
          <Link href="/proprietor/timetable">
            <Button size="sm" variant="outline">
              Class Timetables
            </Button>
          </Link>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Class Cards Grid */}
      {classesList.length === 0 && (
        <Card className="p-8 text-center border-slate-200">
          <p className="text-sm font-semibold text-slate-800">No classes yet</p>
          <p className="text-xs text-slate-500 mt-1">Use Import Classes to add this school's classes.</p>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classesList.map((cls) => {
          const pct = Math.round((cls.enrolled / (cls.capacity || 1)) * 100);
          const hasTeacher = cls.classTeacher !== 'Unassigned';

          return (
            <Card key={cls.id} className="p-6 border-slate-200 space-y-5 hover:shadow-md transition-shadow">
              {/* Class Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-brand-accent tracking-wide uppercase">
                    {cls.level}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {cls.name}
                  </h2>
                </div>

                <Badge
                  variant={pct >= 95 ? 'coral' : pct >= 90 ? 'amber' : 'emerald'}
                  size="sm"
                >
                  {pct}% Capacity
                </Badge>
              </div>

              {/* Student Capacity Metrics */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Students Enrolled:</span>
                  <span className="font-bold text-slate-900">
                    {cls.enrolled} of {cls.capacity} seats
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct >= 95 ? 'bg-brand-accent' : pct >= 90 ? 'bg-amber-500' : 'bg-brand-primary'
                    }`}
                    style={{ width: `${Math.max(pct, cls.enrolled > 0 ? 5 : 0)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-0.5">
                  <span>Today's Attendance: <strong className="text-emerald-700">{cls.attendanceToday}</strong></span>
                  <span>{cls.subjectsCount} Subjects</span>
                </div>
              </div>

              {/* Appointed Class Teacher Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold uppercase tracking-wider">
                    Class Teacher
                  </span>
                  {hasTeacher ? (
                    <span className="font-mono font-bold text-teal-800 text-[10px]">
                      {cls.classTeacherId}
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold text-[10px]">Vacant</span>
                  )}
                </div>

                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-brand-primary" />
                  {cls.classTeacher}
                </p>
                <p className="text-[10px] text-slate-500">
                  Oversees student conduct, morning roll-call, and reports to the Principal and Proprietor.
                </p>

                <div className="pt-1 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAssigningClass(cls);
                      const existing = teachers.find((t) => t.name === cls.classTeacher);
                      setSelectedTeacherId(existing ? existing.id : '');
                    }}
                    className="h-6 text-[10px] px-2 font-bold text-brand-primary border-teal-200 hover:bg-teal-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-brand-primary" />
                    <span>{hasTeacher ? 'Reassign Teacher' : 'Assign Teacher'}</span>
                  </Button>
                </div>
              </div>

              {cls.enrolled === 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteClass(cls)}
                    className="min-h-[44px] sm:min-h-0 px-2 text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer"
                  >
                    Delete class
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href={`/proprietor/students?class=${encodeURIComponent(cls.name)}`}
                  className="font-semibold text-brand-primary hover:underline flex items-center gap-1"
                >
                  View Students ({cls.enrolled}) <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href={`/proprietor/timetable`}
                  className="font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  Timetable <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Assign Teacher Modal */}
      {assigningClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-brand-primary flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Assign Class Teacher
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Appoint homeroom leader for {assigningClass.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningClass(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Faculty Member <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">— Select Teacher —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.employeeId}) &mdash; {t.role}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  The selected teacher will become the official homeroom teacher for {assigningClass.name}.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssigningClass(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!selectedTeacherId || isSavingTeacher}
                  className="bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold"
                >
                  {isSavingTeacher ? 'Assigning...' : 'Confirm Appointment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto" onClick={() => setShowAdd(false)}>
          <form onSubmit={handleAddClass} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 my-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add Class</h2>
              <p className="text-xs text-slate-500">A class is a level plus an arm, for example JSS 1 and Diamond. Every arm of a level pays the same tuition; the timetable, class teacher and capacity are set for each class.</p>
            </div>

            {!freeMode ? (
              <>
                <label className="block text-xs font-semibold text-slate-700">
                  Level
                  <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)} className="mt-1 w-full min-h-[44px] px-3 border border-slate-300 rounded-lg text-sm font-normal bg-white">
                    <option value="">Select a level</option>
                    {levelOptions.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                    <option value={OTHER}>Other (type your own)</option>
                  </select>
                </label>
                {newLevel === OTHER && (
                  <input value={newLevelText} onChange={(e) => setNewLevelText(e.target.value)} placeholder="Level name" aria-label="Level name" className="w-full min-h-[44px] px-3 border border-slate-300 rounded-lg text-sm" />
                )}
                <label className="block text-xs font-semibold text-slate-700">
                  Arm (optional)
                  <select value={newArm} onChange={(e) => setNewArm(e.target.value)} className="mt-1 w-full min-h-[44px] px-3 border border-slate-300 rounded-lg text-sm font-normal bg-white">
                    <option value="">No arm</option>
                    {ARM_SUGGESTIONS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                    <option value={OTHER}>Other (type your own)</option>
                  </select>
                </label>
                {newArm === OTHER && (
                  <input value={newArmText} onChange={(e) => setNewArmText(e.target.value)} placeholder="Arm name, for example Diamond" aria-label="Arm name" className="w-full min-h-[44px] px-3 border border-slate-300 rounded-lg text-sm" />
                )}
              </>
            ) : (
              <label className="block text-xs font-semibold text-slate-700">
                Full class name
                <input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} className="mt-1 w-full min-h-[44px] px-3 border border-slate-300 rounded-lg text-sm font-normal bg-white" />
              </label>
            )}
            <button type="button" onClick={() => setFreeMode((v) => !v)} className="text-xs font-semibold text-brand-primary underline min-h-[44px]">
              {freeMode ? 'Choose a level and arm instead' : 'Type the full class name myself'}
            </button>

            {previewName && (
              <p className="text-xs text-slate-600">
                Will be added as <span className="font-bold text-slate-900">{previewName}</span>
              </p>
            )}

            <label className="block text-xs font-semibold text-slate-700">
              Capacity (optional)
              <input inputMode="numeric" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} className="mt-1 w-full min-h-[44px] px-3 border border-slate-300 rounded-lg text-sm font-normal bg-white" />
              <span className="block text-[11px] font-normal text-slate-400 mt-1">Left empty, it takes the class capacity from School Settings.</span>
            </label>
            {showTuition && (
              <label className="block text-xs font-semibold text-slate-700">
                Tuition per term for {feeLevel} (optional)
                <input inputMode="numeric" value={newTuition} onChange={(e) => setNewTuition(e.target.value)} className="mt-1 w-full min-h-[44px] px-3 border border-slate-300 rounded-lg text-sm font-normal bg-white" />
                <span className="block text-[11px] font-normal text-slate-400 mt-1">Applies to every arm of {feeLevel}. Ignored if {feeLevel} already has a fee. JSS and SS levels use the rates in School Settings.</span>
              </label>
            )}
            {addError && <p className="text-xs text-rose-700">{addError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setShowAdd(false); resetAddForm(); }} className="min-h-[44px] sm:min-h-0">Cancel</Button>
              <Button type="submit" size="sm" className="min-h-[44px] sm:min-h-0">Add Class</Button>
            </div>
          </form>
        </div>
      )}
      <BulkImportModal isOpen={showImport} onClose={() => setShowImport(false)} importType="classes" onImportComplete={handleImportClasses} />
    </div>
  );
}
