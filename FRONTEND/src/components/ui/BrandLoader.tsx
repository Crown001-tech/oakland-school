'use client';

import React from 'react';
import Image from 'next/image';
import { PRODUCT_NAME, isEductiveBrand } from '@/lib/brand';

interface BrandLoaderProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function BrandLoader({
  fullScreen = false,
  size = 'md',
  className = '',
}: BrandLoaderProps) {
  const sizeMap = {
    sm: { dimension: 44, container: 'w-16 h-16' },
    md: { dimension: 64, container: 'w-24 h-24' },
    lg: { dimension: 88, container: 'w-32 h-32' },
    xl: { dimension: 112, container: 'w-40 h-40' },
  };

  const { dimension, container } = sizeMap[size];

  const content = (
    <div className={`relative flex items-center justify-center ${container} ${className}`}>
      {/* School logo with a gentle breathing effect */}
      <div className="relative z-10 flex items-center justify-center p-2.5 rounded-2xl bg-white shadow-sm border border-slate-100">
        {isEductiveBrand() ? (
          <div className="flex items-center gap-2 px-3 py-1.5 animate-pulse">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <span
              className="font-black tracking-wider uppercase text-brand-primary"
              style={{ fontSize: Math.max(14, dimension * 0.3) }}
            >
              {PRODUCT_NAME}
            </span>
          </div>
        ) : (
          <Image
            src="/logo.jpg"
            alt="Oakland School"
            width={dimension}
            height={dimension}
            className="rounded-xl object-contain animate-pulse"
            priority
          />
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16 w-full">
      {content}
    </div>
  );
}

export default BrandLoader;
