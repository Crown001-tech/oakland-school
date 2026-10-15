'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Send,
  Users,
  CheckCircle2,
  Mail,
  Clock,
  Trash2,
  Eye,
  Megaphone,
  Radio,
  FileText,
  Check,
  AlertCircle,
} from 'lucide-react';

export interface StaffBroadcast {
  id: string;
  title: string;
  message: string;
  audience: 'All Staff' | 'Teachers' | 'Administration' | 'Support Staff';
  priority: 'General Announcement' | 'Important Notice';
  channels: string[];
  dispatchedAt: string;
  senderName: string;
}

export default function ProprietorBroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<StaffBroadcast[]>([]);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Form State
  const [audience, setAudience] = useState<StaffBroadcast['audience']>('All Staff');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<StaffBroadcast['priority']>('General Announcement');
  const [channels, setChannels] = useState<string[]>(['Staff Portal Dashboard', 'Official Staff Email']);
  const [actualStaff, setActualStaff] = useState<any[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchBroadcasts = async () => {
    try {
      const [bcRes, stfRes] = await Promise.all([
        fetch('/api/staff/broadcasts').then((r) => r.json()),
        fetch('/api/staff').then((r) => r.json()),
      ]);

      if (bcRes.success && Array.isArray(bcRes.data)) {
        setBroadcasts(bcRes.data);
      }
      if (stfRes.success && Array.isArray(stfRes.data)) {
        setActualStaff(stfRes.data);
      }
    } catch (err) {
      console.error('Failed to load broadcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const getRecipientEstimate = (aud: StaffBroadcast['audience']) => {
    if (actualStaff.length === 0) return 0;
    switch (aud) {
      case 'All Staff':
        return actualStaff.length;
      case 'Teachers':
        return actualStaff.filter((s) => (s.role || '').toLowerCase().includes('teacher')).length;
      case 'Administration':
        return actualStaff.filter((s) => (s.role || '').toLowerCase().includes('admin') || (s.role || '').toLowerCase().includes('principal')).length;
      case 'Support Staff':
        return actualStaff.filter((s) => (s.role || '').toLowerCase().includes('bursar') || (s.role || '').toLowerCase().includes('non-teaching')).length;
    }
  };

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Please enter a title and message.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/staff/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
          priority,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setTitle('');
        setMessage('');
        setActiveTab('history');
        showToast(`Announcement dispatched to ${getRecipientEstimate(audience)} staff members.`);
        fetchBroadcasts();
      } else {
        alert(json.message || 'Failed to dispatch broadcast.');
      }
    } catch {
      alert('Network error while dispatching broadcast.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!confirm('Are you sure you want to remove this broadcast?')) return;
    try {
      const res = await fetch(`/api/staff/broadcasts?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Broadcast removed successfully.');
        fetchBroadcasts();
      } else {
        alert(json.message || 'Failed to delete broadcast.');
      }
    } catch {
      alert('Network error deleting broadcast.');
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Staff Broadcast
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch official notices and communications to teachers, administration, and support staff.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'compose' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Compose Notice
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Dispatch History ({broadcasts.length})
          </button>
        </div>
      </div>

      {/* COMPOSE TAB */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 border-slate-200/80 space-y-5">
            <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['All Staff', 'Teachers', 'Administration', 'Support Staff'] as const).map((aud) => (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => setAudience(aud)}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition cursor-pointer ${
                        audience === aud
                          ? 'border-[#0f3a3e] bg-[#0f3a3e] text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {aud}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notice Priority
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['General Announcement', 'Important Notice'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition cursor-pointer ${
                        priority === p
                          ? p === 'Important Notice'
                            ? 'border-amber-600 bg-amber-500 text-white'
                            : 'border-[#0f3a3e] bg-[#0f3a3e] text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notice Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Staff Academic Assembly & Resumption Directives"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-700 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Message Content *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Enter full notice body to be communicated to staff..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-700 text-xs"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSending}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  className="bg-[#0f3a3e] hover:bg-[#164e53] text-white text-xs font-semibold px-5"
                >
                  {isSending ? 'Dispatching Notice...' : 'Dispatch Announcement'}
                </Button>
              </div>
            </form>
          </Card>

          {/* Audience Preview Card */}
          <div className="space-y-4">
            <Card className="p-5 border-slate-200/80 space-y-4 bg-slate-50/50">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Users className="w-4 h-4 text-[#0f3a3e]" />
                <h3 className="text-xs font-bold text-slate-900">Delivery Overview</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Target Group</span>
                  <span className="font-semibold text-slate-900">{audience}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Estimated Recipients</span>
                  <span className="font-bold text-[#0f3a3e]">
                    {getRecipientEstimate(audience)} Staff
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Notice Category</span>
                  <span className="font-semibold text-slate-900">{priority}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {broadcasts.length === 0 ? (
            <Card className="p-16 text-center space-y-3 border-dashed border-slate-300">
              <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Broadcasts Dispatched</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No official communications have been published yet. Click &quot;Compose Notice&quot; to send an announcement.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {broadcasts.map((b) => (
                <Card key={b.id} className="p-5 border-slate-200 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={b.priority === 'Important Notice' ? 'amber' : 'teal'}
                          size="sm"
                        >
                          {b.priority}
                        </Badge>
                        <span className="text-[11px] font-semibold text-slate-500">
                          Audience: {b.audience}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{b.title}</h3>
                    </div>

                    <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                      {b.dispatchedAt}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    {b.message}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Sender: {b.senderName} &bull; Channels: Portal Dashboard &bull; Email</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteBroadcast(b.id)}
                      className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
