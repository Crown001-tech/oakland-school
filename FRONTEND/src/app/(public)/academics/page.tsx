'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Award,
  Layers,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Calendar,
  Globe2,
  Atom,
  Building2,
  Scale,
  Cpu,
  ChevronRight
} from 'lucide-react';

export default function AcademicsPage() {
  const [activeTab, setActiveTab] = useState<'jss' | 'sciences' | 'humanities' | 'commercial'>('jss');
  const [activeTerm, setActiveTerm] = useState<1 | 2 | 3>(1);

  return (
    <div className="ok-academics-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

        /* ── ROOT THEMING ── */
        .ok-academics-page {
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
        .acad-hero {
          position: relative;
          min-height: 80vh;
          display: flex;
          align-items: flex-end;
          background: var(--obsidian);
          overflow: hidden;
          padding: 120px 32px 80px;
        }
        .acad-hero-media {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .acad-hero-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
          transform: scale(1.04);
          animation: slowZoomAcad 18s ease-in-out infinite alternate;
        }
        @keyframes slowZoomAcad {
          0% { transform: scale(1.04); }
          100% { transform: scale(1.0); }
        }
        .acad-hero-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(7, 24, 26, 0.70) 0%,
            rgba(7, 24, 26, 0.50) 40%,
            rgba(7, 24, 26, 0.95) 95%
          );
        }
        .acad-hero-inner {
          position: relative;
          z-index: 2;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }
        .acad-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(42px, 6.5vw, 84px);
          font-weight: 900;
          color: #ffffff;
          line-height: 1.05;
          letter-spacing: -0.02em;
          max-width: 980px;
          margin-bottom: 24px;
        }
        .acad-hero-title em {
          font-style: italic;
          color: var(--gold);
          font-weight: 400;
        }
        .acad-hero-sub {
          font-size: clamp(16px, 1.8vw, 20px);
          font-weight: 300;
          color: rgba(255, 255, 255, 0.8);
          max-width: 680px;
          line-height: 1.7;
          margin-bottom: 40px;
        }

        /* ── METRICS STRIP ── */
        .acad-metrics {
          background: var(--obsidian);
          border-top: 1px solid var(--border-gold);
          border-bottom: 1px solid var(--border-gold);
          padding: 44px 32px;
        }
        .acad-metrics-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 32px;
        }
        .acad-metric-item {
          border-left: 2px solid var(--gold);
          padding-left: 24px;
          transition: transform 0.3s ease;
        }
        .acad-metric-item:hover {
          transform: translateY(-4px);
        }
        .acad-metric-num {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 3.5vw, 48px);
          font-weight: 700;
          color: var(--gold);
          line-height: 1;
          margin-bottom: 8px;
        }
        .acad-metric-lbl {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
        }
        .acad-metric-desc {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 4px;
          font-weight: 300;
        }

        /* ── SECTION: PHILOSOPHY & DUAL CURRICULUM ── */
        .philosophy-section {
          padding: 120px 32px;
          background: #ffffff;
        }
        .philosophy-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 80px;
          align-items: center;
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
        .body-p {
          font-size: 16px;
          line-height: 1.85;
          color: #3e4a59;
          font-weight: 300;
          margin-bottom: 20px;
        }
        .curriculum-pills {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 32px;
        }
        .curriculum-pill {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 24px;
          background: #faf8f5;
          border-left: 3px solid var(--gold);
          transition: background 0.3s;
        }
        .curriculum-pill:hover {
          background: #f4efe6;
        }
        .pill-icon {
          color: var(--crimson);
          margin-top: 3px;
          flex-shrink: 0;
        }
        .pill-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--obsidian);
          margin-bottom: 4px;
        }
        .pill-desc {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-muted);
          font-weight: 300;
        }

        .dual-visual {
          position: relative;
        }
        .dual-visual-frame {
          position: relative;
          aspect-ratio: 4/5;
          border: 1px solid var(--border-gold);
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(7, 24, 26, 0.12);
        }
        .dual-visual-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .dual-badge-floating {
          position: absolute;
          bottom: 28px;
          left: 28px;
          right: 28px;
          background: rgba(7, 24, 26, 0.94);
          backdrop-filter: blur(10px);
          border: 1px solid var(--gold);
          padding: 24px;
          color: #ffffff;
        }
        .dual-badge-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--gold);
          margin-bottom: 6px;
        }
        .dual-badge-desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.6;
        }

        /* ── SECTION: CURRICULAR PATHWAYS & DEPARTMENTS ── */
        .pathways-section {
          background: var(--obsidian);
          padding: 130px 32px;
          color: #ffffff;
        }
        .pathways-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .pathways-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 60px;
        }
        .pathways-header .section-eyebrow {
          color: var(--gold);
          justify-content: center;
        }
        .pathways-header .section-eyebrow::after {
          background: var(--gold);
        }
        .pathways-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 4vw, 56px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 18px;
        }
        .pathways-header p {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.8;
          font-weight: 300;
        }

        /* ── TABS ── */
        .pathway-tabs {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 50px;
          flex-wrap: wrap;
        }
        .pathway-tab-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.65);
          padding: 14px 28px;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .pathway-tab-btn:hover {
          border-color: var(--gold);
          color: #ffffff;
        }
        .pathway-tab-btn.active {
          background: var(--gold);
          color: var(--obsidian);
          border-color: var(--gold);
          font-weight: 700;
        }

        .pathway-detail-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-gold);
          padding: 56px;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        .pathway-card-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(26px, 2.8vw, 38px);
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 16px;
          line-height: 1.2;
        }
        .pathway-card-body {
          font-size: 15px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.75);
          font-weight: 300;
          margin-bottom: 28px;
        }
        .subjects-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .subject-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          padding: 12px 16px;
          border-left: 2px solid var(--gold);
          font-size: 13px;
          color: #ffffff;
        }
        .pathway-card-media {
          position: relative;
          aspect-ratio: 16/11;
          overflow: hidden;
          border: 1px solid rgba(212, 168, 90, 0.3);
        }
        .pathway-card-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
        }

        /* ── SECTION: ASSESSMENT & GRADING ── */
        .grading-section {
          padding: 130px 32px;
          background: var(--cream);
        }
        .grading-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .grading-layout {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 80px;
          align-items: center;
        }
        .grading-split-box {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: 44px;
          box-shadow: 0 20px 40px rgba(7, 24, 26, 0.05);
        }
        .split-bar-container {
          margin: 28px 0;
        }
        .split-bar {
          height: 36px;
          display: flex;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .split-bar-ca {
          background: var(--gold);
          color: var(--obsidian);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40%;
          transition: width 0.5s ease;
        }
        .split-bar-exam {
          background: var(--obsidian);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 60%;
        }
        .split-legend {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 24px;
        }
        .legend-item h5 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--obsidian);
          margin-bottom: 6px;
        }
        .legend-item p {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .grade-table-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }
        .grade-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Inter', sans-serif;
        }
        .grade-table th {
          background: var(--obsidian);
          color: var(--gold);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 16px 20px;
          text-align: left;
        }
        .grade-table td {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          font-size: 13px;
          color: var(--obsidian);
        }
        .grade-table tr:hover td {
          background: #faf8f5;
        }
        .grade-badge-a {
          font-weight: 700;
          color: #0d8a4f;
        }

        /* ── SECTION: ACADEMIC CALENDAR ── */
        .calendar-section {
          background: #ffffff;
          padding: 120px 32px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }
        .calendar-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .term-selector {
          display: flex;
          gap: 16px;
          margin: 40px 0;
          flex-wrap: wrap;
        }
        .term-btn {
          flex: 1;
          min-width: 240px;
          background: #faf8f5;
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: 24px;
          cursor: pointer;
          text-align: left;
          transition: all 0.3s ease;
        }
        .term-btn:hover {
          border-color: var(--gold);
          background: #ffffff;
        }
        .term-btn.active {
          background: var(--obsidian);
          color: #ffffff;
          border-color: var(--obsidian);
          box-shadow: 0 12px 28px rgba(7, 24, 26, 0.12);
        }
        .term-btn-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 8px;
        }
        .term-btn-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .term-btn-dates {
          font-size: 12px;
          color: var(--text-muted);
        }
        .term-btn.active .term-btn-dates {
          color: rgba(255, 255, 255, 0.65);
        }

        .calendar-agenda {
          background: #faf8f5;
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: 36px 40px;
        }
        .agenda-row {
          display: grid;
          grid-template-columns: 220px 1fr 180px;
          gap: 24px;
          padding: 20px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          align-items: center;
        }
        .agenda-row:last-child {
          border-bottom: none;
        }
        .agenda-date {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--crimson);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .agenda-event {
          font-family: 'Playfair Display', serif;
          font-size: 17px;
          font-weight: 700;
          color: var(--obsidian);
        }
        .agenda-tag {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          text-align: right;
        }

        /* ── SECTION: CALL TO ACTION ── */
        .acad-cta {
          background: var(--obsidian);
          padding: 100px 32px;
          text-align: center;
          position: relative;
        }
        .acad-cta-inner {
          max-width: 800px;
          margin: 0 auto;
        }
        .acad-cta h2 {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 4.5vw, 56px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 20px;
        }
        .acad-cta h2 em {
          font-style: italic;
          color: var(--gold);
        }
        .acad-cta p {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.75);
          font-weight: 300;
          line-height: 1.7;
          margin-bottom: 40px;
        }
        .acad-cta-btns {
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
          .philosophy-inner { grid-template-columns: 1fr; gap: 50px; }
          .pathway-detail-card { grid-template-columns: 1fr; padding: 36px; }
          .grading-layout { grid-template-columns: 1fr; gap: 40px; }
          .agenda-row { grid-template-columns: 1fr; gap: 8px; }
          .agenda-tag { text-align: left; }
        }
        @media (max-width: 768px) {
          .acad-metrics-inner { grid-template-columns: 1fr 1fr; gap: 24px; }
          .subjects-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── HERO BANNER ── */}
      <section className="acad-hero">
        <div className="acad-hero-media">
          <Image
            src="/stem-lab.jpg"
            alt="Oakland STEM and Scholarly Inquiry"
            fill
            priority
            className="acad-hero-img"
          />
          <div className="acad-hero-scrim" />
        </div>

        <div className="acad-hero-inner">
          <h1 className="acad-hero-title">
            Where Scholarly Inquiry Meets <em>Global Ambition</em>.
          </h1>
          <p className="acad-hero-sub">
            A dual-curriculum synthesis merging the depth of the British National Curriculum and Cambridge IGCSE with the comprehensive rigor of the Nigerian National Curriculum.
          </p>
        </div>
      </section>

      {/* ── METRICS STRIP ── */}
      <section className="acad-metrics">
        <div className="acad-metrics-inner">
          <div className="acad-metric-item">
            <div className="acad-metric-num">100%</div>
            <div className="acad-metric-lbl">5+ Credits inc. Math &amp; Eng</div>
            <div className="acad-metric-desc">Unbroken 18-year record in WAEC &amp; Cambridge exams</div>
          </div>
          <div className="acad-metric-item">
            <div className="acad-metric-num">1 : 12</div>
            <div className="acad-metric-lbl">Faculty-to-Scholar Ratio</div>
            <div className="acad-metric-desc">Small seminar formats with personalized intellectual scrutiny</div>
          </div>
          <div className="acad-metric-item">
            <div className="acad-metric-num">28+</div>
            <div className="acad-metric-lbl">Disciplines Offered</div>
            <div className="acad-metric-desc">Sciences, Engineering, Humanities, Arts &amp; Commercial</div>
          </div>
          <div className="acad-metric-item">
            <div className="acad-metric-num">98.4%</div>
            <div className="acad-metric-lbl">Cambridge Distinction Rate</div>
            <div className="acad-metric-desc">Grades A* to B across all IGCSE sitting cohorts</div>
          </div>
        </div>
      </section>

      {/* ── SECTION: PHILOSOPHY & DUAL CURRICULUM ── */}
      <section className="philosophy-section">
        <div className="philosophy-inner">
          <div>
            <div className="section-eyebrow">Curricular Synthesis</div>
            <h2 className="editorial-heading">
              The Dual-Engine of <em>British Depth</em> &amp; National Excellence.
            </h2>
            <p className="body-p">
              At Oakland Schools, our academic framework is engineered to eliminate false dichotomies between local cultural relevance and international competitiveness. We run a harmonized dual curriculum where scholars master the Nigerian National Curriculum while concurrently completing the British National Curriculum leading to Cambridge IGCSE qualifications.
            </p>
            <p className="body-p">
              This provides our graduates with an incomparable strategic advantage: eligibility for prestigious Nigerian universities via JAMB/UTME alongside direct, unconditional matriculation into leading Ivy League, Russell Group, and Canadian research universities.
            </p>

            <div className="curriculum-pills">
              <div className="curriculum-pill">
                <Globe2 className="pill-icon" size={22} />
                <div>
                  <h4 className="pill-title">Cambridge Assessment International Education</h4>
                  <p className="pill-desc">Lower Secondary Checkpoint at JSS 3 and Cambridge IGCSE at SS 2/3 with worldwide university recognition.</p>
                </div>
              </div>

              <div className="curriculum-pill">
                <Award className="pill-icon" size={22} />
                <div>
                  <h4 className="pill-title">National Examinations (WAEC &amp; NECO)</h4>
                  <p className="pill-desc">WASSCE and BECE examinations administered under rigorous proprietary preparation protocols with 100% distinction target.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dual-visual">
            <div className="dual-visual-frame">
              <Image
                src="/classroom.jpg"
                alt="Collegiate seminar classroom"
                fill
                className="dual-visual-img"
              />
              <div className="dual-badge-floating">
                <h4 className="dual-badge-title">Interactive Seminar Pedagogy</h4>
                <p className="dual-badge-desc">
                  Classes are conducted in collegiate seminar formats that privilege critical dialogue, socratic questioning, and empirical problem solving over rote memorization.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: CURRICULAR PATHWAYS & DEPARTMENTS ── */}
      <section className="pathways-section">
        <div className="pathways-inner">
          <div className="pathways-header">
            <div className="section-eyebrow">Academic Divisions</div>
            <h2>Specialized Departments for Focused Mastery</h2>
            <p>From foundational exploration in Junior School to disciplined specializations in Senior College, scholars follow tailored curricular pathways.</p>
          </div>

          <div className="pathway-tabs">
            <button
              onClick={() => setActiveTab('jss')}
              className={`pathway-tab-btn ${activeTab === 'jss' ? 'active' : ''}`}
            >
              <BookOpen size={15} /> Junior School (JSS 1–3)
            </button>
            <button
              onClick={() => setActiveTab('sciences')}
              className={`pathway-tab-btn ${activeTab === 'sciences' ? 'active' : ''}`}
            >
              <Atom size={15} /> Pure &amp; Applied Sciences
            </button>
            <button
              onClick={() => setActiveTab('humanities')}
              className={`pathway-tab-btn ${activeTab === 'humanities' ? 'active' : ''}`}
            >
              <Scale size={15} /> Humanities &amp; Law
            </button>
            <button
              onClick={() => setActiveTab('commercial')}
              className={`pathway-tab-btn ${activeTab === 'commercial' ? 'active' : ''}`}
            >
              <Building2 size={15} /> Commercial &amp; Economics
            </button>
          </div>

          {activeTab === 'jss' && (
            <div className="pathway-detail-card">
              <div>
                <h3 className="pathway-card-title">Junior Secondary School (JSS 1 – JSS 3)</h3>
                <p className="pathway-card-body">
                  A foundational three-year cycle focused on analytical reasoning, mathematical fluency, linguistic elegance, and scientific curiosity. Scholars complete both the Cambridge Lower Secondary Checkpoint and BECE.
                </p>
                <div className="subjects-grid">
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> English &amp; Literature</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Pure Mathematics</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Integrated Sciences</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Computer Science &amp; Coding</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> French &amp; World Languages</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Business Studies</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Social &amp; Civic Studies</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Fine Arts &amp; Design</div>
                </div>
              </div>
              <div className="pathway-card-media">
                <Image src="/library.jpg" alt="Junior School Research" fill className="pathway-card-img" />
              </div>
            </div>
          )}

          {activeTab === 'sciences' && (
            <div className="pathway-detail-card">
              <div>
                <h3 className="pathway-card-title">Pure &amp; Applied Sciences (SS 1 – SS 3)</h3>
                <p className="pathway-card-body">
                  Designed for aspiring physicians, aerospace engineers, biochemists, and AI researchers. Combines laboratory experimentation with computational modelling and university-level problem sets.
                </p>
                <div className="subjects-grid">
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Advanced Physics</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Organic &amp; Physical Chemistry</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Cellular &amp; Human Biology</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Further Mathematics</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Robotics &amp; Artificial Intelligence</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Technical Engineering Drawing</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Agricultural Science</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Data Science &amp; Python</div>
                </div>
              </div>
              <div className="pathway-card-media">
                <Image src="/stem-lab.jpg" alt="Science Lab" fill className="pathway-card-img" />
              </div>
            </div>
          )}

          {activeTab === 'humanities' && (
            <div className="pathway-detail-card">
              <div>
                <h3 className="pathway-card-title">Humanities, Law &amp; Diplomacy (SS 1 – SS 3)</h3>
                <p className="pathway-card-body">
                  Forming the future jurists, diplomats, authors, and public intellectuals of Africa. Heavy emphasis on critical jurisprudence, rhetorical elegance, political philosophy, and historical historiography.
                </p>
                <div className="subjects-grid">
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Literature-in-English</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Constitutional Government</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> World &amp; African History</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Christian / Islamic Theology</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> French Language &amp; Culture</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Visual Arts &amp; Aesthetics</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Civic Education</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Music &amp; Performance Arts</div>
                </div>
              </div>
              <div className="pathway-card-media">
                <Image src="/orchestra.jpg" alt="Humanities & Arts" fill className="pathway-card-img" />
              </div>
            </div>
          )}

          {activeTab === 'commercial' && (
            <div className="pathway-detail-card">
              <div>
                <h3 className="pathway-card-title">Commercial &amp; Financial Studies (SS 1 – SS 3)</h3>
                <p className="pathway-card-body">
                  Preparing the next generation of venture capitalists, economists, accountants, and institutional leaders. Integrates modern financial modelling, microeconomics, and global trade dynamics.
                </p>
                <div className="subjects-grid">
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Financial Accounting</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Micro &amp; Macro Economics</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Global Commerce</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Marketing &amp; Strategy</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Business Data Processing</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Mathematics &amp; Statistics</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Corporate Law &amp; Ethics</div>
                  <div className="subject-pill"><CheckCircle2 size={14} color="#d4a85a" /> Entrepreneurial Practicum</div>
                </div>
              </div>
              <div className="pathway-card-media">
                <Image src="/classroom.jpg" alt="Commercial Studies" fill className="pathway-card-img" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION: ASSESSMENT & GRADING ── */}
      <section className="grading-section">
        <div className="grading-inner">
          <div className="grading-layout">
            <div>
              <div className="section-eyebrow">Academic Accountability</div>
              <h2 className="editorial-heading">
                Continuous Assessment &amp; <em>Grading Integrity</em>
              </h2>
              <p className="body-p">
                Academic progression at Oakland is governed by transparent, continuous evaluation. We do not evaluate students solely on one high-stakes terminal examination; continuous weekly mastery ensures long-term retention and intellectual discipline.
              </p>

              <div className="grading-split-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#b3141f' }}>
                    Evaluation Distribution
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#07181a' }}>100% Total Scale</span>
                </div>

                <div className="split-bar-container">
                  <div className="split-bar">
                    <div className="split-bar-ca">40% Continuous Assessment</div>
                    <div className="split-bar-exam">60% Terminal Exam</div>
                  </div>
                </div>

                <div className="split-legend">
                  <div className="legend-item">
                    <h5>CA Breakdown (40%)</h5>
                    <p>CA1 Project (20%) &bull; CA2 Mid-Term Proctored Examination (20%). Enforces project-based inquiry and independent research.</p>
                  </div>
                  <div className="legend-item">
                    <h5>Terminal Exam (60%)</h5>
                    <p>Comprehensive synoptic examination evaluating cumulative mastery across theoretical and practical dimensions.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grade-table-card">
              <table className="grade-table">
                <thead>
                  <tr>
                    <th>Score Range</th>
                    <th>Grade</th>
                    <th>GPA Point</th>
                    <th>Classification</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>90% – 100%</td>
                    <td className="grade-badge-a">A+</td>
                    <td>4.00</td>
                    <td>High Distinction</td>
                  </tr>
                  <tr>
                    <td>80% – 89%</td>
                    <td className="grade-badge-a">A</td>
                    <td>3.80</td>
                    <td>Distinction</td>
                  </tr>
                  <tr>
                    <td>70% – 79%</td>
                    <td style={{ fontWeight: 600, color: '#1652f0' }}>B+</td>
                    <td>3.40</td>
                    <td>Very Good</td>
                  </tr>
                  <tr>
                    <td>65% – 69%</td>
                    <td style={{ fontWeight: 600, color: '#1652f0' }}>B</td>
                    <td>3.00</td>
                    <td>Good / Credit</td>
                  </tr>
                  <tr>
                    <td>60% – 64%</td>
                    <td style={{ fontWeight: 600, color: '#8c5e00' }}>C+</td>
                    <td>2.60</td>
                    <td>Credit</td>
                  </tr>
                  <tr>
                    <td>50% – 59%</td>
                    <td style={{ fontWeight: 600, color: '#8c5e00' }}>C</td>
                    <td>2.00</td>
                    <td>Pass / Baseline</td>
                  </tr>
                  <tr>
                    <td>Below 50%</td>
                    <td style={{ fontWeight: 700, color: '#b3141f' }}>F</td>
                    <td>0.00</td>
                    <td>Mandatory Remediation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: ACADEMIC CALENDAR ── */}
      <section className="calendar-section">
        <div className="calendar-inner">
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Session 2026 / 2027</div>
            <h2 className="editorial-heading">Institutional Academic Term Structure</h2>
            <p style={{ color: '#5a6578', fontSize: 15, fontWeight: 300, lineHeight: 1.8 }}>
              Oakland operates on a tripartite term calendar designed to balance rigorous academic immersion with intellectual rejuvenation.
            </p>
          </div>

          <div className="term-selector">
            <button
              onClick={() => setActiveTerm(1)}
              className={`term-btn ${activeTerm === 1 ? 'active' : ''}`}
            >
              <div className="term-btn-badge">Current Term</div>
              <div className="term-btn-title">Term 1: Autumn</div>
              <div className="term-btn-dates">September 1, 2026 – December 18, 2026</div>
            </button>

            <button
              onClick={() => setActiveTerm(2)}
              className={`term-btn ${activeTerm === 2 ? 'active' : ''}`}
            >
              <div className="term-btn-badge">Upcoming</div>
              <div className="term-btn-title">Term 2: Lent</div>
              <div className="term-btn-dates">January 11, 2027 – April 9, 2027</div>
            </button>

            <button
              onClick={() => setActiveTerm(3)}
              className={`term-btn ${activeTerm === 3 ? 'active' : ''}`}
            >
              <div className="term-btn-badge">Final Term</div>
              <div className="term-btn-title">Term 3: Trinity</div>
              <div className="term-btn-dates">April 26, 2027 – July 16, 2027</div>
            </button>
          </div>

          <div className="calendar-agenda">
            {activeTerm === 1 && (
              <>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> Sept 1, 2026</div>
                  <div className="agenda-event">Resumption &amp; Matriculation Assembly for All Scholars</div>
                  <div className="agenda-tag">Collegiate Rite</div>
                </div>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> Oct 12 – 16, 2026</div>
                  <div className="agenda-event">Continuous Assessment 1 (CA1) Project Presentations</div>
                  <div className="agenda-tag">Assessment 20%</div>
                </div>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> Nov 2 – 6, 2026</div>
                  <div className="agenda-event">Mid-Term Proctored Testing (CA2) &amp; Open Day</div>
                  <div className="agenda-tag">Assessment 20%</div>
                </div>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> Dec 7 – 16, 2026</div>
                  <div className="agenda-event">Terminal First Term Examinations &amp; Cambridge Mocks</div>
                  <div className="agenda-tag">Examinations 60%</div>
                </div>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> Dec 18, 2026</div>
                  <div className="agenda-event">Annual Christmas Carol Service &amp; Vacation Respite</div>
                  <div className="agenda-tag">Ceremonial</div>
                </div>
              </>
            )}

            {activeTerm === 2 && (
              <>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> Jan 11, 2027</div>
                  <div className="agenda-event">Lent Term Resumption &amp; Senior Scholar Colloquium</div>
                  <div className="agenda-tag">Academic Launch</div>
                </div>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> Feb 15 – 19, 2027</div>
                  <div className="agenda-event">Inter-House Science Olympiad &amp; Robotics Exhibition</div>
                  <div className="agenda-tag">STEM Competition</div>
                </div>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> March 8 – 12, 2027</div>
                  <div className="agenda-event">WAEC &amp; Cambridge IGCSE Intensive Pre-Board Practicum</div>
                  <div className="agenda-tag">Board Prep</div>
                </div>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> March 29 – Apr 7, 2027</div>
                  <div className="agenda-event">Lent Term Examinations &amp; University Application Filing</div>
                  <div className="agenda-tag">Examinations 60%</div>
                </div>
              </>
            )}

            {activeTerm === 3 && (
              <>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> Apr 26, 2027</div>
                  <div className="agenda-event">Trinity Term Resumption &amp; WAEC Candidate Consecration</div>
                  <div className="agenda-tag">Solemn Assembly</div>
                </div>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> May 10 – Jun 4, 2027</div>
                  <div className="agenda-event">Official WAEC &amp; Cambridge IGCSE Board Sittings</div>
                  <div className="agenda-tag">International Exams</div>
                </div>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> June 21 – 25, 2027</div>
                  <div className="agenda-event">Annual Inter-House Sports &amp; Cultural Gala at Teslim Balogun</div>
                  <div className="agenda-tag">Athletic Rite</div>
                </div>
                <div className="agenda-row">
                  <div className="agenda-date"><Calendar size={14} /> July 16, 2027</div>
                  <div className="agenda-event">Valedictory Service &amp; 18th Graduation Convocation</div>
                  <div className="agenda-tag">Convocation</div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── SECTION: CALL TO ACTION ── */}
      <section className="acad-cta">
        <div className="acad-cta-inner">
          <h2>
            Unlock Your Child&apos;s True <em>Scholarly Potential</em>.
          </h2>
          <p>
            Places at Oakland Schools are allocated based on entrance examination performance and academic interview. Applications are currently invited for JSS 1 and transfer scholars into JSS 2 and SS 1.
          </p>
          <div className="acad-cta-btns">
            <Link href="/admissions" className="btn-gold">
              Apply for 2026/2027 Session <ArrowRight size={15} />
            </Link>
            <Link href="/our-values" className="btn-outline">
              Explore Our Values <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
