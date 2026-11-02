'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, ChevronRight, School } from 'lucide-react';
import { SchoolName } from '@/components/common/SchoolName';

interface PortalHeaderProps {
  portalName: string;
  onOpenSidebar: () => void;
  pageTitle?: string;
  children?: React.ReactNode;
}

export function PortalHeader({
  portalName,
  onOpenSidebar,
  pageTitle,
  children,
}: PortalHeaderProps) {
  const pathname = usePathname();

  const resolvedPageTitle =
    pageTitle ||
    (pathname.split('/').length <= 2
      ? 'Dashboard'
      : pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard');

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 print:hidden shrink-0">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation sidebar"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{portalName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-600 capitalize font-medium">
            {resolvedPageTitle}
          </span>
        </div>
      </div>

      {/* Right: Unified Oakland Schools Institutional Badge */}
      <div className="flex items-center gap-2.5">
        {children}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs">
          <School className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-600 font-medium"><SchoolName /></span>
        </div>
      </div>
    </header>
  );
}

export default PortalHeader;
