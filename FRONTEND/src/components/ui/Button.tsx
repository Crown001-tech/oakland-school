import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'crimson' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer leading-none align-middle';

    const variants = {
      primary:
        'bg-[#0f3a3e] text-white hover:bg-[#164e53] focus:ring-[#0f3a3e] shadow-sm',
      crimson:
        'bg-[#b3141f] text-white hover:bg-[#961019] focus:ring-[#b3141f] shadow-sm',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-300',
      accent:
        'bg-[#b3141f] text-white hover:bg-[#961019] focus:ring-[#b3141f] shadow-sm',
      outline:
        'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300 shadow-xs',
      ghost:
        'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 leading-none',
      md: 'text-sm px-4 py-2 gap-2 leading-none',
      lg: 'text-base px-5 py-2.5 gap-2.5 leading-none',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0 self-center" />}
        {!isLoading && leftIcon && (
          <span className="inline-flex items-center justify-center shrink-0 self-center leading-none">
            {leftIcon}
          </span>
        )}
        {children && (
          <span className="inline-flex items-center justify-center self-center leading-none">
            {children}
          </span>
        )}
        {!isLoading && rightIcon && (
          <span className="inline-flex items-center justify-center shrink-0 self-center leading-none">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
