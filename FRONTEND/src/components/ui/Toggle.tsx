'use client';

import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  id,
  name,
  label,
  size = 'md',
  className = '',
}: ToggleProps) {
  const isSm = size === 'sm';

  // md: 36px wide x 20px high. Knob: 16px x 16px. Inset: 2px. Travel: 16px.
  // sm: 28px wide x 16px high. Knob: 12px x 12px. Inset: 2px. Travel: 12px.
  const trackStyle: React.CSSProperties = isSm
    ? { width: '28px', height: '16px' }
    : { width: '36px', height: '20px' };

  const knobStyle: React.CSSProperties = isSm
    ? {
        width: '12px',
        height: '12px',
        top: '2px',
        left: '2px',
        transform: checked ? 'translateX(12px)' : 'translateX(0px)',
      }
    : {
        width: '16px',
        height: '16px',
        top: '2px',
        left: '2px',
        transform: checked ? 'translateX(16px)' : 'translateX(0px)',
      };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      id={id}
      name={name}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          onChange(!checked);
        }
      }}
      style={trackStyle}
      className={`relative inline-block shrink-0 cursor-pointer rounded-full p-0 border-0 transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0f3a3e] focus-visible:ring-offset-2 ${
        checked ? 'bg-[#0f3a3e]' : 'bg-slate-300 hover:bg-slate-400/80'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      <span className="sr-only">{label || 'Toggle switch'}</span>
      <span
        aria-hidden="true"
        style={knobStyle}
        className="pointer-events-none absolute block rounded-full bg-white shadow-xs transition-transform duration-200 ease-out"
      />
    </button>
  );
}
