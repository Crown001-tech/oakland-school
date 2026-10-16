'use client';

import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { X, ArrowRight } from 'lucide-react';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Academics', href: '/academics' },
  { label: 'Our Values', href: '/our-values' },
  { label: 'Admissions', href: '/admissions' },
];

const emptySubscribe = () => () => {};

export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const pathname = usePathname();
  const currentPathRef = useRef(pathname);

  // Close drawer ONLY when the route actually changes after mount
  useEffect(() => {
    if (currentPathRef.current !== pathname) {
      currentPathRef.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Lock body scroll and handle ESC key when open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isClient || !isOpen) return null;

  const drawerContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7, 24, 26, 0.78)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          animation: 'okFadeIn 0.25s ease-out forwards',
        }}
      />

      {/* Drawer Panel */}
      <aside
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '360px',
          height: '100%',
          background: '#07181a',
          borderLeft: '1px solid rgba(212, 168, 90, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100000,
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.65)',
          animation: 'okSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          overflowY: 'auto',
        }}
      >
        <style>{`
          @keyframes okFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes okSlideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }

          /* Close Button */
          .ok-drawer-close-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #d4a85a;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        color 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            will-change: transform, background-color, border-color;
          }
          .ok-drawer-close-btn:hover {
            background: rgba(212, 168, 90, 0.2);
            border-color: #d4a85a;
            color: #ffffff;
            transform: rotate(90deg) scale(1.06);
          }
          .ok-drawer-close-btn:active {
            transform: rotate(90deg) scale(0.92);
          }

          /* Nav Links */
          .ok-drawer-nav-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 0;
            margin: 0;
          }
          .ok-drawer-nav-link {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 18px;
            border-radius: 6px;
            font-family: 'Inter', sans-serif;
            font-size: 13.5px;
            font-weight: 500;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.78);
            background: transparent;
            border-left: 3px solid transparent;
            text-decoration: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        color 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            will-change: transform, background-color, border-color;
          }
          .ok-drawer-nav-link:hover {
            color: #ffffff;
            background: rgba(212, 168, 90, 0.14);
            border-left-color: #d4a85a;
            transform: translateX(6px);
          }
          .ok-drawer-nav-link:active {
            transform: translateX(4px) scale(0.98);
            background: rgba(212, 168, 90, 0.22);
          }
          .ok-drawer-nav-link.active {
            background: #d4a85a;
            color: #07181a;
            font-weight: 700;
            border-left-color: #c4943e;
            box-shadow: 0 4px 16px rgba(212, 168, 90, 0.25);
            transform: none;
          }
          .ok-drawer-nav-link.active:hover {
            background: #e5b96c;
            color: #07181a;
            transform: translateX(3px);
            box-shadow: 0 6px 20px rgba(212, 168, 90, 0.35);
          }
          .ok-drawer-nav-link.active:active {
            transform: scale(0.98);
          }

          /* Nav Link Arrow Icon */
          .ok-drawer-nav-arrow {
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        opacity 0.25s ease,
                        color 0.25s ease;
            opacity: 0.45;
            will-change: transform;
          }
          .ok-drawer-nav-link:hover .ok-drawer-nav-arrow {
            transform: translateX(4px);
            opacity: 1;
            color: #d4a85a;
          }
          .ok-drawer-nav-link.active .ok-drawer-nav-arrow {
            opacity: 0.9;
            color: #07181a;
          }
          .ok-drawer-nav-link.active:hover .ok-drawer-nav-arrow {
            transform: translateX(2px);
          }

          /* CTA Buttons */
          .ok-drawer-cta-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 15px 20px;
            background: #b3141f;
            color: #ffffff;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            text-decoration: none;
            border-radius: 4px;
            box-shadow: 0 4px 14px rgba(179, 20, 31, 0.35);
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            will-change: transform, box-shadow;
          }
          .ok-drawer-cta-primary:hover {
            background: #c91824;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(179, 20, 31, 0.55);
          }
          .ok-drawer-cta-primary:hover svg {
            transform: translateX(4px);
          }
          .ok-drawer-cta-primary svg {
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .ok-drawer-cta-primary:active {
            transform: translateY(0) scale(0.98);
            box-shadow: 0 3px 10px rgba(179, 20, 31, 0.3);
          }

          .ok-drawer-cta-secondary {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 14px 20px;
            background: transparent;
            border: 1px solid rgba(212, 168, 90, 0.4);
            color: #d4a85a;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            text-decoration: none;
            border-radius: 4px;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                        box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            will-change: transform, background-color, border-color;
          }
          .ok-drawer-cta-secondary:hover {
            background: rgba(212, 168, 90, 0.15);
            border-color: #d4a85a;
            color: #ffffff;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(212, 168, 90, 0.25);
          }
          .ok-drawer-cta-secondary:active {
            transform: translateY(0) scale(0.98);
          }
        `}</style>

        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Logo size="sm" href="/" theme="dark" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Navigation"
            className="ok-drawer-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links Navigation */}
        <nav style={{ padding: '28px 24px', flex: 1 }}>
          <ul className="ok-drawer-nav-list">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`ok-drawer-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight size={15} className="ok-drawer-nav-arrow" />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Action CTAs */}
          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              href="/admissions"
              onClick={onClose}
              className="ok-drawer-cta-primary"
            >
              <span>Apply for Admission</span>
              <ArrowRight size={14} />
            </Link>

            <Link
              href="/login"
              onClick={onClose}
              className="ok-drawer-cta-secondary"
            >
              Staff Portal Login
            </Link>
          </div>
        </nav>
      </aside>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
