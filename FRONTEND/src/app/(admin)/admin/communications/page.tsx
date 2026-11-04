'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  Mail,
  Smartphone,
  MessageSquare,
  CheckCircle2,
  Clock,
  Users,
  Search,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useClassNames } from '@/lib/use-class-names';

interface DeliveryRecord {
  id: string;
  recipientsGroup: string;
  recipientCount: number;
  subject: string;
  sentAt: string;
  status: 'Posted' | 'Scheduled';
}

const PREBUILT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  resumption: {
    subject: 'Term Resumption Notice',
    body: 'Dear Guardians,\n\nWe look forward to welcoming our students back for the new academic term on Monday. Assembly begins promptly at 7:45 AM in complete school uniform.\n\nThank you,\nSchool Management',
  },
  fees: {
    subject: 'School Fees Reminder - First Term',
    body: 'Dear Guardians,\n\nThis is a gentle reminder regarding tuition fees for the first term. Kindly conclude all outstanding settlements to ensure uninterrupted student access to school resources and examinations.\n\nThank you,\nBursary Department',
  },
  pta: {
    subject: 'Notice of PTA General Meeting',
    body: 'Dear Guardians and Staff,\n\nThe termly Parent-Teacher Association (PTA) General Meeting is scheduled for Saturday at 10:00 AM in the school main hall. Your prompt attendance is highly appreciated.\n\nWarm regards,\nPTA Executive Committee',
  },
};

