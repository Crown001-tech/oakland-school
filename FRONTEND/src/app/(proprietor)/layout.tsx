'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import {
  LayoutDashboard,
  GraduationCap,
  UserPlus,
  CalendarCheck,
  Users,
  Calendar,
  BookOpen,
  Award,
  Wallet,
  Activity,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Megaphone,
  UserCheck,
  FolderArchive,
  Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

const NAV_GROUPS: NavGroup[] = [
  {
    category: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/proprietor', icon: LayoutDashboard },
    ],
  },
  {
    category: 'STUDENTS',
    items: [
      { label: 'Students', href: '/proprietor/students', icon: GraduationCap },
      { label: 'Admissions', href: '/proprietor/admissions', icon: UserPlus },
      { label: 'Attendance', href: '/proprietor/attendance', icon: CalendarCheck },
    ],
  },
  {
    category: 'STAFF',
    items: [
      { label: 'Staff Directory', href: '/proprietor/staff', icon: Users },
      { label: 'Staff Approvals', href: '/proprietor/staff-approvals', icon: UserCheck },
      { label: 'Staff Broadcast', href: '/proprietor/broadcast', icon: Megaphone },
    ],
  },
  {
    category: 'ACADEMICS',
    items: [
      { label: 'Classes', href: '/proprietor/classes', icon: BookOpen },
      { label: 'Calendar', href: '/proprietor/calendar', icon: Calendar },
      { label: 'Timetable', href: '/proprietor/timetable', icon: Clock },
      { label: 'Results', href: '/proprietor/results', icon: Award },
    ],
  },
  {
    category: 'FINANCE',
    items: [
      { label: 'Finances', href: '/proprietor/finances', icon: Wallet },
      { label: 'Activity Log', href: '/proprietor/activity', icon: Activity },
    ],
  },
  {
    category: 'GENERAL',
    items: [
      { label: 'Documents', href: '/proprietor/documents', icon: FolderArchive },
      { label: 'School Profile', href: '/proprietor/profile', icon: Building2 },
      { label: 'My Profile', href: '/proprietor/my-profile', icon: Shield },
      { label: 'Settings', href: '/proprietor/settings', icon: Settings },
    ],
  },
];

export default function ProprietorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  };

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity cursor-pointer no-print"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#0a1b1d] flex flex-col transition-all duration-200 no-print print:hidden ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
        } ${
          isDesktopCollapsed
            ? 'lg:hidden'
            : 'lg:flex lg:w-64 lg:static lg:translate-x-0'
        }`}
      >
        {/* Logo & Responsive Close Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="min-w-0 flex-1 pr-2 overflow-hidden">
            <Logo theme="dark" size="sm" href="/proprietor" />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMobileOpen(false);
              setIsDesktopCollapsed(true);
            }}
            aria-label="Retract navigation sidebar"
            title="Retract sidebar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors shrink-0 z-20 cursor-pointer"
          >
            <X className="w-5 h-5 shrink-0" />
          </button>
        </div>

        {/* Session pill */}
        <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">2026/2027 Session</span>
          <span className="text-xs font-semibold text-white bg-white/10 px-2 py-0.5 rounded">Term 1</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto" suppressHydrationWarning>
          {NAV_GROUPS.map((group) => (
            <div key={group.category} className="space-y-0.5">
              <p className="px-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">
                {group.category}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-3.5 h-3.5 ${active ? 'text-teal-400' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/10">
          <Link
            href="/proprietor/my-profile"
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group mb-2"
          >
            <div className="w-7 h-7 rounded-full bg-[#0f3a3e] border border-teal-700 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-teal-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">Proprietor</p>
              <p className="text-[10px] text-slate-500 leading-tight">Owner</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 no-print print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsMobileOpen(true);
                setIsDesktopCollapsed(false);
              }}
              title="Expand navigation sidebar"
              aria-label="Expand sidebar"
              className={`p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer ${
                !isDesktopCollapsed ? 'lg:hidden' : 'flex'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">Proprietor</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600 capitalize font-medium">
                {pathname.split('/')[2]?.replace(/-/g, ' ') || 'Dashboard'}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
