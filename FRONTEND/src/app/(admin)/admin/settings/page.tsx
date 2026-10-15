'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Save,
  CheckCircle2,
  Building,
  GraduationCap,
  Clock,
  Bell,
  Shield,
  FileText,
} from 'lucide-react';

type SettingsCategory = 'academic' | 'school' | 'attendance' | 'notifications' | 'security';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('academic');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Academic Settings
  const [ca1Weight, setCa1Weight] = useState(20);
  const [ca2Weight, setCa2Weight] = useState(20);
  const [examWeight, setExamWeight] = useState(60);
  const [resumptionDate, setResumptionDate] = useState('2027-01-11');
  const [activeSession, setActiveSession] = useState('2026/2027');
  const [activeTerm, setActiveTerm] = useState('First Term');
  const [classCapacity, setClassCapacity] = useState(50);
  const [passMark, setPassMark] = useState(50);
  const [minAttendanceRate, setMinAttendanceRate] = useState(75);

  // School Information
  const [schoolName, setSchoolName] = useState('Oakland International College');
  const [schoolAddress, setSchoolAddress] = useState('Plot 12, Admiralty Way, Lekki Phase 1, Lagos, Nigeria');
  const [schoolMotto, setSchoolMotto] = useState('Knowledge, Integrity and Excellence');
  const [schoolEmail, setSchoolEmail] = useState('info@oaklandschools.ng');
  const [schoolPhone, setSchoolPhone] = useState('+234 1 234 5678');

  // Attendance Settings
  const [schoolStartTime, setSchoolStartTime] = useState('08:00');
  const [lateThreshold, setLateThreshold] = useState('08:15');
  const [dismissalTime, setDismissalTime] = useState('15:30');

  // Notification Settings
  const [smsOnPickup, setSmsOnPickup] = useState(true);
  const [smsOnAbsent, setSmsOnAbsent] = useState(true);
  const [emailReceipts, setEmailReceipts] = useState(true);

  // Security Settings
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState(30);
  const [requireStrongPassword, setRequireStrongPassword] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/schools/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setCa1Weight(d.ca1Weight ?? 20);
          setCa2Weight(d.ca2Weight ?? 20);
          setExamWeight(d.examWeight ?? 60);
          setActiveSession(d.academicSession || '2026/2027');
          setActiveTerm(d.currentTerm || 'First Term');
          setClassCapacity(d.classCapacity || 50);
          setPassMark(d.passMark ?? 50);
          setMinAttendanceRate(d.minAttendanceRate ?? 75);
          if (d.termEndDate) setResumptionDate(d.termEndDate);

          if (d.schoolName) setSchoolName(d.schoolName);
          if (d.address) setSchoolAddress(d.address);
          if (d.motto) setSchoolMotto(d.motto);

          if (d.schoolStartTime) setSchoolStartTime(d.schoolStartTime);
          if (d.lateThreshold) setLateThreshold(d.lateThreshold);
          if (d.dismissalTime) setDismissalTime(d.dismissalTime);

          if (typeof d.smsOnPickup === 'boolean') setSmsOnPickup(d.smsOnPickup);
          if (typeof d.smsOnAbsent === 'boolean') setSmsOnAbsent(d.smsOnAbsent);
          if (typeof d.emailReceipts === 'boolean') setEmailReceipts(d.emailReceipts);

          if (typeof d.sessionTimeoutMins === 'number') setSessionTimeoutMins(d.sessionTimeoutMins);
          if (typeof d.requireStrongPassword === 'boolean') setRequireStrongPassword(d.requireStrongPassword);
        }
      }
    } catch (err) {
      console.error('Failed to load school settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ca1Weight,
        ca2Weight,
        examWeight,
        academicSession: activeSession,
        currentTerm: activeTerm,
        classCapacity,
        passMark,
        minAttendanceRate,
        schoolName,
        address: schoolAddress,
        motto: schoolMotto,
        schoolStartTime,
        lateThreshold,
        dismissalTime,
        smsOnPickup,
        smsOnAbsent,
        emailReceipts,
        sessionTimeoutMins,
        requireStrongPassword,
      };

      const res = await fetch('/api/schools/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3500);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  const navItems: { id: SettingsCategory; label: string; icon: React.ElementType }[] = [
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'school', label: 'School Profile', icon: Building },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {isSaved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#0f3a3e] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configure institutional parameters, schedules, and operational preferences.</p>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          className="bg-[#0f3a3e] hover:bg-[#134b50] text-white text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg self-start sm:self-auto"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Category Navigation */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeCategory === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveCategory(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f3a3e] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-teal-300' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div className="md:col-span-3">
          <form onSubmit={handleSave} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
            {/* Academic Settings */}
            {activeCategory === 'academic' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assessment Parameters</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Continuous assessment weights and term calendar.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Active Session</label>
                    <input
                      type="text"
                      value={activeSession}
                      onChange={(e) => setActiveSession(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Active Term</label>
                    <select
                      value={activeTerm}
                      onChange={(e) => setActiveTerm(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="First Term">First Term</option>
                      <option value="Second Term">Second Term</option>
                      <option value="Third Term">Third Term</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Assessment Weight Ratio (Total must equal 100%)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500">CA 1 (Test)</span>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          value={ca1Weight}
                          onChange={(e) => setCa1Weight(Number(e.target.value))}
                          className="h-8 text-xs font-bold pr-7"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">CA 2 (Mid-Term)</span>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          value={ca2Weight}
                          onChange={(e) => setCa2Weight(Number(e.target.value))}
                          className="h-8 text-xs font-bold pr-7"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">Terminal Examination</span>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          value={examWeight}
                          onChange={(e) => setExamWeight(Number(e.target.value))}
                          className="h-8 text-xs font-bold pr-7"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-right">
                    <span className={`text-xs font-bold ${ca1Weight + ca2Weight + examWeight === 100 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      Total: {ca1Weight + ca2Weight + examWeight}%
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Next Term Resumption Date (Printed on Report Cards)
                  </label>
                  <input
                    type="date"
                    value={resumptionDate}
                    onChange={(e) => setResumptionDate(e.target.value)}
                    className="w-full sm:w-64 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {/* School Profile */}
            {activeCategory === 'school' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">School Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Official school identity appearing on receipts, report cards, and letters.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School Name</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Address</label>
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                    <input
                      type="email"
                      value={schoolEmail}
                      onChange={(e) => setSchoolEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone</label>
                    <input
                      type="text"
                      value={schoolPhone}
                      onChange={(e) => setSchoolPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Settings */}
            {activeCategory === 'attendance' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Attendance Configuration</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Daily bell schedule and late arrival thresholds.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Morning Assembly</label>
                    <input
                      type="time"
                      value={schoolStartTime}
                      onChange={(e) => setSchoolStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Late Arrival Threshold</label>
                    <input
                      type="time"
                      value={lateThreshold}
                      onChange={(e) => setLateThreshold(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dismissal Time</label>
                    <input
                      type="time"
                      value={dismissalTime}
                      onChange={(e) => setDismissalTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeCategory === 'notifications' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Automated Parent Alerts</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Toggle automated parent SMS and email alerts.</p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsOnPickup}
                      onChange={(e) => setSmsOnPickup(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Gate Security Pickup SMS</p>
                      <p className="text-[11px] text-slate-500">Send immediate SMS confirmation to parent upon security desk student release.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsOnAbsent}
                      onChange={(e) => setSmsOnAbsent(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Unexcused Absence Alert</p>
                      <p className="text-[11px] text-slate-500">Notify parent if student is marked absent after morning roll call.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailReceipts}
                      onChange={(e) => setEmailReceipts(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Automated Fee Receipts</p>
                      <p className="text-[11px] text-slate-500">Email official stamped receipt PDF to parent upon Bursar payment recording.</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeCategory === 'security' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Security Policy</h3>
                  <p className="text-xs text-slate-500 mt-0.5">User session timeouts and authentication rules.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Session Inactivity Timeout (Minutes)</label>
                    <input
                      type="number"
                      value={sessionTimeoutMins}
                      onChange={(e) => setSessionTimeoutMins(Number(e.target.value))}
                      className="w-32 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-bold"
                    />
                  </div>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireStrongPassword}
                      onChange={(e) => setRequireStrongPassword(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Enforce Strong Staff Passwords</p>
                      <p className="text-[11px] text-slate-500">Require minimum 8 characters with upper, lower, and numbers for all staff accounts.</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