export default function AdminCommunicationsPage() {
  const CLASSES = useClassNames();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // Form State: Who -> What -> Channel -> When -> Send
  const [recipientType, setRecipientType] = useState<'all_parents' | 'all_staff' | 'class' | 'students'>('all_parents');
  const [selectedClass, setSelectedClass] = useState('');
  const [connected, setConnected] = useState<{ sms: boolean; email: boolean; whatsapp: boolean } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('none');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [deliveryTiming, setDeliveryTiming] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState('');

  const [history, setHistory] = useState<DeliveryRecord[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Live Directory Data for Accurate Recipient Counts
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [commRes, studRes, staffRes, msgRes] = await Promise.all([
          fetch('/api/communications'),
          fetch('/api/students'),
          fetch('/api/staff'),
          fetch('/api/messages'),
        ]);

        if (msgRes.ok) {
          const mData = await msgRes.json();
          if (mData.success && mData.data?.connected) setConnected(mData.data.connected);
        }

        if (commRes.ok) {
          const cData = await commRes.json();
          if (cData.success && Array.isArray(cData.history)) {
            setHistory(cData.history);
          }
        }

        if (studRes.ok) {
          const sData = await studRes.json();
          if (sData.success && Array.isArray(sData.data)) {
            setStudents(sData.data);
          }
        }

        if (staffRes.ok) {
          const stData = await staffRes.json();
          const staffList = Array.isArray(stData.data)
            ? stData.data
            : Array.isArray(stData.staff)
            ? stData.staff
            : [];
          setStaff(staffList);
        }

        if (studRes.ok) {
          const sData = await studRes.json();
          const studentList = Array.isArray(sData.data)
            ? sData.data
            : Array.isArray(sData.students)
            ? sData.students
            : [];
          setStudents(studentList);
        }
      } catch {
        // Clean empty fallbacks
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTemplateChange = (key: string) => {
    setSelectedTemplate(key);
    if (key !== 'none' && PREBUILT_TEMPLATES[key]) {
      setSubject(PREBUILT_TEMPLATES[key].subject);
      setMessage(PREBUILT_TEMPLATES[key].body);
    }
  };

  // Resolve dynamic counts strictly from real database counts
  const allParentsCount = students.length;
  const allStaffCount = staff.length;
  const classParentsCount = students.filter((s) => s.class === selectedClass).length;

  const currentRecipientCount =
    recipientType === 'all_parents'
      ? allParentsCount
      : recipientType === 'all_staff'
      ? allStaffCount
      : recipientType === 'class'
      ? classParentsCount
      : allParentsCount;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    if (recipientType === 'class' && !selectedClass) {
      showToast('Choose a class first.');
      return;
    }

    setIsSending(true);

    const recipientGroupName =
      recipientType === 'all_parents'
        ? 'All Guardians'
        : recipientType === 'all_staff'
        ? 'All Staff'
        : `${selectedClass} Guardians`;

    try {
      const res = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientsGroup: recipientGroupName,
          recipientCount: currentRecipientCount,
          audience: recipientType,
          className: recipientType === 'class' ? selectedClass : undefined,
          subject: subject.trim(),
          message: message.trim(),
          deliveryTiming,
        }),
      });

      const data = await res.json();
      if (data.success && data.record) {
        setHistory((prev) => [data.record, ...prev]);
        const queued = Number(data.messages?.queued ?? 0);
        const skipped = Number(data.messages?.skipped ?? 0);
        showToast(
          recipientType === 'all_staff'
            ? `Notice posted to ${recipientGroupName}.`
            : `Notice posted to ${recipientGroupName}. ${queued} message${queued === 1 ? '' : 's'} queued${skipped > 0 ? `, ${skipped} not sent (no number, or opted out)` : ''}.`,
        );
        setSubject('');
        setMessage('');
        setSelectedTemplate('none');
      } else {
        showToast(data.message || 'Failed to dispatch notice.');
      }
    } catch {
      showToast('Network error dispatching notice.');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary text-white uppercase tracking-wider">
            Broadcast System
          </span>
          <span className="text-xs text-slate-500 font-medium">Official Dispatch Hub</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Send className="w-6 h-6 text-brand-primary" />
          <span>School Communications</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Send announcements, term notices, and administrative updates to guardians and staff members.
        </p>
      </div>

      {/* Primary Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('compose')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'compose'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Compose Notice</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Sent Dispatches</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold font-mono">
            {history.length}
          </span>
        </button>
      </div>

      {/* TAB 1: COMPOSE NOTICE */}
      {activeTab === 'compose' && (
        <form onSubmit={handleSendMessage} className="space-y-6">
          {/* Step 1: Target Audience */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-brand-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Select Target Audience
                  </h3>
                  <p className="text-[11px] text-slate-500">Choose which directory recipients receive this notification</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-brand-primary bg-teal-50 px-3 py-1 rounded-full border border-teal-200 shrink-0 self-start sm:self-auto">
                {currentRecipientCount} recipients targeted
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: All Guardians */}
              <button
                type="button"
                onClick={() => setRecipientType('all_parents')}
                className={`w-full flex flex-col items-start justify-start p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                  recipientType === 'all_parents'
                    ? 'border-brand-primary bg-brand-primary text-white shadow-md ring-2 ring-brand-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-900'
                }`}
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${recipientType === 'all_parents' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    recipientType === 'all_parents'
                      ? 'border-white bg-white text-brand-primary'
                      : 'border-slate-300 bg-transparent'
                  }`}>
                    {recipientType === 'all_parents' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="font-bold text-sm leading-tight">All Guardians</div>
                <div className={`text-xs mt-1 font-medium ${recipientType === 'all_parents' ? 'text-teal-100' : 'text-slate-500'}`}>
                  {allParentsCount} registered guardians
                </div>
              </button>

              {/* Card 2: All Staff */}
              <button
                type="button"
                onClick={() => setRecipientType('all_staff')}
                className={`w-full flex flex-col items-start justify-start p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                  recipientType === 'all_staff'
                    ? 'border-brand-primary bg-brand-primary text-white shadow-md ring-2 ring-brand-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-900'
                }`}
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${recipientType === 'all_staff' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    recipientType === 'all_staff'
                      ? 'border-white bg-white text-brand-primary'
                      : 'border-slate-300 bg-transparent'
                  }`}>
                    {recipientType === 'all_staff' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="font-bold text-sm leading-tight">All Staff</div>
                <div className={`text-xs mt-1 font-medium ${recipientType === 'all_staff' ? 'text-teal-100' : 'text-slate-500'}`}>
                  {allStaffCount} staff members
                </div>
              </button>

              {/* Card 3: Specific Class */}
              <button
                type="button"
                onClick={() => setRecipientType('class')}
                className={`w-full flex flex-col items-start justify-start p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                  recipientType === 'class'
                    ? 'border-brand-primary bg-brand-primary text-white shadow-md ring-2 ring-brand-primary/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 text-slate-900'
                }`}
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${recipientType === 'class' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    recipientType === 'class'
                      ? 'border-white bg-white text-brand-primary'
                      : 'border-slate-300 bg-transparent'
                  }`}>
                    {recipientType === 'class' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <div className="font-bold text-sm leading-tight">Specific Class</div>
                <div className={`text-xs mt-1 font-medium ${recipientType === 'class' ? 'text-teal-100' : 'text-slate-500'}`}>
                  {selectedClass ? `${classParentsCount} guardians in ${selectedClass}` : 'Choose a class'}
                </div>
              </button>
            </div>

            {/* Class Pill Selector when Specific Class is active */}
            {recipientType === 'class' && (
              <div className="pt-3 border-t border-slate-100 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Select Class Roster
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Showing enrolled students per class
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CLASSES.map((c) => {
                    const countInClass = students.filter((s) => s.class === c).length;
                    const isSelected = selectedClass === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedClass(c)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span>{c}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {countInClass}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Content & Templates */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-brand-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Message Content
                  </h3>
                  <p className="text-[11px] text-slate-500">Draft your announcement or load a preset template</p>
                </div>
              </div>

              {/* Template Dropdown */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Quick Template:</span>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="min-h-[44px] border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:border-brand-primary bg-white font-semibold text-slate-800 cursor-pointer shadow-2xs"
                >
                  <option value="none">Blank Notice</option>
                  <option value="resumption">Term Resumption</option>
                  <option value="fees">Fees Reminder</option>
                  <option value="pta">PTA General Meeting</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Subject Line <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Term Resumption Notice"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-brand-primary focus:ring-1 focus:ring-brand-primary font-semibold text-slate-900 text-xs shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-800">
                    Message Body <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {message.length} characters
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  placeholder="Type official notification message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-slate-900 text-xs shadow-2xs leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Where the notice appears */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Delivery Channels</h3>
              <p className="text-[11px] text-slate-500">The notice is always posted to each parent's portal. Each parent also gets it by WhatsApp, SMS or email, whichever the school has connected and the parent has not turned off.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between gap-2 min-h-[44px] px-3 rounded-xl border border-emerald-600 bg-emerald-600 text-white font-semibold">
                <span>Parent Portal</span>
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              {([['Email', connected?.email], ['SMS', connected?.sms], ['WhatsApp', connected?.whatsapp]] as const).map(([label, on]) =>
                on ? (
                  <div key={label} className="flex items-center justify-between gap-2 min-h-[44px] px-3 rounded-xl border border-emerald-600 bg-emerald-600 text-white font-semibold">
                    <span>{label}</span>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : (
                  <div key={label} aria-disabled="true" className="flex items-center justify-between gap-2 min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 font-semibold cursor-not-allowed">
                    <span>{label}</span>
                    <span className="text-[10px] font-medium">Not connected yet</span>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-400">
              Dispatches are permanently logged in the official audit ledger.
            </span>

            <Button
              type="submit"
              disabled={isSending}
              className="bg-brand-primary hover:bg-[#134b50] text-white text-xs font-bold px-6 py-3 min-h-[44px] rounded-xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Dispatching...' : 'Dispatch Notice'}</span>
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: SENT DISPATCHES HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              {history.length} Sent Dispatches Recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Sent At</th>
                  <th className="py-2.5 px-4 font-semibold">Recipients</th>
                  <th className="py-2.5 px-4 font-semibold">Subject</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                      No communications dispatched yet. Use &quot;Compose Notice&quot; to send announcements to guardians and staff.
                    </td>
                  </tr>
                ) : (
                  history.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {record.sentAt}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">
                          {record.recipientsGroup}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {record.recipientCount} recipients
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {record.subject}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
