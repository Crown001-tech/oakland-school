import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  variant?: 'full' | 'mark' | 'image';
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  href?: string | null;
  className?: string;
}

export function Logo({
  variant = 'full',
  theme = 'light',
  size = 'md',
  href,
  className = '',
}: LogoProps) {
  const sizeMap = {
    sm: { img: 30, mark: 26, title: 'text-sm', sub: 'text-[8.5px]' },
    md: { img: 40, mark: 36, title: 'text-lg', sub: 'text-[10px]' },
    lg: { img: 56, mark: 48, title: 'text-2xl', sub: 'text-xs' },
    xl: { img: 80, mark: 68, title: 'text-3xl', sub: 'text-sm' },
  };

  const { img, mark, title, sub } = sizeMap[size];

  // Official Oakland Crimson / Wine Red
  const brandCrimson = '#B3141F';

  const markSvg = (
    <svg
      width={mark}
      height={mark}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform group-hover:scale-105"
    >
      {/* Top Diamond Facet */}
      <polygon
        points="50,14 41,25 50,36 59,25"
        stroke={brandCrimson}
        strokeWidth="3.2"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Main Gothic Arch Outer Boundary */}
      <path
        d="M 50,14 C 40,24 28,34 28,52 L 28,76 L 50,83 L 72,76 L 72,52 C 72,34 60,24 50,14 Z"
        stroke={brandCrimson}
        strokeWidth="3.4"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Outer Left & Right Wing Steps */}
      <path
        d="M 28,34 L 20,38 L 20,68 L 28,72"
        stroke={brandCrimson}
        strokeWidth="3.2"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 72,34 L 80,38 L 80,68 L 72,72"
        stroke={brandCrimson}
        strokeWidth="3.2"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Central Book Spine & Open Pages */}
      <path
        d="M 23,80 L 50,85 L 77,80"
        stroke={brandCrimson}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M 50,85 L 50,56"
        stroke={brandCrimson}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Dynamic Inner Facet Lines (Cathedral / Seed / Book Geometry) */}
      <path
        d="M 41,25 L 35,52 L 50,56 L 65,52 L 59,25"
        stroke={brandCrimson}
        strokeWidth="3"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 35,52 L 28,60 L 50,70 L 72,60 L 65,52"
        stroke={brandCrimson}
        strokeWidth="2.8"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 50,36 L 50,56"
        stroke={brandCrimson}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );

  let content: React.ReactNode;

  if (variant === 'image') {
    content = (
      <div className={`inline-flex items-center select-none group ${className}`}>
        <Image
          src="/logo.jpg"
          alt="Oakland Schools"
          width={img * 3}
          height={img * 3}
          className="rounded-lg object-contain"
          priority
        />
      </div>
    );
  } else if (variant === 'mark') {
    content = (
      <div className={`inline-flex items-center select-none group ${className}`}>
        {markSvg}
      </div>
    );
  } else {
    content = (
      <div className={`inline-flex items-center gap-3 select-none group ${className}`}>
        {markSvg}

        <div className="flex flex-col leading-none">
          <span
            className={`font-black tracking-[0.04em] uppercase font-serif ${title} ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}
          >
            Oakland
          </span>
          <span
            className={`font-bold tracking-[0.32em] uppercase font-sans ${sub} ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            Schools
          </span>
        </div>
      </div>
    );
  }

  if (href) {
    return (
      <Link href={href} className="focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
