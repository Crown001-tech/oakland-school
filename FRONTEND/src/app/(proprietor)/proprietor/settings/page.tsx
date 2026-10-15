'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { Toggle } from '@/components/ui/Toggle';
import {
  School,
  BookOpen,
  CalendarCheck,
  Wallet,
  Bell,
  CheckCircle2,
  Save,
  Clock,
  Calendar,
  AlertCircle,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  Plus,
  Trash2,
  Building2,
  UserCheck,
} from 'lucide-react';

export interface EntranceExamWindow {
  id: string;
  title: string;
  windowStart: string;
  windowEnd: string;
  examDate: string;
  examTime: string;
  venue: string;
  isActive: boolean;
}

export interface PrincipalDelegations {
  canOnboardStaff: boolean;
  canSetCalendarEvents: boolean;
  canApproveAdmissions: boolean;
  canEndorseResults: boolean;
}

export interface SchoolSettings {
  // Tab 1: General & Session
  schoolName: string;
  motto: string;
  address: string;
  academicSession: string;
  currentTerm: string;
  termStartDate: string;
  termEndDate: string;
  classCapacity: number;

  // Tab 2: Academic & Grading
  ca1Weight: number;
  ca2Weight: number;
  examWeight: number;
  passMark: number;
  minAttendanceRate: number;

  // Tab 3: Attendance Rules
  rollCallCutoff: string;
  submissionDeadline: string;
  autoNotifyAbsent: boolean;
  autoNotifyLate: boolean;

  // Tab 4: Tuition & Fees
  tuitionJSS: number;
  tuitionSS12: number;
  tuitionSS3: number;
  restrictExamSlipIfDebtor: boolean;
  debtorThresholdPct: number;

  // Tab 5: Communication Alerts
  smsReceipts: boolean;
  smsResults: boolean;
  alertLargeTransactions: boolean;

  // Tab 6: Staff Compensation Scales (Master Institutional Scale)
  salaryPrincipal: number;
  salaryBursar: number;
  salaryClassTeacher: number;
  salarySubjectTeacher: number;
  salarySupportStaff: number;
  allowanceClassTeacher: number;

  // Tab 7: Entrance Exam Schedule Windows
  entranceExamWindows: EntranceExamWindow[];

  // Tab 8: Principal Delegated Powers
  principalDelegations: PrincipalDelegations;
}

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'Oakland International School',
  motto: 'Knowledge, Integrity and Excellence',
  address: '14 Academic Crescent, Victoria Island, Lagos',
  academicSession: '2026/2027',
  currentTerm: 'Term 1',
  termStartDate: '2026-09-14',
  termEndDate: '2026-12-18',
  classCapacity: 250,

  ca1Weight: 20,
  ca2Weight: 20,
  examWeight: 60,
  passMark: 50,
  minAttendanceRate: 75,

  rollCallCutoff: '08:15',
  submissionDeadline: '08:30',
  autoNotifyAbsent: true,
  autoNotifyLate: true,

  tuitionJSS: 185000,
  tuitionSS12: 220000,
  tuitionSS3: 240000,
  restrictExamSlipIfDebtor: true,
  debtorThresholdPct: 50,

  smsReceipts: true,
  smsResults: true,
  alertLargeTransactions: true,

  salaryPrincipal: 450000,
  salaryBursar: 400000,
  salaryClassTeacher: 280000,
  salarySubjectTeacher: 240000,
  salarySupportStaff: 180000,
  allowanceClassTeacher: 35000,

  entranceExamWindows: [],

  principalDelegations: {
    canOnboardStaff: true,
    canSetCalendarEvents: true,
    canApproveAdmissions: true,
    canEndorseResults: true,
  },
};

