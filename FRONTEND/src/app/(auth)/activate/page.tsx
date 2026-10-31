'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  KeyRound,
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
} from 'lucide-react';

function ActivateStudentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ studentName?: string; admissionNumber?: string } | null>(null);

  useEffect(() => {
    const qToken = searchParams.get('token');
    const qAdm = searchParams.get('adm') || searchParams.get('admissionNumber');
    if (qToken) setToken(qToken.toUpperCase());
    if (qAdm) setAdmissionNumber(qAdm.toUpperCase());
  }, [searchParams]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanToken = token.trim().toUpperCase();
    const cleanAdm = admissionNumber.trim().toUpperCase();
    const cleanPassword = password.trim();

    if (!cleanToken) {
      setErrorMessage('Please enter your activation code.');
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (cleanPassword !== confirmPassword.trim()) {
      setErrorMessage('Passwords do not match. Please verify both entries.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/activate-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: cleanToken,
          admissionNumber: cleanAdm || undefined,
          password: cleanPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Activation failed. Please check your activation code.');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setSuccessData({
        studentName: data.studentName,
        admissionNumber: data.admissionNumber,
      });
      setIsLoading(false);

      // Redirect after brief celebration
      setTimeout(() => {
        window.location.href = data.redirectUrl || '/student';
      }, 1500);
    } catch {
      setErrorMessage('Network connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-7">
      {/* Brand Header */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex justify-center mb-1">
          <Logo size="md" href="/" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Oakland International School
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Student Account Activation
          </p>
        </div>
      </div>

      {/* Main Activation Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/40 p-6 sm:p-8 space-y-6">
        {isSuccess ? (
          <div className="text-center space-y-4 py-4 animate-in fade-in">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Account Activated!
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Welcome, <strong>{successData?.studentName || 'Student'}</strong> ({successData?.admissionNumber}).
              </p>
              <p className="text-[11px] text-brand-primary font-medium mt-3 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Directing you to your student portal...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-brand-primary/5 border border-brand-primary/15 text-[11px] text-slate-700 leading-relaxed">
              Enter the activation code issued by the school administration and create your secure personal password.
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 inline-flex items-start gap-2.5 text-xs text-rose-800 w-full animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Activation Code
              </label>
              <Input
                type="text"
                placeholder="e.g. OAK-7K9M2P"
                required
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
                className="text-xs font-mono tracking-wider h-11 min-h-[44px] uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Admission Number (Optional Confirmation)
              </label>
              <Input
                type="text"
                placeholder="e.g. OAK-2026-123"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value.toUpperCase())}
                leftIcon={<UserCheck className="w-4 h-4 text-slate-400" />}
                className="text-xs font-mono h-11 min-h-[44px] uppercase"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-brand-primary hover:text-brand-accent font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                className="text-xs font-mono h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<ShieldCheck className="w-4 h-4 text-slate-400" />}
                className="text-xs font-mono h-10"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="w-full bg-brand-primary hover:bg-brand-primary-light text-white shadow-md font-bold text-xs py-2.5 h-11"
              >
                Activate Student Account
              </Button>
            </div>
          </form>
        )}

        {/* Navigation Back */}
        <div className="pt-3 border-t border-slate-100 text-center">
          <Link
            href="/login"
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold transition-colors"
          >
            Already activated? Return to Sign In &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StudentActivationPage() {
  return (
    <Suspense fallback={<BrandLoader fullScreen size="lg" />}>
      <ActivateStudentForm />
    </Suspense>
  );
}
