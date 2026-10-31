'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { DEMO_ROLES, DEMO_ROLE_LABELS, DEMO_ROLE_NOTES, isDemoRole, type DemoRole } from '@/lib/demo-mode';

const WIDTH = 1120;
const HEIGHT = 590;
/** Pushes the whole drawing down so the top label has room above the cap. */
const OFFSET_Y = 30;

type Placement = 'top' | 'bottom' | 'left' | 'right';

/** Where each role sits on the graduation cap, and which side its label opens to. */
const NODES: Record<DemoRole, { x: number; y: number; place: Placement }> = {
  proprietor: { x: 560, y: 90, place: 'top' },
  principal: { x: 900, y: 230, place: 'right' },
  bursar: { x: 220, y: 230, place: 'left' },
  student: { x: 560, y: 230, place: 'bottom' },
  security: { x: 560, y: 370, place: 'bottom' },
  teacher: { x: 370, y: 430, place: 'left' },
  parent: { x: 750, y: 430, place: 'right' },
};

const PLACEMENT_TRANSFORM: Record<Placement, string> = {
  top: 'translate(-50%, calc(-100% - 22px))',
  bottom: 'translate(-50%, 22px)',
  left: 'translate(calc(-100% - 22px), -50%)',
  right: 'translate(22px, -50%)',
};

const PLACEMENT_TEXT: Record<Placement, string> = {
  top: 'text-center',
  bottom: 'text-center',
  left: 'text-right',
  right: 'text-left',
};

