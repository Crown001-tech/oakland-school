'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  FileText,
  BookOpen,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Download,
  CheckCircle2,
  X,
  Layers,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface LearningMaterial {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
  externalLink: string;
  createdAt: string;
  className: string;
  classId: string | null;
  subjectName: string;
  subjectCode: string;
  subjectId: string | null;
  teacherName: string;
}

export default function TeacherMaterialsPage() {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; code: string }[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);

  // Filters
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Material Form
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formFileType, setFormFileType] = useState('PDF');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formExternalLink, setFormExternalLink] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      const [matRes, meRes, subRes] = await Promise.all([
        fetch('/api/materials').then((r) => r.json()).catch(() => ({ materials: [] })),
        fetch('/api/auth/me').then((r) => r.json()).catch(() => ({})),
        fetch('/api/subjects').then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (matRes?.materials && Array.isArray(matRes.materials)) {
        setMaterials(matRes.materials);
      }

      if (meRes?.authenticated && meRes.profile) {
        setTeacherProfile(meRes.profile);
      }

      if (subRes?.data && Array.isArray(subRes.data)) {
        setSubjects(subRes.data.map((s: any) => ({ id: s.id, name: s.name, code: s.code })));
      }

      // Fetch classes
      try {
        const clsRes = await fetch('/api/classes').then((r) => r.json()).catch(() => ({ data: [] }));
        if (clsRes?.data && Array.isArray(clsRes.data)) {
          setClasses(clsRes.data.map((c: any) => ({ id: c.id, name: c.name })));
        } else {
          setClasses([]);
        }
      } catch {}
    } catch (err) {
      console.error('Failed to load materials data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formClassId || !formSubjectId) {
      alert('Please fill out the Title, Class, and Subject fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        classId: formClassId,
        subjectId: formSubjectId,
        teacherId: teacherProfile?.id || null,
        fileType: formFileType,
        fileUrl: formFileUrl.trim() || formExternalLink.trim() || '',
        externalLink: formExternalLink.trim(),
        fileSizeBytes: 0,
      };

      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('Learning material published to student portal successfully.');
        setShowUploadModal(false);
        setFormTitle('');
        setFormDescription('');
        setFormFileUrl('');
        setFormExternalLink('');
        await loadData();
      } else {
        alert(json.message || 'Failed to upload material.');
      }
    } catch {
      alert('Network error while saving learning material.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? Students will no longer see this resource.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/materials?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`"${title}" removed from curriculum materials.`);
        await loadData();
      } else {
        alert(json.message || 'Failed to remove material.');
      }
    } catch {
      alert('Network error removing material.');
    }
  };

  // Filtered List
  const filteredMaterials = materials.filter((m) => {
    const matchesClass = selectedClass === 'All' || m.className === selectedClass || (m.className || '').includes(selectedClass);
    const matchesSubject = selectedSubject === 'All' || m.subjectName === selectedSubject;
    const matchesSearch =
      (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesClass && matchesSubject && matchesSearch;
  });

  const distinctClassNames = Array.from(new Set(materials.map((m) => m.className).filter(Boolean)));
  const distinctSubjectNames = Array.from(new Set(materials.map((m) => m.subjectName).filter(Boolean)));

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#0f3a3e] text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Learning Materials</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload and manage lecture notes, curriculum guides, and supplementary resources for your classes.
          </p>
        </div>

        <Button
          onClick={() => {
            if (classes.length > 0 && !formClassId) setFormClassId(classes[0].id);
            if (subjects.length > 0 && !formSubjectId) setFormSubjectId(subjects[0].id);
            setShowUploadModal(true);
          }}
          className="bg-[#0f3a3e] hover:bg-[#14474d] text-white text-xs font-bold shadow-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Material</span>
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Resources
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">
                {materials.length}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Published to students</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-100">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Active Classes
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">
                {distinctClassNames.length}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Classes with study packs</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center border border-indigo-100">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Curriculum Subjects
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">
                {distinctSubjectNames.length}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Subjects with materials</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold shrink-0">Filter:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 text-xs focus:outline-none"
          >
            <option value="All">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 text-xs focus:outline-none max-w-[200px]"
          >
            <option value="All">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search material title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs h-9 pl-8 pr-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-800"
          />
        </div>
      </div>

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <Card className="border-slate-200 shadow-xs bg-white p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No Learning Materials Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No lecture notes or study packs uploaded matching your current filter. Click &quot;Upload Material&quot; to publish notes for your students.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs p-5 transition flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-teal-50 border border-teal-200 text-teal-800">
                      {mat.className}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 border border-slate-200 text-slate-700">
                      {mat.subjectCode || mat.subjectName}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {mat.fileType}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-900 transition leading-snug">
                    {mat.title}
                  </h3>
                  {mat.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {mat.description}
                    </p>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(mat.createdAt).toLocaleDateString()}
                  </span>
                  <span>&bull;</span>
                  <span>{mat.teacherName}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {mat.externalLink ? (
                    <a
                      href={mat.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Link</span>
                    </a>
                  ) : (
                    <a
                      href={mat.fileUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteMaterial(mat.id, mat.title)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                  title="Remove Material"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Material Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-white shadow-2xl border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Learning Material</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish notes, slides, or study documents to the student portal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Material Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Photosynthesis and Plant Nutrition"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Class <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Format Type
                </label>
                <select
                  value={formFileType}
                  onChange={(e) => setFormFileType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none"
                >
                  <option value="PDF">PDF Document</option>
                  <option value="DOCX">Word Document (.docx)</option>
                  <option value="SLIDES">Presentation Slides</option>
                  <option value="LINK">External Web Link</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description / Study Guidelines
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline key areas scholars should read prior to lecture..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Document URL / Resource Link
                </label>
                <input
                  type="url"
                  placeholder="https://... (or leave blank to generate school link)"
                  value={formExternalLink}
                  onChange={(e) => setFormExternalLink(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmitting}
                  className="bg-[#0f3a3e] hover:bg-[#14474d] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Publish Material
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
