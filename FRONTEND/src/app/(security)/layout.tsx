'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Footprints,
  BadgeCheck,
  Package,
  AlertTriangle,
  PhoneCall,
  History,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Lock,
  Clock,
  ShieldAlert,
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

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [officerProfile, setOfficerProfile] = useState<{
    name: string;
    employeeId: string;
    role: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [navBadges, setNavBadges] = useState<Record<string, { count: number; dot: boolean }>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchBadges = async () => {
      try {
        const res = await fetch('/api/nav-badges?role=security');
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

  // Live Clock updater (WAT Lagos Time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Authentication & Role Verification
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

        if (!data.authenticated || data.role !== 'security') {
          if (isMounted) {
            setIsAuthenticated(false);
            setIsAuthorized(false);
          }
          return;
        }

        if (isMounted) {
          setIsAuthenticated(true);
          setIsAuthorized(true);
          setOfficerProfile({
            name: data.profile?.name || 'Security Desk',
            employeeId: data.profile?.employeeId || 'OAK-SEC-001',
            role: 'Security & Reception',
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
      category: 'OPERATIONS',
      items: [
        { label: 'Dashboard', href: '/security', icon: LayoutDashboard },
        { label: 'Visitors', href: '/security/visitors', icon: Users },
        { label: 'Student Pickup', href: '/security/pickup', icon: ShieldCheck },
        { label: 'Student Movement', href: '/security/movement', icon: Footprints },
        { label: 'Staff Gate', href: '/security/staff-gate', icon: BadgeCheck },
      ],
    },
    {
      category: 'LOGISTICS & SAFETY',
      items: [
        { label: 'Deliveries', href: '/security/deliveries', icon: Package },
        { label: 'Incidents', href: '/security/incidents', icon: AlertTriangle },
        { label: 'Emergency', href: '/security/emergency', icon: PhoneCall },
        { label: 'Activity Logs', href: '/security/logs', icon: History },
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

  // Loading state with Oakland BrandLoader
  if (isAuthorized === null) {
    return <BrandLoader fullScreen size="lg" />;
  }

  // Unauthorized state
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
              You are not authorized to access the Security and Reception portal. Please sign in with an authorized security account.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition cursor-pointer"
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a1b1d] flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="min-w-0 flex-1 pr-2 overflow-hidden">
            <Logo theme="dark" size="sm" href="/security" />
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

        {/* Live Gate Status Banner */}
        <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium">Gate Active</span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
            Secure
          </span>
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
                const badgeInfo = navBadges[item.href];
                const badgeCount = badgeInfo?.count || 0;
                const hasDot = badgeInfo?.dot || false;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#b3141f] text-white shadow-sm'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex items-center justify-center shrink-0">
                        <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
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

        {/* Officer Account Footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition group">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-[#0f3a3e] text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/20">
                {officerProfile?.name
                  ? officerProfile.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                  : 'SD'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white leading-tight truncate">
                  {officerProfile?.name || 'Security Desk'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight truncate font-mono">
                  {officerProfile?.employeeId || 'OAK-SEC-001'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main View Shell */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Sticky Bar */}
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
              <span className="font-semibold text-slate-800">Security</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600 font-medium">
                {pathname === '/security'
                  ? 'Dashboard'
                  : pathname === '/security/visitors'
                  ? 'Visitors'
                  : pathname === '/security/pickup'
                  ? 'Student Pickup'
                  : pathname === '/security/movement'
                  ? 'Student Movement'
                  : pathname === '/security/staff-gate'
                  ? 'Staff Gate'
                  : pathname === '/security/deliveries'
                  ? 'Deliveries'
                  : pathname === '/security/incidents'
                  ? 'Incidents'
                  : pathname === '/security/emergency'
                  ? 'Emergency'
                  : pathname === '/security/logs'
                  ? 'Activity Logs'
                  : pathname.split('/').pop()?.replace(/-/g, ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Time Display */}
            {currentTime && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentTime} WAT</span>
              </div>
            )}

            {/* Emergency Hotline Button */}
            <Link
              href="/security/emergency"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Emergency</span>
            </Link>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