export function DemoStage() {
  const [role, setRole] = useState<DemoRole | ''>('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInRole = async (targetRole: DemoRole) => {
    if (pending) return;
    setRole(targetRole);
    setError(null);
    setPending(true);
    try {
      const res = await fetch('/api/demo/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.redirectUrl) {
        setError(data.message || 'Could not sign in. Please try again.');
        setPending(false);
        return;
      }
      window.location.assign(data.redirectUrl);
    } catch {
      setError('Could not sign in. Check your connection and try again.');
      setPending(false);
    }
  };

  const enter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role || pending) return;
    await signInRole(role);
  };

  return (
    <div className="flex flex-col gap-8">
      {pending && <BrandLoader fullScreen />}

      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Demo school</p>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-primary sm:text-4xl">
            See the school through every role
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Choose a role and step in. No password needed. Everything you see is sample records.
          </p>
        </div>

        <form onSubmit={enter} className="w-full lg:max-w-md">
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-border bg-white p-2 shadow-sm sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor="demo-role" className="sr-only">
                Role
              </label>
              <select
                id="demo-role"
                value={role}
                onChange={(e) => setRole(isDemoRole(e.target.value) ? e.target.value : '')}
                disabled={pending}
                className="h-12 w-full appearance-none rounded-xl bg-brand-primary-soft pl-4 pr-10 text-base font-semibold text-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-60"
              >
                <option value="" disabled>
                  Choose a role
                </option>
                {DEMO_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {DEMO_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-primary" />
            </div>
            <button
              type="submit"
              disabled={!role || pending}
              className="h-12 rounded-xl bg-brand-accent px-7 text-base font-bold text-brand-primary transition-colors hover:bg-brand-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enter
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-brand-accent-soft px-4 py-2.5 text-sm font-medium text-brand-primary">
              {error}
            </p>
          )}
        </form>
      </section>

      {/* Large screens: one connected line draws a graduation cap on a chalkboard. */}
      <div
        className="relative mx-3 hidden overflow-visible rounded-2xl bg-[radial-gradient(ellipse_at_50%_38%,#0e4a3c_0%,#07332a_65%)] shadow-xl ring-[10px] ring-[#d2c7b2] lg:block"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="absolute inset-0 h-full w-full"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>

          <g transform={`translate(0 ${OFFSET_Y})`}>
          <g filter="url(#chalk)" stroke="#eef6f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {/* Cap board, its thickness and the crown below it */}
            <path d="M560 90 L900 230 L560 370 L220 230 Z" fill="rgba(238,246,241,0.05)" />
            <path d="M220 230 L220 246 L560 386 L900 246 L900 230" strokeOpacity="0.75" />
            <path d="M370 308 L370 430 Q560 520 750 430 L750 308" />

            {/* Tassel cord, running from the centre button to the corner */}
            <path d="M560 230 L900 230 L900 330" stroke="#3ddc97" strokeWidth="2.5" strokeDasharray="7 8" />
            <rect x="891" y="330" width="18" height="24" rx="4" fill="#ff6a1a" stroke="#ff6a1a" />
            <path d="M893 354 L889 398 M900 354 L900 404 M907 354 L911 398" stroke="#ff6a1a" strokeWidth="2.5" />

            {/* Chalk drawings: ruler, pencil and open book */}
            <g strokeOpacity="0.55" strokeWidth="2.5">
              <rect x="34" y="34" width="190" height="26" rx="3" />
              <path d="M58 34 V46 M82 34 V50 M106 34 V46 M130 34 V50 M154 34 V46 M178 34 V50 M202 34 V46" />
              <g transform="translate(920 40) rotate(14)">
                <rect x="0" y="0" width="150" height="20" rx="3" />
                <path d="M150 0 L176 10 L150 20 Z" />
                <path d="M26 0 V20" />
              </g>
              <path d="M40 470 Q85 452 130 470 V506 Q85 488 40 506 Z" />
              <path d="M130 470 Q175 452 220 470 V506 Q175 488 130 506 Z" />
            </g>

            {/* Chalk tray with a piece of chalk and an eraser */}
            <rect x="24" y="522" width="1072" height="16" rx="4" fill="#14463a" strokeOpacity="0.3" strokeWidth="2" />
            <rect x="890" y="508" width="46" height="12" rx="6" fill="#f5f1e6" stroke="none" />
            <rect x="962" y="498" width="74" height="22" rx="4" fill="#b99467" stroke="none" />
            <rect x="962" y="498" width="74" height="12" rx="4" fill="#cfd8d3" stroke="none" />
          </g>

          {/* Role points on the cap */}
          {DEMO_ROLES.map((r) => {
            const { x, y } = NODES[r];
            const active = role === r;
            return (
              <g key={r}>
                {active && <circle cx={x} cy={y} r="21" stroke="#ff6a1a" strokeWidth="2" strokeOpacity="0.6" />}
                <circle
                  cx={x}
                  cy={y}
                  r="12"
                  strokeWidth="3"
                  className={`transition-colors duration-200 ${
                    active ? 'fill-[#ff6a1a] stroke-white' : 'fill-[#07332a] stroke-[#eef6f1]'
                  }`}
                />
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  className={`transition-colors duration-200 ${active ? 'fill-[#07332a]' : 'fill-[#3ddc97]'}`}
                />
              </g>
            );
          })}
          </g>
        </svg>

        {DEMO_ROLES.map((r) => {
          const { x, y, place } = NODES[r];
          const active = role === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => signInRole(r)}
              disabled={pending}
              className={`absolute w-[164px] rounded-xl border px-3 py-2 transition-all duration-200 hover:scale-105 hover:border-brand-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${PLACEMENT_TEXT[place]} ${
                active ? 'border-brand-accent bg-[#0e4a3c] shadow-lg' : 'border-white/15 bg-[#07332a] hover:bg-[#0a3a2f]'
              } disabled:cursor-not-allowed disabled:opacity-60`}
              style={{
                left: `${(x / WIDTH) * 100}%`,
                top: `${((y + OFFSET_Y) / HEIGHT) * 100}%`,
                transform: PLACEMENT_TRANSFORM[place],
              }}
            >
              <p className="text-[15px] font-bold leading-tight text-white">{DEMO_ROLE_LABELS[r]}</p>
              <p className="mt-0.5 text-xs leading-snug text-white/75">{DEMO_ROLE_NOTES[r]}</p>
            </button>
          );
        })}
      </div>

      {/* Smaller screens: the same roles on one connected line with 1-tap buttons. */}
      <ol className="relative rounded-2xl bg-[#07332a] px-4 py-5 lg:hidden">
        <span
          aria-hidden="true"
          className="absolute bottom-10 left-[27px] top-10 border-l-2 border-dashed border-[#3ddc97]/60"
        />
        {DEMO_ROLES.map((r) => {
          const active = role === r;
          return (
            <li key={r} className="relative py-2">
              <button
                type="button"
                onClick={() => signInRole(r)}
                disabled={pending}
                className={`flex min-h-[48px] w-full items-center gap-3.5 rounded-xl border p-3 text-left transition-all ${
                  active
                    ? 'border-brand-accent bg-[#0e4a3c] text-white shadow-md'
                    : 'border-white/15 bg-[#05261f]/80 text-white hover:border-brand-accent hover:bg-[#0b4034]'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[3px] transition-colors ${
                    active ? 'border-white bg-brand-accent' : 'border-[#eef6f1] bg-[#07332a]'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#07332a]' : 'bg-[#3ddc97]'}`} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-bold leading-tight text-white">{DEMO_ROLE_LABELS[r]}</span>
                  <span className="mt-0.5 text-xs leading-snug text-white/75">{DEMO_ROLE_NOTES[r]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
