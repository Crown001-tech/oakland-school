'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { MobileNavDrawer } from '@/components/brand/MobileNavDrawer';
import { Menu } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Academics', href: '/academics' },
  { label: 'Our Values', href: '/our-values' },
  { label: 'Admissions', href: '/admissions' },
];

export function PublicNavbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  const handleOpen = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  return (
    <>
      <nav className="ok-nav">
        <div className="ok-nav-inner">
          <Logo size="md" href="/" theme="dark" />

          {/* Desktop Nav Links (Hidden on screens <= 1024px) */}
          <ul className="ok-nav-links">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`ok-nav-link ${isActive ? 'active' : ''}`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right Action Area */}
          <div className="ok-nav-actions">
            <Link href="/login" className="ok-nav-cta">
              Staff Login
            </Link>

            {/* Mobile Hamburger Button (Visible only <= 1024px) */}
            <button
              type="button"
              className="ok-hamburger-btn"
              onClick={handleOpen}
              aria-label="Open Navigation Menu"
              aria-expanded={isDrawerOpen}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {/* Slide-in Mobile Drawer */}
      <MobileNavDrawer
        isOpen={isDrawerOpen}
        onClose={handleClose}
      />
    </>
  );
}
