'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStudent } from '@/context/StudentContext';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  BookOpen,
  User,
  FileText,
  Search,
} from 'lucide-react';

export default function StudentSubjectsPage() {
  const { student } = useStudent();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (student?.currentClassId) params.append('classId', student.currentClassId);
    if (student?.currentClass) params.append('class', student.currentClass);
    if (student?.department) params.append('department', student.department);
    const query = params.toString() ? `?${params.toString()}` : '';

    fetch(`/api/subjects${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setSubjects(data.data);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [student?.currentClass, student?.currentClassId, student?.department]);

  const isSenior = Boolean(student?.currentClass?.toUpperCase().startsWith('SS'));
  const SENIOR_CORE_CODES = React.useMemo(() => new Set(['MTH', 'ENG', 'CVE', 'CMP']), []);

  const isGeneralSubject = React.useCallback(
    (s: any) => SENIOR_CORE_CODES.has(s.code) || (s.category || '').toLowerCase() === 'general',
    [SENIOR_CORE_CODES]
  );

  const generalCount = subjects.filter(isGeneralSubject).length;
  const departmentalCount = subjects.filter((s) => !isGeneralSubject(s)).length;

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.code || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (!isSenior || filter === 'all') return true;
    if (filter === 'general') return isGeneralSubject(s);
    if (filter === 'departmental') return !isGeneralSubject(s);

    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          My Subjects
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Subjects for {student?.currentClass || 'your class'}
          {student?.department ? ` • ${student.department} Department` : ''}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {isSenior ? (
          <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
            {[
              { id: 'all', label: 'All Subjects', count: subjects.length },
              { id: 'general', label: 'General', count: generalCount },
              { id: 'departmental', label: 'Departmental', count: departmentalCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  filter === tab.id
                    ? 'bg-[#0f3a3e] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-600">
            {subjects.length} Subjects Registered
          </div>
        )}

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs h-10 min-h-[40px] pl-8 pr-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f3a3e] font-medium text-slate-800"
          />
        </div>
      </div>

      {/* Subjects Grid */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <BrandLoader />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No Subjects Found</h3>
            <p className="text-xs text-slate-500">
              No registered subjects match the selected criteria.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub) => {
            const classAssignment = (sub.assignments || []).find((a: any) =>
              (a.className || '').toLowerCase().includes((student?.currentClass || '').toLowerCase())
            );
            const teacherName = sub.assignedTeacher || classAssignment?.teacherName || 'Unassigned';

            return (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs p-5 transition flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0f3a3e] bg-[#0f3a3e]/10 border border-[#0f3a3e]/20 px-2 py-0.5 rounded-md">
                      {sub.code || 'SUB'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {isSenior && isGeneralSubject(sub) ? 'General' : (sub.category || 'Curriculum')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#b3141f] transition">
                    {sub.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Teacher: <strong className="text-slate-700">{teacherName}</strong></span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/student/materials?subject=${encodeURIComponent(sub.name)}`}
                    className="text-xs text-[#0f3a3e] hover:text-[#b3141f] font-bold inline-flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Study Materials &rarr;</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