export default function ProprietorSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'academic' | 'attendance' | 'fees' | 'exams' | 'delegations' | 'alerts' | 'payroll'>('general');
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // New Entrance Exam Window state
  const [isAddingWindow, setIsAddingWindow] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newWindowStart, setNewWindowStart] = useState('');
  const [newWindowEnd, setNewWindowEnd] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamTime, setNewExamTime] = useState('09:00 AM');
  const [newExamVenue, setNewExamVenue] = useState('Oakland Main Auditorium');

  useEffect(() => {
    let isMounted = true;
    async function fetchSettings() {
      try {
        const res = await fetch('/api/schools/settings');
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setSettings((prev) => ({
            ...prev,
            ...json.data,
            entranceExamWindows: Array.isArray(json.data.entranceExamWindows) ? json.data.entranceExamWindows : [],
            principalDelegations: json.data.principalDelegations || prev.principalDelegations,
          }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalWeight = Number(settings.ca1Weight) + Number(settings.ca2Weight) + Number(settings.examWeight);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (totalWeight !== 100) {
      alert(`Continuous assessment weights must total exactly 100%. Current total: ${totalWeight}%`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/schools/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 3500);
      } else {
        alert(json.message || 'Failed to save settings.');
      }
    } catch {
      alert('Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SchoolSettings>(key: K, value: SchoolSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddExamWindow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle || !newWindowStart || !newWindowEnd || !newExamDate) {
      alert('Please fill out all required window dates and title.');
      return;
    }

    const newWin: EntranceExamWindow = {
      id: `exam-win-${Date.now()}`,
      title: newExamTitle.trim(),
      windowStart: newWindowStart,
      windowEnd: newWindowEnd,
      examDate: newExamDate,
      examTime: newExamTime || '09:00 AM',
      venue: newExamVenue.trim() || 'Oakland Main Auditorium',
      isActive: true,
    };

    const currentWindows = Array.isArray(settings.entranceExamWindows) ? settings.entranceExamWindows : [];
    updateSetting('entranceExamWindows', [...currentWindows, newWin]);
    setIsAddingWindow(false);
    setNewExamTitle('');
    setNewWindowStart('');
    setNewWindowEnd('');
    setNewExamDate('');
    setNewExamTime('09:00 AM');
    setNewExamVenue('Oakland Main Auditorium');
  };

  const handleToggleWindow = (id: string) => {
    const currentWindows = Array.isArray(settings.entranceExamWindows) ? settings.entranceExamWindows : [];
    const updated = currentWindows.map((w) =>
      w.id === id ? { ...w, isActive: !w.isActive } : w
    );
    updateSetting('entranceExamWindows', updated);
  };

  const handleDeleteWindow = (id: string) => {
    const currentWindows = Array.isArray(settings.entranceExamWindows) ? settings.entranceExamWindows : [];
    const updated = currentWindows.filter((w) => w.id !== id);
    updateSetting('entranceExamWindows', updated);
  };

  const handleToggleDelegation = (key: keyof PrincipalDelegations) => {
    const currentDelegations = settings.principalDelegations || {
      canOnboardStaff: true,
      canSetCalendarEvents: true,
      canApproveAdmissions: true,
      canEndorseResults: true,
    };
    updateSetting('principalDelegations', {
      ...currentDelegations,
      [key]: !currentDelegations[key],
    });
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            School Settings & Policies
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure school profile, academic calendar, assessment weights, entrance exam schedules, and delegated powers.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Save className="w-3.5 h-3.5" />}
          onClick={() => handleSave()}
          disabled={saving}
          className="bg-[#0f3a3e] hover:bg-[#164e53] text-white"
        >
          {saving ? 'Saving Changes...' : 'Save Changes'}
        </Button>
      </div>

      {saveToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">
            School settings have been saved successfully and applied across all portals.
          </span>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'general'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <School className="w-3.5 h-3.5" />
          <span>School & Session</span>
        </button>

        <button
          onClick={() => setActiveTab('academic')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'academic'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Academic & Grading</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Attendance & Timings</span>
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'fees'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Tuition & Fees</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'exams'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Entrance Exams</span>
        </button>

        <button
          onClick={() => setActiveTab('delegations')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'delegations'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Principal Delegations</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Parent Alerts</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-3.5 py-2 font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'payroll'
              ? 'bg-[#0f3a3e] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Staff Compensation</span>
        </button>
      </div>

      {/* Tab 1: General & Session */}
      {activeTab === 'general' && (
        <Card className="p-6 border-slate-200 space-y-5">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              School Profile & Current Academic Session
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Official school identity and active term calendar displayed across reports and receipts.
            </CardDescription>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official School Name</label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => updateSetting('schoolName', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">School Motto</label>
              <input
                type="text"
                value={settings.motto}
                onChange={(e) => updateSetting('motto', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Campus Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => updateSetting('address', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Academic Session</label>
              <input
                type="text"
                value={settings.academicSession}
                onChange={(e) => updateSetting('academicSession', e.target.value)}
                placeholder="2026/2027"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Active Term</label>
              <select
                value={settings.currentTerm}
                onChange={(e) => updateSetting('currentTerm', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 text-xs"
              >
                <option value="Term 1">First Term (Term 1)</option>
                <option value="Term 2">Second Term (Term 2)</option>
                <option value="Term 3">Third Term (Term 3)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Term Resumption Date</label>
              <input
                type="date"
                value={settings.termStartDate}
                onChange={(e) => updateSetting('termStartDate', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Term Closing Date</label>
              <input
                type="date"
                value={settings.termEndDate}
                onChange={(e) => updateSetting('termEndDate', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard Class Seat Capacity</label>
              <input
                type="number"
                min="10"
                max="500"
                value={settings.classCapacity || 250}
                onChange={(e) => updateSetting('classCapacity', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Standard student enrollment limit per class (applies to JSS 1 through SS 3).
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: Academic & Grading */}
      {activeTab === 'academic' && (
        <Card className="p-6 border-slate-200 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Continuous Assessment & Examination Formula
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Components must total exactly 100%. These weights are applied to generate final terminal report cards.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Sum:</span>
              <Badge
                variant={totalWeight === 100 ? 'teal' : 'crimson'}
                size="sm"
              >
                {totalWeight}% / 100%
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block font-bold text-slate-800">1st Continuous Assessment (CA1)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.ca1Weight}
                  onChange={(e) => updateSetting('ca1Weight', Number(e.target.value))}
                  className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 text-center"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
              <p className="text-[11px] text-slate-400">Mid-term test & assignments</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block font-bold text-slate-800">2nd Continuous Assessment (CA2)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.ca2Weight}
                  onChange={(e) => updateSetting('ca2Weight', Number(e.target.value))}
                  className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 text-center"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
              <p className="text-[11px] text-slate-400">Class projects & practical exercises</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block font-bold text-slate-800">Terminal Examination</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.examWeight}
                  onChange={(e) => updateSetting('examWeight', Number(e.target.value))}
                  className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 text-center"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
              <p className="text-[11px] text-slate-400">End-of-term comprehensive examination</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subject Minimum Pass Mark (%)</label>
              <input
                type="number"
                min="30"
                max="75"
                value={settings.passMark}
                onChange={(e) => updateSetting('passMark', Number(e.target.value))}
                className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Scores below this mark are categorized as Needs Improvement.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Minimum Attendance Rate for Exam Sitting (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={settings.minAttendanceRate}
                onChange={(e) => updateSetting('minAttendanceRate', Number(e.target.value))}
                className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">Students below this threshold require Principal clearance before sitting examinations.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Attendance & Timings */}
      {activeTab === 'attendance' && (
        <Card className="p-6 border-slate-200 space-y-5">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Daily Attendance & Morning Timings
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Policies governing student arrival, roll call submission by class teachers, and parent notifications.
            </CardDescription>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">Lateness Cutoff</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <input
                  type="time"
                  value={settings.rollCallCutoff}
                  onChange={(e) => updateSetting('rollCallCutoff', e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500">Students arriving after this time are marked Late at the school gate.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">Teacher Roll Call Submission Deadline</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <input
                  type="time"
                  value={settings.submissionDeadline}
                  onChange={(e) => updateSetting('submissionDeadline', e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500">Deadline for class teachers to submit morning homeroom registers.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <p className="font-bold text-slate-900">Notify Parents Automatically on Unexcused Absence</p>
                <p className="text-[11px] text-slate-500">
                  Sends an instant notification to parents if a student is marked Absent during morning roll call.
                </p>
              </div>
              <Toggle
                checked={settings.autoNotifyAbsent}
                onChange={(checked) => updateSetting('autoNotifyAbsent', checked)}
                label="Notify Parents on Unexcused Absence"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <p className="font-bold text-slate-900">Notify Parents Automatically on Late Arrival</p>
                <p className="text-[11px] text-slate-500">
                  Sends an alert to parents when student arrives after official assembly start time.
                </p>
              </div>
              <Toggle
                checked={settings.autoNotifyLate}
                onChange={(checked) => updateSetting('autoNotifyLate', checked)}
                label="Notify Parents on Late Arrival"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Tuition & Fees */}
      {activeTab === 'fees' && (
        <Card className="p-6 border-slate-200 space-y-5">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Standard Term Tuition Schedules & Examination Clearance
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Default billing amounts applied automatically to students enrolled in Junior and Senior secondary classes.
            </CardDescription>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">Junior Secondary (JSS 1 - 3)</label>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500">₦</span>
                <input
                  type="number"
                  step="5000"
                  value={settings.tuitionJSS}
                  onChange={(e) => updateSetting('tuitionJSS', Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-400">Per student per term</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">Senior Secondary (SS 1 - 2)</label>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500">₦</span>
                <input
                  type="number"
                  step="5000"
                  value={settings.tuitionSS12}
                  onChange={(e) => updateSetting('tuitionSS12', Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-400">Per student per term</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">Graduating Class (SS 3)</label>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500">₦</span>
                <input
                  type="number"
                  step="5000"
                  value={settings.tuitionSS3}
                  onChange={(e) => updateSetting('tuitionSS3', Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-400">Includes terminal mock examinations</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <p className="font-bold text-slate-900">Restrict Terminal Exam Clearance for Unpaid Fees</p>
                <p className="text-[11px] text-slate-500">
                  Withhold official examination docket if student fee balance exceeds the clearance threshold.
                </p>
              </div>
              <Toggle
                checked={settings.restrictExamSlipIfDebtor}
                onChange={(checked) => updateSetting('restrictExamSlipIfDebtor', checked)}
                label="Restrict Exam Clearance for Unpaid Fees"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-900">Debtor Cutoff Threshold (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={settings.debtorThresholdPct}
                  onChange={(e) => updateSetting('debtorThresholdPct', Number(e.target.value))}
                  className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                />
                <span className="text-slate-500 text-xs">% of total term bill outstanding</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pupils with fee balance exceeding {settings.debtorThresholdPct}% require special bursary clearance.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 5: Entrance Exam Schedules */}
      {activeTab === 'exams' && (
        <Card className="p-6 border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Entrance Examination Schedule Windows
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure candidate intake windows. When parents submit admissions applications, their exam date, time, and campus venue are automatically assigned based on the active application window.
              </CardDescription>
            </div>

            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddingWindow(true)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 shrink-0"
            >
              Add Schedule Window
            </Button>
          </div>

          {/* Add New Window Form (Collapsible/Modal) */}
          {isAddingWindow && (
            <form onSubmit={handleAddExamWindow} className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Create New Admissions Schedule Window
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingWindow(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Window Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Supplementary Autumn Admissions Window"
                    value={newExamTitle}
                    onChange={(e) => setNewExamTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Application Window Opens</label>
                  <input
                    type="date"
                    required
                    value={newWindowStart}
                    onChange={(e) => setNewWindowStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Application Window Closes</label>
                  <input
                    type="date"
                    required
                    value={newWindowEnd}
                    onChange={(e) => setNewWindowEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheduled Examination Date</label>
                  <input
                    type="date"
                    required
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Examination Sitting Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09:00 AM"
                    value={newExamTime}
                    onChange={(e) => setNewExamTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Exam Venue</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oakland Main Auditorium, Campus A"
                    value={newExamVenue}
                    onChange={(e) => setNewExamVenue(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingWindow(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs"
                >
                  Save Schedule Window
                </Button>
              </div>
            </form>
          )}

          {/* Schedule Windows List */}
          <div className="space-y-3">
            {(!settings.entranceExamWindows || settings.entranceExamWindows.length === 0) ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                No entrance examination windows configured. Click "Add Schedule Window" above to establish an intake window.
              </div>
            ) : (
              settings.entranceExamWindows.map((win) => (
                <div
                  key={win.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-xs">{win.title}</h4>
                      <Badge variant={win.isActive ? 'teal' : 'slate'} size="sm">
                        {win.isActive ? 'Active Intake' : 'Archived'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 font-semibold block">Application Period:</span>
                        <span className="font-mono text-slate-800">{win.windowStart} &rarr; {win.windowEnd}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Exam Sitting:</span>
                        <span className="font-mono font-bold text-teal-900">{win.examDate} at {win.examTime}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Campus Venue:</span>
                        <span className="text-slate-800">{win.venue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                        {win.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Toggle
                        size="sm"
                        checked={win.isActive}
                        onChange={() => handleToggleWindow(win.id)}
                        label="Toggle window active status"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteWindow(win.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title="Delete Window"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Tab 6: Principal Delegated Powers */}
      {activeTab === 'delegations' && (
        <Card className="p-6 border-slate-200 space-y-6">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Principal Delegated Powers & Executive Authorities
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Configure administrative privileges delegated to the Head of School. Reserved financial authorities remain strictly exclusive to the Proprietor.
            </CardDescription>
          </div>

          {/* Principal Identity Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0f3a3e] text-white flex items-center justify-center font-bold text-sm">
                SB
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm">Mr Seyi Bankole</h3>
                  <Badge variant="teal" size="sm">Appointed Principal</Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Employee ID: OAK-PRN-001 &bull; Head of School &bull; seyibankole@gmail.com
                </p>
              </div>
            </div>
          </div>

          {/* Delegated Authorities Toggles */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition">
              <div className="space-y-0.5 pr-4">
                <p className="font-bold text-slate-900">Faculty & Staff Onboarding</p>
                <p className="text-[11px] text-slate-500">
                  Allows the Principal to invite teachers, assign homeroom classes, and issue standard portal accounts with default credentials.
                </p>
              </div>
              <Toggle
                checked={!!settings.principalDelegations?.canOnboardStaff}
                onChange={() => handleToggleDelegation('canOnboardStaff')}
                label="Faculty & Staff Onboarding"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition">
              <div className="space-y-0.5 pr-4">
                <p className="font-bold text-slate-900">Academic Calendar & Examination Timetables</p>
                <p className="text-[11px] text-slate-500">
                  Allows the Principal to schedule school assembly events, midterm assessments, and terminal examination dates.
                </p>
              </div>
              <Toggle
                checked={!!settings.principalDelegations?.canSetCalendarEvents}
                onChange={() => handleToggleDelegation('canSetCalendarEvents')}
                label="Academic Calendar & Examination Timetables"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition">
              <div className="space-y-0.5 pr-4">
                <p className="font-bold text-slate-900">Student Admissions Intake & Review</p>
                <p className="text-[11px] text-slate-500">
                  Allows the Principal to inspect submitted entrance applications, grade entrance exams, and approve student enrollment.
                </p>
              </div>
              <Toggle
                checked={!!settings.principalDelegations?.canApproveAdmissions}
                onChange={() => handleToggleDelegation('canApproveAdmissions')}
                label="Student Admissions Intake & Review"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition">
              <div className="space-y-0.5 pr-4">
                <p className="font-bold text-slate-900">Continuous Assessment & Terminal Results Endorsement</p>
                <p className="text-[11px] text-slate-500">
                  Allows the Principal to review class broadsheets, sign terminal report cards, and forward them for final Proprietor publication.
                </p>
              </div>
              <Toggle
                checked={!!settings.principalDelegations?.canEndorseResults}
                onChange={() => handleToggleDelegation('canEndorseResults')}
                label="Continuous Assessment & Terminal Results Endorsement"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 5: Parent Alerts */}
      {activeTab === 'alerts' && (
        <Card className="p-6 border-slate-200 space-y-5">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Communication & Notification Dispatch
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Manage automatic notifications sent to parents and executive alerts.
            </CardDescription>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <p className="font-bold text-slate-900">Send Instant SMS & Email Receipt on Fee Payment</p>
                <p className="text-[11px] text-slate-500">
                  Parents automatically receive an official payment confirmation and remaining balance receipt.
                </p>
              </div>
              <Toggle
                checked={settings.smsReceipts}
                onChange={(checked) => updateSetting('smsReceipts', checked)}
                label="Send SMS & Email Receipt on Fee Payment"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <p className="font-bold text-slate-900">Notify Parents Upon Official Report Card Publication</p>
                <p className="text-[11px] text-slate-500">
                  Sends notice to guardians when terminal result cards are approved and published by the Principal.
                </p>
              </div>
              <Toggle
                checked={settings.smsResults}
                onChange={(checked) => updateSetting('smsResults', checked)}
                label="Notify Parents on Report Card Publication"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <p className="font-bold text-slate-900">Alert Proprietor on Single Transactions Over ₦500,000</p>
                <p className="text-[11px] text-slate-500">
                  Send immediate executive notice to your phone for high-value tuition payments or disbursements.
                </p>
              </div>
              <Toggle
                checked={settings.alertLargeTransactions}
                onChange={(checked) => updateSetting('alertLargeTransactions', checked)}
                label="Alert Proprietor on Single Transactions Over ₦500,000"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 6: Staff Compensation Scales */}
      {activeTab === 'payroll' && (
        <Card className="p-6 border-slate-200 space-y-5">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Master Institutional Compensation & Salary Scales
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Establish institutional compensation scales across designations. Staff payroll records and payslips automatically derive from these master rates.
            </CardDescription>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-emerald-900">Institutional Baseline Rule Active</p>
              <p className="text-[11px] text-emerald-800">
                Salaries are managed globally rather than negotiated per individual profile to maintain equity and standard payroll governance.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Currency</span>
              <span className="font-mono font-bold text-slate-800 text-sm">NGN (₦)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="block font-bold text-slate-900">
                Principal (Base Monthly)
              </label>
              <p className="text-[11px] text-slate-500">Master executive tier compensation</p>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₦</span>
                <input
                  type="number"
                  value={settings.salaryPrincipal}
                  onChange={(e) => updateSetting('salaryPrincipal', Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="block font-bold text-slate-900">
                Bursar (Base Monthly)
              </label>
              <p className="text-[11px] text-slate-500">Senior financial administration tier</p>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₦</span>
                <input
                  type="number"
                  value={settings.salaryBursar}
                  onChange={(e) => updateSetting('salaryBursar', Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="block font-bold text-slate-900">
                Class Teacher Base (Monthly)
              </label>
              <p className="text-[11px] text-slate-500">Teachers with homeroom custody</p>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₦</span>
                <input
                  type="number"
                  value={settings.salaryClassTeacher}
                  onChange={(e) => updateSetting('salaryClassTeacher', Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="block font-bold text-slate-900">
                Subject Teacher Base (Monthly)
              </label>
              <p className="text-[11px] text-slate-500">Specialist instructors without homeroom</p>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₦</span>
                <input
                  type="number"
                  value={settings.salarySubjectTeacher}
                  onChange={(e) => updateSetting('salarySubjectTeacher', Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="block font-bold text-slate-900">
                Class Teacher Allowance (Monthly)
              </label>
              <p className="text-[11px] text-slate-500">Added to homeroom class managers</p>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₦</span>
                <input
                  type="number"
                  value={settings.allowanceClassTeacher}
                  onChange={(e) => updateSetting('allowanceClassTeacher', Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="block font-bold text-slate-900">
                Support & Non-Teaching Staff Base (Monthly)
              </label>
              <p className="text-[11px] text-slate-500">Facilities, security, admin aides</p>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₦</span>
                <input
                  type="number"
                  value={settings.salarySupportStaff}
                  onChange={(e) => updateSetting('salarySupportStaff', Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f3a3e] font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Save Button Footer */}
      <div className="flex justify-end pt-2">
        <Button
          size="sm"
          variant="primary"
          leftIcon={<Save className="w-3.5 h-3.5" />}
          onClick={() => handleSave()}
          className="bg-[#0f3a3e] hover:bg-[#164e53] text-white px-6"
        >
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
