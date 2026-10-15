import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'crimson' | 'teal' | 'coral' | 'slate' | 'emerald' | 'amber' | 'rose' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'slate',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    crimson: 'bg-[#fdf2f3] text-[#b3141f] border border-[#b3141f]/20',
    teal: 'bg-[#eaf3f3] text-[#0f3a3e] border border-[#0f3a3e]/10',
    coral: 'bg-[#fdf2f3] text-[#b3141f] border border-[#b3141f]/20',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200',
    outline: 'bg-transparent text-slate-700 border border-slate-300',
  };

  const sizes = {
    sm: 'text-[11px] font-semibold px-2 py-0.5 rounded-md',
    md: 'text-xs font-semibold px-2.5 py-1 rounded-md',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium tracking-wide uppercase leading-none align-middle',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
