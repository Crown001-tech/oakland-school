'use client';

import React from 'react';
import { Toggle } from '@/components/ui/Toggle';

/** An on and off switch with its words beside it. The whole row is the tap target, at least 44 pixels tall. */
export function SwitchRow({ checked, onChange, label, hint, disabled = false, strong = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint?: string; disabled?: boolean; strong?: boolean }) {
  return (
    <div
      role="presentation"
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-center justify-between gap-4 min-h-[44px] py-1 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <span className="min-w-0">
        <span className={`block text-xs ${strong ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{label}</span>
        {hint ? <span className="block text-[11px] text-slate-500 leading-snug">{hint}</span> : null}
      </span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}
