'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  GraduationCap,
  Search,
  Phone,
  Mail,
  User,
  Calendar,
  MapPin,
  HeartPulse,
  ShieldCheck,
  ChevronRight,
  Award,
  Users,
} from 'lucide-react';

export interface StudentProfile {
  id: string;
  admissionNo: string;
  fullName: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  age: string;
  stateOfOrigin: string;
  lga: string;
  nationality: string;
  address: string;
  fatherName: string;
  fatherOccupation: string;
  fatherPhone: string;
  fatherEmail: string;
  motherName: string;
  motherOccupation: string;
  motherPhone: string;
  motherEmail: string;
  pickupGuardianName: string;
  pickupGuardianRelationship: string;
  pickupGuardianPhone: string;
  pickupTagId: string;
  emergencyContact: string;
  emergencyPhone: string;
  bloodGroup: string;
  genotype: string;
  allergies: string;
  medicalNotes: string;
  attendanceRate: string;
  termAverage: string;
  classPosition: string;
  class?: string;
}

export default function ClassStudentsPage() {
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      let defaultCls = '';
      let teacherProfile: any = null;

      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.authenticated && meData.profile) {
            teacherProfile = meData.profile;
            const currentHomeroom = teacherProfile.assignedClass;
            const assignments = teacherProfile.teachingAssignments || [];
            
            const classesFromAssignments = assignments.flatMap((ta: any) => ta.classes || []);
            const distinctClasses = Array.from(new Set([
              ...(currentHomeroom ? [currentHomeroom] : []),
              ...classesFromAssignments,
            ])).filter(Boolean) as string[];

            defaultCls = currentHomeroom || distinctClasses[0] || '';

            if (isMounted) {
              setCurrentTeacher(teacherProfile);
              setAvailableClasses(distinctClasses);
              setSelectedClass(defaultCls);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load teacher profile', err);
      }

      try {
        const stRes = await fetch('/api/students');
        if (stRes.ok) {
          const stData = await stRes.json();
          if (stData?.success && Array.isArray(stData.data)) {
            const mapped: StudentProfile[] = stData.data.map((s: any, idx: number) => {
              const birthYear = s.dob && s.dob !== '—' ? new Date(s.dob).getFullYear() : null;
              const currentYear = new Date().getFullYear();
              const computedAge = birthYear && !isNaN(birthYear) ? `${currentYear - birthYear} yrs` : '—';
              const adm = s.admissionNo || `OAK-${idx + 1}`;

              return {
                id: s.id || `std-${idx}`,
                admissionNo: adm,
                fullName: s.fullName || 'Student',
                gender: s.gender === 'Female' ? 'Female' : 'Male',
                dateOfBirth: s.dob || '—',
                age: computedAge,
                stateOfOrigin: '—',
                lga: '—',
                nationality: 'Nigerian',
                address: s.address || '—',
                fatherName: s.guardianName || '—',
                fatherOccupation: s.guardianOccupation || 'Guardian',
                fatherPhone: s.guardianPhone || '—',
                fatherEmail: s.guardianEmail || '—',
                motherName: '—',
                motherOccupation: '—',
                motherPhone: '—',
                motherEmail: '—',
                pickupGuardianName: s.guardianName || '—',
                pickupGuardianRelationship: s.guardianRelationship || 'Guardian',
                pickupGuardianPhone: s.guardianPhone || '—',
                pickupTagId: `TAG-${adm.replace(/\D/g, '') || String(idx + 1).padStart(3, '0')}`,
                emergencyContact: s.guardianName || '—',
                emergencyPhone: s.guardianPhone || '—',
                bloodGroup: s.bloodGroup || '—',
                genotype: '—',
                allergies: 'None recorded',
                medicalNotes: 'No existing conditions documented',
                attendanceRate: s.attendanceRate || '100%',
                termAverage: '—',
                classPosition: '—',
                class: s.class,
              };
            });

            if (isMounted) {
              setAllStudents(mapped);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch students', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const isClassTeacher = currentTeacher?.role === 'Class Teacher';
  const homeroomClass = isClassTeacher ? currentTeacher?.assignedClass : undefined;

  // Filter students strictly by selected class
  const classStudents = allStudents.filter((s: any) => s.class === selectedClass);

  useEffect(() => {
    if (classStudents.length > 0) {
      setSelectedStudent(classStudents[0]);
    } else {
      setSelectedStudent(null);
    }
  }, [selectedClass, allStudents]);

  const filteredStudents = classStudents.filter((s) =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pupil biodata, guardian contacts, pickup authorization, and health records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/teacher/report-cards">
            <Button className="bg-[#0f3a3e] hover:bg-[#164e53] text-white shadow-xs text-xs font-semibold flex items-center gap-2 cursor-pointer">
              <Award className="w-4 h-4" />
              <span>Class Report Cards</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Class Switcher & Roster Metric Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 mr-1">Class:</span>
          {availableClasses.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No classes assigned</span>
          ) : (
            availableClasses.map((cls) => {
              const isSelected = selectedClass === cls;
              const isHome = isClassTeacher && cls === homeroomClass;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0f3a3e] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{cls}</span>
                  {isHome && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                        isSelected ? 'bg-teal-700 text-white' : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      Homeroom
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          {classStudents.length} Enrolled {classStudents.length === 1 ? 'Student' : 'Students'}
        </div>
      </div>

      {/* Main Grid: Student List (Left) + Detailed Profile (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Student Selector List */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="border-slate-200 shadow-xs bg-white">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="py-12 flex justify-center items-center">
                  <BrandLoader size="sm" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No students found in {selectedClass || 'this class'}.
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;
                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      type="button"
                      className={`w-full p-3.5 text-left transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50/70 border-l-4 border-[#0f3a3e]'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? 'bg-[#0f3a3e] text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {student.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#0f3a3e]' : 'text-slate-900'}`}>
                            {student.fullName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            {student.admissionNo} &bull; {student.gender}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#0f3a3e]' : 'text-slate-300'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right: Modern, Clean Student Profile */}
        <div className="lg:col-span-8">
          {selectedStudent ? (
            <div className="space-y-4">
              {/* Executive Student Profile Header Hero */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/70 to-teal-50/30 shadow-sm p-5 sm:p-6">
                {/* Decorative Brand Top Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0f3a3e] via-teal-600 to-emerald-500" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
                  {/* Left: Avatar & Identity Details */}
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-[#0f3a3e] to-[#164e53] text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-md border-2 border-white ring-2 ring-teal-700/20">
                        {selectedStudent.fullName
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
                          {selectedStudent.admissionNo}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-900 text-[10px] font-extrabold border border-teal-200 uppercase tracking-wide">
                          {selectedStudent.class || selectedClass}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Enrolled
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                        {selectedStudent.fullName}
                      </h2>

                      <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                        <span>Gender: <strong className="text-slate-700 font-semibold">{selectedStudent.gender}</strong></span>
                        <span className="text-slate-300">&bull;</span>
                        <span>Age: <strong className="text-slate-700 font-semibold">{selectedStudent.age}</strong></span>
                        <span className="text-slate-300">&bull;</span>
                        <span>DOB: <strong className="text-slate-700 font-semibold">{selectedStudent.dateOfBirth}</strong></span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Quick Performance Strip & Report Card CTA */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-200/60">
                    <div className="grid grid-cols-2 gap-2 bg-white/95 backdrop-blur-xs p-2 rounded-xl border border-slate-200/90 shadow-2xs shrink-0">
                      <div className="text-center px-3 py-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Attendance
                        </span>
                        <span className="text-sm font-black text-slate-900 mt-0.5 block">
                          {selectedStudent.attendanceRate || '100%'}
                        </span>
                      </div>
                      <div className="text-center px-3 py-1 border-l border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Term Score
                        </span>
                        <span className="text-sm font-black text-[#0f3a3e] mt-0.5 block">
                          {selectedStudent.termAverage || '—'}
                        </span>
                      </div>
                    </div>

                    <Link href={`/teacher/report-cards?studentId=${selectedStudent.id}`} className="shrink-0">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-[#0f3a3e] to-[#164e53] hover:from-[#13494e] hover:to-[#1c5f65] text-white text-xs font-bold h-10 px-4 rounded-xl cursor-pointer shadow-sm hover:shadow transition-all flex items-center gap-2"
                      >
                        <Award className="w-4 h-4 text-amber-300" />
                        <span>View Report Card</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Personal Biodata */}
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#0f3a3e]" />
                    Personal Biodata
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Full Name</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">{selectedStudent.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Date of Birth (Age)</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">
                        {selectedStudent.dateOfBirth} ({selectedStudent.age})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Gender</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{selectedStudent.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">State of Origin</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{selectedStudent.stateOfOrigin}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">LGA</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{selectedStudent.lga}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Nationality</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{selectedStudent.nationality}</span>
                    </div>
                    <div className="sm:col-span-3">
                      <span className="text-slate-400 text-[11px] block">Residential Address</span>
                      <span className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5 block">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {selectedStudent.address}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Family Contacts */}
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#0f3a3e]" />
                    Family Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Father Card */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Father</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                          Primary Contact
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{selectedStudent.fatherName}</p>
                        <p className="text-[11px] text-slate-500">{selectedStudent.fatherOccupation}</p>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-slate-200/60 text-[11px]">
                        <p className="flex items-center gap-2 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          <a href={`tel:${selectedStudent.fatherPhone}`} className="hover:underline font-mono">
                            {selectedStudent.fatherPhone}
                          </a>
                        </p>
                        <p className="flex items-center gap-2 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          <span className="truncate">{selectedStudent.fatherEmail}</span>
                        </p>
                      </div>
                    </div>

                    {/* Mother Card */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Mother</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                          Secondary Contact
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{selectedStudent.motherName}</p>
                        <p className="text-[11px] text-slate-500">{selectedStudent.motherOccupation}</p>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-slate-200/60 text-[11px]">
                        <p className="flex items-center gap-2 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          <a href={`tel:${selectedStudent.motherPhone}`} className="hover:underline font-mono">
                            {selectedStudent.motherPhone}
                          </a>
                        </p>
                        <p className="flex items-center gap-2 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          <span className="truncate">{selectedStudent.motherEmail}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pickup Authorization */}
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0f3a3e]" />
                    Pickup Authorization
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Authorized Person</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">{selectedStudent.pickupGuardianName}</span>
                      <span className="text-[10px] text-teal-800 font-medium block">
                        Role: {selectedStudent.pickupGuardianRelationship}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Verified Telephone</span>
                      <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                        {selectedStudent.pickupGuardianPhone}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Security Gate Tag</span>
                      <span className="inline-block px-2.5 py-0.5 mt-0.5 rounded bg-teal-800 text-white font-mono font-bold text-[10px]">
                        {selectedStudent.pickupTagId}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Record */}
              <Card className="border-slate-200 shadow-xs bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                    Medical Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                      <span className="text-slate-500 text-[10px] block">Blood Group</span>
                      <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                        {selectedStudent.bloodGroup}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                      <span className="text-slate-500 text-[10px] block">Genotype</span>
                      <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                        {selectedStudent.genotype}
                      </span>
                    </div>
                    <div className="sm:col-span-2 p-3 rounded-xl border border-rose-200 bg-rose-50/40">
                      <span className="text-rose-800 font-bold text-[10px] block">Known Allergies</span>
                      <span className="text-slate-800 font-medium mt-0.5 block">{selectedStudent.allergies}</span>
                    </div>
                    <div className="sm:col-span-4 p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-slate-500 text-[10px] block">Clinic Notes</span>
                      <span className="text-slate-800 font-medium mt-0.5 block">{selectedStudent.medicalNotes}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-12 text-center border-slate-200 bg-white text-slate-400 text-xs">
              Select a student to view their records.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
