'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Plus,
  Save,
  CheckCircle2,
  RotateCcw,
  X,
  Sparkles,
  CheckCheck,
  RefreshCw,
  Printer,
  Sliders,
  Trash2,
  School,
  UserCheck,
  Pencil,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  getStoredCurriculum,
  ALL_OFFICIAL_SUBJECT_NAMES,
  SubjectItem,
} from '@/lib/curriculum-data';
import {
  fetchPrincipalDelegations,
  type PrincipalDelegations,
} from '@/lib/delegations';
import { DelegationRestrictedBanner } from '@/components/common/DelegationRestrictedBanner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export interface PeriodSlot {
  id: string;
  label: string;
  time: string;
  isBreak?: boolean;
}

const DEFAULT_PERIODS: PeriodSlot[] = [
  { id: 'roll-call', label: 'Roll Call', time: '07:45 – 08:15', isBreak: true },
  { id: 'p1', label: 'Period 1', time: '08:15 – 09:00' },
  { id: 'p2', label: 'Period 2', time: '09:00 – 09:45' },
  { id: 'p3', label: 'Period 3', time: '09:45 – 10:30' },
  { id: 'break1', label: 'Short Break', time: '10:30 – 10:50', isBreak: true },
  { id: 'p4', label: 'Period 4', time: '10:50 – 11:35' },
  { id: 'p5', label: 'Period 5', time: '11:35 – 12:20' },
  { id: 'p6', label: 'Period 6', time: '12:20 – 13:05' },
  { id: 'break2', label: 'Lunch Break', time: '13:05 – 13:45', isBreak: true },
  { id: 'p7', label: 'Period 7', time: '13:45 – 14:30' },
  { id: 'p8', label: 'Period 8', time: '14:30 – 15:15' },
];

const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

type TimetableCell = { subject: string; teacher: string } | null;
type TimetableData = Record<string, Record<string, Record<string, TimetableCell>>>;

function generateBlankTimetable(periodsList: PeriodSlot[]): TimetableData {
  const data: TimetableData = {};
  CLASSES.forEach((cls) => {
    data[cls] = {};
    periodsList.forEach((period) => {
      if (period.isBreak) return;
      data[cls][period.id] = {};
      DAYS.forEach((day) => {
        data[cls][period.id][day] = null;
      });
    });
  });
  return data;
}

interface StaffMember {
  id: string;
  name: string;
  role?: string;
  assignedClass?: string;
  teachingClasses?: string[];
  subjects?: string[];
  teachingAssignments?: { subject: string; classes: string[] }[];
}

