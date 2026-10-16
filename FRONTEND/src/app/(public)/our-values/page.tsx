'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Heart,
  Sparkles,
  Users,
  Compass,
  Award,
  ChevronRight,
  Scroll,
  CheckCircle2
} from 'lucide-react';

export default function OurValuesPage() {
  const [activeHouse, setActiveHouse] = useState<'moremi' | 'balewa' | 'macaulay' | 'idia'>('moremi');

  const houses = {
    moremi: {
      name: 'House Moremi',
      color: '#b3141f',
      accent: '#d4a85a',
      motto: 'Virtus et Sapientia (Valor and Wisdom)',
      namesake: 'Queen Moremi of Ile-Ife — Paragon of self-sacrifice, civic courage, and visionary fortitude.',
      master: 'Mrs. Folake Adebisi, M.Ed',
      points: '1,420 Pts (Leading)',
      shieldLetter: 'M',
      description: 'Scholars of Moremi are recognized by their indomitable moral courage, readiness to champion justice, and willingness to place the collective welfare of the college and community above personal convenience.',
    },
    balewa: {
      name: 'House Balewa',
      color: '#0e387a',
      accent: '#d4a85a',
      motto: 'Integritas et Pax (Integrity and Peace)',
      namesake: 'Sir Abubakar Tafawa Balewa — Exemplar of rhetorical dignity, humble statesmanship, and national unity.',
      master: 'Mr. Chukwuma Obi, B.Sc, M.A',
      points: '1,385 Pts',
      shieldLetter: 'B',
      description: 'Balewa House cultivates statesmanship, diplomatic eloquence, and serene composure under pressure. Its scholars lead the collegiate debate union, Model United Nations, and editorial publications.',
    },
    macaulay: {
      name: 'House Macaulay',
      color: '#086343',
      accent: '#d4a85a',
      motto: 'Invenio et Lidero (Discover and Lead)',
      namesake: 'Herbert Macaulay — Pioneer civil engineer, surveyor, journalist, and nationalist champion.',
      master: 'Engr. Daniel Alabi, M.Tech',
      points: '1,360 Pts',
      shieldLetter: 'H',
      description: 'Macaulay scholars represent scientific ingenuity, mathematical audacity, and entrepreneurial enterprise. The house traditionally dominates the Inter-House Science Olympiad and Robotics Hackathons.',
    },
    idia: {
      name: 'House Idia',
      color: '#5b21b6',
      accent: '#d4a85a',
      motto: 'Semper Invicta (Always Unconquered)',
      namesake: 'Queen Idia of the Ancient Benin Empire — Supreme strategist, military counsel, and cultural patron.',
      master: 'Dr. (Mrs.) Zainab Sanusi, Ph.D',
      points: '1,340 Pts',
      shieldLetter: 'I',
      description: 'Idia House is celebrated for strategic brilliance, commanding resilience, and cultural sovereignty. Members excel across the performing arts, symphonic orchestra, and track and field athletics.',
    },
  };

  return (
    <div className="ok-values-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

        /* ── ROOT THEMING ── */
        .ok-values-page {
          --obsidian: #07181a;
          --gold: #d4a85a;
          --gold-hover: #c4943e;
          --crimson: #b3141f;
          --cream: #f5f2ed;
          --border-gold: rgba(212, 168, 90, 0.25);
          --text-dark: #07181a;
          --text-muted: #5a6578;

          background-color: var(--cream);
          color: var(--text-dark);
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }

        /* ── HERO BANNER ── */
        .val-hero {
          position: relative;
          min-height: 80vh;
          display: flex;
          align-items: flex-end;
          background: var(--obsidian);
          overflow: hidden;
          padding: 120px 32px 80px;
        }
        .val-hero-media {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .val-hero-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
          transform: scale(1.05);
          animation: slowZoomVal 18s ease-in-out infinite alternate;
        }
        @keyframes slowZoomVal {
          0% { transform: scale(1.05); }
          100% { transform: scale(1.0); }
        }
        .val-hero-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(7, 24, 26, 0.72) 0%,
            rgba(7, 24, 26, 0.50) 40%,
            rgba(7, 24, 26, 0.95) 95%
          );
        }
        .val-hero-inner {
          position: relative;
          z-index: 2;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }
        .val-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(42px, 6.5vw, 84px);
          font-weight: 900;
          color: #ffffff;
          line-height: 1.05;
          letter-spacing: -0.02em;
          max-width: 980px;
          margin-bottom: 24px;
        }
        .val-hero-title em {
          font-style: italic;
          color: var(--gold);
          font-weight: 400;
        }
        .val-hero-sub {
          font-size: clamp(16px, 1.8vw, 20px);
          font-weight: 300;
          color: rgba(255, 255, 255, 0.8);
          max-width: 680px;
          line-height: 1.7;
          margin-bottom: 40px;
        }

        /* ── SECTION: FOUNDATIONAL ETHOS MANIFESTO ── */
        .ethos-manifesto {
          background: var(--obsidian);
          border-top: 1px solid var(--border-gold);
          border-bottom: 1px solid var(--border-gold);
          padding: 60px 32px;
          color: #ffffff;
        }
        .ethos-manifesto-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: 60px;
          align-items: center;
        }
        .ethos-quote-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 12px;
        }
        .ethos-manifesto h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3.2vw, 44px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
        }
        .ethos-manifesto h2 em {
          color: var(--gold);
          font-style: italic;
        }
        .ethos-manifesto-p {
          font-size: 16px;
          font-weight: 300;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.78);
        }

        /* ── SECTION: THE FIVE COLUMNS (EDITORIAL ALTERNATING SPREADS) ── */
        .columns-section {
          padding: 120px 32px;
          background: #ffffff;
        }
        .columns-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .columns-intro {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 100px;
        }
        .section-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--crimson);
          margin-bottom: 16px;
        }
        .section-eyebrow::after {
          content: '';
          width: 48px;
          height: 1px;
          background: var(--crimson);
        }
        .editorial-heading {
          font-family: 'Playfair Display', serif;
          font-size: clamp(32px, 3.8vw, 52px);
          font-weight: 700;
          line-height: 1.15;
          color: var(--obsidian);
          letter-spacing: -0.01em;
          margin-bottom: 24px;
        }
        .editorial-heading em {
          font-style: italic;
          color: var(--crimson);
        }

        .pillar-spread {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 70px;
          align-items: stretch;
          margin-bottom: 120px;
        }
        .pillar-spread:last-child {
          margin-bottom: 0;
        }
        .pillar-spread.reverse {
          direction: rtl;
        }
        .pillar-spread.reverse > * {
          direction: ltr;
        }

        .spread-media {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .spread-img-box {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 480px;
          border: 1px solid var(--border-gold);
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(7, 24, 26, 0.12);
        }
        .spread-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .spread-media:hover .spread-img {
          transform: scale(1.04);
        }

        .spread-content {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          padding: 4px 0;
        }
        .spread-num {
          font-family: 'Playfair Display', serif;
          font-size: 42px;
          font-weight: 800;
          color: var(--gold);
          line-height: 1;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .spread-num::after {
          content: '';
          width: 44px;
          height: 1px;
          background: var(--gold);
          opacity: 0.5;
        }
        .spread-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3vw, 40px);
          font-weight: 700;
          color: var(--obsidian);
          margin-bottom: 16px;
          line-height: 1.2;
        }
        .spread-tagline {
          font-size: 15px;
          font-style: italic;
          color: var(--crimson);
          margin-bottom: 18px;
          font-family: 'Playfair Display', serif;
        }
        .spread-text {
          font-size: 15px;
          line-height: 1.8;
          color: #4a5568;
          font-weight: 300;
          margin-bottom: 24px;
        }
        .spread-manifesto-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          padding-top: 20px;
          margin-top: auto;
        }
        .spread-manifesto-list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 13px;
          color: var(--obsidian);
          line-height: 1.6;
        }
        .spread-manifesto-list li svg {
          color: var(--crimson);
          margin-top: 2px;
          flex-shrink: 0;
        }

        /* ── SECTION: COLLEGIATE HOUSE SYSTEM ── */
        .house-system-section {
          background: var(--obsidian);
          padding: 130px 32px;
          color: #ffffff;
        }
        .house-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .house-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 60px;
        }
        .house-header .section-eyebrow {
          color: var(--gold);
          justify-content: center;
        }
        .house-header .section-eyebrow::after {
          background: var(--gold);
        }
        .house-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 4vw, 56px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 18px;
        }
        .house-header p {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.8;
          font-weight: 300;
        }

        .house-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 50px;
        }
        .house-tab-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 24px;
          cursor: pointer;
          text-align: left;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .house-tab-btn:hover {
          border-color: var(--gold);
          background: rgba(255, 255, 255, 0.08);
        }
        .house-tab-btn.active {
          border-color: var(--gold);
          background: rgba(212, 168, 90, 0.12);
        }
        .house-tab-crest {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 900;
          color: #ffffff;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .house-tab-name {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 4px;
        }
        .house-tab-pts {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold);
        }

        .house-spotlight {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-gold);
          padding: 60px;
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 60px;
          align-items: center;
        }
        .house-spotlight-crest {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 40px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
        }
        .crest-big {
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 44px;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 20px;
          border: 2px solid var(--gold);
        }
        .crest-motto {
          font-family: 'Playfair Display', serif;
          font-size: 16px;
          font-style: italic;
          color: var(--gold);
          margin-bottom: 8px;
        }
        .crest-sub {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .house-spotlight-info h3 {
          font-family: 'Playfair Display', serif;
          font-size: 34px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 12px;
        }
        .house-meta-row {
          display: flex;
          gap: 28px;
          padding: 16px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin: 18px 0 24px;
          flex-wrap: wrap;
        }
        .house-meta-item span {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          display: block;
          margin-bottom: 2px;
        }
        .house-meta-item strong {
          font-size: 14px;
          color: #ffffff;
          font-weight: 500;
        }
        .house-desc-p {
          font-size: 15px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.78);
          font-weight: 300;
          margin-bottom: 20px;
        }
        .house-namesake-box {
          background: rgba(255, 255, 255, 0.04);
          border-left: 3px solid var(--gold);
          padding: 16px 20px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.6;
        }

        /* ── SECTION: THE SCHOLAR'S HONOR PLEDGE ── */
        .honor-section {
          padding: 130px 32px;
          background: var(--cream);
        }
        .honor-inner {
          max-width: 900px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: 70px 60px;
          box-shadow: 0 24px 60px rgba(7, 24, 26, 0.06);
          text-align: center;
          position: relative;
        }
        .honor-inner::before {
          content: '';
          position: absolute;
          inset: 12px;
          border: 1px solid var(--border-gold);
          pointer-events: none;
        }
        .honor-seal {
          width: 64px;
          height: 64px;
          margin: 0 auto 24px;
          background: var(--obsidian);
          color: var(--gold);
          border: 1px solid var(--gold);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 900;
        }
        .honor-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3.2vw, 42px);
          font-weight: 700;
          color: var(--obsidian);
          margin-bottom: 12px;
        }
        .honor-sub {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--crimson);
          margin-bottom: 36px;
        }
        .honor-p {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-style: italic;
          line-height: 1.75;
          color: #2c384a;
          margin-bottom: 28px;
        }
        .honor-sign {
          font-size: 13px;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          padding-top: 24px;
          max-width: 480px;
          margin: 0 auto;
        }

        /* ── SECTION: CALL TO ACTION ── */
        .val-cta {
          background: var(--obsidian);
          padding: 100px 32px;
          text-align: center;
          position: relative;
        }
        .val-cta-inner {
          max-width: 800px;
          margin: 0 auto;
        }
        .val-cta h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 4.5vw, 56px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 20px;
        }
        .val-cta h2 em {
          font-style: italic;
          color: var(--gold);
        }
        .val-cta p {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.75);
          font-weight: 300;
          line-height: 1.7;
          margin-bottom: 40px;
        }
        .val-cta-btns {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .btn-gold {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: var(--gold);
          color: var(--obsidian);
          padding: 16px 36px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: background 0.25s, transform 0.25s;
        }
        .btn-gold:hover {
          background: var(--gold-hover);
          transform: translateY(-2px);
        }
        .btn-outline {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: transparent;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.4);
          padding: 15px 32px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.25s;
        }
        .btn-outline:hover {
          border-color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }

        /* ── RESPONSIVENESS ── */
        @media (max-width: 1024px) {
          .ethos-manifesto-inner { grid-template-columns: 1fr; gap: 30px; }
          .pillar-spread, .pillar-spread.reverse { grid-template-columns: 1fr; gap: 40px; direction: ltr; }
          .spread-img-box { min-height: 320px; aspect-ratio: 16/10; }
          .house-tabs { grid-template-columns: 1fr 1fr; }
          .house-spotlight { grid-template-columns: 1fr; gap: 40px; padding: 36px; }
        }
        @media (max-width: 768px) {
          .house-tabs { grid-template-columns: 1fr; }
          .honor-inner { padding: 40px 24px; }
        }
        @media (max-width: 640px) {
          .val-hero { padding: 100px 20px 48px; min-height: 60vh; }
          .val-hero-sub { font-size: 15px; margin-bottom: 24px; }
          .ethos-manifesto { padding: 40px 20px; }
          .columns-section, .house-system-section, .honor-section { padding: 60px 20px; }
          .columns-intro { margin-bottom: 40px; }
          .pillar-spread { gap: 24px; margin-bottom: 50px; }
          .spread-img-box { min-height: 240px; aspect-ratio: 16/10; }
          .spread-content { padding: 0; }
          .spread-num { font-size: 32px; }
          .spread-title { font-size: 24px; }
          .spread-text { font-size: 14px; }
          .house-tabs { gap: 10px; margin-bottom: 24px; }
          .house-tab-btn { padding: 16px; }
          .house-spotlight { padding: 24px 18px; gap: 24px; }
          .house-spotlight-crest { padding: 24px 16px; }
          .crest-big { width: 70px; height: 70px; font-size: 34px; margin-bottom: 12px; }
          .house-spotlight-info h3 { font-size: 26px; }
          .house-meta-row { gap: 16px; padding: 12px 0; margin: 14px 0 18px; }
          .honor-inner { padding: 32px 18px; }
          .honor-title { font-size: 24px; }
          .honor-signoff { flex-direction: column; align-items: flex-start; gap: 12px; }
          .cta-strip { padding: 64px 20px; }
          .cta-actions { flex-direction: column; gap: 12px; }
          .btn-gold, .btn-outline { width: 100%; justify-content: center; }
        }
        @media (max-width: 480px) {
          .house-tab-crest { width: 40px; height: 40px; font-size: 18px; }
          .house-tab-name { font-size: 16px; }
          .house-namesake-box { padding: 12px 14px; font-size: 12px; }
        }
      `}</style>

      {/* ── HERO BANNER ── */}
      <section className="val-hero">
        <div className="val-hero-media">
          <Image
            src="/orchestra.jpg"
            alt="Oakland Performing Arts and Values"
            fill
            priority
            className="val-hero-img"
          />
          <div className="val-hero-scrim" />
        </div>

        <div className="val-hero-inner">
          <h1 className="val-hero-title">
            Nurturing Moral Fortitude, Cultural Nobility &amp; <em>Unbending Integrity</em>.
          </h1>
          <p className="val-hero-sub">
            At Oakland Schools, academic brilliance is only one side of the coin. Character is our foundation, integrity our currency, and selfless service to Nigeria and the world our highest aspiration.
          </p>
        </div>
      </section>

      {/* ── SECTION: FOUNDATIONAL ETHOS MANIFESTO ── */}
      <section className="ethos-manifesto">
        <div className="ethos-manifesto-inner">
          <div>
            <div className="ethos-quote-label">The Oakland Moral Philosophy</div>
            <h2>
              &ldquo;Knowledge without <em>moral character</em> is a hazard to society.&rdquo;
            </h2>
          </div>
          <p className="ethos-manifesto-p">
            In an era of relentless technological acceleration and shifting societal norms, we ground our young scholars in virtues that never rust: honesty in inquiry, chivalry in conduct, devotion to communal welfare, and an unwavering reverence for human dignity. An Oakland graduate stands tall not solely because of the prizes won, but because of the compromises they refused to make.
          </p>
        </div>
      </section>

      {/* ── SECTION: THE FIVE CORNERSTONES (EDITORIAL SPREADS) ── */}
      <section className="columns-section">
        <div className="columns-inner">
          <div className="columns-intro">
            <div className="section-eyebrow">Pillars of Character</div>
            <h2 className="editorial-heading">
              How Character is <em>Formed</em>, Not Merely Taught
            </h2>
            <p style={{ color: '#5a6578', fontSize: 16, fontWeight: 300, lineHeight: 1.8 }}>
              We do not treat character as an extracurricular elective. It is woven into the very fabric of our collegiate routines, classroom interactions, sporting contests, and civic duties.
            </p>
          </div>

          {/* Cornerstone 1 */}
          <div className="pillar-spread">
            <div className="spread-media">
              <div className="spread-img-box">
                <Image
                  src="/library.jpg"
                  alt="Intellectual Integrity at Rotunda Library"
                  fill
                  className="spread-img"
                />
              </div>
            </div>

            <div className="spread-content">
              <div className="spread-num">01</div>
              <h3 className="spread-title">Intellectual Integrity &amp; Veritas</h3>
              <p className="spread-tagline">&ldquo;Truth sought without fear, held without compromise.&rdquo;</p>
              <p className="spread-text">
                Scholars are taught that intellectual honesty is non-negotiable. Whether drafting a senior research dissertation, executing a chemistry synthesis, or sitting an examination, an Oakland student refuses deceit, plagiarism, and intellectual shortcuts.
              </p>
              <ul className="spread-manifesto-list">
                <li>
                  <CheckCircle2 size={16} />
                  <span><strong>Solemn Matriculation Honor Code:</strong> Signed annually by every scholar and faculty member.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span><strong>Blind Peer Evaluation:</strong> Rigorous protocols that celebrate authentic mastery over artificial scores.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Cornerstone 2 */}
          <div className="pillar-spread reverse">
            <div className="spread-media">
              <div className="spread-img-box">
                <Image
                  src="/campus-quad.jpg"
                  alt="Campus Quadrangle and Community"
                  fill
                  className="spread-img"
                />
              </div>
            </div>

            <div className="spread-content">
              <div className="spread-num">02</div>
              <h3 className="spread-title">Civic Nobility &amp; Noblesse Oblige</h3>
              <p className="spread-tagline">&ldquo;To whom immense privilege is given, extraordinary service is demanded.&rdquo;</p>
              <p className="spread-text">
                True nobility does not isolate itself; it bends down to serve. Our students actively engage in structured civic outreach, partnering with local schools, environmental conservation bodies, and public health foundations across Lagos State.
              </p>
              <ul className="spread-manifesto-list">
                <li>
                  <CheckCircle2 size={16} />
                  <span><strong>60 Hours Compulsory Civic Service:</strong> Mandatory community practicum required for graduation.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span><strong>Peer Literacy Tutoring:</strong> Oakland scholars mentor younger students in neighboring public primary schools weekly.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Cornerstone 3 */}
          <div className="pillar-spread">
            <div className="spread-media">
              <div className="spread-img-box">
                <Image
                  src="/orchestra.jpg"
                  alt="Aesthetic Nobility & Youth Orchestra"
                  fill
                  className="spread-img"
                />
              </div>
            </div>

            <div className="spread-content">
              <div className="spread-num">03</div>
              <h3 className="spread-title">Aesthetic Nobility &amp; Cultural Grace</h3>
              <p className="spread-tagline">&ldquo;Cultivating refinement of the senses, elegance in expression.&rdquo;</p>
              <p className="spread-text">
                We believe that education must cultivate the soul. Through our 80-member youth symphony orchestra, choral academy, classical African drama troupe, and visual arts studios, scholars develop an appreciation for timeless beauty, poise, and oratorical grace.
              </p>
              <ul className="spread-manifesto-list">
                <li>
                  <CheckCircle2 size={16} />
                  <span><strong>Symphonic &amp; Chamber Music:</strong> Every Junior scholar is trained in sight-reading and orchestral performance.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span><strong>Classical Rhetoric &amp; Debate:</strong> Regular parliamentary debates teaching respectful dissent and philosophical acuity.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Cornerstone 4 */}
          <div className="pillar-spread reverse">
            <div className="spread-media">
              <div className="spread-img-box">
                <Image
                  src="/athletics.jpg"
                  alt="Athletic Fortitude & Sportsmanship"
                  fill
                  className="spread-img"
                />
              </div>
            </div>

            <div className="spread-content">
              <div className="spread-num">04</div>
              <h3 className="spread-title">Athletic Grit &amp; Unconquerable Fortitude</h3>
              <p className="spread-tagline">&ldquo;Testing the body to forge an invincible spirit.&rdquo;</p>
              <p className="spread-text">
                Character is tested when the lungs burn and the body demands surrender. On our Olympic running track, basketball pavilion, and playing fields, scholars discover the irreplaceable lessons of sportsmanship: how to win with magnanimity and lose with dignity.
              </p>
              <ul className="spread-manifesto-list">
                <li>
                  <CheckCircle2 size={16} />
                  <span><strong>Comprehensive Sports Conditioning:</strong> Athletics, swimming, tennis, soccer, and cross-country running.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} />
                  <span><strong>Chivalric Sportsmanship:</strong> Zero tolerance for unsporting conduct; celebration of team cohesion over individual hubris.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: THE COLLEGIATE HOUSE SYSTEM ── */}
      <section className="house-system-section">
        <div className="house-inner">
          <div className="house-header">
            <div className="section-eyebrow">Collegiate Fraternity</div>
            <h2>The Four Houses of Oakland</h2>
            <p>
              Upon matriculation, every scholar is permanently inducted into one of four collegiate houses. Spanning JSS 1 through SS 3, the House System fosters inter-generational brotherhood, pastoral care, and healthy collegiate rivalry.
            </p>
          </div>

          <div className="house-tabs">
            {(['moremi', 'balewa', 'macaulay', 'idia'] as const).map((key) => {
              const h = houses[key];
              return (
                <button
                  key={key}
                  onClick={() => setActiveHouse(key)}
                  className={`house-tab-btn ${activeHouse === key ? 'active' : ''}`}
                >
                  <div className="house-tab-crest" style={{ backgroundColor: h.color }}>
                    {h.shieldLetter}
                  </div>
                  <div>
                    <div className="house-tab-name">{h.name}</div>
                    <div className="house-tab-pts">{h.points}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* House Spotlight */}
          <div className="house-spotlight">
            <div className="house-spotlight-crest">
              <div className="crest-big" style={{ backgroundColor: houses[activeHouse].color }}>
                {houses[activeHouse].shieldLetter}
              </div>
              <div className="crest-motto">&ldquo;{houses[activeHouse].motto}&rdquo;</div>
              <div className="crest-sub">Official House Insignia</div>
            </div>

            <div className="house-spotlight-info">
              <h3>{houses[activeHouse].name}</h3>

              <div className="house-meta-row">
                <div className="house-meta-item">
                  <span>House Master</span>
                  <strong>{houses[activeHouse].master}</strong>
                </div>
                <div className="house-meta-item">
                  <span>Inter-House Standing</span>
                  <strong>{houses[activeHouse].points}</strong>
                </div>
                <div className="house-meta-item">
                  <span>Primary Ethos</span>
                  <strong>{houses[activeHouse].motto}</strong>
                </div>
              </div>

              <p className="house-desc-p">{houses[activeHouse].description}</p>

              <div className="house-namesake-box">
                <strong style={{ color: '#d4a85a' }}>Historic Namesake: </strong>
                {houses[activeHouse].namesake}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: THE SCHOLAR'S HONOR PLEDGE ── */}
      <section className="honor-section">
        <div className="honor-inner">
          <div className="honor-seal">OS</div>
          <h2 className="honor-title">The Oakland Scholar&apos;s Matriculation Oath</h2>
          <div className="honor-sub">Recited Solenmly at Every Michaelmas Convocation</div>

          <p className="honor-p">
            &ldquo;I solemnly pledge upon my honor that as a scholar of Oakland Schools, I shall pursue truth without compromise, defend the dignity of my peers, honor my educators, uphold absolute integrity in all academic work, and dedicate my gifts to the service of my country, Nigeria, and humanity.&rdquo;
          </p>

          <div className="honor-sign">
            Adopted by the Oakland Senate of Regents &bull; Victoria Island, Lagos
          </div>
        </div>
      </section>

      {/* ── SECTION: CALL TO ACTION ── */}
      <section className="val-cta">
        <div className="val-cta-inner">
          <h2>
            Raise a Child of <em>Honor and Substance</em>.
          </h2>
          <p>
            Join a community that believes intellect is only crowned when accompanied by character. Inquire about admissions for the 2026/2027 academic session.
          </p>
          <div className="val-cta-btns">
            <Link href="/admissions" className="btn-gold">
              Apply for Admission <ArrowRight size={15} />
            </Link>
            <Link href="/about" className="btn-outline">
              Learn About Our Heritage <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
