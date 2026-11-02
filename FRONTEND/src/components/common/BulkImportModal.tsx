'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, Download, CheckCircle2, AlertTriangle, X, FileSpreadsheet, Trash2, Sparkles } from 'lucide-react';
import { useSubjectNames } from '@/lib/use-subject-names';
import { useClassNames } from '@/lib/use-class-names';
import {
  checkClassRows,
  checkStaffRows,
  checkStudentRows,
  parseDelimited,
  tableFromCells,
  type CheckedRows,
  type ClassImportRow,
  type StaffImportRow,
  type StudentImportRow,
  type Table,
} from '@/lib/import-rows';

export type ImportType = 'students' | 'staff' | 'classes';

export type ParsedStudentRow = StudentImportRow;
export type ParsedStaffRow = StaffImportRow;
export type ParsedClassRow = ClassImportRow;

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importType: ImportType;
  onImportComplete: (records: any[]) => void;
}

const TEMPLATES: Record<ImportType, { header: string; file: string; hint: string; title: string; unit: string; single: string }> = {
  students: {
    header: 'Full Name,Gender,Class,Admission No,Parent Name,Parent Phone,Parent Email\n',
    file: 'Students_Import_Template.csv',
    hint: 'Full Name, Gender, Class, Admission No, Parent Name, Parent Phone, Parent Email',
    title: 'Import Students',
    unit: 'students',
    single: 'student',
  },
  staff: {
    header: 'Full Name,Role,Department,Assigned Class,Classes Taught,Subject,Email,Phone\n',
    file: 'Staff_Import_Template.csv',
    hint: 'Full Name, Role, Department, Assigned Class, Classes Taught, Subject, Email, Phone',
    title: 'Import Staff',
    unit: 'staff',
    single: 'staff member',
  },
  classes: {
    header: 'Level,Arm,Capacity,Tuition\n',
    file: 'Classes_Import_Template.csv',
    hint: 'Level, Arm, Capacity, Tuition (Arm, Capacity and Tuition can be left empty)',
    title: 'Import Classes',
    unit: 'classes',
    single: 'class',
  },
};

/** Reads the first sheet of an Excel file into rows of text. */
async function readWorkbook(file: File): Promise<string[][]> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const text = (v: unknown): string => {
    if (v == null) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'object') {
      const o = v as { text?: string; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
      if (o.richText) return o.richText.map((r) => r.text).join('');
      if (o.result !== undefined) return text(o.result);
      if (o.text) return o.text;
      return '';
    }
    return String(v).trim();
  };
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cells[col - 1] = text(cell.value);
    });
    rows.push(Array.from(cells, (c) => c ?? ''));
  });
  return rows;
}

