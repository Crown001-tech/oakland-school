'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  FileText,
  Plus,
  Printer,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

export type LetterType =
  | 'Query Letter'
  | 'Termination Letter'
  | 'Meeting Notice'
  | 'Resumption Notice'
  | 'Letter of Commendation'
  | 'Parent Disciplinary Hearing';

export interface OfficialLetter {
  id: string;
  refNo: string;
  type: LetterType;
  recipientName: string;
  recipientRole: string;
  recipientEmail?: string;
  subject: string;
  body: string;
  date: string;
  issuedBy: string;
  signatoryRole: string;
  includeSeal: boolean;
  status: 'Issued' | 'Draft';
}

const TEMPLATES: Record<LetterType, { subject: string; body: string }> = {
  'Query Letter': {
    subject: 'OFFICIAL ADMINISTRATIVE QUERY: UNEXCUSED ABSENCE AND BREACH OF DUTY',
    body: `It has come to the attention of the Office of the Principal that you were absent from your designated teaching responsibilities and morning assembly roll call without prior written authorization or an approved leave of absence.

Such conduct constitutes a breach of institutional staff regulations and compromises the academic continuity of our students.

You are hereby required to respond in writing to this query within forty-eight (48) hours of receipt of this memorandum, stating reasons why disciplinary proceedings should not be instituted against you in accordance with Oakland International School Staff Regulations.

Your written representation should be addressed directly to the Office of the Principal.`,
  },
  'Termination Letter': {
    subject: 'FORMAL NOTICE OF TERMINATION OF EMPLOYMENT CONTRACT',
    body: `Pursuant to the resolution of the Governing Council and directive of the School Proprietor, we regret to inform you that your appointment as a member of staff at Oakland International School is hereby terminated with immediate effect.

You are instructed to immediately hand over all school property in your possession, including student assessment gradebooks, attendance registries, physical keys, and identity credentials, to the Vice Principal.

Your final financial entitlements, including any accrued salary up to your effective disengagement date, will be reconciled and disbursed by the Bursary upon receipt of your completed departmental clearance.

We thank you for your past contributions and wish you success in your future endeavors.`,
  },
  'Meeting Notice': {
    subject: 'NOTICE OF EMERGENCY ACADEMIC FACULTY BOARD MEETING',
    body: `Notice is hereby given that an Emergency Academic Faculty Board Meeting has been scheduled to hold as follows:

Date: Thursday, 1st October 2026
Time: 03:30 PM Prompt
Venue: Main Assembly Hall
Chair: The School Principal

AGENDA ITEMS:
1. Mid-Term Continuous Assessment Collation Review
2. Senior Secondary Curriculum Alignment
3. Examination Laboratory Readiness Inspection
4. Student Disciplinary Oversight and Attendance Patterns
5. Any Other Business

Attendance is compulsory for all full-time and specialist academic teaching staff. Please ensure all grade records are updated prior to the assembly.`,
  },
  'Resumption Notice': {
    subject: 'OFFICIAL NOTICE: TERM RESUMPTION AND CALENDAR ADJUSTMENT',
    body: `The Management of Oakland International School hereby issues this official circular regarding the adjusted academic calendar and term resumption schedule.

Following campus facility upgrades and laboratory infrastructure installations, the official resumption date for all boarding and day students has been adjusted as follows:

• Academic and Administrative Staff Resumption: Monday, 5th October 2026 (08:00 AM)
• Boarding Students Return: Sunday, 11th October 2026 (12:00 PM – 05:00 PM)
• Full Academic Classes Resume: Monday, 12th October 2026 (07:45 AM Prompt)

All class teachers, subject specialists, and administrative personnel are expected to be present for pre-resumption curriculum synchronization. Parents and guardians are advised to ensure all term fees are settled with the Bursary prior to resumption.`,
  },
  'Letter of Commendation': {
    subject: 'LETTER OF OFFICIAL COMMENDATION: OUTSTANDING ACADEMIC DISTINCTION',
    body: `On behalf of the Proprietor, Governing Council, and Academic Staff of Oakland International School, I have the privilege of presenting this official commendation in recognition of your exemplary dedication, teaching excellence, and diligent service.

Your innovative pedagogical methods and exceptional mentorship have resulted in noteworthy academic performance and commendable discipline among our students during the current academic term.

The school leadership values your steadfast commitment to the high standards of Oakland International School. A copy of this letter has been officially deposited in your personnel file.

Please accept our highest congratulations. Keep up the sterling performance!`,
  },
  'Parent Disciplinary Hearing': {
    subject: 'INVITATION: SPECIAL DISCIPLINARY COMMITTEE MEETING',
    body: `The Office of the Principal writes to formally invite you to a Special Disciplinary Committee Meeting regarding your ward's academic conduct and behavioural record.

Meeting Schedule:
Date: Friday, 2nd October 2026
Time: 10:00 AM Prompt
Venue: Office of the Principal, Administrative Wing

We request your presence alongside your ward for an amicable and constructive review of the documented incidents, aimed at establishing corrective guidance and ensuring your child's moral and academic development.

Kindly confirm your availability upon receipt of this official notice.`,
  },
};

