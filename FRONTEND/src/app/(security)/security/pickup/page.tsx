'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  User,
  Users,
  RefreshCw,
  X,
  KeyRound,
  Delete,
  Check,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface AuthorizedEscort {
  id: string;
  studentId: string;
  fullName: string;
  relationship: string;
  phone: string;
  qrToken?: string;
  pickupPin: string;
  isActive: boolean;
  isGuardian: boolean;
}

interface StudentInfo {
  id: string;
  name: string;
  class: string;
  admissionNo: string;
}

interface PickupMatch {
  student: StudentInfo;
  escort: AuthorizedEscort;
  authorizedEscorts: AuthorizedEscort[];
}

interface PickupLog {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  pickedUpByName: string;
  relationship: string;
  verifiedByName: string;
  verificationMethod: string;
  status: 'cleared' | 'flagged_unauthorized';
  notes: string;
  pickupTime: string;
}

export default function SecurityPickupPage() {
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matchResult, setMatchResult] = useState<PickupMatch | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [logs, setLogs] = useState<PickupLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'flagged'>('all');

  // Action Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Pickup Logs
  const fetchLogs = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch('/api/pickup');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error('Failed to load pickup records:', err);
    } finally {
      setIsLoadingLogs(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(), 20000);
    return () => clearInterval(interval);
  }, []);

  // Execute Lookup
  const performLookup = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setMatchResult(null);

    try {
      const res = await fetch(`/api/pickup?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (res.ok && data.success && data.match) {
        setMatchResult(data.match);
      } else {
        setSearchError(data.message || `No authorized record found matching "${query}".`);
      }
    } catch (err: any) {
      setSearchError('Network error while verifying clearance credentials.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Keypad Press
  const handleKeypadPress = (digit: string) => {
    if (pinDigits.length < 4) {
      const newDigits = [...pinDigits, digit];
      setPinDigits(newDigits);
      if (newDigits.length === 4) {
        const fullPin = newDigits.join('');
        performLookup(fullPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pinDigits.length > 0) {
      setPinDigits(pinDigits.slice(0, -1));
      setMatchResult(null);
      setSearchError(null);
    }
  };

  const handleClearPin = () => {
    setPinDigits([]);
    setMatchResult(null);
    setSearchError(null);
  };

  // Handle Physical Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input, don't capture for keypad
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClearPin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinDigits]);

  // Clear for Departure
  const handleClearDeparture = async () => {
    if (!matchResult) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          studentId: matchResult.student.id,
          studentName: matchResult.student.name,
          studentClass: matchResult.student.class,
          pickedUpByName: matchResult.escort.fullName,
          relationship: matchResult.escort.relationship,
          verifiedByName: 'Security Desk',
          verificationMethod: pinDigits.length === 4 ? 'qr_scan' : 'manual_code',
          notes: '4-Digit PIN verified at dismissal gate.',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Clearance failed');
      }

      showToast(`Departure cleared for ${matchResult.student.name}`);
      handleClearPin();
      setSearchInput('');
      fetchLogs();
    } catch (err: any) {
      showToast(err.message || 'Clearance failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Flag Unauthorized Attempt
  const handleFlagAttempt = async () => {
    if (!matchResult) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'flag',
          studentId: matchResult.student.id,
          studentName: matchResult.student.name,
          studentClass: matchResult.student.class,
          pickedUpByName: matchResult.escort?.fullName || 'Unidentified Person',
          relationship: matchResult.escort?.relationship || 'Unauthorized',
          verifiedByName: 'Security Desk',
          reason: flagReason || 'Identity or authorization mismatch at gate.',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Flagging failed');
      }

      showToast(`Security warning logged and escalated to Principal.`, 'error');
      setIsFlagModalOpen(false);
      setFlagReason('');
      handleClearPin();
      setSearchInput('');
      fetchLogs();
    } catch (err: any) {
      showToast(err.message || 'Flagging failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter logs
  const clearedCount = logs.filter((l) => l.status === 'cleared').length;
  const flaggedCount = logs.filter((l) => l.status === 'flagged_unauthorized').length;
  const displayedLogs = activeTab === 'all' ? logs : logs.filter((l) => l.status === 'flagged_unauthorized');

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/security" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Student Pickup Clearance
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {clearedCount} Cleared Today
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            4-digit PIN verification, authorized guardian escort matching, and cleared student dismissal.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer self-start sm:self-auto disabled:opacity-50 min-h-[44px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-primary' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top Verification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Keypad & Input (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-brand-accent flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">4-Digit Pickup PIN</h2>
                <p className="text-[11px] text-slate-400">Enter guardian or escort pass code</p>
              </div>
            </div>
            {pinDigits.length > 0 && (
              <button
                onClick={handleClearPin}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* 4 PIN Digit Boxes */}
          <div className="flex items-center justify-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const val = pinDigits[idx];
              return (
                <div
                  key={idx}
                  className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold font-mono transition-all ${
                    val
                      ? 'border-brand-accent bg-rose-50/50 text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-300'
                  }`}
                >
                  {val || '•'}
                </div>
              );
            })}
          </div>

          {/* Search Spinner / Error */}
          {isSearching && (
            <div className="text-center text-xs text-slate-500 py-1 flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-primary" />
              <span>Verifying credentials in database...</span>
            </div>
          )}

          {searchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Touch-Friendly Virtual Keypad (Large >= 48px buttons) */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="h-13 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-lg font-bold text-slate-800 transition shadow-xs cursor-pointer select-none"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClearPin}
              className="h-13 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer select-none uppercase tracking-wider"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-13 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-lg font-bold text-slate-800 transition shadow-xs cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-13 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer select-none"
              title="Backspace"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Alternative Search Input */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Or Lookup by Student Admission / Name
            </span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. OAK-2026-001 or Amina Bello"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') performLookup(searchInput);
                  }}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary min-h-[38px]"
                />
              </div>
              <button
                type="button"
                onClick={() => performLookup(searchInput)}
                className="px-3.5 py-2 rounded-lg bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-light cursor-pointer min-h-[38px] transition-colors"
              >
                Find
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Handover Verification Card (7 Cols) */}
        <div className="lg:col-span-7">
          {matchResult ? (
            <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-6 shadow-md space-y-5">
              {/* Header Status */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Handover Authorization Card</h2>
                    <p className="text-[11px] text-emerald-700 font-medium">Valid credentials confirmed in database</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                  Authorized Escort
                </span>
              </div>

              {/* Side-by-Side Student & Escort Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Student Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Student Details
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary text-amber-300 border border-amber-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                      {matchResult.student.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {matchResult.student.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {matchResult.student.admissionNo}
                      </p>
                      <p className="text-[11px] font-bold text-brand-primary mt-0.5">
                        Class: {matchResult.student.class}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Escort Box */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">
                    Presented Escort
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {matchResult.escort.fullName}
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300 mt-0.5">
                        {matchResult.escort.relationship}
                      </span>
                      <p className="text-[11px] text-slate-600 font-mono flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {matchResult.escort.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Authorized Escorts for this Student */}
              {matchResult.authorizedEscorts && matchResult.authorizedEscorts.length > 1 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Other Authorized Escorts for this Student:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.authorizedEscorts
                      .filter((e) => e.fullName !== matchResult.escort.fullName)
                      .map((esc, i) => (
                        <div
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] flex items-center gap-1.5"
                        >
                          <span className="font-semibold">{esc.fullName}</span>
                          <span className="text-slate-400">({esc.relationship})</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Clearance Decision Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearDeparture}
                  disabled={isProcessing}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50 min-h-[48px]"
                >
                  <Check className="w-5 h-5" />
                  <span>{isProcessing ? 'Recording Clearance...' : 'Clear for Departure'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlagModalOpen(true)}
                  disabled={isProcessing}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 min-h-[48px]"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Flag Unauthorized</span>
                </button>
              </div>
            </div>
          ) : searchError ? (
            <div className="h-full min-h-[300px] bg-rose-50/60 border border-rose-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-rose-900">Clearance Verification Failed</h3>
              <p className="text-xs text-rose-700 max-w-sm">
                {searchError}
              </p>
              <p className="text-[11px] text-rose-500">
                Ensure the guardian or escort has provided the correct 4-digit Pickup PIN or verify active enrollment via admission search.
              </p>
            </div>
          ) : (
            <div className="h-full min-h-[300px] bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Student Selected for Handover</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Enter the guardian's 4-digit PIN on the keypad or search by admission number to display the verified handover authorization card.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Flag Unauthorized Attempt Modal */}
      {isFlagModalOpen && matchResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold">Flag Unauthorized Dismissal</h3>
              </div>
              <button
                onClick={() => setIsFlagModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Flagging this event will record a security warning in the gate logs and immediately alert the Principal and Executive Administration.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Reason / Suspicious Circumstance
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Unidentified individual attempting pickup; presented incorrect credentials; guardian did not authorize."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFlagModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFlagAttempt}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Logging...' : 'Confirm Security Warning'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verified Dismissals Activity Log */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Today's Dismissal Clearance Log</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Verified chronological record of cleared gate handovers and security warnings.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Handover Logs ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('flagged')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                activeTab === 'flagged'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Security Warnings ({flaggedCount})
            </button>
          </div>
        </div>

        {isLoadingLogs ? (
          <div className="p-12 text-center">
            <BrandLoader size="md" />
          </div>
        ) : displayedLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'flagged'
                ? 'No Security Warnings Recorded'
                : 'No Student Dismissals Recorded Yet Today'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeTab === 'flagged'
                ? 'All dismissal attempts have been cleared without security incident.'
                : 'Enter a 4-digit PIN on the keypad to verify and clear departures.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Escort Name</th>
                  <th className="px-4 py-3">Relationship</th>
                  <th className="px-4 py-3">Verified By</th>
                  <th className="px-4 py-3">Clearance Time</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedLogs.map((log) => {
                  const isCleared = log.status === 'cleared';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{log.studentName}</span>
                        <span className="text-[11px] text-slate-400">{log.studentClass}</span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {log.pickedUpByName}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {log.relationship}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {log.verifiedByName}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-700">
                        {new Date(log.pickupTime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isCleared
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCleared ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {isCleared ? 'Cleared' : 'Flagged Warning'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
