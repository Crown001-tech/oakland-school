'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { PortalHeader } from '@/components/layout/PortalHeader';
import { StudentProvider, useStudent } from '@/context/StudentContext';
import {
  LayoutDashboard,
  Clock,
  BookOpen,
  FileText,
  CheckSquare,
  Laptop,
  Award,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  GraduationCap,
  Sparkles,
  School,
} from 'lucide-react';
import { isModuleEnabled, moduleForPath } from '@/lib/modules';
import { useModules } from '@/lib/use-modules';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const modules = useModules();
  const pathname = usePathname();
  const { student, isLoading } = useStudent();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navBadges, setNavBadges] = useState<Record<string, { count: number; dot: boolean }>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchBadges = async () => {
      try {
        const res = await fetch('/api/nav-badges?role=student');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.badges) {
            setNavBadges(data.badges);
          }
        }
      } catch (err) {
        console.warn('Failed to load navigation badges:', err);
      }
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const navGroups: NavGroup[] = [
    {
      category: 'ACADEMICS',
      items: [
        { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
        { label: 'Timetable', href: '/student/timetable', icon: Clock },
        { label: 'Subjects', href: '/student/subjects', icon: BookOpen },
        { label: 'Materials', href: '/student/materials', icon: FileText },
      ],
    },
    {
      category: 'ASSESSMENTS',
      items: [
        { label: 'Assignments', href: '/student/assignments', icon: CheckSquare },
        { label: 'Examinations', href: '/student/cbt', icon: Laptop },
        { label: 'Results', href: '/student/results', icon: Award },
      ],
    },
    {
      category: 'ACCOUNT',
      items: [
        { label: 'Profile', href: '/student/profile', icon: User },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  };

  if (isLoading) {
    return <BrandLoader fullScreen size="lg" />;
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#0a1b1d] flex items-center justify-center p-6 text-white">
        <div className="max-w-sm w-full bg-[#0d2224] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-brand-primary/30 border border-[#d4af37]/30 text-amber-300 flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-white tracking-tight">Student Sign In</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Please sign in with your student admission number and password to access your classes and results.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login?redirect=/student"
              className="inline-flex items-center justify-center w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold transition text-center shadow-md cursor-pointer"
            >
              Sign In &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a1b1d] flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto print:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="min-w-0 flex-1 pr-2 overflow-hidden">
            <Logo theme="dark" size="sm" href="/student" />
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5 shrink-0" />
          </button>
        </div>

        {/* Portal Identifier */}
        <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs">
          <span className="text-amber-300 font-bold tracking-wide">Student Portal</span>
          <span className="text-[11px] font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
            2026/2027
          </span>
        </div>

        {/* Student Active Identity Card in Sidebar */}
        <div className="p-3.5 border-b border-white/10">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/8 border border-white/10">
            <div className="w-9 h-9 rounded-lg bg-brand-primary text-amber-300 border border-amber-500/20 flex items-center justify-center font-bold text-sm shrink-0">
              {student.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {student.name}
              </p>
              <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                Class: <strong className="text-white">{student.currentClass}</strong>
                {student.department ? ` (${student.department})` : ''}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                {student.admissionNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.category} className="space-y-0.5">
              <p className="px-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                {group.category}
              </p>
              {group.items.filter((item) => isModuleEnabled(modules, moduleForPath(item.href))).map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                const badgeInfo = navBadges[item.href];
                const badgeCount = badgeInfo?.count || 0;
                const hasDot = badgeInfo?.dot || false;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? 'bg-brand-accent/30 border border-brand-accent/40 text-white shadow-xs'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex items-center justify-center shrink-0">
                        <Icon className={`w-4 h-4 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
                        {badgeCount > 0 ? (
                          <span
                            className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-[#0a1b1d] shadow-xs"
                            title={`${badgeCount} item${badgeCount > 1 ? 's' : ''} requiring attention`}
                          >
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        ) : hasDot ? (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-[#0a1b1d] animate-pulse"
                            title="Attention required"
                          />
                        ) : null}
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {badgeCount > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shrink-0">
                        {badgeCount}
                      </span>
                    ) : item.badge ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-bold shrink-0">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
            <Link href="/student/profile" className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {student.name}
                </p>
                <p className="text-[10px] text-amber-300 truncate">
                  Student Profile &rarr;
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md transition-colors shrink-0 ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Page Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <PortalHeader
          portalName="Student Portal"
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Routed Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:overflow-visible print:bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentProvider>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </StudentProvider>
  );
}