export default function AdminTimetablePage() {
  const [selectedClass, setSelectedClass] = useState('JSS 1');
  const [periods, setPeriods] = useState<PeriodSlot[]>(DEFAULT_PERIODS);
  const [timetable, setTimetable] = useState<TimetableData>({});
  const [curriculum, setCurriculum] = useState<SubjectItem[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Cell Edit Modal
  const [editingCell, setEditingCell] = useState<{ period: string; day: string } | null>(null);
  const [cellInput, setCellInput] = useState({ subject: '', teacher: '' });

  // Period Management Modal
  const [isManagePeriodsOpen, setIsManagePeriodsOpen] = useState(false);
  const [newPeriodLabel, setNewPeriodLabel] = useState('');
  const [newPeriodStartTime, setNewPeriodStartTime] = useState('');
  const [newPeriodEndTime, setNewPeriodEndTime] = useState('');
  const [newPeriodIsBreak, setNewPeriodIsBreak] = useState(false);

  // Inline Period Editing
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [editPeriodLabel, setEditPeriodLabel] = useState('');
  const [editPeriodStartTime, setEditPeriodStartTime] = useState('');
  const [editPeriodEndTime, setEditPeriodEndTime] = useState('');
  const [editPeriodIsBreak, setEditPeriodIsBreak] = useState(false);

  // Feedback & Scheduling State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [delegations, setDelegations] = useState<PrincipalDelegations | null>(null);
  const canSetCalendarEvents = delegations?.canSetCalendarEvents ?? true;

  // Load Initial Data
  useEffect(() => {
    fetchPrincipalDelegations().then(setDelegations);

    // 1. Curriculum
    const loadedCurriculum = getStoredCurriculum();
    setCurriculum(loadedCurriculum);

    // 2. Staff Directory (Authoritative from PostgreSQL)
    fetch('/api/staff')
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (payload?.success && Array.isArray(payload.data)) {
          setStaffList(payload.data);
        }
      })
      .catch(() => {});

    // 3. Timetable Grid & Periods: authoritative from PostgreSQL /api/timetable
    fetch('/api/timetable')
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        let activePeriods = DEFAULT_PERIODS;
        if (payload?.periods && Array.isArray(payload.periods) && payload.periods.length > 0) {
          activePeriods = payload.periods;
          setPeriods(payload.periods);
        }
        if (payload?.success && payload.data && Object.keys(payload.data).length > 0) {
          setTimetable(payload.data);
        } else {
          setTimetable(generateBlankTimetable(activePeriods));
        }
      })
      .catch(() => {
        setTimetable(generateBlankTimetable(DEFAULT_PERIODS));
      });
  }, []);

  const syncTimetableToDb = async (dataToSync: TimetableData) => {
    try {
      await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timetable: dataToSync }),
      });
    } catch {}
  };

  const syncPeriodsToDb = async (periodsToSync: PeriodSlot[]) => {
    try {
      await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periods: periodsToSync }),
      });
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Class subjects derived from Option 2 curriculum
  const availableClassSubjects = useMemo(() => {
    const classSubs = curriculum
      .filter((s) => s.classLevel === selectedClass)
      .map((s) => s.name);

    if (classSubs.length > 0) {
      return Array.from(new Set(classSubs));
    }
    return ALL_OFFICIAL_SUBJECT_NAMES;
  }, [curriculum, selectedClass]);

  // All teaching faculty deduplicated
  const allTeachingFaculty = useMemo(() => {
    const names = staffList
      .filter((s) => s.role === 'Class Teacher' || s.role === 'Subject Teacher' || !s.role)
      .map((s) => (typeof s.name === 'string' ? s.name.trim() : ''))
      .filter(Boolean);

    return Array.from(new Set(names));
  }, [staffList]);

  // Subject Specialist filtering: strictly only teachers who teach the selected subject
  const specialistTeachers = useMemo(() => {
    if (!cellInput.subject) {
      return [];
    }

    // 1. Staff who have this subject assigned in their staff profile (and specifically for this class)
    const subjectTaggedStaff = staffList
      .filter((s) => s.role === 'Class Teacher' || s.role === 'Subject Teacher' || !s.role)
      .filter((s) => {
        if (Array.isArray(s.teachingAssignments) && s.teachingAssignments.length > 0) {
          return s.teachingAssignments.some(
            (ta) =>
              ta.subject === cellInput.subject &&
              (ta.classes.includes(selectedClass) || ta.classes.length === 0)
          );
        }
        return (
          Array.isArray(s.subjects) &&
          s.subjects.includes(cellInput.subject) &&
          (!s.teachingClasses ||
            s.teachingClasses.length === 0 ||
            s.teachingClasses.includes(selectedClass) ||
            s.assignedClass === selectedClass)
        );
      })
      .map((s) => s.name.trim())
      .filter(Boolean);

    // 2. Teacher assigned to this subject in the curriculum table for this class
    const curriculumMatch = curriculum.find(
      (c) => c.classLevel === selectedClass && c.name === cellInput.subject && c.assignedTeacher
    );
    const curriculumTeacher = curriculumMatch?.assignedTeacher?.trim();

    const specialistsSet = new Set<string>(subjectTaggedStaff);
    if (curriculumTeacher && curriculumTeacher !== 'Unassigned') {
      specialistsSet.add(curriculumTeacher);
    }

    return Array.from(specialistsSet);
  }, [cellInput.subject, staffList, curriculum, selectedClass]);

  // Form tutor of currently selected class
  const classHomeroomTeacher = useMemo(() => {
    const match = staffList.find(
      (s: any) =>
        (s.role === 'Class Teacher' || s.assignedClass || s.assigned_class) &&
        (s.assignedClass === selectedClass || s.assigned_class === selectedClass)
    );
    return match ? (match.name || `${(match as any).first_name || ''} ${(match as any).last_name || ''}`.trim()) : 'Unassigned';
  }, [staffList, selectedClass]);

  // Cell Management
  const getCell = (period: string, day: string): TimetableCell =>
    timetable[selectedClass]?.[period]?.[day] ?? null;

  const openEdit = (period: string, day: string) => {
    if (!canSetCalendarEvents) {
      showToast('Action prohibited: Timetable modification is reserved by the Proprietor.');
      return;
    }
    const cell = getCell(period, day);
    const initialSubject = cell?.subject || availableClassSubjects[0] || 'Mathematics';

    // Find assigned teacher in curriculum or specialist
    const curriculumMatch = curriculum.find(
      (c) => c.classLevel === selectedClass && c.name === initialSubject
    );
    const initialTeacher =
      cell?.teacher || curriculumMatch?.assignedTeacher || 'Unassigned';

    setEditingCell({ period, day });
    setCellInput({
      subject: initialSubject,
      teacher: initialTeacher,
    });
  };

  const handleSubjectChangeInModal = (newSubject: string) => {
    const currMatch = curriculum.find(
      (c) => c.classLevel === selectedClass && c.name === newSubject
    );
    const suggestedTeacher = currMatch?.assignedTeacher || 'Unassigned';

    setCellInput({
      subject: newSubject,
      teacher: suggestedTeacher,
    });
  };

  const saveCell = () => {
    if (!editingCell || !canSetCalendarEvents) return;
    const updated: TimetableData = {
      ...timetable,
      [selectedClass]: {
        ...(timetable[selectedClass] || {}),
        [editingCell.period]: {
          ...(timetable[selectedClass]?.[editingCell.period] || {}),
          [editingCell.day]: cellInput.subject
            ? { subject: cellInput.subject, teacher: cellInput.teacher }
            : null,
        },
      },
    };
    setTimetable(updated);
    syncTimetableToDb(updated);
    setEditingCell(null);
    showToast(`Updated ${selectedClass} - ${editingCell.day} (${cellInput.subject})`);
  };

  const clearCell = () => {
    if (!editingCell || !canSetCalendarEvents) return;
    const updated: TimetableData = {
      ...timetable,
      [selectedClass]: {
        ...(timetable[selectedClass] || {}),
        [editingCell.period]: {
          ...(timetable[selectedClass]?.[editingCell.period] || {}),
          [editingCell.day]: null,
        },
      },
    };
    setTimetable(updated);
    syncTimetableToDb(updated);
    setEditingCell(null);
    showToast(`Period cleared.`);
  };

  const handleSaveAll = () => {
    if (!canSetCalendarEvents) {
      showToast('Action prohibited: Timetable modification is reserved by the Proprietor.');
      return;
    }
    syncTimetableToDb(timetable);
    showToast(`Timetable saved for ${selectedClass} and all classes.`);
  };

  const handlePublish = async () => {
    if (!canSetCalendarEvents) {
      showToast('Action prohibited: Timetable modification is reserved by the Proprietor.');
      return;
    }
    await syncTimetableToDb(timetable);
    showToast(`Timetable published across all portals.`);
  };

  // Auto-schedule periods deterministically from official curriculum
  const handleAutoSchedule = async () => {
    if (!canSetCalendarEvents) {
      showToast('Action prohibited: Timetable modification is reserved by the Proprietor.');
      return;
    }
    setIsSolving(true);

    // Deterministic population from curriculum subjects
    const generated: TimetableData = {};
    CLASSES.forEach((cls) => {
      generated[cls] = {};
      const classSubs = curriculum.filter((s) => s.classLevel === cls);
      const subList = classSubs.length > 0 ? classSubs : curriculum.slice(0, 10);
      let subIdx = 0;

      periods.forEach((period) => {
        if (period.isBreak) return;
        generated[cls][period.id] = {};
        DAYS.forEach((day) => {
          if (subList.length > 0) {
            const currentSub = subList[subIdx % subList.length];
            generated[cls][period.id][day] = {
              subject: currentSub.name,
              teacher: currentSub.assignedTeacher && currentSub.assignedTeacher !== 'Unassigned'
                ? currentSub.assignedTeacher
                : 'Faculty on Duty',
            };
            subIdx++;
          } else {
            generated[cls][period.id][day] = null;
          }
        });
      });
    });

    setTimetable(generated);
    await syncTimetableToDb(generated);
    showToast(`Timetable auto-populated from curriculum subjects.`);
    setIsSolving(false);
  };

  // Period / Bell Schedule Management
  const handleAddPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodLabel.trim() || !newPeriodStartTime.trim() || !newPeriodEndTime.trim()) {
      showToast('Please provide period name, start time, and end time.');
      return;
    }

    const formattedTime = `${newPeriodStartTime.trim()} – ${newPeriodEndTime.trim()}`;
    const newId = `custom-p-${Date.now()}`;
    const updatedPeriods = [
      ...periods,
      {
        id: newId,
        label: newPeriodLabel.trim(),
        time: formattedTime,
        isBreak: newPeriodIsBreak,
      },
    ];

    setPeriods(updatedPeriods);
    syncPeriodsToDb(updatedPeriods);
    setNewPeriodLabel('');
    setNewPeriodStartTime('');
    setNewPeriodEndTime('');
    setNewPeriodIsBreak(false);
    showToast(`Added ${newPeriodLabel} to schedule.`);
  };

  const startEditingPeriod = (p: PeriodSlot) => {
    setEditingPeriodId(p.id);
    setEditPeriodLabel(p.label);
    const parts = p.time.split('–').map((s) => s.trim());
    setEditPeriodStartTime(parts[0] || '');
    setEditPeriodEndTime(parts[1] || '');
    setEditPeriodIsBreak(!!p.isBreak);
  };

  const handleSaveEditedPeriod = (periodId: string) => {
    if (!editPeriodLabel.trim() || !editPeriodStartTime.trim() || !editPeriodEndTime.trim()) {
      showToast('Please provide period name, start time, and end time.');
      return;
    }

    const formattedTime = `${editPeriodStartTime.trim()} – ${editPeriodEndTime.trim()}`;
    const updated = periods.map((p) =>
      p.id === periodId
        ? {
            ...p,
            label: editPeriodLabel.trim(),
            time: formattedTime,
            isBreak: editPeriodIsBreak,
          }
        : p
    );

    setPeriods(updated);
    syncPeriodsToDb(updated);
    setEditingPeriodId(null);
    showToast(`Updated period ${editPeriodLabel}.`);
  };

  const handleDeletePeriod = (periodId: string) => {
    if (periods.length <= 3) {
      showToast('Cannot delete period: schedule requires minimum 3 intervals.');
      return;
    }
    const updated = periods.filter((p) => p.id !== periodId);
    setPeriods(updated);
    syncPeriodsToDb(updated);
    showToast('Period removed.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          nav, aside, header, .no-print, button {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 10mm !important;
          }
          .printable-timetable {
            display: block !important;
            width: 100% !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #1e293b !important;
            padding: 6px 8px !important;
            font-size: 10pt !important;
          }
        }
      `}</style>

      {/* Screen Header (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#0f3a3e] text-white">
              2026/2027 Session &bull; First Term
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Timetable
          </h1>
          <p className="text-xs text-slate-500">
            Weekly class timetable and period schedule.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs text-slate-700 hover:text-slate-900 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Schedule</span>
          </Button>

          {canSetCalendarEvents ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoSchedule}
                disabled={isSolving}
                className="text-xs text-slate-700 hover:text-slate-900 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                <span>{isSolving ? 'Scheduling...' : 'Auto-Schedule'}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsManagePeriodsOpen(true)}
                className="text-xs text-slate-700 hover:text-slate-900 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Bell Schedule</span>
              </Button>

              <Button
                type="button"
                onClick={handleSaveAll}
                className="bg-slate-800 hover:bg-slate-900 text-white shadow-xs text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </Button>

              <Button
                type="button"
                onClick={handlePublish}
                className="bg-[#0f3a3e] hover:bg-[#134b50] text-white shadow-xs text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-teal-400" />
                <span>Publish</span>
              </Button>
            </>
          ) : (
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Timetable Changes Reserved</span>
            </span>
          )}
        </div>
      </div>

      {/* Authority Restriction Notice */}
      {!canSetCalendarEvents && (
        <DelegationRestrictedBanner
          title="Timetable Scheduling Authority Reserved"
          description="The Office of the Proprietor has reserved timetable and bell schedule modification authorities. The Principal may review and print the current schedule in read-only mode."
        />
      )}

      {toastMessage && (
        <div className="no-print p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Class Selector Bar (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-bold px-2">Select Class:</span>
          {CLASSES.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => {
                if (editingCell) saveCell();
                setSelectedClass(cls);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedClass === cls
                  ? 'bg-[#0f3a3e] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs px-2 text-slate-600">
          <UserCheck className="w-3.5 h-3.5 text-teal-800" />
          <span>
            Class Teacher: <strong className="text-slate-900">{classHomeroomTeacher}</strong>
          </span>
        </div>
      </div>

      {/* Official Print Header (Only visible on paper / printout) */}
      <div className="hidden print:block mb-4 text-center border-b-2 border-slate-900 pb-3">
        <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
          Oakland International School, Lagos
        </h1>
        <p className="text-xs text-slate-700 font-medium">
          Official Class Timetable &bull; Academic Session 2026/2027 (First Term)
        </p>
        <div className="flex justify-between items-center text-xs font-bold mt-2 pt-2 border-t border-slate-300">
          <span>Class: {selectedClass}</span>
          <span>Homeroom Teacher: {classHomeroomTeacher}</span>
          <span>Effective: September 2026</span>
        </div>
      </div>

      {/* Timetable Table Grid */}
      <div className="printable-timetable bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="bg-[#0f3a3e] text-white font-bold print:bg-slate-800">
                <th className="text-left px-4 py-3 w-40">Period</th>
                {DAYS.map((day) => (
                  <th key={day} className="text-center px-2 py-3 font-semibold">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((period) => (
                <tr key={period.id} className={period.isBreak ? 'bg-slate-50' : 'hover:bg-slate-50/50'}>
                  {/* Period label */}
                  <td className="px-4 py-3 bg-slate-50/80 border-r border-slate-100 print:bg-slate-100">
                    <div className="font-bold text-slate-800 text-xs">{period.label}</div>
                    <div className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5 font-mono print:text-slate-600">
                      <Clock className="w-3 h-3 text-slate-400 print:hidden" />
                      {period.time}
                    </div>
                  </td>

                  {/* Day cells */}
                  {DAYS.map((day) => {
                    if (period.isBreak) {
                      return (
                        <td key={day} className="px-2 py-3 text-center bg-slate-100/70 border-r border-slate-200/50 print:bg-slate-100">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {period.label}
                          </span>
                        </td>
                      );
                    }

                    const cell = getCell(period.id, day);
                    const isEditing = editingCell?.period === period.id && editingCell?.day === day;

                    return (
                      <td key={day} className="p-1.5 border-r border-slate-100 align-top">
                        {isEditing ? (
                          <div className="p-2.5 rounded-xl bg-teal-50/90 border border-teal-300 space-y-2 min-w-[140px] shadow-md animate-in fade-in">
                            <div>
                              <label className="block text-[9px] font-bold text-teal-900 uppercase mb-0.5">
                                Subject ({selectedClass})
                              </label>
                              <select
                                value={cellInput.subject}
                                onChange={(e) => handleSubjectChangeInModal(e.target.value)}
                                className="w-full text-[10px] border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-800 font-semibold"
                              >
                                {availableClassSubjects.map((s, idx) => (
                                  <option key={`${s}-${idx}`} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-teal-900 uppercase mb-0.5">
                                Assigned Teacher
                              </label>
                              <select
                                value={cellInput.teacher}
                                onChange={(e) => setCellInput((p) => ({ ...p, teacher: e.target.value }))}
                                className="w-full text-[10px] border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-800"
                              >
                                <option value="Unassigned">Unassigned</option>
                                {specialistTeachers.length > 0 ? (
                                  specialistTeachers.map((t, idx) => (
                                    <option key={`spec-${t}-${idx}`} value={t}>
                                      {t}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>No teacher registered for {cellInput.subject}</option>
                                )}
                              </select>
                            </div>

                            <div className="flex items-center gap-1 pt-1">
                              <button
                                type="button"
                                onClick={saveCell}
                                className="flex-1 bg-[#0f3a3e] hover:bg-[#164e53] text-white text-[9px] font-bold py-1 rounded-md cursor-pointer"
                              >
                                Set
                              </button>
                              <button
                                type="button"
                                onClick={clearCell}
                                className="flex-1 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[9px] font-bold py-1 rounded-md cursor-pointer"
                              >
                                Clear
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCell(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEdit(period.id, day)}
                            disabled={!canSetCalendarEvents}
                            className={`w-full min-h-[54px] rounded-xl border text-left p-2 transition-all group ${
                              !canSetCalendarEvents
                                ? cell
                                  ? 'border-slate-200/90 bg-white cursor-default print:border-none print:p-0'
                                  : 'border-dashed border-slate-200 bg-slate-50/50 cursor-default opacity-60'
                                : cell
                                ? 'border-slate-200/90 bg-white hover:border-[#0f3a3e] hover:shadow-xs cursor-pointer print:border-none print:p-0'
                                : 'border-dashed border-slate-200 bg-slate-50/50 hover:border-teal-300 hover:bg-teal-50/20 cursor-pointer'
                            }`}
                          >
                            {cell ? (
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-900 text-[11px] leading-tight line-clamp-2">
                                  {cell.subject}
                                </p>
                                {cell.teacher && cell.teacher !== 'Unassigned' && (
                                  <p className="text-slate-500 text-[9.5px] truncate font-medium print:text-slate-700">
                                    {cell.teacher}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full text-slate-300 group-hover:text-teal-600 print:hidden">
                                <Plus className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Signatures Block (Only visible on paper / printout) */}
      <div className="hidden print:flex justify-between items-end pt-8 mt-6 border-t border-slate-400 text-xs">
        <div>
          <p className="border-t border-slate-700 pt-1 font-bold">Principal</p>
          <p className="text-[10px] text-slate-500">Signature and Official Stamp</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-400">Oakland Schools Academic Registry</p>
          <p className="text-[9px] text-slate-400">Printed: {new Date().toLocaleDateString('en-GB')}</p>
        </div>
        <div className="text-right">
          <p className="border-t border-slate-700 pt-1 font-bold">{classHomeroomTeacher}</p>
          <p className="text-[10px] text-slate-500">Homeroom Class Teacher</p>
        </div>
      </div>

      {/* Footer Instructions (Hidden on print) */}
      <div className="no-print p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p>
          Click any cell to assign or change a subject. The faculty list is strictly filtered to teachers assigned to that subject.
        </p>
      </div>

      {/* Modal: Bell Schedule & Period Configuration */}
      {isManagePeriodsOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manage Bell Schedule</h3>
                <p className="text-xs text-slate-500">Customize daily intervals, breaks, and period timings</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManagePeriodsOpen(false);
                  setEditingPeriodId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Periods List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {periods.map((p) => {
                const isEditingThis = editingPeriodId === p.id;
                if (isEditingThis) {
                  return (
                    <div key={p.id} className="p-3 rounded-xl border border-teal-300 bg-teal-50/50 space-y-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Period Name</label>
                        <input
                          type="text"
                          value={editPeriodLabel}
                          onChange={(e) => setEditPeriodLabel(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Start Time</label>
                          <input
                            type="text"
                            placeholder="08:15"
                            value={editPeriodStartTime}
                            onChange={(e) => setEditPeriodStartTime(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">End Time</label>
                          <input
                            type="text"
                            placeholder="09:00"
                            value={editPeriodEndTime}
                            onChange={(e) => setEditPeriodEndTime(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`edit-break-${p.id}`}
                          checked={editPeriodIsBreak}
                          onChange={(e) => setEditPeriodIsBreak(e.target.checked)}
                          className="rounded border-slate-300 text-[#0f3a3e]"
                        />
                        <label htmlFor={`edit-break-${p.id}`} className="text-slate-700 text-[11px]">
                          Non-instructional interval (Break or Roll Call)
                        </label>
                      </div>
                      <div className="flex items-center gap-2 pt-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingPeriodId(null)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleSaveEditedPeriod(p.id)}
                          className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-[11px] h-7 px-3 font-semibold"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{p.label}</span>
                      <span className="text-slate-500 ml-2 font-mono text-[11px]">{p.time}</span>
                      {p.isBreak && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                          Break
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditingPeriod(p)}
                        className="p-1 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition"
                        title="Edit period times"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePeriod(p.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Remove period"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Period Form */}
            <form onSubmit={handleAddPeriod} className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <h4 className="font-bold text-slate-800">Add New Interval</h4>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Period Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Period 9 (Club Activities)"
                  value={newPeriodLabel}
                  onChange={(e) => setNewPeriodLabel(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    placeholder="15:15"
                    value={newPeriodStartTime}
                    onChange={(e) => setNewPeriodStartTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    placeholder="16:00"
                    value={newPeriodEndTime}
                    onChange={(e) => setNewPeriodEndTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isBreakCheck"
                  checked={newPeriodIsBreak}
                  onChange={(e) => setNewPeriodIsBreak(e.target.checked)}
                  className="rounded border-slate-300 text-[#0f3a3e]"
                />
                <label htmlFor="isBreakCheck" className="text-slate-700 font-medium">
                  This is a non-instructional interval (Break, Assembly, or Games)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Interval
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
