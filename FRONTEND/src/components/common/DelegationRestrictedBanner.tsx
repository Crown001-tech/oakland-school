'use client';

import React from 'react';
import { Lock, ShieldAlert } from 'lucide-react';

interface DelegationRestrictedBannerProps {
  title: string;
  description: string;
}

export function DelegationRestrictedBanner({
  title,
  description,
}: DelegationRestrictedBannerProps) {
  return (
    <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
          <Lock className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-amber-950 text-xs sm:text-sm">{title}</h2>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Authority Reserved
            </span>
          </div>
          <p className="text-amber-800/90 text-xs leading-relaxed max-w-2xl">
            {description}
          </p>
        </div>
      </div>
      <div className="sm:self-center shrink-0">
        <span className="text-[11px] font-semibold text-amber-900 bg-amber-200/50 border border-amber-300 px-2.5 py-1 rounded-lg">
          Read-Only Mode
        </span>
      </div>
    </div>
  );
}
