import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { PublicNavbar } from '@/components/brand/PublicNavbar';
import { MapPin, Mail, Phone } from 'lucide-react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ok-public-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f2ed', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap');

        /* ── ANNOUNCEMENT BAR ── */
        .ok-bar {
          background: #b3141f;
          color: rgba(255,255,255,0.92);
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-align: center;
          padding: 9px 16px;
          line-height: 1.5;
        }
        .ok-bar a {
          color: #fff;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
          margin-left: 8px;
          white-space: nowrap;
        }

        /* ── NAVBAR ── */
        .ok-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(7, 24, 26, 0.97);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(212, 168, 90, 0.2);
        }
        .ok-nav-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 32px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .ok-nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
          list-style: none;
        }
        .ok-nav-link {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          position: relative;
          padding: 8px 16px;
          border-radius: 4px;
          transition: color 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                      background-color 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, background-color, color;
        }
        .ok-nav-link::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 16px;
          right: 16px;
          height: 2px;
          background: #d4a85a;
          border-radius: 2px;
          transform: scaleX(0);
          transform-origin: center;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }
        .ok-nav-link:hover {
          color: #ffffff;
          background: rgba(212, 168, 90, 0.1);
          transform: translateY(-1px);
        }
        .ok-nav-link:hover::after {
          transform: scaleX(1);
        }
        .ok-nav-link.active {
          color: #d4a85a;
          font-weight: 600;
          background: rgba(212, 168, 90, 0.12);
        }
        .ok-nav-link.active::after {
          transform: scaleX(1);
        }
        .ok-nav-link:active {
          transform: translateY(0) scale(0.98);
        }

        .ok-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ok-nav-cta {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #07181a;
          background: #d4a85a;
          padding: 10px 22px;
          text-decoration: none;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          will-change: transform, box-shadow;
        }
        .ok-nav-cta:hover {
          background: #e5b96c;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(212, 168, 90, 0.35);
        }
        .ok-nav-cta:active {
          transform: translateY(0) scale(0.97);
          box-shadow: 0 2px 6px rgba(212, 168, 90, 0.2);
        }

        .ok-hamburger-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 6px;
          border: 1px solid rgba(212, 168, 90, 0.3);
          background: rgba(255, 255, 255, 0.05);
          color: #d4a85a;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, background-color, border-color;
        }
        .ok-hamburger-btn:hover {
          background: rgba(212, 168, 90, 0.18);
          border-color: #d4a85a;
          color: #ffffff;
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 4px 14px rgba(212, 168, 90, 0.2);
        }
        .ok-hamburger-btn:active {
          transform: translateY(0) scale(0.94);
          background: rgba(212, 168, 90, 0.28);
        }

        /* ── MOBILE DRAWER MICRO-INTERACTIONS ── */
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

        /* ── FOOTER ── */
        .ok-footer {
          background: #07181a;
          padding: 80px 32px 40px;
          margin-top: auto;
        }
        .ok-footer-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .ok-footer-top {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 60px;
          padding-bottom: 60px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ok-footer-brand p {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: rgba(255,255,255,0.4);
          line-height: 1.8;
          margin-top: 20px;
          max-width: 300px;
        }
        .ok-footer-col h5 {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #d4a85a;
          margin-bottom: 20px;
        }
        .ok-footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .ok-footer-col ul li a,
        .ok-footer-col ul li span {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: rgba(255,255,255,0.45);
          text-decoration: none;
          transition: color 0.2s;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .ok-footer-col ul li a:hover { color: rgba(255,255,255,0.85); }
        .ok-footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 28px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .ok-footer-copy {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          color: rgba(255,255,255,0.25);
          font-weight: 300;
        }

        @media (max-width: 1024px) {
          .ok-nav-links { display: none; }
          .ok-hamburger-btn { display: flex; }
          .ok-footer-top { grid-template-columns: 1fr 1fr; gap: 40px; }
        }
        @media (max-width: 640px) {
          .ok-nav-inner { padding: 0 16px; height: 68px; }
          .ok-nav-cta { display: none; }
          .ok-bar { font-size: 10px; padding: 8px 12px; }
          .ok-footer-top { grid-template-columns: 1fr; gap: 32px; }
          .ok-footer { padding: 48px 16px 28px; }
        }

        @media print {
          .ok-bar,
          .ok-nav,
          .ok-footer,
          .no-print {
            display: none !important;
          }
          body,
          html,
          main,
          .ok-public-root {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
        }
      `}</style>

      {/* ── Announcement Bar ── */}
      <div className="ok-bar">
        Admissions are open for the 2026/2027 Academic Session — Limited places available.
        <Link href="/admissions">Apply Online →</Link>
      </div>

      {/* ── Responsive Navigation Bar ── */}
      <PublicNavbar />

      {/* ── Content ── */}
      <main style={{ flex: 1 }}>{children}</main>

      {/* ── Footer ── */}
      <footer className="ok-footer">
        <div className="ok-footer-inner">
          <div className="ok-footer-top">
            <div className="ok-footer-brand">
              <Logo size="md" theme="dark" />
              <p>
                Oakland Schools is Lagos&apos;s foremost international secondary college, delivering world-class education rooted in Nigerian excellence, moral character, and global standards since 2008.
              </p>
            </div>

            <div className="ok-footer-col">
              <h5>Quick Links</h5>
              <ul>
                <li><Link href="/">Home</Link></li>
                <li><Link href="/about">About Oakland</Link></li>
                <li><Link href="/academics">Curriculum &amp; Academics</Link></li>
                <li><Link href="/our-values">Our Values</Link></li>
                <li><Link href="/admissions">Admissions</Link></li>
                <li><Link href="/login">Staff Portal</Link></li>
              </ul>
            </div>

            <div className="ok-footer-col">
              <h5>School Hours</h5>
              <ul>
                <li><span>Mon – Thu: 7:45am – 3:30pm</span></li>
                <li><span>Friday: 7:45am – 1:00pm</span></li>
                <li><span>Current Session: 2026/2027</span></li>
                <li><span>Term One in Progress</span></li>
              </ul>
            </div>

            <div className="ok-footer-col">
              <h5>Contact</h5>
              <ul>
                <li>
                  <span>
                    <MapPin size={13} style={{ color: '#b3141f', marginTop: 2, flexShrink: 0 }} />
                    14 Academic Crescent, Victoria Island, Lagos
                  </span>
                </li>
                <li>
                  <span>
                    <Phone size={13} style={{ color: '#b3141f', marginTop: 2, flexShrink: 0 }} />
                    +234 800 625 5263
                  </span>
                </li>
                <li>
                  <span>
                    <Mail size={13} style={{ color: '#b3141f', marginTop: 2, flexShrink: 0 }} />
                    info@oaklandschools.edu
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="ok-footer-bottom">
            <p className="ok-footer-copy">
              © {new Date().getFullYear()} Oakland Schools. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
