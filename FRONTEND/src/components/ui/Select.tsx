import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, leftIcon, children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full appearance-none rounded-lg border bg-white px-3.5 py-2 pr-9 text-sm text-slate-800 transition-colors cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-[#0f3a3e] focus:border-transparent',
              'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
              leftIcon ? 'pl-9' : '',
              error
                ? 'border-rose-300 focus:ring-rose-500 text-rose-900'
                : 'border-slate-300 hover:border-slate-400',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center">
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </div>
        </div>
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
