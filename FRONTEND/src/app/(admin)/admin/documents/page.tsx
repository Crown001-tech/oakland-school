'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  Search,
  FileText,
  Download,
  Filter,
  Eye,
  ExternalLink,
  Printer,
  Receipt,
  FileCheck,
  ShieldCheck,
  BookOpen,
  User,
  CheckCircle2,
  X,
  Upload,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';

export interface SchoolDocument {
  id: string;
  title: string;
  documentType: 'report_card' | 'receipt' | 'admission_letter' | 'query_letter' | 'certificate' | 'policy' | 'official_notice' | 'curriculum' | 'other';
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  associatedStudentId?: string;
  associatedStudentName?: string;
  associatedStaffId?: string;
  associatedStaffName?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: string;
}

export default function DocumentCentrePage() {
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Document Viewer / Preview State
  const [selectedDoc, setSelectedDoc] = useState<SchoolDocument | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Form for new document
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<SchoolDocument['documentType']>('policy');
  const [newDocFileName, setNewDocFileName] = useState('');
  const [newDocPerson, setNewDocPerson] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDataUrl, setUploadDataUrl] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState(0);
  const [uploadMimeType, setUploadMimeType] = useState('application/pdf');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mappedDocs: SchoolDocument[] = json.data.map((d: any) => ({
            ...d,
            associatedStudentName: d.metadata?.associatedPerson || d.associatedStudentName,
          }));
          setDocuments(mappedDocs);
          return;
        }
      }
      setDocuments([]);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setNewDocFileName(file.name);
    setUploadFileSize(file.size);
    setUploadMimeType(file.type || 'application/octet-stream');

    if (!newDocTitle) {
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .trim();
      setNewDocTitle(cleanTitle);
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const getEmbedUrl = (doc: SchoolDocument) => {
    if (doc.id) {
      return `/api/documents/file?id=${encodeURIComponent(doc.id)}`;
    }
    if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
      try {
        const parts = doc.fileUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : (doc.mimeType || 'application/pdf');
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: mimeType });
        return URL.createObjectURL(blob);
      } catch {}
    }
    return doc.fileUrl;
  };

  const handleDownload = async (doc: SchoolDocument) => {
    if (doc.id) {
      const a = document.createElement('a');
      a.href = `/api/documents/file?id=${encodeURIComponent(doc.id)}&download=true`;
      a.download = doc.fileName || `${doc.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Downloading: ${doc.fileName}`);
      return;
    }

    if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
      try {
        const parts = doc.fileUrl.split(',');
        const header = parts[0];
        const base64Data = parts[1];
        const mimeMatch = header.match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : (doc.mimeType || 'application/octet-stream');

        const byteCharacters = atob(base64Data);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const blob = new Blob([byteNumbers], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName || `${doc.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Downloaded: ${doc.fileName}`);
        return;
      } catch (err) {
        console.error('Download error:', err);
      }
    } else if (doc.fileUrl && doc.fileUrl.startsWith('http')) {
      try {
        const res = await fetch(doc.fileUrl);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.fileName || `${doc.title}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast(`Downloaded: ${doc.fileName}`);
          return;
        }
      } catch {
        const a = document.createElement('a');
        a.href = doc.fileUrl;
        a.download = doc.fileName || `${doc.title}.pdf`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`Opening download: ${doc.fileName}`);
        return;
      }
    }

    showToast('Document file is not available for download.');
  };

  const handleOpenViewer = (doc: SchoolDocument) => {
    setSelectedDoc(doc);
    setIsViewOpen(true);
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document from the official repository?')) return;
    try {
      const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        if (selectedDoc?.id === id) {
          setIsViewOpen(false);
          setSelectedDoc(null);
        }
        showToast('Document removed.');
      } else {
        showToast('Failed to delete document.');
      }
    } catch {
      showToast('Network error while deleting document.');
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    if (!selectedFile && !uploadDataUrl && !newDocFileName) {
      showToast('Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);
    const fileName = newDocFileName.trim() || `${newDocTitle.trim().replace(/\s+/g, '_')}.pdf`;

    try {
      let res: Response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', newDocTitle.trim());
        formData.append('documentType', newDocType);
        formData.append('actorRole', 'Principal');
        if (newDocPerson.trim()) {
          formData.append('metadata', JSON.stringify({ associatedPerson: newDocPerson.trim() }));
        }
        res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newDocTitle.trim(),
            documentType: newDocType,
            fileName,
            fileUrl: uploadDataUrl,
            fileSizeBytes: uploadFileSize || 50000,
            mimeType: uploadMimeType || 'application/pdf',
            tags: [newDocType, 'institutional'],
            actorRole: 'Principal',
            metadata: {
              associatedPerson: newDocPerson.trim() || undefined,
            },
          }),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Document "${newDocTitle.trim()}" saved.`);
        setIsUploadOpen(false);
        setNewDocTitle('');
        setNewDocFileName('');
        setNewDocPerson('');
        setSelectedFile(null);
        setUploadDataUrl('');
        setUploadFileSize(0);
        await fetchDocuments();
      } else {
        showToast(data.error || 'Failed to upload document.');
      }
    } catch {
      showToast('Network error while uploading document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (selectedType !== 'all' && doc.documentType !== selectedType) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchFile = doc.fileName.toLowerCase().includes(q);
      const matchStudent = doc.associatedStudentName?.toLowerCase().includes(q);
      const matchTag = doc.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchFile && !matchStudent && !matchTag) return false;
    }
    return true;
  });

  const getDocIcon = (type: SchoolDocument['documentType']) => {
    switch (type) {
      case 'receipt':
        return <Receipt className="w-4 h-4 text-emerald-600" />;
      case 'report_card':
        return <FileCheck className="w-4 h-4 text-purple-600" />;
      case 'policy':
        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
      case 'curriculum':
        return <BookOpen className="w-4 h-4 text-teal-600" />;
      case 'admission_letter':
        return <FileCheck className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '—';
    if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
    return `${Math.round(bytes / 1000)} KB`;
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'policy':
        return 'School Policy';
      case 'curriculum':
        return 'Curriculum';
      case 'report_card':
        return 'Report Card';
      case 'receipt':
        return 'Fee Receipt';
      case 'admission_letter':
        return 'Admission Offer';
      case 'certificate':
        return 'Certificate';
      case 'official_notice':
        return 'Official Notice';
      default:
        return 'Other Document';
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0f3a3e] text-white uppercase tracking-wider">
              Records Archive
            </span>
            <span className="text-xs text-slate-500 font-medium">Official Repository</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <FolderArchive className="w-6 h-6 text-[#0f3a3e]" />
            <span>Document Centre</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Store, archive, and retrieve verified school policies, student records, and curriculum frameworks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="bg-[#0f3a3e] hover:bg-[#134b50] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {/* Quick Category Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Documents</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{documents.length}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">School Policy</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{documents.filter((d) => d.documentType === 'policy').length}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Curriculum</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{documents.filter((d) => d.documentType === 'curriculum').length}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Official Notices</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{documents.filter((d) => d.documentType === 'official_notice').length}</p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, file name, or person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Filter:</span>
          {(['all', 'policy', 'curriculum', 'official_notice', 'report_card', 'receipt', 'admission_letter'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                selectedType === type
                  ? 'bg-[#0f3a3e] text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {type === 'all'
                ? 'All'
                : type === 'official_notice'
                ? 'Notices'
                : getCategoryLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Document Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Associated Person</th>
                <th className="px-4 py-3">File Size</th>
                <th className="px-4 py-3">Date Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <FolderArchive className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No documents in the repository.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Upload school policies, curriculum documents, or official notices using the button above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 max-w-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          {getDocIcon(doc.documentType)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{doc.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{doc.fileName}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {getCategoryLabel(doc.documentType)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {doc.associatedStudentName ? (
                        <div className="flex items-center gap-1.5 text-slate-900">
                          <User className="w-3 h-3 text-teal-600" />
                          <span className="font-semibold">{doc.associatedStudentName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Institutional</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-mono text-[11px]">{formatFileSize(doc.fileSizeBytes)}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          v{doc.version}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenViewer(doc)}
                          className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                          title="View Document"
                        >
                          <Eye className="w-3 h-3 text-teal-600" />
                          <span>View</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                          title="Download Document"
                        >
                          <Download className="w-3 h-3 text-teal-600" />
                          <span>Download</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {isViewOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 relative my-6 text-slate-900 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                  {getDocIcon(selectedDoc.documentType)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{selectedDoc.title}</h3>
                  <p className="text-[10px] text-slate-400 truncate">
                    {selectedDoc.fileName} &bull; {formatFileSize(selectedDoc.fileSizeBytes)} &bull; {getCategoryLabel(selectedDoc.documentType)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <a
                  href={getEmbedUrl(selectedDoc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition text-xs font-semibold flex items-center gap-1"
                  title="Open document in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open</span>
                </a>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleDownload(selectedDoc)}
                  className="bg-[#0f3a3e] hover:bg-[#134b50] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewOpen(false);
                    setSelectedDoc(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Preview Area */}
            <div className="flex-1 overflow-y-auto min-h-[350px] p-2 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-center">
              {/* Render PDF object + iframe */}
              {selectedDoc.mimeType?.includes('pdf') || selectedDoc.fileName.toLowerCase().endsWith('.pdf') ? (
                <object
                  data={getEmbedUrl(selectedDoc)}
                  type="application/pdf"
                  className="w-full h-[580px] rounded-lg border border-slate-200 bg-white"
                >
                  <iframe
                    src={getEmbedUrl(selectedDoc)}
                    title={selectedDoc.title}
                    className="w-full h-[580px] rounded-lg border border-slate-200 bg-white"
                  />
                </object>
              ) : selectedDoc.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(selectedDoc.fileName) ? (
                <div className="p-4 flex items-center justify-center max-h-[580px]">
                  <img
                    src={getEmbedUrl(selectedDoc)}
                    alt={selectedDoc.title}
                    className="max-h-[550px] max-w-full object-contain rounded-lg shadow-xs"
                  />
                </div>
              ) : (
                /* Institutional Certificate / Summary Viewer Sheet */
                <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs max-w-lg w-full text-slate-800 space-y-4">
                  <div className="text-center pb-4 border-b border-slate-200 space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-[#0f3a3e] text-[#d4af37] border-2 border-[#d4af37] mx-auto flex items-center justify-center font-serif text-lg font-bold mb-1">
                      O
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-[#0f3a3e] font-serif">
                      Oakland International School
                    </h4>
                    <p className="text-[9px] font-bold text-[#b3141f] tracking-widest uppercase">
                      Official Document Registry Entry
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Document Title:</span>
                      <span className="font-bold text-slate-900 text-right">{selectedDoc.title}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Category:</span>
                      <span className="font-semibold text-slate-800">{getCategoryLabel(selectedDoc.documentType)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">File Name:</span>
                      <span className="font-mono text-slate-700 text-right text-[11px] truncate max-w-[200px]">{selectedDoc.fileName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">File Size:</span>
                      <span className="font-mono text-slate-700">{formatFileSize(selectedDoc.fileSizeBytes)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Associated Person:</span>
                      <span className="font-semibold text-slate-900">{selectedDoc.associatedStudentName || 'Institutional'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-400">Status:</span>
                      <span className="font-bold text-emerald-700">Verified</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Registered On:</span>
                      <span className="text-slate-700">{new Date(selectedDoc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">Registry ID: {selectedDoc.id}</span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleDownload(selectedDoc)}
                      className="bg-[#0f3a3e] hover:bg-[#134b50] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">Upload Official Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026/2027 Faculty Resumption Guide"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category</label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800 bg-white"
                  >
                    <option value="policy">School Policy</option>
                    <option value="curriculum">Curriculum</option>
                    <option value="report_card">Report Card</option>
                    <option value="receipt">Fee Receipt</option>
                    <option value="admission_letter">Admission Offer</option>
                    <option value="certificate">Certificate</option>
                    <option value="official_notice">Official Notice</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Person (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Chinedu Okafor or Staff member"
                    value={newDocPerson}
                    onChange={(e) => setNewDocPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  File Attachment <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center hover:border-teal-600 transition-colors bg-slate-50/50">
                  <Upload className="w-7 h-7 text-teal-700 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-800">Select file to attach to official record</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, DOCX, XLSX, Images, and Text files</p>
                  <input
                    type="file"
                    className="hidden"
                    id="doc-file-input"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="doc-file-input"
                    className="inline-block mt-3 px-4 py-1.5 bg-[#0f3a3e] hover:bg-[#134b50] text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-xs"
                  >
                    Choose Local File
                  </label>
                  {newDocFileName && (
                    <div className="mt-3 p-2 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-teal-900 truncate">{newDocFileName}</span>
                      <span className="text-[10px] text-teal-700 font-mono shrink-0 ml-2">
                        {formatFileSize(uploadFileSize)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newDocFileName || isSubmitting}
                  className="bg-[#0f3a3e] hover:bg-[#134b50] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Document'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
