'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Compass, Award, BookOpen, Shield, Users, CheckCircle2, ChevronRight } from 'lucide-react';

export default function AboutPage() {
  const [activeMilestone, setActiveMilestone] = useState(0);
  const [inViewSections, setInViewSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInViewSections((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const milestones = [
    {
      year: '2008',
      title: 'The Founding Vision',
      tag: 'Foundation',
      desc: 'Founded on Victoria Island with 60 pioneer scholars and 12 distinguished educators, Oakland Schools was established to provide an uncompromised standard of British-Nigerian secondary education.',
    },
    {
      year: '2014',
      title: 'Cambridge International Accreditation',
      tag: 'Global Standard',
      desc: 'Accredited by Cambridge Assessment International Education. Our inaugural IGCSE cohort recorded a 98.4% distinction rate, cementing Oakland as an academic powerhouse.',
    },
    {
      year: '2019',
      title: 'The Rotunda & STEM Innovation Center',
      tag: 'Campus Expansion',
      desc: 'Commissioned the 15,000-volume Rotunda Research Library and the multi-tier Robotics & Artificial Intelligence laboratory, fostering experimental inquiry and technological fluency.',
    },
    {
      year: '2023',
      title: 'Pan-African Academic Distinction Award',
      tag: 'Accolade',
      desc: 'Recognized by the West African Examinations Council (WAEC) as the Highest Performing Private Secondary Institution in Science and Humanities in Lagos State.',
    },
    {
      year: '2026',
      title: 'Eighteen Years of Transformative Leadership',
      tag: 'Present Era',
      desc: 'Celebrating 18 years of academic nobility with over 1,250 active scholars, an alumni network across top global universities (Oxford, MIT, Imperial, Toronto), and 100% university matriculation.',
    },
  ];

  return (
    <div className="ok-about-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

        /* ── ROOT THEMING ── */
        .ok-about-page {
          --obsidian: #07181a;
          --gold: #d4a85a;
          --gold-hover: #c4943e;
          --crimson: #b3141f;
          --cream: #f5f2ed;
          --cream-card: #ffffff;
          --border-gold: rgba(212, 168, 90, 0.25);
          --text-dark: #07181a;
          --text-muted: #5a6578;
          --text-light: rgba(255, 255, 255, 0.85);

          background-color: var(--cream);
          color: var(--text-dark);
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
        }

        /* ── HERO BANNER ── */
        .about-hero {
          position: relative;
          min-height: 80vh;
          display: flex;
          align-items: flex-end;
          background: var(--obsidian);
          overflow: hidden;
          padding: 120px 32px 80px;
        }
        .about-hero-media {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .about-hero-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
          transform: scale(1.05);
          animation: subtleZoom 16s ease-in-out infinite alternate;
        }
        @keyframes subtleZoom {
          0% { transform: scale(1.05); }
          100% { transform: scale(1.0); }
        }
        .about-hero-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(7, 24, 26, 0.65) 0%,
            rgba(7, 24, 26, 0.45) 40%,
            rgba(7, 24, 26, 0.94) 95%
          );
        }
        .about-hero-inner {
          position: relative;
          z-index: 2;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }
        .about-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(42px, 6.5vw, 84px);
          font-weight: 900;
          color: #ffffff;
          line-height: 1.05;
          letter-spacing: -0.02em;
          max-width: 960px;
          margin-bottom: 24px;
        }
        .about-hero-title em {
          font-style: italic;
          color: var(--gold);
          font-weight: 400;
        }
        .about-hero-subtitle {
          font-size: clamp(16px, 1.8vw, 20px);
          font-weight: 300;
          color: rgba(255, 255, 255, 0.8);
          max-width: 660px;
          line-height: 1.7;
          margin-bottom: 40px;
        }

        /* ── STATS DOCK ── */
        .stats-dock {
          background: var(--obsidian);
          border-top: 1px solid var(--border-gold);
          border-bottom: 1px solid var(--border-gold);
          padding: 44px 32px;
        }
        .stats-dock-grid {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 32px;
        }
        .stats-dock-item {
          border-left: 2px solid var(--gold);
          padding-left: 24px;
          transition: transform 0.3s ease;
        }
        .stats-dock-item:hover {
          transform: translateY(-4px);
        }
        .stats-dock-val {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 3.5vw, 48px);
          font-weight: 700;
          color: var(--gold);
          line-height: 1;
          margin-bottom: 8px;
        }
        .stats-dock-lbl {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
        }
        .stats-dock-desc {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 4px;
          font-weight: 300;
        }

        /* ── SECTION: HEADMASTER WELCOME ── */
        .headmaster-section {
          padding: 120px 32px;
          background: #ffffff;
          position: relative;
        }
        .headmaster-grid {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1.25fr;
          gap: 80px;
          align-items: center;
        }
        .portrait-frame {
          position: relative;
        }
        .portrait-frame::before {
          content: '';
          position: absolute;
          inset: -16px;
          border: 1px solid var(--gold);
          pointer-events: none;
          z-index: 1;
          opacity: 0.6;
        }
        .portrait-frame::after {
          content: '';
          position: absolute;
          width: 80px;
          height: 80px;
          bottom: -24px;
          right: -24px;
          background: rgba(179, 20, 31, 0.08);
          z-index: 0;
        }
        .portrait-img-box {
          position: relative;
          aspect-ratio: 4/5;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(7, 24, 26, 0.14);
          z-index: 2;
        }
        .portrait-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .portrait-frame:hover .portrait-img {
          transform: scale(1.03);
        }
        .portrait-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(7, 24, 26, 0.95), transparent);
          padding: 24px;
          z-index: 3;
        }
        .portrait-name {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          color: #ffffff;
          font-weight: 700;
        }
        .portrait-role {
          font-size: 11px;
          color: var(--gold);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .headmaster-letter {
          padding-left: 20px;
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
          margin-bottom: 28px;
        }
        .editorial-heading em {
          font-style: italic;
          color: var(--crimson);
        }
        .drop-cap-p {
          font-size: 16px;
          line-height: 1.85;
          color: #3e4a59;
          font-weight: 300;
          margin-bottom: 22px;
        }
        .drop-cap-p::first-letter {
          float: left;
          font-family: 'Playfair Display', serif;
          font-size: 64px;
          line-height: 52px;
          padding-top: 4px;
          padding-right: 14px;
          padding-bottom: 0;
          color: var(--crimson);
          font-weight: 700;
        }
        .quote-block {
          position: relative;
          background: #faf8f5;
          border-left: 3px solid var(--gold);
          padding: 24px 28px;
          margin: 32px 0;
        }
        .quote-text {
          font-family: 'Playfair Display', serif;
          font-size: 19px;
          font-style: italic;
          line-height: 1.6;
          color: var(--obsidian);
        }
        .signoff-box {
          margin-top: 36px;
          display: flex;
          align-items: center;
          gap: 24px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          padding-top: 24px;
        }
        .seal-mark {
          width: 52px;
          height: 52px;
          border: 1px solid var(--gold);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold);
          font-family: 'Playfair Display', serif;
          font-weight: 900;
          font-size: 18px;
          letter-spacing: -0.05em;
          background: var(--obsidian);
        }
        .signoff-meta h6 {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          color: var(--obsidian);
        }
        .signoff-meta p {
          font-size: 12px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        /* ── SECTION: CHRONOLOGY / TIMELINE ── */
        .timeline-section {
          background: var(--obsidian);
          padding: 130px 32px;
          color: #ffffff;
          position: relative;
        }
        .timeline-header {
          max-width: 1280px;
          margin: 0 auto 70px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 40px;
          flex-wrap: wrap;
        }
        .timeline-header .section-eyebrow {
          color: var(--gold);
        }
        .timeline-header .section-eyebrow::after {
          background: var(--gold);
        }
        .timeline-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 4vw, 56px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.1;
        }
        .timeline-nav {
          display: flex;
          gap: 8px;
        }
        .milestone-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.6);
          padding: 10px 18px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .milestone-btn:hover {
          border-color: var(--gold);
          color: #ffffff;
        }
        .milestone-btn.active {
          background: var(--gold);
          color: var(--obsidian);
          border-color: var(--gold);
          font-weight: 700;
        }

        .timeline-showcase {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-gold);
          padding: 56px;
          position: relative;
        }
        .milestone-left {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .milestone-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold);
          background: rgba(212, 168, 90, 0.12);
          padding: 6px 14px;
          align-self: flex-start;
        }
        .milestone-year {
          font-family: 'Playfair Display', serif;
          font-size: clamp(64px, 8vw, 110px);
          font-weight: 900;
          color: rgba(212, 168, 90, 0.9);
          line-height: 0.9;
          letter-spacing: -0.04em;
        }
        .milestone-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(24px, 2.5vw, 36px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.25;
        }
        .milestone-desc {
          font-size: 16px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.75);
          font-weight: 300;
        }
        .milestone-right-media {
          position: relative;
          aspect-ratio: 16/10;
          overflow: hidden;
          border: 1px solid rgba(212, 168, 90, 0.3);
        }
        .milestone-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
          transition: transform 1.2s ease;
        }
        .timeline-showcase:hover .milestone-img {
          transform: scale(1.04);
        }

        /* ── SECTION: CAMPUS & LIFE ── */
        .campus-section {
          padding: 130px 32px;
          background: var(--cream);
        }
        .campus-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .campus-intro {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: flex-end;
          margin-bottom: 70px;
        }
        .campus-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }
        .campus-card {
          position: relative;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        }
        .campus-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(7, 24, 26, 0.08);
          border-color: var(--gold);
        }
        .campus-card-media {
          position: relative;
          aspect-ratio: 16/10;
          overflow: hidden;
        }
        .campus-card-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
          transition: transform 0.8s ease;
        }
        .campus-card:hover .campus-card-img {
          transform: scale(1.06);
        }
        .campus-card-content {
          padding: 32px 28px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .campus-tag {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--crimson);
          margin-bottom: 12px;
        }
        .campus-title {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--obsidian);
          margin-bottom: 14px;
        }
        .campus-text {
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-muted);
          font-weight: 300;
          margin-bottom: 24px;
        }
        .campus-feature-list {
          list-style: none;
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          padding-top: 16px;
        }
        .campus-feature-list li {
          font-size: 12px;
          font-weight: 500;
          color: var(--obsidian);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── SECTION: GOVERNANCE & FACULTY COUNCIL ── */
        .governance-section {
          background: #ffffff;
          padding: 120px 32px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }
        .gov-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .gov-banner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          background: var(--obsidian);
          padding: 60px;
          color: #ffffff;
          border-left: 6px solid var(--gold);
          margin-bottom: 80px;
        }
        .gov-banner h3 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 3vw, 42px);
          font-weight: 700;
          line-height: 1.2;
          color: #ffffff;
        }
        .gov-banner h3 em {
          color: var(--gold);
          font-style: italic;
        }
        .gov-banner p {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.78);
        }

        .pillars-quad {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 32px;
        }
        .quad-item {
          padding: 32px 24px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #faf8f5;
          position: relative;
          transition: all 0.3s ease;
        }
        .quad-item:hover {
          background: #ffffff;
          border-color: var(--gold);
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(7, 24, 26, 0.06);
        }
        .quad-num {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: var(--crimson);
          margin-bottom: 16px;
        }
        .quad-heading {
          font-family: 'Playfair Display', serif;
          font-size: 19px;
          font-weight: 700;
          color: var(--obsidian);
          margin-bottom: 10px;
        }
        .quad-body {
          font-size: 13px;
          line-height: 1.7;
          color: var(--text-muted);
          font-weight: 300;
        }

        /* ── SECTION: CALL TO ACTION ── */
        .cta-strip {
          position: relative;
          background: var(--obsidian);
          padding: 100px 32px;
          overflow: hidden;
          text-align: center;
        }
        .cta-strip::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(212, 168, 90, 0.15), transparent 70%);
          pointer-events: none;
        }
        .cta-content {
          position: relative;
          z-index: 2;
          max-width: 800px;
          margin: 0 auto;
        }
        .cta-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 4.5vw, 56px);
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 20px;
          line-height: 1.15;
        }
        .cta-title em {
          font-style: italic;
          color: var(--gold);
        }
        .cta-sub {
          font-size: 16px;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.75);
          margin-bottom: 40px;
          line-height: 1.7;
        }
        .cta-actions {
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
          .headmaster-grid { grid-template-columns: 1fr; gap: 50px; }
          .timeline-showcase { grid-template-columns: 1fr; padding: 36px; }
          .campus-grid { grid-template-columns: 1fr; }
          .pillars-quad { grid-template-columns: 1fr 1fr; }
          .gov-banner { grid-template-columns: 1fr; padding: 40px; }
        }
        @media (max-width: 768px) {
          .stats-dock-grid { grid-template-columns: 1fr 1fr; gap: 24px; }
          .pillars-quad { grid-template-columns: 1fr; }
          .timeline-nav { overflow-x: auto; padding-bottom: 12px; }
          .campus-intro { grid-template-columns: 1fr; gap: 20px; }
        }
      `}</style>

      {/* ── HERO BANNER ── */}
      <section className="about-hero">
        <div className="about-hero-media">
          <Image
            src="/campus-quad.jpg"
            alt="Oakland Schools Campus Quadrangle"
            fill
            priority
            className="about-hero-img"
          />
          <div className="about-hero-scrim" />
        </div>

        <div className="about-hero-inner">
          <h1 className="about-hero-title">
            Cultivating Intellectual <em>Nobility</em> &amp; Character.
          </h1>
          <p className="about-hero-subtitle">
            For nearly two decades, Oakland Schools has stood as a beacon of academic distinction in Nigeria, integrating classical British rigor with authentic African heritage and moral leadership.
          </p>
        </div>
      </section>

      {/* ── STATS DOCK ── */}
      <section className="stats-dock">
        <div className="stats-dock-grid">
          <div className="stats-dock-item">
            <div className="stats-dock-val">18</div>
            <div className="stats-dock-lbl">Years of Proven Eminence</div>
            <div className="stats-dock-desc">Continuous leadership in secondary education since 2008</div>
          </div>
          <div className="stats-dock-item">
            <div className="stats-dock-val">98.6%</div>
            <div className="stats-dock-lbl">WAEC &amp; IGCSE Distinctions</div>
            <div className="stats-dock-desc">Top 1% academic performance percentile nationwide</div>
          </div>
          <div className="stats-dock-item">
            <div className="stats-dock-val">1 : 12</div>
            <div className="stats-dock-lbl">Faculty to Student Ratio</div>
            <div className="stats-dock-desc">Bespoke mentorship tailored to every individual mind</div>
          </div>
          <div className="stats-dock-item">
            <div className="stats-dock-val">100%</div>
            <div className="stats-dock-lbl">University Matriculation</div>
            <div className="stats-dock-desc">Scholars admitted to premier institutions worldwide</div>
          </div>
        </div>
      </section>

      {/* ── SECTION: HEADMASTER WELCOME ── */}
      <section className="headmaster-section animate-on-scroll" id="headmaster">
        <div className="headmaster-grid">
          <div className="portrait-frame">
            <div className="portrait-img-box">
              <Image
                src="/headmaster.jpg"
                alt="Headmaster of Oakland Schools"
                fill
                className="portrait-img"
              />
              <div className="portrait-caption">
                <div className="portrait-name">Dr. Babatunde Adeleke, F.Ed</div>
                <div className="portrait-role">Principal &amp; Head of College</div>
              </div>
            </div>
          </div>

          <div className="headmaster-letter">
            <div className="section-eyebrow">A Message from the Principal</div>
            <h2 className="editorial-heading">
              &ldquo;We do not merely prepare students for exams; we prepare them for <em>eternity and influence</em>.&rdquo;
            </h2>

            <p className="drop-cap-p">
              Welcome to Oakland Schools. When we opened our gates in 2008, our founding premise was bold yet timeless: that a truly world-class education must wed intellectual precision with deep moral conviction. In an increasingly interconnected world, tomorrow&apos;s challenges will not be solved by knowledge alone, but by leaders of conscience, resilience, and vision.
            </p>

            <p className="drop-cap-p" style={{ marginTop: -8 }}>
              Here on our Victoria Island campus, we have created an academic sanctuary where curiosity is nurtured, discipline is celebrated, and every child is challenged to explore the perimeter of their potential. Our educators are master scholars who view teaching as a noble calling, walking alongside our young men and women from their first day in JSS 1 to their triumphant graduation in SS 3.
            </p>

            <div className="quote-block">
              <p className="quote-text">
                &ldquo;An Oakland scholar is instantly recognizable: thoughtful in speech, rigorous in inquiry, gracious in victory, and unshakeable in moral compass.&rdquo;
              </p>
            </div>

            <div className="signoff-box">
              <div className="seal-mark">OS</div>
              <div className="signoff-meta">
                <h6>Dr. Babatunde Adeleke, M.A., Ph.D.</h6>
                <p>Head of College &bull; Oakland Schools Victoria Island</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: CHRONOLOGY / TIMELINE ── */}
      <section className="timeline-section animate-on-scroll" id="chronology">
        <div className="timeline-header">
          <div>
            <div className="section-eyebrow">Our Historic Trajectory</div>
            <h2>Eighteen Years of Distinctive Heritage</h2>
          </div>

          <div className="timeline-nav">
            {milestones.map((m, idx) => (
              <button
                key={m.year}
                onClick={() => setActiveMilestone(idx)}
                className={`milestone-btn ${activeMilestone === idx ? 'active' : ''}`}
              >
                {m.year}
              </button>
            ))}
          </div>
        </div>

        <div className="timeline-showcase">
          <div className="milestone-left">
            <span className="milestone-badge">{milestones[activeMilestone].tag}</span>
            <div className="milestone-year">{milestones[activeMilestone].year}</div>
            <h3 className="milestone-title">{milestones[activeMilestone].title}</h3>
            <p className="milestone-desc">{milestones[activeMilestone].desc}</p>
          </div>

          <div className="milestone-right-media">
            <Image
              src={activeMilestone === 2 ? '/library.jpg' : activeMilestone === 3 ? '/stem-lab.jpg' : '/hero-campus.jpg'}
              alt={milestones[activeMilestone].title}
              fill
              className="milestone-img"
            />
          </div>
        </div>
      </section>

      {/* ── SECTION: CAMPUS & INFRASTRUCTURE ── */}
      <section className="campus-section animate-on-scroll" id="campus">
        <div className="campus-inner">
          <div className="campus-intro">
            <div>
              <div className="section-eyebrow">Designed for Purpose</div>
              <h2 className="editorial-heading">
                A Purpose-Built Haven for <em>Scholarship</em> &amp; Discovery
              </h2>
            </div>
            <p style={{ color: '#5a6578', fontSize: 16, lineHeight: 1.8, fontWeight: 300 }}>
              Our 12-acre enclosed campus in the heart of Victoria Island blends classical collegiate architecture with cutting-edge academic technology, creating an inspiring sanctuary for holistic growth.
            </p>
          </div>

          <div className="campus-grid">
            <div className="campus-card">
              <div className="campus-card-media">
                <Image
                  src="/library.jpg"
                  alt="The Rotunda Library"
                  fill
                  className="campus-card-img"
                />
              </div>
              <div className="campus-card-content">
                <span className="campus-tag">Intellectual Hub</span>
                <h3 className="campus-title">The Rotunda Library</h3>
                <p className="campus-text">
                  A two-story collegiate rotunda housing over 15,000 scholarly volumes, silent reading bays, digital JSTOR archives, and quiet study alcoves.
                </p>
                <ul className="campus-feature-list">
                  <li><CheckCircle2 size={13} style={{ color: '#b3141f' }} /> 15,000+ catalogued volumes</li>
                  <li><CheckCircle2 size={13} style={{ color: '#b3141f' }} /> High-speed research terminals</li>
                  <li><CheckCircle2 size={13} style={{ color: '#b3141f' }} /> Dedicated senior thesis suites</li>
                </ul>
              </div>
            </div>

            <div className="campus-card">
              <div className="campus-card-media">
                <Image
                  src="/stem-lab.jpg"
                  alt="Robotics & Science Innovation Complex"
                  fill
                  className="campus-card-img"
                />
              </div>
              <div className="campus-card-content">
                <span className="campus-tag">Technological Mastery</span>
                <h3 className="campus-title">Advanced STEM Labs</h3>
                <p className="campus-text">
                  Four specialized laboratories for Chemistry, Biology, Physics, and Robotics, equipped with microcontrollers, 3D printers, and digital sensor suites.
                </p>
                <ul className="campus-feature-list">
                  <li><CheckCircle2 size={13} style={{ color: '#b3141f' }} /> University-grade lab apparatus</li>
                  <li><CheckCircle2 size={13} style={{ color: '#b3141f' }} /> Robotics arm programming cells</li>
                  <li><CheckCircle2 size={13} style={{ color: '#b3141f' }} /> Strict international safety standards</li>
                </ul>
              </div>
            </div>

            <div className="campus-card">
              <div className="campus-card-media">
                <Image
                  src="/athletics.jpg"
                  alt="Athletics & Performing Arts"
                  fill
                  className="campus-card-img"
                />
              </div>
              <div className="campus-card-content">
                <span className="campus-tag">Physical &amp; Creative Vigor</span>
                <h3 className="campus-title">Athletic &amp; Arts Arena</h3>
                <p className="campus-text">
                  An Olympic-grade running track, multi-purpose sports pavilion, tennis courts, and an 800-seat acoustic auditorium for symphonic and theatrical arts.
                </p>
                <ul className="campus-feature-list">
                  <li><CheckCircle2 size={13} style={{ color: '#b3141f' }} /> All-weather tartan running track</li>
                  <li><CheckCircle2 size={13} style={{ color: '#b3141f' }} /> 800-capacity acoustic hall</li>
                  <li><CheckCircle2 size={13} style={{ color: '#b3141f' }} /> Swimming pool &amp; gymnasium</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: GOVERNANCE & QUADRANGLE ── */}
      <section className="governance-section animate-on-scroll" id="governance">
        <div className="gov-inner">
          <div className="gov-banner">
            <div>
              <div className="section-eyebrow" style={{ color: '#d4a85a' }}>Institutional Guardianship</div>
              <h3>Anchored in <em>Accountability</em>, Driven by Excellence.</h3>
            </div>
            <p>
              Oakland Schools operates under the strategic oversight of an independent Board of Regents comprising distinguished educationists, industry leaders, and legal scholars dedicated to sustaining our institutional mission.
            </p>
          </div>

          <div className="pillars-quad">
            <div className="quad-item">
              <div className="quad-num">01</div>
              <h4 className="quad-heading">Academic Sanctity</h4>
              <p className="quad-body">
                Relentless fidelity to intellectual honesty, rigorous peer evaluation, and international curricular bench-marking across JSS and SS levels.
              </p>
            </div>

            <div className="quad-item">
              <div className="quad-num">02</div>
              <h4 className="quad-heading">Pastoral Care</h4>
              <p className="quad-body">
                A structured collegiate house system ensuring every scholar is known, cherished, safeguarded, and nurtured spiritually, emotionally, and socially.
              </p>
            </div>

            <div className="quad-item">
              <div className="quad-num">03</div>
              <h4 className="quad-heading">Global Matriculation</h4>
              <p className="quad-body">
                Strategic university counselling pathway guiding students into Ivy League, Russell Group, and premier African universities with prestigious merit scholarships.
              </p>
            </div>

            <div className="quad-item">
              <div className="quad-num">04</div>
              <h4 className="quad-heading">Civic Leadership</h4>
              <p className="quad-body">
                Compulsory community engagement and ethical leadership practicums instilling a profound commitment to national advancement and global stewardship.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: CALL TO ACTION ── */}
      <section className="cta-strip">
        <div className="cta-content">
          <h2 className="cta-title">
            Begin Your Child&apos;s Journey of <em>Excellence</em>.
          </h2>
          <p className="cta-sub">
            Admissions for the 2026/2027 Academic Session are now open. We invite discerning families to discover the transformative Oakland experience.
          </p>
          <div className="cta-actions">
            <Link href="/admissions" className="btn-gold">
              Apply Online Today <ArrowRight size={15} />
            </Link>
            <Link href="/academics" className="btn-outline">
              Explore Our Curriculum <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
