'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  FolderArchive,
  Search,
  FileText,
  Download,
  Eye,
  ShieldCheck,
  BookOpen,
  X,
  ExternalLink,
} from 'lucide-react';

interface SchoolDocument {
  id: string;
  title: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  status: string;
  version: number;
  tags: string[];
  createdAt: string;
}

export default function TeacherPoliciesPage() {
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectDoc, setInspectDoc] = useState<SchoolDocument | null>(null);

  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Filter to institutional documents and published policies
        const policies = json.data.filter((doc: SchoolDocument) =>
          ['policy', 'official_notice', 'curriculum', 'other'].includes(doc.documentType) &&
          doc.status === 'published'
        );
        setDocuments(policies);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Failed to load policies:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Policies & Handbooks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official operational manuals, safeguarding protocols, and curriculum frameworks published by School Leadership.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search policies & handbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Policy Cards Grid */}
      {filteredDocs.length === 0 ? (
        <Card className="p-12 text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <FolderArchive className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No institutional documents found</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery ? 'No documents match your search criteria.' : 'Official institutional documents published by leadership will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="p-5 border border-slate-200 hover:border-teal-500/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/60">
                    {doc.documentType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">v{doc.version}.0</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-2">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-4">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{doc.fileName}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectDoc(doc)}
                  className="px-3 py-1.5 bg-[#0f3a3e] hover:bg-[#14484d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Inspect Document Modal */}
      {inspectDoc && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setInspectDoc(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="min-w-0 flex-1 pr-3">
                <h2 className="text-base font-bold text-slate-900 truncate">{inspectDoc.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Published Institutional Document &bull; Version {inspectDoc.version}.0</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs text-slate-600">
              <p><strong className="text-slate-800">File Name:</strong> {inspectDoc.fileName}</p>
              <p><strong className="text-slate-800">Format:</strong> {inspectDoc.mimeType}</p>
              <p><strong className="text-slate-800">File Size:</strong> {(inspectDoc.fileSizeBytes / 1024).toFixed(1)} KB</p>
              <p><strong className="text-slate-800">Published Date:</strong> {inspectDoc.createdAt ? new Date(inspectDoc.createdAt).toLocaleDateString('en-GB') : '—'}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
              {inspectDoc.fileUrl && (
                <a
                  href={inspectDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#0f3a3e] hover:bg-[#14484d] text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Document</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
