'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/brand/Logo';
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [authMethod, setAuthMethod] = useState<'password' | 'magic'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Pre-fill email from query param if provided & sync server-appointed executives & staff directory
  React.useEffect(() => {
    const qEmail = searchParams.get('email');
    if (qEmail) setEmail(qEmail);
  }, [searchParams]);

  // Handle Password Sign-In via Server-Side HTTP Cookies
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Invalid login credentials. Please verify your official email address and password.');
        setIsLoading(false);
        return;
      }

      // Purge any stale demo cookies that could cause role mismatch / lockout
      try {
        document.cookie = 'oakland_demo_role=; path=/; max-age=0;';
      } catch {}

      // Successful login - determine target destination strictly compatible with authenticated role
      let destination = data.redirectUrl || '/teacher';
      if (redirectUrl) {
        if (data.role === 'teacher' && redirectUrl.startsWith('/teacher')) {
          destination = redirectUrl;
        } else if (data.role === 'admin' && redirectUrl.startsWith('/admin')) {
          destination = redirectUrl;
        } else if (data.role === 'bursar' && redirectUrl.startsWith('/bursar')) {
          destination = redirectUrl;
        } else if (data.role === 'proprietor' && redirectUrl.startsWith('/proprietor')) {
          destination = redirectUrl;
        }
      }

      window.location.href = destination;
      return;
    } catch {
      setErrorMessage('Authentication service could not verify your credentials. Please try again.');
      setIsLoading(false);
      return;
    }
  };

  // Handle Magic Link Sign-In
  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setMagicLinkSent(false);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setMagicLinkSent(true);
      setIsLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send magic link.';
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-7">
      {/* Spacious, Unchoked Brand Presentation */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex justify-center mb-1">
          <Logo size="md" href="/" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Oakland International School
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Faculty, Bursary & Administration Portal
          </p>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/40 p-6 sm:p-8 space-y-6">
        {/* Method Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100/90 border border-slate-200/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMethod('password'); setErrorMessage(null); }}
            className={`py-2 px-3 rounded-lg transition-all text-center inline-flex items-center justify-center gap-1.5 ${
              authMethod === 'password'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password Sign-In</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('magic'); setErrorMessage(null); }}
            className={`py-2 px-3 rounded-lg transition-all text-center inline-flex items-center justify-center gap-1.5 ${
              authMethod === 'magic'
                ? 'bg-white text-[#0f3a3e] shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Magic Link</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 inline-flex items-start gap-2.5 text-xs text-rose-800 w-full animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {magicLinkSent && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1.5 animate-in fade-in">
            <p className="font-bold inline-flex items-center gap-1.5 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sign-In Link Sent!
            </p>
            <p className="text-emerald-700 text-[11px] leading-relaxed">
              We have dispatched a secure sign-in link to <strong>{email}</strong>. Open your email inbox to log in directly.
            </p>
          </div>
        )}

        {authMethod === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Official School Email
              </label>
              <Input
                type="email"
                placeholder="e.g. principal@oaklandschools.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                className="text-xs h-10"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Portal Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-teal-800 hover:text-teal-950 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your confidential password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                className="text-xs font-mono h-10"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="w-full bg-[#0f3a3e] hover:bg-[#164e53] text-white shadow-md font-bold text-xs py-2.5 h-11"
              >
                Sign In to Portal
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMagicLinkLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Authorized Email Address
              </label>
              <Input
                type="email"
                placeholder="e.g. staff@oaklandschools.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                className="text-xs h-10"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                A passwordless verification link will be sent to your official registered email address.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="w-full bg-[#0f3a3e] hover:bg-[#164e53] text-white shadow-md font-bold text-xs py-2.5 h-11"
              >
                Send Magic Sign-In Link
              </Button>
            </div>
          </form>
        )}

        {/* Parent Portal Access */}
        <div className="pt-3 pb-1 border-t border-slate-100 text-center">
          <Link
            href="/parent/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200/80 transition-colors"
          >
            Are you a Parent? Go to Parent Portal &rarr;
          </Link>
        </div>

        {/* Footnote */}
        <div className="pt-3 border-t border-slate-100 text-center space-y-1">
          <p className="text-[11px] text-slate-500 font-medium">
            Principal and Bursar accounts are appointed exclusively by the Proprietor.
          </p>
          <p className="text-[10px] text-slate-400">
            Internal school management system &bull; Confidential & monitored access
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-500 text-xs">Loading Oakland Portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
