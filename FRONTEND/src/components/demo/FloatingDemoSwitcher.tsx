'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { DEMO_ROLES, DEMO_ROLE_LABELS, DEMO_ROLE_NOTES, type DemoRole } from '@/lib/demo-mode';
import {
  ShieldCheck,
  GraduationCap,
  Briefcase,
  BookOpen,
  Users,
  User,
  Shield,
  ChevronUp,
  X,
} from 'lucide-react';

const ROLE_ICONS: Record<DemoRole, React.ComponentType<{ className?: string }>> = {
  proprietor: ShieldCheck,
  principal: GraduationCap,
  bursar: Briefcase,
  teacher: BookOpen,
  parent: Users,
  student: User,
  security: Shield,
};

function detectActiveRole(pathname: string): DemoRole | null {
  if (pathname.startsWith('/proprietor')) return 'proprietor';
  if (pathname.startsWith('/admin') || pathname.startsWith('/principal')) return 'principal';
  if (pathname.startsWith('/bursar')) return 'bursar';
  if (pathname.startsWith('/teacher')) return 'teacher';
  if (pathname.startsWith('/parent')) return 'parent';
  if (pathname.startsWith('/student')) return 'student';
  if (pathname.startsWith('/security')) return 'security';
  return null;
}

/** Role selector shown inside the demo school, so a visitor can change role without signing out. */
export function FloatingDemoSwitcher({ live = false }: { live?: boolean }) {
  // live: the role switcher on Oakland itself, not the separate sample demo school
  const title = live ? 'Oakland Demo' : 'Eductive Demo';
  const note = live ? 'Demo records' : 'Sample records';
  const pathname = usePathname() || '';
  const activeRole = detectActiveRole(pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<DemoRole | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // The demo entry page has its own selector
  if (pathname === '/demo') return null;

  const handleRoleSwitch = async (role: DemoRole) => {
    if (switchingTo) return;
    setErrorMsg(null);
    setSwitchingTo(role);

    try {
      const res = await fetch('/api/demo/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.redirectUrl) {
        setErrorMsg(data.message || 'Could not change role.');
        setSwitchingTo(null);
        return;
      }

      window.location.assign(data.redirectUrl);
    } catch {
      setErrorMsg('No connection. Could not change role.');
      setSwitchingTo(null);
    }
  };

  if (isMinimized) {
    return (
      <aside aria-label="Change demo role" className="fixed bottom-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex min-h-[44px] items-center gap-2.5 rounded-full border border-[#0b4034] bg-[#07332a] px-4 py-2 text-xs font-semibold text-white shadow-xl transition hover:bg-[#0b4034] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>
            Viewing as <strong className="text-brand-accent">{activeRole ? DEMO_ROLE_LABELS[activeRole] : 'guest'}</strong>
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Change demo role" className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex flex-col items-center px-3">
      {errorMsg && (
        <div role="alert" className="pointer-events-auto mb-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950 px-4 py-2 text-xs font-medium text-red-100 shadow-lg">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="flex h-8 w-8 items-center justify-center text-red-200 hover:text-white" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-2xl border border-[#0b4034] bg-[#07332a] p-1.5 shadow-2xl sm:rounded-full sm:px-2.5 sm:py-1.5">
        <div className="flex items-center gap-2 border-r border-[#0b4034] pl-2 pr-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <div className="hidden flex-col lg:flex">
            <span className="text-[11px] font-black uppercase tracking-wider text-white">{title}</span>
            <span className="text-xs text-emerald-300/80">{note}</span>
          </div>
        </div>

        <nav aria-label="Roles" className="hidden items-center gap-1 md:flex">
          {DEMO_ROLES.map((role) => {
            const Icon = ROLE_ICONS[role];
            const isActive = activeRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleSwitch(role)}
                disabled={switchingTo !== null}
                aria-current={isActive ? 'true' : undefined}
                title={`${DEMO_ROLE_LABELS[role]}: ${DEMO_ROLE_NOTES[role]}`}
                className={`flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                  isActive ? 'bg-brand-accent text-brand-primary' : 'text-slate-200 hover:bg-[#0b4034] hover:text-white'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{switchingTo === role ? 'Opening' : DEMO_ROLE_LABELS[role]}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0b4034] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0d4d3e] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              {live ? 'Demo' : 'Sample'}
            </span>
            <span>
              Role: <strong className="text-brand-accent">{activeRole ? DEMO_ROLE_LABELS[activeRole] : 'Choose'}</strong>
            </span>
            <ChevronUp className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex items-center border-l border-[#0b4034] pl-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-300 hover:bg-[#0b4034] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent sm:min-h-[36px] sm:min-w-[36px]"
            aria-label="Minimise role selector"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 md:hidden" onClick={() => setIsOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-[#0b4034] bg-[#07332a] p-4 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between border-b border-[#0b4034] pb-2">
              <div>
                <h3 className="text-sm font-bold text-white">Change role</h3>
                <p className="text-xs text-emerald-300/80">One tap. No password needed.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-300 hover:bg-[#0b4034] hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto">
              {DEMO_ROLES.map((role) => {
                const Icon = ROLE_ICONS[role];
                const isActive = activeRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      handleRoleSwitch(role);
                    }}
                    disabled={switchingTo !== null}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      isActive
                        ? 'border-brand-accent bg-[#0e4a3c] text-white'
                        : 'border-[#0b4034] bg-[#05261f] text-slate-200 hover:border-emerald-600 hover:bg-[#0b4034]'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? 'bg-brand-accent text-brand-primary' : 'bg-[#0b4034] text-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold">{DEMO_ROLE_LABELS[role]}</span>
                      <span className="text-xs text-slate-300">{DEMO_ROLE_NOTES[role]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