export function BulkImportModal({ isOpen, onClose, importType, onImportComplete }: BulkImportModalProps) {
  const subjects = useSubjectNames();
  const classes = useClassNames();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [table, setTable] = useState<Table | null>(null);
  const [fileError, setFileError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [existingAdmissionNos, setExistingAdmissionNos] = useState<string[]>([]);
  const [existingEmails, setExistingEmails] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // What the school already holds, so duplicates are caught before anything is saved
  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    if (importType === 'students') {
      fetch('/api/students')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (live && j?.success && Array.isArray(j.data)) {
            setExistingAdmissionNos(j.data.map((s: any) => s.admissionNo || s.admissionNumber || '').filter(Boolean));
          }
        })
        .catch(() => {});
    } else if (importType === 'staff') {
      fetch('/api/staff')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (live && j?.success && Array.isArray(j.data)) setExistingEmails(j.data.map((s: any) => s.email || '').filter(Boolean));
        })
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, [isOpen, importType]);

  if (!isOpen) return null;

  const t = TEMPLATES[importType];
  const ctx = { classes, subjects, existingAdmissionNos, existingEmails };

  let checked: CheckedRows<any> | null = null;
  if (table && table.rows.length > 0) {
    checked =
      importType === 'students' ? checkStudentRows(table, ctx) : importType === 'staff' ? checkStaffRows(table, ctx) : checkClassRows(table, ctx);
  }
  const classesMissing = importType !== 'classes' && classes.length === 0;

  const reset = () => {
    setTable(null);
    setFileName(null);
    setPastedText('');
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([t.header], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', t.file);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const showTable = (next: Table) => {
    if (next.headers.length === 0 || next.rows.length === 0) {
      setTable(null);
      setFileError('The file needs a header row and at least one record.');
      return;
    }
    setFileError('');
    setTable(next);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      if (/\.xlsx$/i.test(file.name)) {
        showTable(tableFromCells(await readWorkbook(file)));
      } else if (/\.xls$/i.test(file.name)) {
        setTable(null);
        setFileError('Old .xls files cannot be read. Save the sheet as .xlsx or .csv and upload that.');
      } else {
        showTable(parseDelimited(await file.text()));
      }
    } catch {
      setTable(null);
      setFileError('That file could not be read. Check that it is a spreadsheet or CSV.');
    }
  };

  const handleCommitImport = () => {
    if (!checked || checked.valid.length === 0) return;
    setIsProcessing(true);
    onImportComplete(checked.valid);
    setIsProcessing(false);
    reset();
    onClose();
  };

  const issueCount = checked?.issues.length ?? 0;
  const validCount = checked?.valid.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{t.title}</h2>
            <p className="text-xs text-slate-500">
              Upload a spreadsheet or CSV. Every row is checked before anything is saved, and rows with problems are left out.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {classesMissing && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
            This school has no classes yet. Add the classes first, then import {t.unit}.
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            {(['upload', 'paste'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 min-h-[44px] sm:min-h-0 sm:py-1.5 rounded-lg font-semibold transition ${
                  activeTab === tab
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab === 'upload' ? 'Upload File' : 'Paste Text'}
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDownloadTemplate}
            className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-white flex items-center gap-1.5 min-h-[44px] sm:min-h-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </Button>
        </div>

        {activeTab === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-brand-primary bg-slate-50/50 rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-800">{fileName ?? 'Click to select a file'}</p>
            <p className="text-[11px] text-slate-400">Excel (.xlsx), CSV or tab-separated text</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
          </div>
        )}

        {activeTab === 'paste' && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">Paste rows copied from a spreadsheet. The first row must be the column names.</label>
            <textarea
              rows={5}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={t.hint}
              className="w-full p-3 text-xs font-mono border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-600 bg-slate-50"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => pastedText.trim() && showTable(parseDelimited(pastedText))}
              className="bg-brand-primary text-white text-xs font-semibold min-h-[44px] sm:min-h-0"
            >
              Check Rows
            </Button>
          </div>
        )}

        {fileError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}

        {checked && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs gap-3">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className={`w-4 h-4 ${validCount > 0 ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>
                  {validCount} of {checked.total} rows ready
                  {issueCount > 0 ? `, ${issueCount} with problems` : ''}
                </span>
              </span>
              <button type="button" onClick={reset} className="text-slate-400 hover:text-rose-600 text-[11px] font-medium flex items-center gap-1 min-h-[44px] sm:min-h-0">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>

            {issueCount > 0 && (
              <div className="border border-rose-200 bg-rose-50/50 rounded-xl max-h-44 overflow-y-auto divide-y divide-rose-100">
                {checked.issues.map((i) => (
                  <div key={i.row} className="px-3 py-2 text-[11px] text-rose-900">
                    <span className="font-bold">Row {i.row}:</span> {i.messages.join(' ')}
                  </div>
                ))}
              </div>
            )}

            {validCount > 0 && (
              <div className="border border-slate-200 rounded-xl max-h-48 overflow-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">{importType === 'students' ? 'Class' : importType === 'staff' ? 'Role' : 'Capacity'}</th>
                      {importType !== 'classes' && <th className="py-2 px-3">{importType === 'students' ? 'Guardian' : 'Email'}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {checked.valid.slice(0, 10).map((r, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-3 font-bold text-slate-900">{r.fullName ?? r.name}</td>
                        <td className="py-1.5 px-3 text-slate-700">{r.class ?? r.role ?? r.capacity ?? '—'}</td>
                        {importType !== 'classes' && <td className="py-1.5 px-3 text-slate-500">{r.guardianName ?? r.email ?? '—'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validCount > 10 && <p className="text-center py-2 text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">and {validCount - 10} more</p>}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs border-slate-200 text-slate-700 min-h-[44px] sm:min-h-0">
            Cancel
          </Button>
          <Button
            type="button"
            disabled={validCount === 0 || isProcessing || classesMissing}
            onClick={handleCommitImport}
            className="bg-brand-primary text-white text-xs font-semibold flex items-center gap-1.5 min-h-[44px] sm:min-h-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{validCount > 0 ? `Import ${validCount} ${validCount === 1 ? t.single : t.unit}` : 'Import'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
