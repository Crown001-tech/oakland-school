import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-50 via-white to-teal-50/20">
      {/* Top Bar */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-sm">
        <Logo size="sm" href="/" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0f3a3e] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Public Website
        </Link>
      </div>

      {/* Auth Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">{children}</main>

      {/* Footer */}
      <div className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/50">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0f3a3e]" />
          Authorized School Personnel Only &bull; Monitored Access
        </span>
      </div>
    </div>
  );
}
