'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Save,
  Filter,
  Users,
  ChevronRight,
  Info,
  Calendar,
  BookOpen,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  admissionNo: string;
  name: string;
  gender: 'Male' | 'Female';
  status: 'present' | 'late' | 'absent';
  arrivalTime?: string;
  reason?: string;
}

const INITIAL_STUDENTS: AttendanceRecord[] = [];

export default function DailyAttendancePage() {
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [homeroomClass, setHomeroomClass] = useState<string | null>(null);
  const [isClassTeacher, setIsClassTeacher] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<AttendanceRecord[]>(INITIAL_STUDENTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState<'All' | 'Male' | 'Female'>('All');
  const [isSaved, setIsSaved] = useState(false);
  const [todayDate, setTodayDate] = useState('');

  useEffect(() => {
    setTodayDate(
      new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );

    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      let homeroom: string | null = null;
      let teacherProfile: any = null;

      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.authenticated && meData.profile) {
            teacherProfile = meData.profile;
            homeroom = teacherProfile.assignedClass || null;
            if (isMounted) {
              setCurrentTeacher(teacherProfile);
              setHomeroomClass(homeroom);
              setIsClassTeacher(Boolean(homeroom));
              if (homeroom) {
                setSelectedClass(homeroom);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load teacher profile', err);
      }

      if (homeroom) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const [stRes, attRes] = await Promise.all([
            fetch('/api/students'),
            fetch(`/api/attendance?date=${today}`),
          ]);

          const existingMap = new Map<string, 'present' | 'late' | 'absent'>();
          if (attRes.ok) {
            const attData = await attRes.json();
            if (attData?.success && Array.isArray(attData.data?.records)) {
              attData.data.records.forEach((r: any) => {
                if (r.student_id && ['present', 'late', 'absent'].includes(r.status)) {
                  existingMap.set(r.student_id, r.status);
                }
              });
            }
          }

          if (stRes.ok) {
            const stData = await stRes.json();
            if (stData?.success && Array.isArray(stData.data)) {
              const matching = stData.data.filter((s: any) => s.class === homeroom);
              const mapped: AttendanceRecord[] = matching.map((s: any, idx: number) => ({
                id: s.id || `std-${idx}`,
                admissionNo: s.admissionNo || `OAK-${idx + 1}`,
                name: s.fullName || 'Student',
                gender: s.gender === 'Female' ? 'Female' : 'Male',
                status: existingMap.get(s.id) || 'present',
              }));

              if (isMounted) {
                setStudents(mapped);
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch students for attendance', err);
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Quick 1-tap status updater
  const updateStatus = (id: string, newStatus: 'present' | 'late' | 'absent') => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
    setIsSaved(false);
  };

  // Instant Reset: All Present
  const handleMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, status: 'present', arrivalTime: undefined, reason: undefined }))
    );
    setIsSaved(false);
  };

  const handleSaveRegister = async () => {
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class: selectedClass || homeroomClass,
          date: today,
          records: students,
          markedBy: currentTeacher?.name || 'Adesayan Peter',
        }),
      });

      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 4000);
      }
    } catch (err) {
      console.error('Failed to save attendance register', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = filterGender === 'All' || s.gender === filterGender;
    return matchesSearch && matchesGender;
  });

  const presentCount = students.filter((s) => s.status === 'present').length;
  const lateCount = students.filter((s) => s.status === 'late').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const totalCount = students.length;
  const attendanceRate = totalCount > 0 ? (((presentCount + lateCount) / totalCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-800 text-white uppercase">
              {isClassTeacher ? `Homeroom Roll Call (${homeroomClass})` : 'Subject Teacher View'}
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" /> {todayDate}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            {isClassTeacher ? `${homeroomClass} Daily Attendance Register` : 'Daily Attendance Roll Call'}
          </h1>
          <p className="text-xs text-slate-500">
            {isClassTeacher
              ? `Official morning homeroom roll call for ${homeroomClass}. Records synchronize directly to school administration.`
              : 'Daily morning roll call is governed exclusively by the appointed Homeroom Class Teacher.'}
          </p>
        </div>

        {isClassTeacher && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleMarkAllPresent}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Reset All to Present
            </Button>

            <Button
              type="button"
              onClick={handleSaveRegister}
              disabled={isSaving}
              className="bg-[#0f3a3e] hover:bg-[#164e53] text-white shadow-xs text-xs font-semibold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Submitting...' : 'Submit Register'}</span>
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <BrandLoader size="lg" />
        </div>
      ) : !isClassTeacher ? (
        /* Subject Teacher Notice Card */
        <Card className="border-amber-200 bg-amber-50/50 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Homeroom Roll Call Notice
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-6 max-w-lg mx-auto">
            Official daily morning attendance roll call is governed exclusively by the appointed <strong>Homeroom Class Teacher</strong>.
            As a <strong>Subject Teacher</strong>, your primary responsibility is recording Continuous Assessment tests and exam scores for your assigned subject classes.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/teacher/scores">
              <Button className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold px-6 h-10 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Go to Subject Scores Roster</span>
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        /* Class Teacher Attendance Register */
        <>
          {/* Success Notification */}
          {isSaved && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 shadow-xs transition-all">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold">Register Successfully Recorded!</p>
                <p className="text-emerald-700">
                  Today's roll call for {homeroomClass} ({presentCount} Present, {lateCount} Late, {absentCount} Absent) has been submitted to the Principal and saved to the school database.
                </p>
              </div>
            </div>
          )}



          {/* Quick Summary Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Class Size</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-emerald-600 uppercase">Present</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{presentCount}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-amber-600 uppercase">Late Arrivals</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{lateCount}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-rose-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-rose-600 uppercase">Absent Today</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">{absentCount}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Student Attendance List */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  {homeroomClass} Student Roster ({filteredStudents.length} Students)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Tap any status pill to toggle Present, Late, or Absent
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search student or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-slate-50"
                  />
                </div>

                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value as 'All' | 'Male' | 'Female')}
                  className="h-8 px-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700"
                >
                  <option value="All">All Genders</option>
                  <option value="Male">Boys</option>
                  <option value="Female">Girls</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No students currently enrolled in {homeroomClass}.
                  </div>
                ) : (
                  filteredStudents.map((student, idx) => (
                    <div
                      key={student.id}
                      className="p-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 text-xs font-bold text-slate-400">
                          #{idx + 1}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center font-bold text-xs shrink-0">
                          {student.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{student.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="font-mono">{student.admissionNo}</span>
                            <span>&bull;</span>
                            <span>{student.gender}</span>
                            {student.status === 'late' && student.reason && (
                              <>
                                <span>&bull;</span>
                                <span className="text-amber-700 font-medium italic">
                                  {student.arrivalTime} ({student.reason})
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 1-Tap Status Selector */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {/* Present Button */}
                        <button
                          type="button"
                          onClick={() => updateStatus(student.id, 'present')}
                          className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                            student.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </button>

                        {/* Late Button */}
                        <button
                          type="button"
                          onClick={() => updateStatus(student.id, 'late')}
                          className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                            student.status === 'late'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Late</span>
                        </button>

                        {/* Absent Button */}
                        <button
                          type="button"
                          onClick={() => updateStatus(student.id, 'absent')}
                          className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                            student.status === 'absent'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-600">
                  Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> homeroom students.
                </span>
                <Button
                  type="button"
                  onClick={handleSaveRegister}
                  disabled={isSaving}
                  className="bg-[#0f3a3e] hover:bg-[#164e53] text-white font-semibold text-xs h-8 px-4"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {isSaving ? 'Submitting...' : 'Submit Register'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
