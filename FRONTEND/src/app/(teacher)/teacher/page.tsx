'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  GraduationCap,
  CalendarCheck,
  Award,
  BookOpen,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  ChevronRight,
  Megaphone,
  School,
} from 'lucide-react';

interface TeachingAssignment {
  subject: string;
  classes: string[];
}

export default function TeacherDashboard() {
  const [studentCount, setStudentCount] = useState(0);
  const [teacherName, setTeacherName] = useState('Educator');
  const [assignedClass, setAssignedClass] = useState<string | undefined>(undefined);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadTeacherSession = async () => {
      let currentHomeroom: string | undefined = undefined;
      let rawAssignments: TeachingAssignment[] = [];
      let resolvedClasses: string[] = [];

      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.authenticated && meData.profile) {
            const p = meData.profile;
            currentHomeroom = p.assignedClass || undefined;
            rawAssignments = p.teachingAssignments || [];
            
            const distinctClasses = Array.from(new Set([
              ...(currentHomeroom ? [currentHomeroom] : []),
              ...rawAssignments.flatMap((ta: any) => ta.classes || [])
            ]));
            resolvedClasses = distinctClasses;

            let distinctSubjects = Array.from(new Set(rawAssignments.map((ta: any) => ta.subject)));
            if (distinctSubjects.length === 0 && Array.isArray(p.subjects)) {
              distinctSubjects = p.subjects;
            }

            const isHomeroomLead = Boolean(currentHomeroom) || p.teacherType === 'Class Teacher' || p.role === 'Class Teacher';

            if (isMounted) {
              setTeacherName(p.name || 'Educator');
              setAssignedClass(currentHomeroom);
              setIsClassTeacher(isHomeroomLead);
              setTeachingAssignments(rawAssignments);
              setAssignedClasses(distinctClasses);
              setSubjects(distinctSubjects);
            }
          }
        }
      } catch {}

      // Fetch live student roster from PostgreSQL and filter STRICTLY to assigned classes
      try {
        const stRes = await fetch('/api/students');
        if (stRes.ok) {
          const stData = await stRes.json();
          if (stData?.success && Array.isArray(stData.data)) {
            if (isMounted) {
              if (currentHomeroom) {
                // For a Class Teacher, count pupils in their homeroom
                const homeroomStudents = stData.data.filter((s: any) => s.class === currentHomeroom);
                setStudentCount(homeroomStudents.length);
              } else {
                // For a Subject Teacher, count distinct pupils in the classes they actually teach
                const teachingClassSet = new Set(resolvedClasses);
                const assignedPupils = stData.data.filter((s: any) => teachingClassSet.has(s.class));
                setStudentCount(assignedPupils.length);
              }
            }
          }
        }
      } catch {}

      // Notice Board Broadcasts from live /api/staff/broadcasts
      try {
        const bcRes = await fetch('/api/staff/broadcasts');
        if (bcRes.ok) {
          const bcData = await bcRes.json();
          if (bcData?.success && Array.isArray(bcData.data) && isMounted) {
            // Filter broadcasts relevant to teachers
            const relevant = bcData.data.filter(
              (b: any) => b.audience === 'All Staff' || b.audience === 'Teachers'
            );
            setBroadcasts(
              relevant.map((b: any) => ({
                id: b.id,
                title: b.title,
                sender: b.senderName || 'Office of the Proprietor',
                date: b.dispatchedAt || 'Recent',
                content: b.message || '',
                priority: b.priority || 'Notice',
              }))
            );
          }
        }
      } catch {}
    };

    loadTeacherSession();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Teacher Profile Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0c282b] via-[#0f3a3e] to-[#14474d] text-white shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-semibold border border-white/15">
                Session 2026/2027 &bull; Term 1
              </span>
              <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
                {isClassTeacher
                  ? assignedClass
                    ? `Class Teacher (${assignedClass})`
                    : 'Class Teacher'
                  : 'Subject Teacher'}
              </span>
              {assignedClasses.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-white/5 text-slate-300 text-xs font-semibold border border-white/10">
                  Teaching: {assignedClasses.join(', ')}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {teacherName}
            </h1>
            <p className="text-sm text-teal-100/80 max-w-2xl">
              {isClassTeacher && assignedClass
                ? `You are the designated Class Teacher for ${assignedClass}. Manage attendance, students, and terminal report cards.`
                : isClassTeacher
                ? 'Designated Class Teacher. Contact the Principal to allocate your specific homeroom class.'
                : `Manage scores and timetable for ${assignedClasses.length > 0 ? assignedClasses.join(', ') : 'assigned classes'}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/teacher/scores">
              <Button className="bg-white text-[#0f3a3e] hover:bg-slate-100 font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Score Entry</span>
              </Button>
            </Link>
            {isClassTeacher && (
              <Link href="/teacher/attendance">
                <Button className="bg-teal-700/80 hover:bg-teal-600 text-white border border-teal-400/40 text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer">
                  <CalendarCheck className="w-4 h-4" />
                  <span>Daily Attendance</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Homeroom Showcase for Class Teachers */}
      {isClassTeacher && assignedClass && (
        <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/80 border border-teal-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0f3a3e] text-teal-300 flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#0f3a3e] text-white">
                  Homeroom Custody
                </span>
                <span className="text-sm font-extrabold text-teal-950 bg-white px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
                  {assignedClass}
                </span>
                <span className="text-xs text-teal-800 font-semibold">
                  &bull; {studentCount} Enrolled Pupils
                </span>
              </div>
              <p className="text-xs text-teal-900 mt-1 font-medium">
                You are the official Class Teacher for <strong>{assignedClass}</strong>. You oversee daily roll call, pupil welfare, and terminal report card remarks.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/teacher/attendance">
              <Button size="sm" className="bg-[#0f3a3e] hover:bg-[#14474d] text-white text-xs font-bold shadow-xs cursor-pointer">
                Daily Roll Call &rarr;
              </Button>
            </Link>
            <Link href="/teacher/students">
              <Button size="sm" variant="outline" className="text-xs font-bold border-teal-300 text-teal-950 bg-white hover:bg-teal-50 cursor-pointer">
                Roster ({studentCount})
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isClassTeacher && assignedClass ? `Homeroom Class (${assignedClass})` : 'Class Assignment'}
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-100">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">
                {isClassTeacher && assignedClass ? assignedClass : `${studentCount} Pupils`}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {isClassTeacher && assignedClass
                  ? `${studentCount} Enrolled Pupils in Homeroom`
                  : assignedClasses.length > 0
                  ? `Teaching in ${assignedClasses.join(', ')}`
                  : 'No classes assigned'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        {isClassTeacher ? (
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Today&apos;s Homeroom Roll-Call
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">{studentCount > 0 ? `${studentCount} Pupils` : 'No Pupils'}</div>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                  Ready for morning attendance
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Instructional Role
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">Subject Specialist</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Continuous Assessment and Exams
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metric 3 */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assigned Teaching Courses
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-100">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">
                {teachingAssignments.length > 0 ? teachingAssignments.length : subjects.length} Offerings
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">
                {subjects.length > 0 ? subjects.join(', ') : 'General Curriculum'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Subject Grading & Teaching Responsibilities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Teaching Offerings */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Assigned Teaching Subjects
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Curriculum allocations registered by the Principal
                </CardDescription>
              </div>
              <Link href="/teacher/scores">
                <Button variant="ghost" size="sm" className="text-xs text-[#0f3a3e] font-bold cursor-pointer">
                  Enter Scores &rarr;
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6">
              {teachingAssignments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teachingAssignments.map((ta, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-800 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900">{ta.subject}</p>
                            <p className="text-[10px] text-slate-500">Curriculum Subject</p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Assigned Classes:</span>
                        <div className="flex flex-wrap gap-1">
                          {ta.classes.map((cls) => (
                            <span
                              key={cls}
                              className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-teal-100/70 text-teal-900 font-mono"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : subjects.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {subjects.map((sub) => (
                    <div
                      key={sub}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-800 flex items-center justify-center font-bold">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{sub}</p>
                        <p className="text-[10px] text-slate-500">Continuous Assessment and Examinations</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <p>No specialist teaching courses assigned yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Shortcuts */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Academic Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/teacher/scores" className="block">
                <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition-colors flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#0f3a3e]" />
                    <span className="font-semibold text-slate-800">Subject Gradebook</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>

              <Link href="/teacher/students" className="block">
                <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition-colors flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-[#0f3a3e]" />
                    <span className="font-semibold text-slate-800">My Students Roster</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>

              {isClassTeacher && (
                <Link href="/teacher/attendance" className="block">
                  <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition-colors flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <CalendarCheck className="w-4 h-4 text-[#0f3a3e]" />
                      <span className="font-semibold text-slate-800">Daily Attendance Register</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
              )}

              <Link href="/teacher/timetable" className="block">
                <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition-colors flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#0f3a3e]" />
                    <span className="font-semibold text-slate-800">Teaching Timetable</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Live Staff Notices Board */}
        <div>
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-teal-800" />
                  Official Staff Notices
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Broadcasts from School Administration
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {broadcasts.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No New Announcements</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Official memos and broadcasts will appear here.
                  </p>
                </div>
              ) : (
                broadcasts.map((bc) => (
                  <div
                    key={bc.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{bc.title}</span>
                      <span className="text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                        {bc.priority || 'Notice'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{bc.content || bc.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {bc.sender || bc.senderName || 'Principal'} &bull; {bc.date || bc.dispatchedAt || 'Recent'}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
