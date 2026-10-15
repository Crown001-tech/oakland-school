'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  LayoutDashboard,
  User,
  Users,
  ShoppingBag,
  Receipt,
  Wallet,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Lock,
  School,
} from 'lucide-react';

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

export default function BursarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [bursarProfile, setBursarProfile] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          if (isMounted) {
            setIsAuthenticated(false);
            window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
          }
          return;
        }

        const data = await res.json();

        if (!data.authenticated || data.role !== 'bursar') {
          if (isMounted) {
            setIsAuthenticated(false);
            setIsAuthorized(false);
          }
          return;
        }

        if (isMounted) {
          setIsAuthenticated(true);
          setIsAuthorized(true);
          setBursarProfile({
            name: data.profile?.name || 'Mrs Folake Esther',
            email: data.profile?.email || data.user?.email || 'folakeesther6@gmail.com',
          });
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
        }
      }
    };

    verifyAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const navGroups: NavGroup[] = [
    {
      category: 'OVERVIEW',
      items: [
        { label: 'Dashboard', href: '/bursar', icon: LayoutDashboard },
        { label: 'My Profile', href: '/bursar/profile', icon: User },
      ],
    },
    {
      category: 'PAYMENTS',
      items: [
        { label: 'Fees and Receipts', href: '/bursar/fees', icon: Receipt },
        { label: 'Salaries', href: '/bursar/payroll', icon: Users },
        { label: 'Expenditures', href: '/bursar/expenditures', icon: ShoppingBag },
        { label: 'Petty Cash', href: '/bursar/petty-cash', icon: Wallet },
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

  if (isAuthorized === null) {
    return <BrandLoader fullScreen size="lg" />;
  }

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <div className="max-w-sm w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-white">Access Restricted</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              You are not authorized to access the Bursar portal. Please sign in with an authorized account.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              Sign Out
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a1b1d] flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo and Mobile Close Button */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="min-w-0 flex-1 pr-2 overflow-hidden">
            <Logo theme="dark" size="sm" href="/bursar" />
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

        {/* Academic Session Indicator */}
        <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">2026/2027 Session</span>
          <span className="text-xs font-semibold text-white bg-white/10 px-2 py-0.5 rounded">Term 1</span>
        </div>

        {/* Navigation Groups */}
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

        {/* Bursar Account Footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition group">
            <Link
              href="/bursar/profile"
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-teal-800 text-teal-100 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-500/30 group-hover:scale-105 transition">
                {bursarProfile?.name
                  ? bursarProfile.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                  : 'FE'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white leading-tight truncate">
                  {bursarProfile?.name || 'Mrs Folake Esther'}
                </p>
                <p className="text-[10px] text-teal-300 leading-tight truncate">
                  Bursar
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">Bursar</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600 font-medium">
                {pathname === '/bursar'
                  ? 'Dashboard'
                  : pathname === '/bursar/profile'
                  ? 'My Profile'
                  : pathname === '/bursar/fees'
                  ? 'Fees and Receipts'
                  : pathname === '/bursar/payroll'
                  ? 'Salaries'
                  : pathname === '/bursar/expenditures'
                  ? 'Expenditures'
                  : pathname === '/bursar/petty-cash'
                  ? 'Petty Cash'
                  : pathname.split('/').pop()?.replace(/-/g, ' ')}
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
