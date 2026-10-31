'use client';

import React, { useState, useEffect } from 'react';
import { useActiveChild } from '@/context/ParentContext';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  UserCheck,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

export default function ParentPickupPage() {
  const { activeChild, parent } = useActiveChild();
  const [pickupData, setPickupData] = useState<any | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [escortName, setEscortName] = useState('');
  const [escortPhone, setEscortPhone] = useState('');
  const [escortRelation, setEscortRelation] = useState('Relative');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addMessage, setAddMessage] = useState<string | null>(null);

  const [movements, setMovements] = useState<any[]>([]);

  const loadPickupData = async () => {
    try {
      const mvRes = await fetch(`/api/security/movement?studentId=${encodeURIComponent(activeChild?.id || '')}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (mvRes?.success && activeChild?.id) setMovements(mvRes.movements || []);
      const res = await fetch('/api/pickup');
      const data = await res.json();
      if (data && data.success) {
        setPickupData(data);
      }
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPickupData();
  }, [activeChild?.id]);

  // Find escorts for active student
  const activeEscorts = React.useMemo(() => {
    if (!pickupData || !activeChild) return [];
    return (pickupData.escorts || []).filter(
      (e: any) => e.studentId === activeChild.id || e.studentName === activeChild.name
    );
  }, [pickupData, activeChild]);

  const activeMovements = React.useMemo(() => {
    if (!activeChild) return [];
    return movements.filter((m: any) => m.studentId === activeChild.id);
  }, [movements, activeChild]);

  // Find dismissal logs for active student
  const activeLogs = React.useMemo(() => {
    if (!pickupData || !activeChild) return [];
    return (pickupData.logs || []).filter(
      (l: any) => l.studentId === activeChild.id || l.studentName === activeChild.name
    );
  }, [pickupData, activeChild]);

  // Guardian's active 4-digit PIN (strictly from DB, never hardcoded)
  const primaryPin = React.useMemo(() => {
    const guardianEscort = activeEscorts.find((e: any) => e.isGuardian);
    if (guardianEscort && guardianEscort.pickupPin && guardianEscort.pickupPin !== '—') {
      return guardianEscort.pickupPin;
    }
    const anyEscort = activeEscorts.find((e: any) => e.pickupPin && e.pickupPin !== '—');
    if (anyEscort && anyEscort.pickupPin && anyEscort.pickupPin !== '—') {
      return anyEscort.pickupPin;
    }
    return null;
  }, [activeEscorts]);

  const handleCopyPin = () => {
    if (primaryPin) {
      navigator.clipboard.writeText(primaryPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleAddEscort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild || !escortName.trim() || !escortPhone.trim()) return;

    setIsSubmitting(true);
    setAddMessage(null);

    try {
      const res = await fetch('/api/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_escort',
          studentId: activeChild.id,
          fullName: escortName.trim(),
          phone: escortPhone.trim(),
          relationship: escortRelation,
        }),
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        setAddMessage(`Authorized escort registered with clearance PIN ${data.escort?.pickupPin || ''}`);
        setEscortName('');
        setEscortPhone('');
        loadPickupData();
        setTimeout(() => {
          setIsAddModalOpen(false);
          setAddMessage(null);
        }, 2000);
      } else {
        setAddMessage(data.message || 'Registration failed.');
      }
    } catch {
      setIsSubmitting(false);
      setAddMessage('Failed to register escort. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <BrandLoader />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Gate Dismissal
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            4-digit authorization security codes and authorized escorts for {activeChild?.name || 'Selected Student'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAddModalOpen(true);
            setAddMessage(null);
          }}
          className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5 self-start"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Authorized Escort</span>
        </button>
      </div>

      {/* Security PIN Hero Card */}
      <div className="bg-linear-to-br from-brand-primary via-[#144449] to-[#0a272a] rounded-2xl p-6 sm:p-8 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> Gate Dismissal Authorization
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Official 4-Digit Pickup PIN
            </h2>
            <p className="text-xs text-slate-200 max-w-lg leading-relaxed">
              Present this confidential code or share it with your registered escort during afternoon gate dismissals. Gate security confirms this code prior to release.
            </p>
          </div>

          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 flex items-center gap-4 self-start sm:self-auto">
            <div className="text-center">
              <span className="text-[10px] text-slate-300 block uppercase font-bold tracking-wider mb-1">
                Authorized PIN
              </span>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-amber-300">
                {showPin ? (primaryPin || '—') : '••••'}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-l border-white/15 pl-3">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title={showPin ? 'Hide PIN' : 'Reveal PIN'}
                aria-label={showPin ? 'Hide PIN' : 'Reveal PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleCopyPin}
                className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Copy PIN"
                aria-label="Copy PIN"
              >
                {copiedPin ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Authorized Escorts List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-900">
              Registered Authorized Escorts
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {activeEscorts.length} Authorized Person(s)
          </span>
        </div>

        {activeEscorts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 rounded-xl bg-slate-50">
            No additional escorts registered. Only the primary guardian is currently authorized for gate dismissal.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEscorts.map((escort: any, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {escort.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {escort.relationship}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                    Cleared
                  </span>
                </div>

                <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Phone: <strong className="text-slate-800">{escort.phone}</strong></span>
                  <span className="font-mono text-brand-primary font-bold">PIN: {escort.pickupPin}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Gate Dismissals */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-900">
              Recent Gate Dismissal Logs
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {activeLogs.length} Verified Log(s)
          </span>
        </div>

        {activeLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 rounded-xl bg-slate-50">
            No gate dismissals recorded today for {activeChild?.name}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Escort Name</th>
                  <th className="py-3 px-4">Relationship</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Gate Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {activeLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-600">
                      {log.pickupTime ? new Date(log.pickupTime).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : 'Today'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.pickedUpByName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.relationship || 'Guardian'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.verifiedByName || 'Gate Security'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                        Cleared
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Daytime Movement Passes */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-slate-900">Daytime Movement Passes</h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">{activeMovements.length} Pass(es)</span>
        </div>
        {activeMovements.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 rounded-xl bg-slate-50">
            No movement passes recorded for {activeChild?.name}.
          </div>
        ) : (
          <div className="space-y-2">
            {activeMovements.map((m: any) => (
              <div key={m.id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-bold text-slate-900 capitalize">{String(m.reason).replace(/_/g, ' ')}</p>
                  <p className="text-[11px] text-slate-500">
                    {m.passNumber} • Authorized by {m.authorizedByName} • Escort {m.escortName}
                  </p>
                </div>
                <div className="text-[11px] text-slate-600 sm:text-right">
                  <p>Out {m.departureTime ? new Date(m.departureTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  <p>Back {m.actualReturnTime ? new Date(m.actualReturnTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold self-start sm:self-auto capitalize ${
                  m.status === 'returned'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : m.status === 'overdue'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {m.status === 'departed' ? 'Out of class' : m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Escort Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Register Authorized Escort
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Authorize a person to pick up <strong>{activeChild?.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close escort modal"
                className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {addMessage ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Escort Authorized
                </p>
                <p className="text-[11px] leading-relaxed">{addMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleAddEscort} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Escort Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Okafor"
                    value={escortName}
                    onChange={(e) => setEscortName(e.target.value)}
                    className="w-full text-xs h-10 px-3 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Relationship to Student
                  </label>
                  <select
                    value={escortRelation}
                    onChange={(e) => setEscortRelation(e.target.value)}
                    className="w-full text-xs h-10 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="Relative">Relative</option>
                    <option value="Driver">Family Driver</option>
                    <option value="Caregiver">Caregiver</option>
                    <option value="Neighbor">Authorized Neighbor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Telephone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +234 803 123 4567"
                    value={escortPhone}
                    onChange={(e) => setEscortPhone(e.target.value)}
                    className="w-full text-xs h-10 px-3 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Registering...' : 'Authorize Escort'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
