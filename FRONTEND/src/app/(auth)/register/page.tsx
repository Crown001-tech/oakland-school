'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import {
  GraduationCap,
  Briefcase,
  KeyRound,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { SchoolName } from '@/components/common/SchoolName';

export default function RegisterIndexPage() {
  return (
    <div className="w-full max-w-lg mx-auto space-y-7">
      {/* Brand Header */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex justify-center mb-1">
          <Logo size="md" href="/" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            <SchoolName />
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Portal Registration & Intake Directory
          </p>
        </div>
      </div>

      {/* Main Selection Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/40 p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-slate-900">
            Select Your Registration Pathway
          </h2>
          <p className="text-xs text-slate-500">
            Choose the application pathway appropriate for your role.
          </p>
        </div>

        <div className="space-y-3">
          {/* Pathway 1: Staff & Faculty Appointment */}
          <Link
            href="/register/staff"
            className="group block p-4 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50/50 hover:bg-brand-primary/5 transition-all shadow-2xs min-h-[44px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-brand-primary transition-colors">
                    Staff Appointment
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Apply for teaching or administrative positions.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </div>
          </Link>

          {/* Pathway 2: Prospective Student Admission */}
          <Link
            href="/admissions"
            className="group block p-4 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50/50 hover:bg-brand-primary/5 transition-all shadow-2xs min-h-[44px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                    Student Admissions
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enroll a new scholar for the 2026/2027 academic session.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </div>
          </Link>

          {/* Pathway 3: Student Account Activation */}
          <Link
            href="/activate"
            className="group block p-4 rounded-xl border border-slate-200 hover:border-brand-primary bg-slate-50/50 hover:bg-brand-primary/5 transition-all shadow-2xs min-h-[44px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                    Activate Student Account
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Redeem your administrative activation code.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </div>
          </Link>
        </div>

        {/* Existing Account Link */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold transition-colors py-2 min-h-[44px]"
          >
            <span>Already have an account? Sign in</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
