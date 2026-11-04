'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface Preview { valid: boolean; schoolName?: string; firstName?: string; email?: string | null }

function ActivateParentForm() {
  const token = useSearchParams().get('token') || '';
  const [preview, setPreview] = useState<Preview | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setPreview({ valid: false });
      return;
    }
    fetch(`/api/auth/parent-invite/accept?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => {
        const data: Preview = j?.success ? j.data : { valid: false };
        setPreview(data);
        if (data.email) setEmail(data.email);
      })
      .catch(() => setPreview({ valid: false }));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('The two passwords are not the same.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/parent-invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, email: email || undefined }),
      });
      const json = await res.json();
      if (json?.success) setDone(true);
      else setError(json?.message || 'Could not set up your account. Try again.');
    } catch {
      setError('Could not reach the school. Check your connection and try again.');
    }
    setBusy(false);
  };

  if (!preview) return <BrandLoader fullScreen size="lg" />;

  return (
    <div className="w-full max-w-md mx-auto space-y-7">
      <div className="text-center space-y-2.5">
        <div className="inline-flex justify-center mb-1">
          <Logo size="md" href="/" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">{preview.schoolName || 'Parent Account'}</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/40 p-6 sm:p-8 space-y-5">
        {!preview.valid ? (
          <div className="text-center space-y-3 py-2">
            <AlertCircle className="w-10 h-10 mx-auto text-rose-600" />
            <h2 className="text-lg font-bold text-slate-900">This link cannot be used</h2>
            <p className="text-xs text-slate-600">It has expired or was already used. Ask the school office to send you a new one.</p>
          </div>
        ) : done ? (
          <div className="text-center space-y-3 py-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Your account is ready</h2>
            <p className="text-xs text-slate-600">Sign in with your email and the password you just chose.</p>
            <Link href="/login" className="min-h-[44px] px-6 inline-flex items-center justify-center rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold">
              Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-xs text-slate-700 leading-relaxed">
              {preview.firstName ? `Welcome, ${preview.firstName}. ` : ''}Choose a password to see your child’s fees, results and attendance.
            </p>
            {error && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label htmlFor="pi-email" className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
              <Input id="pi-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail className="w-4 h-4 text-slate-400" />} className="text-xs h-11 min-h-[44px]" />
              <p className="text-[11px] text-slate-500 mt-1">You will sign in with this email.</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="pi-pass" className="text-xs font-bold text-slate-700">Password</label>
                <button type="button" onClick={() => setShow(!show)} className="min-h-[44px] px-2 text-[11px] text-brand-primary font-semibold inline-flex items-center gap-1 cursor-pointer">
                  {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{show ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <Input id="pi-pass" type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock className="w-4 h-4 text-slate-400" />} className="text-xs h-11 min-h-[44px]" />
              <p className="text-[11px] text-slate-500 mt-1">At least 8 characters, with a letter and a number.</p>
            </div>
            <div>
              <label htmlFor="pi-confirm" className="block text-xs font-bold text-slate-700 mb-1.5">Type the password again</label>
              <Input id="pi-confirm" type={show ? 'text' : 'password'} required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} leftIcon={<Lock className="w-4 h-4 text-slate-400" />} className="text-xs h-11 min-h-[44px]" />
            </div>
            <Button type="submit" size="lg" isLoading={busy} className="w-full bg-brand-primary hover:bg-brand-primary-light text-white shadow-md font-bold text-xs h-11">
              Create My Account
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ActivateParentPage() {
  return (
    <Suspense fallback={<BrandLoader fullScreen size="lg" />}>
      <ActivateParentForm />
    </Suspense>
  );
}
