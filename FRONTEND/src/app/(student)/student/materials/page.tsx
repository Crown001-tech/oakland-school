'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStudent } from '@/context/StudentContext';
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  BookOpen,
  User,
  Calendar,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

export default function StudentMaterialsPage() {
  const { student } = useStudent();
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get('subject') || 'all';

  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // DEF-059: Pass classId when available for indexed UUID lookup
    const classParam = student?.currentClassId
      ? `?classId=${encodeURIComponent(student.currentClassId)}`
      : student?.currentClass
      ? `?class=${encodeURIComponent(student.currentClass)}`
      : '';
    fetch(`/api/materials${classParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.materials)) {
          setMaterials(data.materials);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [student?.currentClassId, student?.currentClass]);

  // Extract unique subjects from materials
  const availableSubjects = React.useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => {
      if (m.subjectName) set.add(m.subjectName);
    });
    return Array.from(set);
  }, [materials]);

  const filteredMaterials = materials.filter((m) => {
    const matchesSubject =
      selectedSubject === 'all' || (m.subjectName || '').toLowerCase() === selectedSubject.toLowerCase();
    const matchesSearch =
      (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSubject && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
          Study Materials
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Notes and study files for {student?.currentClass || 'your class'}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Subject Filter */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedSubject('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedSubject === 'all'
                ? 'bg-[#0f3a3e] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Subjects
          </button>
          {availableSubjects.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedSubject === sub
                  ? 'bg-[#0f3a3e] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs h-10 min-h-[40px] pl-8 pr-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f3a3e] font-medium text-slate-800"
          />
        </div>
      </div>

      {/* Materials List */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <BrandLoader />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No Study Materials Found</h3>
            <p className="text-xs text-slate-500">
              No study notes uploaded for this subject yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredMaterials.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs p-5 transition flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0f3a3e] bg-[#0f3a3e]/10 border border-[#0f3a3e]/20 px-2 py-0.5 rounded-md text-[10px]">
                    {m.subjectName}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">
                    {m.fileType || 'PDF'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {m.title}
                </h3>

                {m.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {m.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Uploaded by: <strong className="text-slate-700">{m.teacherName}</strong></span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recent'}
                </span>

                {m.fileUrl ? (
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </a>
                ) : m.externalLink ? (
                  <a
                    href={m.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#0f3a3e]/10 hover:bg-[#0f3a3e]/20 text-[#0f3a3e] text-xs font-bold transition border border-[#0f3a3e]/20 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Resource</span>
                  </a>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">
                    Notes Available
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
