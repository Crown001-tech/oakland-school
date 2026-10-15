import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { MapPin, Mail, Phone } from 'lucide-react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ok-public-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f2ed' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap');

        /* ── ANNOUNCEMENT BAR ── */
        .ok-bar {
          background: #b3141f;
          color: rgba(255,255,255,0.9);
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-align: center;
          padding: 10px 20px;
        }
        .ok-bar a {
          color: #fff;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
          margin-left: 8px;
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
          gap: 32px;
        }
        .ok-nav-links {
          display: flex;
          align-items: center;
          gap: 40px;
          list-style: none;
        }
        .ok-nav-link {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          transition: color 0.2s;
          position: relative;
          padding-bottom: 3px;
        }
        .ok-nav-link::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0;
          width: 0; height: 1px;
          background: #d4a85a;
          transition: width 0.3s ease;
        }
        .ok-nav-link:hover { color: #ffffff; }
        .ok-nav-link:hover::after { width: 100%; }
        .ok-nav-cta {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #07181a;
          background: #d4a85a;
          padding: 11px 24px;
          text-decoration: none;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .ok-nav-cta:hover { background: #c4943e; }

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
        .ok-footer-legal {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: #b3141f;
          font-weight: 600;
          letter-spacing: 0.06em;
        }

        @media (max-width: 1024px) {
          .ok-footer-top { grid-template-columns: 1fr 1fr; gap: 40px; }
        }
        @media (max-width: 640px) {
          .ok-nav-links { display: none; }
          .ok-footer-top { grid-template-columns: 1fr; gap: 36px; }
          .ok-nav-inner { padding: 0 20px; }
          .ok-footer { padding: 60px 20px 32px; }
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

      {/* ── Navigation ── */}
      <nav className="ok-nav">
        <div className="ok-nav-inner">
          <Logo size="md" href="/" theme="dark" />

          <ul className="ok-nav-links">
            <li><Link href="/" className="ok-nav-link">Home</Link></li>
            <li><Link href="/about" className="ok-nav-link">About</Link></li>
            <li><Link href="/academics" className="ok-nav-link">Academics</Link></li>
            <li><Link href="/our-values" className="ok-nav-link">Our Values</Link></li>
            <li><Link href="/admissions" className="ok-nav-link">Admissions</Link></li>
          </ul>

          <Link href="/login" className="ok-nav-cta">Staff Login</Link>
        </div>
      </nav>

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
            <span className="ok-footer-legal">Strictly Role-Based Access Management</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
