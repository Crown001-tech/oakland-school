'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import {
  LayoutDashboard,
  GraduationCap,
  CalendarCheck,
  Award,
  FileSpreadsheet,
  Clock,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Lock,
  School,
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

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

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasTeacherAuth, setHasTeacherAuth] = useState<boolean | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const checkTeacherAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          if (isMounted) {
            setHasTeacherAuth(false);
            setCurrentTeacher(null);
            window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
          }
          return;
        }

        const data = await res.json();

        if (!data.authenticated || data.role !== 'teacher') {
          if (isMounted) {
            setHasTeacherAuth(false);
            setCurrentTeacher(null);
            window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
          }
          return;
        }

        if (isMounted) {
          const profile = data.profile || {};
          const isCT = Boolean(profile.assignedClass) || profile.teacherType === 'Class Teacher' || profile.role === 'Class Teacher';
          const roleDisplay = isCT
            ? profile.assignedClass
              ? `Class Teacher (${profile.assignedClass})`
              : 'Class Teacher'
            : (profile.department || 'Subject Teacher');

          const teacherData = {
            id: profile.id || data.user?.id,
            employeeId: profile.employeeId || 'OAK-TCH',
            name: profile.name || 'Faculty Member',
            email: profile.email || data.user?.email || 'teacher@oaklandschools.edu',
            role: isCT ? 'Class Teacher' : 'Subject Teacher',
            roleDisplay,
            department: profile.department || 'Academics',
            assignedClass: profile.assignedClass || null,
            phone: profile.phone,
          };
          setCurrentTeacher(teacherData);
          setHasTeacherAuth(true);
        }
      } catch {
        if (isMounted) {
          setHasTeacherAuth(false);
          setCurrentTeacher(null);
          window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
        }
      }
    };

    checkTeacherAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const navGroups: NavGroup[] = [
    {
      category: 'OVERVIEW',
      items: [
        { label: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
        { label: 'My Profile', href: '/teacher/profile', icon: User },
      ],
    },
    {
      category: 'MY CLASS',
      items: [
        { label: 'Students', href: '/teacher/students', icon: GraduationCap },
        { label: 'Attendance', href: '/teacher/attendance', icon: CalendarCheck },
        { label: 'Report Cards', href: '/teacher/report-cards', icon: Award },
      ],
    },
    {
      category: 'TEACHING',
      items: [
        { label: 'Scores', href: '/teacher/scores', icon: FileSpreadsheet },
        { label: 'Timetable', href: '/teacher/timetable', icon: Clock },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  if (hasTeacherAuth === null) {
    return <BrandLoader fullScreen size="lg" />;
  }

  if (hasTeacherAuth === false) {
    return (
      <div className="min-h-screen bg-[#0a1b1d] flex items-center justify-center p-6 text-white">
        <div className="max-w-sm w-full bg-[#0d2224] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Access Restricted</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Teacher authentication required. Please sign in with your official school email and password to access the teacher portal.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/login?redirect=/teacher"
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition text-center shadow-lg shadow-teal-900/40"
            >
              Sign In to Teacher Portal &rarr;
            </Link>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition border border-white/10"
            >
              Clear Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a1b1d] flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto print:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Responsive Close Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="min-w-0 flex-1 pr-2 overflow-hidden">
            <Logo theme="dark" size="sm" href="/teacher" />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSidebarOpen(false);
            }}
            aria-label="Close navigation sidebar"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors shrink-0 z-20 cursor-pointer lg:hidden"
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
        <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto">
          {navGroups.map((group) => (
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
                    onClick={() => setIsSidebarOpen(false)}
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
          <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition group">
            <Link href="/teacher/profile" className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-teal-800 text-teal-100 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition">
                {currentTeacher?.name ? currentTeacher.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white leading-tight truncate">
                  {currentTeacher?.name || 'Class Teacher'}
                </p>
                <p className="text-[10px] text-teal-300 leading-tight">
                  {currentTeacher?.role || 'Faculty Member'}{currentTeacher?.assignedClass ? ` (${currentTeacher.assignedClass})` : ''} &bull; Profile &rarr;
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-md transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">Teacher</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600 capitalize font-medium">
                {pathname === '/teacher' ? 'Dashboard' : pathname.split('/').pop()?.replace(/-/g, ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs">
              <School className="w-3 h-3 text-slate-500" />
              <span className="text-slate-600 font-medium">Oakland Schools</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:overflow-visible print:bg-white">{children}</main>
      </div>
    </div>
  );
}
