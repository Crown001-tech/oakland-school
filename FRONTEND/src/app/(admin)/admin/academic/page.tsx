'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  X,
  School,
  BookOpen,
  UserCheck,
} from 'lucide-react';
import {
  SubjectItem,
  getStoredCurriculum,
  saveStoredCurriculum,
  ALL_OFFICIAL_SUBJECT_NAMES,
} from '@/lib/curriculum-data';
import {
  fetchPrincipalDelegations,
  type PrincipalDelegations,
} from '@/lib/delegations';
import { DelegationRestrictedBanner } from '@/components/common/DelegationRestrictedBanner';
import { Lock } from 'lucide-react';

const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

export default function AcademicCurriculumPage() {
  const [selectedClass, setSelectedClass] = useState<string>('JSS 1');
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [availableTeachers, setAvailableTeachers] = useState<string[]>([]);
  const [delegations, setDelegations] = useState<PrincipalDelegations | null>(null);
  const canEditCurriculum = delegations?.canEditCurriculum ?? true;

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSubjectOption, setSelectedSubjectOption] = useState(ALL_OFFICIAL_SUBJECT_NAMES[0]);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [newStream, setNewStream] = useState<SubjectItem['stream']>('Core');
  const [newPeriods, setNewPeriods] = useState('4');
  const [newTeacher, setNewTeacher] = useState('Unassigned');

  // Load curriculum and teachers
  useEffect(() => {
    const loadData = async () => {
      try {
        const staffRes = await fetch('/api/staff').then((r) => (r.ok ? r.json() : null));
        if (staffRes?.success && Array.isArray(staffRes.data)) {
          const teachers = staffRes.data
            .filter((s: any) => s.role === 'Class Teacher' || s.role === 'Subject Teacher' || s.role === 'Teacher')
            .map((s: any) => (typeof s.name === 'string' ? s.name.trim() : ''))
            .filter(Boolean);

          const uniqueTeachers = Array.from(new Set<string>(teachers));
          if (uniqueTeachers.length > 0) {
            setAvailableTeachers(['Unassigned', ...uniqueTeachers]);
          } else {
            setAvailableTeachers(['Unassigned']);
          }
        } else {
          setAvailableTeachers(['Unassigned']);
        }
      } catch {
        setAvailableTeachers(['Unassigned']);
      }

      const loaded = getStoredCurriculum();
      setSubjects(loaded);
      fetchPrincipalDelegations().then(setDelegations);
    };

    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTeacherChange = (subjectId: string, teacher: string) => {
    const targetSubject = subjects.find((s) => s.id === subjectId);
    const updated = subjects.map((s) =>
      s.id === subjectId ? { ...s, assignedTeacher: teacher === 'Unassigned' ? undefined : teacher } : s
    );
    setSubjects(updated);
    saveStoredCurriculum(updated);
    showToast('Teacher assignment updated and saved');
  };

  const handleDeleteSubject = (subjectId: string) => {
    const updated = subjects.filter((s) => s.id !== subjectId);
    setSubjects(updated);
    saveStoredCurriculum(updated);
    showToast('Subject removed from class curriculum');
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = customSubjectName.trim() || selectedSubjectOption;
    if (!finalName) return;

    let dept = 'Sciences';
    if (['English Language', 'French', 'Literature in English', 'Cultural & Creative Arts (CCA)'].includes(finalName)) {
      dept = 'Languages & Arts';
    } else if (['Social Studies', 'Civic Education', 'Government', 'History / Geography'].includes(finalName)) {
      dept = 'Humanities';
    } else if (['Financial Accounting', 'Economics', 'Commerce', 'Business Management'].includes(finalName)) {
      dept = 'Commercial';
    } else if (['Basic Technology', 'Computer Studies', 'Computer Studies / Data Processing', 'Technical Drawing'].includes(finalName)) {
      dept = 'Vocational & Tech';
    }

    const newSub: SubjectItem = {
      id: `cur-${selectedClass.toLowerCase().replace(' ', '')}-${Date.now()}`,
      name: finalName,
      classLevel: selectedClass,
      stream: newStream,
      periodsPerWeek: Number(newPeriods) || 4,
      assignedTeacher: newTeacher === 'Unassigned' ? undefined : newTeacher,
      department: dept,
    };

    const updated = [...subjects, newSub];
    setSubjects(updated);
    saveStoredCurriculum(updated);

    // Persist directly to live PostgreSQL database
    fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: finalName,
        category: dept === 'Sciences' ? 'Sciences' : dept === 'Commercial' ? 'Commercial' : dept === 'Humanities' ? 'Humanities' : 'General',
      }),
    }).catch(() => {});

    setIsAddOpen(false);
    setCustomSubjectName('');
    showToast(`Added ${newSub.name} to ${selectedClass}`);
  };

  const isSeniorSecondary = selectedClass.startsWith('SS');

  const filteredSubjects = subjects
    .filter((s) => s.classLevel === selectedClass)
    .filter((s) => (selectedStream === 'All' ? true : s.stream === selectedStream))
    .filter((s) =>
      searchQuery
        ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.assignedTeacher && s.assignedTeacher.toLowerCase().includes(searchQuery.toLowerCase())) ||
          s.department.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  const assignedCount = subjects.filter((s) => s.classLevel === selectedClass && Boolean(s.assignedTeacher)).length;
  const totalCount = subjects.filter((s) => s.classLevel === selectedClass).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Curriculum</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            10 Junior Secondary core subjects and Senior Secondary departmental streams with teacher allocations.
          </p>
        </div>

        {canEditCurriculum ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subject to {selectedClass}</span>
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Curriculum Editing Reserved</span>
          </div>
        )}
      </div>

      {!canEditCurriculum && (
        <DelegationRestrictedBanner
          title="Curriculum Modification Authority Reserved"
          description="The Office of the Proprietor has reserved curriculum editing authorities. The Principal may inspect course lists and subject allocations in read-only mode."
        />
      )}

      {/* Class Selector Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <School className="w-3.5 h-3.5 text-teal-800" /> Class:
          </span>
          {CLASSES.map((cls) => {
            const count = subjects.filter((s) => s.classLevel === cls).length;
            const isSelected = selectedClass === cls;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => {
                  setSelectedClass(cls);
                  setSelectedStream('All');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0f3a3e] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>{cls}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stream Filter for SS1 - SS3 */}
        {isSeniorSecondary && (
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 px-1.5">Stream:</span>
            {['All', 'Core', 'Science', 'Commercial', 'Humanities'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStream(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  selectedStream === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Class Allocation Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-800 shrink-0" />
          <span className="text-slate-700">
            <strong>{selectedClass}</strong> has <strong>{totalCount}</strong> curriculum subjects registered.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-slate-600">
            Teachers Assigned: <strong className="text-emerald-700">{assignedCount}</strong> / {totalCount}
          </span>
        </div>
      </div>

      {/* Subjects Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {selectedClass} Subjects ({filteredSubjects.length})
            </h2>
            <p className="text-xs text-slate-500">
              {isSeniorSecondary && selectedStream !== 'All' ? `${selectedStream} Stream` : 'All Curriculum Subjects'}
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search subject, stream, or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 font-semibold">Subject</th>
                <th className="py-2.5 px-3 font-semibold">Stream</th>
                <th className="py-2.5 px-3 font-semibold">Department</th>
                <th className="py-2.5 px-3 font-semibold">Weekly Periods</th>
                <th className="py-2.5 px-3 font-semibold">Assigned Teacher</th>
                <th className="py-2.5 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No subjects found matching current filter. Use &quot;Add Subject&quot; to add to this class.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {sub.name}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.stream === 'Science'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : sub.stream === 'Commercial'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : sub.stream === 'Humanities'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-teal-50 text-teal-800 border border-teal-200'
                        }`}
                      >
                        {sub.stream}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-medium">
                      {sub.department}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {sub.periodsPerWeek} periods
                    </td>
                    <td className="py-3 px-3">
                      <select
                        disabled={!canEditCurriculum}
                        value={sub.assignedTeacher || 'Unassigned'}
                        onChange={(e) => handleTeacherChange(sub.id, e.target.value)}
                        className={`text-xs border rounded-xl px-2.5 py-1.5 bg-white font-medium focus:outline-hidden focus:border-slate-800 transition ${
                          !canEditCurriculum ? 'opacity-70 cursor-not-allowed bg-slate-50' : ''
                        } ${
                          sub.assignedTeacher
                            ? 'border-emerald-200 text-emerald-900 bg-emerald-50/40 font-semibold'
                            : 'border-slate-200 text-slate-500 italic'
                        }`}
                      >
                        {availableTeachers.map((t, idx) => (
                          <option key={`${t}-${idx}`} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {canEditCurriculum ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove subject from this class"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Subject */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Subject to {selectedClass}</h3>
                <p className="text-[11px] text-slate-500">Official Nigerian Secondary Curriculum</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Choose from Official Subject List
                </label>
                <select
                  value={selectedSubjectOption}
                  onChange={(e) => {
                    setSelectedSubjectOption(e.target.value);
                    setCustomSubjectName('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                >
                  {ALL_OFFICIAL_SUBJECT_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Or Enter Custom Subject Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Further Mathematics, Yoruba, or Igbo"
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stream</label>
                  <select
                    value={newStream}
                    onChange={(e) => setNewStream(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                  >
                    <option value="Core">Core</option>
                    <option value="Science">Science</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Humanities">Humanities</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Weekly Periods</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newPeriods}
                    onChange={(e) => setNewPeriods(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Teacher</label>
                <select
                  value={newTeacher}
                  onChange={(e) => setNewTeacher(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                >
                  {availableTeachers.map((t, idx) => (
                    <option key={`${t}-${idx}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0f3a3e] hover:bg-[#164e53] text-white font-semibold rounded-xl shadow-xs transition"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