export default function AdminLettersPage() {
  const [letters, setLetters] = useState<OfficialLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<OfficialLetter | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [staffDirectory, setStaffDirectory] = useState<Array<{ name: string; role: string; email: string }>>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<LetterType>('Query Letter');
  const [formRecipientType, setFormRecipientType] = useState<'staff' | 'custom'>('staff');
  const [formRecipientName, setFormRecipientName] = useState('');
  const [formRecipientRole, setFormRecipientRole] = useState('');
  const [formRecipientEmail, setFormRecipientEmail] = useState('');
  const [formSubject, setFormSubject] = useState(TEMPLATES['Query Letter'].subject);
  const [formBody, setFormBody] = useState(TEMPLATES['Query Letter'].body);
  const [formRefNo, setFormRefNo] = useState(`OAK/PRIN/QRY/2026/0${Math.floor(10 + Math.random() * 90)}`);
  const [formIncludeSeal, setFormIncludeSeal] = useState(true);
  const principalName = 'Mr Seyi Bankole';

  const loadData = async () => {
    try {
      const [lettersRes, staffRes] = await Promise.all([
        fetch('/api/letters'),
        fetch('/api/staff'),
      ]);

      if (lettersRes.ok) {
        const json = await lettersRes.json();
        if (json.success && Array.isArray(json.data)) {
          setLetters(json.data);
        }
      }

      if (staffRes.ok) {
        const json = await staffRes.json();
        if (json.success && Array.isArray(json.data)) {
          const list = json.data.map((s: any) => ({
            name: s.name,
            role: s.role || 'Staff Member',
            email: s.email || '',
          }));
          setStaffDirectory(list);
          if (list.length > 0 && !formRecipientName) {
            setFormRecipientName(list[0].name);
            setFormRecipientRole(list[0].role);
            setFormRecipientEmail(list[0].email);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load letters or staff directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTemplateChange = (type: LetterType) => {
    setFormType(type);
    setFormSubject(TEMPLATES[type].subject);
    setFormBody(TEMPLATES[type].body);
    const prefix =
      type === 'Query Letter' ? 'QRY' :
      type === 'Termination Letter' ? 'TRM' :
      type === 'Meeting Notice' ? 'MTG' :
      type === 'Resumption Notice' ? 'CIR' :
      type === 'Letter of Commendation' ? 'COM' : 'DSC';
    setFormRefNo(`OAK/PRIN/${prefix}/2026/0${Math.floor(10 + Math.random() * 90)}`);
  };

  const handleSelectStaff = (name: string) => {
    setFormRecipientName(name);
    const match = staffDirectory.find((s) => s.name === name);
    if (match) {
      setFormRecipientRole(match.role);
      setFormRecipientEmail(match.email);
    }
  };

  const handleSaveAndIssueLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRecipientName.trim() || !formSubject.trim() || !formBody.trim()) return;

    try {
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refNo: formRefNo.trim(),
          type: formType,
          recipientName: formRecipientName.trim(),
          recipientRole: formRecipientRole.trim() || 'Designated Recipient',
          recipientEmail: formRecipientEmail.trim(),
          subject: formSubject.trim(),
          body: formBody.trim(),
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          issuedBy: principalName,
          signatoryRole: 'School Principal',
          includeSeal: formIncludeSeal,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const saved: OfficialLetter = json.data;
        setLetters((prev) => [saved, ...prev]);
        setIsEditorOpen(false);
        setSelectedLetter(saved);
        setIsPreviewOpen(true);
        showToast(`Official letter ${saved.refNo} registered in archives.`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to issue letter.');
      }
    } catch {
      showToast('Network error while issuing letter.');
    }
  };

  const handleDeleteLetter = async (id: string, refNo: string) => {
    if (!confirm(`Are you sure you want to remove letter ${refNo} from the official registry?`)) return;

    try {
      const res = await fetch(`/api/letters?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLetters((prev) => prev.filter((l) => l.id !== id));
        showToast(`Removed letter ${refNo} from registry.`);
      } else {
        showToast('Failed to delete letter.');
      }
    } catch {
      showToast('Network error while deleting letter.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadLetter = (ltr: OfficialLetter) => {
    const letterText = `================================================================================
                         OAKLAND INTERNATIONAL SCHOOL
          Administrative Wing, Victoria Island, Lagos, Nigeria
                      OFFICE OF THE SCHOOL PRINCIPAL
================================================================================

REF: ${ltr.refNo}
DATE: ${ltr.date}

TO:
${ltr.recipientName}
${ltr.recipientRole}${ltr.recipientEmail ? `\n${ltr.recipientEmail}` : ''}
Oakland International School, Lagos

SUBJECT:
${ltr.subject}

--------------------------------------------------------------------------------

${ltr.body}

--------------------------------------------------------------------------------

Yours faithfully,

${ltr.issuedBy}
${ltr.signatoryRole}
Oakland International School

[OFFICIAL DIGITAL VERIFICATION SEAL AFFIXED]
================================================================================`;

    const blob = new Blob([letterText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ltr.refNo.replace(/[\/\\]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded letter: ${ltr.refNo}`);
  };

  const getTypeBadgeColor = (type: LetterType) => {
    switch (type) {
      case 'Query Letter':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Termination Letter':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Meeting Notice':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Resumption Notice':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Letter of Commendation':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Parent Disciplinary Hearing':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0f3a3e] text-white uppercase tracking-wider">
              Principal Directorate
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Official Correspondence
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Official Letters
          </h1>
          <p className="text-xs text-slate-500">
            Draft, issue, and archive official correspondence including Query Letters, Disengagement Notices, Staff Assembly Notices, and Holiday Calendars.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            handleTemplateChange('Query Letter');
            if (staffDirectory.length > 0) {
              handleSelectStaff(staffDirectory[0].name);
            }
            setIsEditorOpen(true);
          }}
          className="bg-[#0f3a3e] hover:bg-[#164e53] text-white shadow-xs text-xs font-semibold flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Draft New Letter</span>
        </Button>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Quick Template Launchers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {(Object.keys(TEMPLATES) as LetterType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              handleTemplateChange(type);
              if (staffDirectory.length > 0) {
                handleSelectStaff(staffDirectory[0].name);
              }
              setIsEditorOpen(true);
            }}
            className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#0f3a3e] hover:shadow-xs text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTypeBadgeColor(type)}`}>
                Template
              </span>
            </div>
            <p className="font-bold text-slate-800 text-xs line-clamp-2 group-hover:text-[#0f3a3e]">
              {type}
            </p>
          </button>
        ))}
      </div>

      {/* Official Letters Registry Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Dispatched Letters Registry
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Institutional log of formal letters issued by the School Principal.
            </CardDescription>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            {letters.length} Letters in Registry
          </span>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {letters.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No official letters issued yet.</p>
              <p className="text-[11px]">Click "Draft New Letter" or choose a template above to generate formal correspondence.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0f3a3e] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-4">Ref Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {letters.map((ltr) => (
                  <tr key={ltr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {ltr.refNo}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {ltr.date}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getTypeBadgeColor(ltr.type)}`}>
                        {ltr.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{ltr.recipientName}</p>
                      <p className="text-[10px] text-slate-400">{ltr.recipientRole}</p>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-700 font-medium">
                      {ltr.subject}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {ltr.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLetter(ltr);
                            setIsPreviewOpen(true);
                          }}
                          className="h-7 px-2 text-[10px] font-bold text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadLetter(ltr)}
                          className="h-7 px-2 text-[10px] font-bold text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                          title="Download Letter"
                        >
                          <Download className="w-3 h-3 text-teal-600" />
                          <span>Download</span>
                        </Button>
                        <button
                          type="button"
                          title="Delete Letter"
                          onClick={() => handleDeleteLetter(ltr.id, ltr.refNo)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Drafting Modal / Editor */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative my-8">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0f3a3e] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Draft Official Letter</h2>
                <p className="text-xs text-slate-500">Issued under the Authority of the Office of the Principal</p>
              </div>
            </div>

            <form onSubmit={handleSaveAndIssueLetter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Letter Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => handleTemplateChange(e.target.value as LetterType)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800"
                  >
                    {(Object.keys(TEMPLATES) as LetterType[]).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Reference Number
                  </label>
                  <Input
                    required
                    value={formRefNo}
                    onChange={(e) => setFormRefNo(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Recipient Selection */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Addressed Recipient:</span>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="recipType"
                        checked={formRecipientType === 'staff'}
                        onChange={() => setFormRecipientType('staff')}
                        className="text-teal-600"
                      />
                      <span>From Staff Directory</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="recipType"
                        checked={formRecipientType === 'custom'}
                        onChange={() => setFormRecipientType('custom')}
                        className="text-teal-600"
                      />
                      <span>Custom Recipient</span>
                    </label>
                  </div>
                </div>

                {formRecipientType === 'staff' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Staff Member</label>
                      <select
                        value={formRecipientName}
                        onChange={(e) => handleSelectStaff(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-semibold"
                      >
                        {staffDirectory.map((s) => (
                          <option key={s.name} value={s.name}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Role</label>
                      <Input
                        value={formRecipientRole}
                        onChange={(e) => setFormRecipientRole(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Recipient Name</label>
                      <Input
                        required
                        placeholder="e.g. Chief Emeka Okafor, PTA Council"
                        value={formRecipientName}
                        onChange={(e) => setFormRecipientName(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Relationship</label>
                      <Input
                        placeholder="e.g. Parents of JSS 2 Student"
                        value={formRecipientRole}
                        onChange={(e) => setFormRecipientRole(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Line <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Body of Letter <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={8}
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  className="w-full text-xs font-serif leading-relaxed border border-slate-300 rounded-lg p-3 bg-white text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIncludeSeal}
                    onChange={(e) => setFormIncludeSeal(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600"
                  />
                  <span>Affix Principal Digital Verification Stamp</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditorOpen(false)}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-[#0f3a3e] hover:bg-[#164e53] text-white cursor-pointer"
                  >
                    Issue Letter
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Letterhead Printable Modal */}
      {isPreviewOpen && selectedLetter && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-10 shadow-2xl border border-slate-300 relative my-6 text-slate-900">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 no-print">
              <span className="text-xs font-bold text-slate-500">
                Letterhead Preview &bull; {selectedLetter.refNo}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadLetter(selectedLetter)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-600" />
                  <span>Download Letter</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePrint}
                  className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Letter</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Formal Institutional Letterhead Sheet */}
            <div className="border border-slate-300 p-8 sm:p-12 rounded-xl shadow-xs bg-white text-slate-900 space-y-6 print:border-none print:shadow-none print:p-0">
              {/* Header Crest & Titles */}
              <div className="text-center pb-6 border-b-2 border-[#0f3a3e] space-y-1">
                <div className="w-12 h-12 rounded-xl bg-[#0f3a3e] text-[#d4af37] border-2 border-[#d4af37] mx-auto flex items-center justify-center font-serif text-2xl font-bold mb-2">
                  O
                </div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-[0.18em] text-[#0f3a3e] font-serif">
                  Oakland International School
                </h1>
                <p className="text-[11px] font-bold text-[#b3141f] tracking-widest uppercase">
                  Per Ardua Ad Astra &bull; Excellence &bull; Integrity &bull; Leadership
                </p>
                <p className="text-[10px] text-slate-500">
                  Administrative Wing, Victoria Island, Lagos, Nigeria &bull; Office of the Principal
                </p>
              </div>

              {/* Reference & Date Bar */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-2 border-b border-slate-100 pb-3">
                <p>REF: <span className="font-mono text-[#0f3a3e]">{selectedLetter.refNo}</span></p>
                <p>DATE: <span className="font-mono">{selectedLetter.date}</span></p>
              </div>

              {/* Addressee Block */}
              <div className="text-xs space-y-0.5 text-slate-800">
                <p className="text-slate-500 font-semibold">To:</p>
                <p className="font-bold text-sm text-slate-900">{selectedLetter.recipientName}</p>
                <p className="text-slate-600 font-medium">{selectedLetter.recipientRole}</p>
                {selectedLetter.recipientEmail && (
                  <p className="text-slate-400 font-mono text-[11px]">{selectedLetter.recipientEmail}</p>
                )}
                <p className="text-slate-600">Oakland International School, Lagos</p>
              </div>

              {/* Subject Title */}
              <div className="pt-2">
                <p className="text-xs font-extrabold text-slate-900 tracking-wide uppercase border-b border-slate-900 pb-1 inline-block">
                  {selectedLetter.subject}
                </p>
              </div>

              {/* Body */}
              <div className="text-xs font-serif leading-relaxed text-slate-800 space-y-3 whitespace-pre-line text-justify">
                {selectedLetter.body}
              </div>

              {/* Sign-off & Stamp */}
              <div className="pt-8 flex items-end justify-between border-t border-slate-200">
                <div className="space-y-1">
                  <p className="text-[11px] italic text-slate-500">Yours faithfully,</p>
                  <div className="font-serif italic font-bold text-[#0f3a3e] text-base pt-2">
                    {selectedLetter.issuedBy}
                  </div>
                  <p className="font-bold text-xs text-slate-900">{selectedLetter.issuedBy}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">{selectedLetter.signatoryRole}</p>
                  <p className="text-[9.5px] text-slate-400">Oakland International School</p>
                </div>

                {selectedLetter.includeSeal && (
                  <div className="border-2 border-dashed border-teal-800/40 rounded-xl p-3 text-center bg-teal-50/30">
                    <p className="text-[9px] font-black uppercase text-teal-900 tracking-widest">Office of the Principal</p>
                    <p className="text-[11px] font-bold text-[#0f3a3e] font-serif">VERIFIED DIGITAL SEAL</p>
                    <p className="text-[8px] font-mono text-teal-700">Digital Directorate Seal</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
