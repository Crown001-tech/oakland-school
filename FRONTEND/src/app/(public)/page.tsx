'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight as ChevRight, BookOpen, Sprout, Users, Building2, GraduationCap, Landmark } from 'lucide-react';

/* ─────────────── COUNTER HOOK ─────────────── */
function useCountUp(target: number, duration = 2000, trigger: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [trigger, target, duration]);
  return count;
}

function StatCounter({ value, suffix, label, trigger }: { value: number; suffix: string; label: string; trigger: boolean }) {
  const count = useCountUp(value, 1800, trigger);
  return (
    <div className="stat-item">
      <span className="stat-number">{count}{suffix}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

/* ─────────────── HERO SLIDES CONFIG ─────────────── */
const HERO_SLIDES = [
  { src: '/hero-campus.jpg', alt: 'Oakland Campus', caption: 'Main Campus — Victoria Island' },
  { src: '/students-lab.jpg', alt: 'Science Lab', caption: 'State-of-the-Art Laboratories' },
  { src: '/library.jpg', alt: 'Library', caption: 'Grand Two-Storey Library' },
  { src: '/classroom.jpg', alt: 'Smart Classroom', caption: 'Smart Technology Classrooms' },
];

/* The rotating word that replaces "Excellence" */
const ROTATING_WORDS = ['Excellence', 'Character', 'Leadership', 'Integrity', 'Purpose'];

/* ─────────────── PILLARS DATA ─────────────── */
const PILLARS = [
  {
    icon: BookOpen,
    image: '/classroom.jpg',
    title: 'Academic Rigour',
    text: 'CA scores (40%) and terminal exams (60%) are transparently verified before any result is published.',
  },
  {
    icon: Sprout,
    image: '/orchestra.jpg',
    title: 'Character & Values',
    text: 'Daily assemblies, pastoral care, and a house system nurture discipline, integrity, and responsibility.',
  },
  {
    icon: Users,
    image: '/campus-quad.jpg',
    title: 'Parent Visibility',
    text: 'Automated alerts for attendance, incidents, and sealed digital report cards keep parents fully informed.',
  },
  {
    icon: Building2,
    image: '/stem-lab.jpg',
    title: 'Modern Facilities',
    text: 'Smart-board classrooms, chemistry and biology labs, a two-storey library, and ICT suites — all in daily use.',
  },
  {
    icon: GraduationCap,
    image: '/headmaster.jpg',
    title: 'Qualified Teachers',
    text: 'Every teacher is a subject-certified specialist — assigned only within their area of professional training.',
  },
  {
    icon: Landmark,
    image: '/library.jpg',
    title: 'Financial Integrity',
    text: 'A fully audited bursary system handles all fees, salaries, and expenditures with complete accountability.',
  },
];

export default function HomePage() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  /* Pillars reveal state */
  const pillarsRef = useRef<HTMLElement>(null);
  const [pillarsVisible, setPillarsVisible] = useState(false);
  const [activePillar, setActivePillar] = useState(0);

  /* Hero slider state */
  const [slideIndex, setSlideIndex] = useState(0);
  const slideCount = HERO_SLIDES.length;

  /* Rotating word state */
  const [wordIndex, setWordIndex] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);

  /* Auto-advance slider */
  useEffect(() => {
    const t = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slideCount);
    }, 5000);
    return () => clearInterval(t);
  }, [slideCount]);

  /* Rotate words with fade */
  useEffect(() => {
    const t = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
        setWordVisible(true);
      }, 400);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  /* Stats observer */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  /* Pillars observer */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPillarsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    if (pillarsRef.current) observer.observe(pillarsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── HERO ── */
        .ok-hero {
          position: relative;
          width: 100%;
          height: 100svh;
          min-height: 640px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
        }
        .ok-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.2s ease;
        }
        .ok-slide.active { opacity: 1; }
        .ok-slide img {
          width: 100%; height: 100%;
          object-fit: cover;
        }
        .ok-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            160deg,
            rgba(7,24,26,0.78) 0%,
            rgba(7,24,26,0.38) 45%,
            rgba(7,24,26,0.80) 100%
          );
          z-index: 1;
        }
        .ok-hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 32px 80px;
        }
        .ok-eyebrow {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #d4a85a;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ok-eyebrow::before {
          content: '';
          display: block;
          width: 40px; height: 1px;
          background: #d4a85a;
        }
        .ok-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(48px, 7vw, 96px);
          font-weight: 900;
          line-height: 1.0;
          color: #ffffff;
          max-width: 780px;
          margin-bottom: 28px;
          letter-spacing: -0.02em;
        }
        .ok-rotating-word {
          display: inline-block;
          color: #d4a85a;
          font-style: italic;
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .ok-rotating-word.hidden {
          opacity: 0;
          transform: translateY(8px);
        }
        .ok-rotating-word.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ok-hero-sub {
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          font-weight: 300;
          color: rgba(255,255,255,0.76);
          max-width: 540px;
          line-height: 1.7;
          margin-bottom: 40px;
        }
        .ok-cta-row { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .ok-btn-primary {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #07181a;
          background: #d4a85a;
          border: none;
          padding: 16px 36px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: background 0.25s, transform 0.2s;
        }
        .ok-btn-primary:hover { background: #c4943e; transform: translateX(3px); }
        .ok-btn-ghost {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.85);
          background: transparent;
          border: 1px solid rgba(255,255,255,0.35);
          padding: 15px 32px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: border-color 0.25s, color 0.25s;
        }
        .ok-btn-ghost:hover { border-color: rgba(255,255,255,0.8); color: #fff; }

        /* Slider nav arrows */
        .ok-slider-nav {
          position: absolute;
          bottom: 36px;
          right: 40px;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ok-slider-btn {
          width: 36px; height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.3);
          background: rgba(7,24,26,0.5);
          color: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .ok-slider-btn:hover { background: rgba(212,168,90,0.4); border-color: #d4a85a; }
        .ok-slider-dots {
          display: flex; gap: 6px; align-items: center;
        }
        .ok-slider-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.35);
          cursor: pointer;
          transition: background 0.3s, width 0.3s;
        }
        .ok-slider-dot.active {
          background: #d4a85a;
          width: 20px;
          border-radius: 3px;
        }

        .ok-scroll-hint {
          position: absolute;
          bottom: 30px; left: 50%;
          transform: translateX(-50%);
          z-index: 2;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          color: rgba(255,255,255,0.45);
          font-family: 'Inter', sans-serif;
          font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;
          animation: scrollBounce 2s ease-in-out infinite;
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(6px); }
        }

        /* ── STATS STRIP ── */
        .ok-stats-strip { background: #07181a; padding: 56px 32px; }
        .ok-stats-inner {
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
        }
        .stat-item {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 0 24px;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .stat-item:last-child { border-right: none; }
        .stat-number {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(36px, 4vw, 56px);
          font-weight: 700; color: #d4a85a; line-height: 1;
        }
        .stat-label {
          font-family: 'Inter', sans-serif;
          font-size: 11px; font-weight: 500;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(255,255,255,0.45);
        }

        /* ── EDITORIAL / ABOUT ── */
        .ok-editorial { background: #f5f2ed; padding: 120px 32px; }
        .ok-editorial-inner {
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 100px; align-items: center;
        }
        .ok-section-label {
          font-family: 'Inter', sans-serif;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.3em; text-transform: uppercase;
          color: #b3141f; margin-bottom: 24px;
          display: flex; align-items: center; gap: 12px;
        }
        .ok-section-label::after {
          content: ''; display: block; flex: 1; max-width: 60px;
          height: 1px; background: #b3141f;
        }
        .ok-h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(36px, 4vw, 56px);
          font-weight: 700; line-height: 1.12;
          letter-spacing: -0.02em; color: #07181a; margin-bottom: 28px;
        }
        .ok-h2 em { font-style: italic; color: #b3141f; }
        .ok-body-text {
          font-family: 'Inter', sans-serif;
          font-size: 15px; font-weight: 300;
          line-height: 1.8; color: #4a5568; margin-bottom: 20px;
        }
        .ok-pull-quote {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px; font-style: italic; color: #07181a;
          border-left: 3px solid #d4a85a;
          padding: 16px 0 16px 24px; margin: 32px 0; line-height: 1.55;
        }
        .ok-img-stack { position: relative; height: 560px; }
        .ok-img-main {
          position: absolute; top: 0; left: 0;
          width: 72%; height: 82%; object-fit: cover;
        }
        .ok-img-accent {
          position: absolute; bottom: 0; right: 0;
          width: 56%; height: 50%; object-fit: cover;
          border: 6px solid #f5f2ed;
        }
        .ok-img-badge {
          position: absolute; top: 50%; left: 60%;
          transform: translate(-50%, -50%);
          background: #d4a85a; color: #07181a;
          font-family: 'Inter', sans-serif;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          padding: 14px 20px; white-space: nowrap;
        }

        /* ── PILLARS — EVEN CARD GRID ── */
        .ok-pillars {
          background: #ffffff;
          padding: 120px 32px;
        }
        .ok-pillars-inner { max-width: 1280px; margin: 0 auto; }

        .ok-pillars-header {
          margin-bottom: 56px;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ok-pillars-header.in { opacity: 1; transform: translateY(0); }
        .ok-pillars-header .ok-h2 { margin-bottom: 0; }

        .ok-px-row {
          display: flex;
          gap: 10px;
          height: 580px;
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s;
        }
        .ok-px-row.in { opacity: 1; transform: translateY(0); }

        .ok-px {
          position: relative;
          flex: 1 1 0;
          min-width: 0;
          overflow: hidden;
          border: none;
          padding: 0;
          background: #07181a;
          text-align: left;
          cursor: pointer;
          transition: flex-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ok-px.active { flex-grow: 5; cursor: default; }
        .ok-px:focus-visible { outline: 2px solid #d4a85a; outline-offset: 3px; }

        .ok-px-img { position: absolute; inset: 0; }
        .ok-px-img img {
          object-fit: cover;
          filter: grayscale(0.85) brightness(0.55);
          transform: scale(1.12);
          transition: filter 0.9s ease, transform 1.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ok-px:hover .ok-px-img img { filter: grayscale(0.4) brightness(0.65); }
        .ok-px.active .ok-px-img img { filter: grayscale(0) brightness(0.8); transform: scale(1); }

        .ok-px-shade {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(7,24,26,0.55) 0%, rgba(7,24,26,0.15) 40%, rgba(7,24,26,0.92) 100%);
          transition: opacity 0.6s ease;
        }
        .ok-px.active .ok-px-shade {
          background: linear-gradient(180deg, rgba(7,24,26,0.35) 0%, rgba(7,24,26,0.1) 30%, rgba(7,24,26,0.92) 100%);
        }

        /* Gold line along the bottom of the active panel */
        .ok-px::after {
          content: '';
          position: absolute; left: 0; bottom: 0;
          height: 3px; width: 100%;
          background: #d4a85a;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ok-px.active::after { transform: scaleX(1); }

        /* Number sits top-left on every panel */
        .ok-px-num {
          position: absolute;
          top: 28px; left: 28px;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15px; font-weight: 700;
          letter-spacing: 0.2em;
          color: #d4a85a;
        }

        /* Collapsed label: vertical title */
        .ok-px-vlabel {
          position: absolute;
          left: 50%; bottom: 32px;
          transform: translateX(-50%);
          writing-mode: vertical-rl;
          rotate: 180deg;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px; font-weight: 700;
          letter-spacing: 0.04em;
          white-space: nowrap;
          color: rgba(255,255,255,0.85);
          opacity: 1;
          transition: opacity 0.4s ease 0.2s;
        }
        .ok-px.active .ok-px-vlabel { opacity: 0; transition-delay: 0s; }

        /* Expanded content */
        .ok-px-body {
          position: absolute;
          left: 0; bottom: 0;
          width: 460px; max-width: 100%;
          padding: 0 44px 48px;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.5s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ok-px.active .ok-px-body {
          opacity: 1;
          transform: translateY(0);
          transition-delay: 0.35s;
        }
        .ok-px-icon {
          width: 52px; height: 52px;
          display: flex; align-items: center; justify-content: center;
          background: #d4a85a; color: #07181a;
          margin-bottom: 24px;
        }
        .ok-px-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(28px, 3vw, 40px);
          font-weight: 700; line-height: 1.12;
          color: #ffffff;
          margin-bottom: 16px;
        }
        .ok-px-text {
          font-family: 'Inter', sans-serif;
          font-size: 15px; font-weight: 300;
          line-height: 1.75;
          color: rgba(255,255,255,0.78);
          max-width: 380px;
        }

        @media (max-width: 900px) {
          .ok-px-row { flex-direction: column; height: auto; gap: 8px; }
          .ok-px { flex: none; height: 76px; transition: height 0.8s cubic-bezier(0.22, 1, 0.36, 1); }
          .ok-px.active { height: 400px; }
          .ok-px-num { top: 50%; transform: translateY(-50%); }
          .ok-px.active .ok-px-num { top: 28px; transform: none; }
          .ok-px-vlabel {
            writing-mode: horizontal-tb; rotate: 0deg;
            left: 72px; bottom: auto; top: 50%;
            transform: translateY(-50%);
            font-size: 18px;
          }
          .ok-px-body { width: 100%; padding: 0 28px 32px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ok-pillars-header, .ok-px-row { opacity: 1; transform: none; }
          .ok-px, .ok-px *, .ok-px::after { transition: none !important; }
        }

        /* ── CAMPUS GALLERY ── */
        .ok-gallery { background: #f5f2ed; padding: 120px 32px; }
        .ok-gallery-inner { max-width: 1280px; margin: 0 auto; }
        .ok-gallery-header {
          display: flex; justify-content: space-between;
          align-items: flex-end; margin-bottom: 60px;
        }
        .ok-h2-dark {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(32px, 3.5vw, 52px);
          font-weight: 700; line-height: 1.12;
          letter-spacing: -0.02em; color: #07181a;
        }
        .ok-h2-dark em { font-style: italic; color: #b3141f; }
        .ok-gallery-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          grid-template-rows: 300px 300px;
          gap: 4px;
        }
        .ok-gal-item { overflow: hidden; position: relative; }
        .ok-gal-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s ease; }
        .ok-gal-item:hover img { transform: scale(1.06); }
        .ok-gal-span-col { grid-column: 1 / 2; grid-row: 1 / 3; }
        .ok-gal-caption {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(7,24,26,0.85));
          padding: 32px 24px 20px;
          opacity: 0; transition: opacity 0.4s;
        }
        .ok-gal-item:hover .ok-gal-caption { opacity: 1; }
        .ok-gal-caption-text {
          font-family: 'Inter', sans-serif;
          font-size: 12px; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase; color: #d4a85a;
        }

        /* ── ACADEMICS ── */
        .ok-academics { background: #ffffff; padding: 120px 32px; }
        .ok-academics-inner {
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 100px; align-items: center;
        }
        .ok-term-list { margin-top: 40px; display: flex; flex-direction: column; gap: 0; }
        .ok-term-item {
          display: grid; grid-template-columns: auto 1fr auto;
          align-items: center; gap: 24px;
          padding: 24px 0; border-bottom: 1px solid #e5e7eb;
          transition: padding-left 0.3s; cursor: default;
        }
        .ok-term-item:hover { padding-left: 8px; }
        .ok-term-num {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 32px; font-weight: 700; color: #e5e7eb;
          min-width: 44px; text-align: center;
        }
        .ok-term-name {
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
          color: #07181a; letter-spacing: 0.02em; margin-bottom: 4px;
        }
        .ok-term-dates {
          font-family: 'Inter', sans-serif; font-size: 12px;
          color: #9ca3af; font-weight: 300;
        }
        .ok-term-badge {
          font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 700;
          letter-spacing: 0.15em; text-transform: uppercase;
          background: #07181a; color: #d4a85a; padding: 5px 10px; white-space: nowrap;
        }
        .ok-curriculum-img { width: 100%; height: 480px; object-fit: cover; }

        /* ── CTA ── */
        .ok-cta-section {
          position: relative; overflow: hidden;
          padding: 140px 32px; text-align: center;
        }
        .ok-cta-bg {
          position: absolute; inset: 0; object-fit: cover;
          width: 100%; height: 100%;
          filter: brightness(0.22) saturate(0.5);
        }
        .ok-cta-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(7,24,26,0.95) 0%, rgba(11,42,48,0.88) 100%);
        }
        .ok-cta-content { position: relative; z-index: 2; max-width: 680px; margin: 0 auto; }
        .ok-cta-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(36px, 5vw, 64px); font-weight: 700;
          color: #ffffff; line-height: 1.1;
          letter-spacing: -0.02em; margin-bottom: 20px;
        }
        .ok-cta-title em { font-style: italic; color: #d4a85a; }
        .ok-cta-sub {
          font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 300;
          color: rgba(255,255,255,0.6); line-height: 1.7; margin-bottom: 48px;
        }
        .ok-divider { width: 60px; height: 1px; background: #d4a85a; margin: 0 auto 32px; }
        .ok-cta-btns { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .ok-editorial-inner,
          .ok-academics-inner { grid-template-columns: 1fr; gap: 60px; }
          .ok-stats-inner { grid-template-columns: repeat(2, 1fr); gap: 32px; }
          .stat-item { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 24px; }
          .ok-pillars-grid { grid-template-columns: 1fr 1fr; }
          .ok-gallery-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 240px 240px 240px;
          }
          .ok-gal-span-col { grid-column: 1 / 3; grid-row: 1 / 2; }
        }
        @media (max-width: 640px) {
          .ok-hero-content { padding: 0 20px 60px; }
          .ok-stats-inner { grid-template-columns: 1fr 1fr; }
          .ok-editorial, .ok-pillars, .ok-gallery, .ok-academics { padding: 80px 20px; }
          .ok-gallery-grid { grid-template-columns: 1fr; grid-template-rows: auto; }
          .ok-gal-span-col { grid-column: 1; grid-row: 1; }
          .ok-gal-item { height: 260px; }
          .ok-img-stack { height: 400px; }
          .ok-pillars-grid { grid-template-columns: 1fr; }
          .ok-slider-nav { right: 16px; }
        }
      `}</style>

      {/* ══ HERO ══ */}
      <section className="ok-hero">
        {/* Carousel slides */}
        {HERO_SLIDES.map((slide, i) => (
          <div key={i} className={`ok-slide ${i === slideIndex ? 'active' : ''}`}>
            <Image src={slide.src} alt={slide.alt} fill priority={i === 0} quality={90} style={{ objectFit: 'cover' }} />
          </div>
        ))}

        <div className="ok-hero-overlay" />

        {/* Content */}
        <div className="ok-hero-content">
          <p className="ok-eyebrow">Victoria Island, Lagos &nbsp;·&nbsp; Est. 2008 &nbsp;·&nbsp; 2026/2027 Session</p>
          <h1 className="ok-hero-title">
            Where{' '}
            <span
              className={`ok-rotating-word ${wordVisible ? 'visible' : 'hidden'}`}
            >
              {ROTATING_WORDS[wordIndex]}
            </span>
            <br />
            Becomes a Standard.
          </h1>
          <p className="ok-hero-sub">
            Oakland Schools is Lagos's leading international secondary college — combining the Nigerian curriculum with global academic standards, moral formation, and leadership development.
          </p>
          <div className="ok-cta-row">
            <Link href="/admissions" className="ok-btn-primary">
              Apply for Admission <ArrowRight size={14} />
            </Link>
            <Link href="#about" className="ok-btn-ghost">
              Discover Oakland
            </Link>
          </div>
        </div>

        {/* Slider controls */}
        <div className="ok-slider-nav">
          <button
            className="ok-slider-btn"
            onClick={() => setSlideIndex((i) => (i - 1 + slideCount) % slideCount)}
            aria-label="Previous slide"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="ok-slider-dots">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                className={`ok-slider-dot ${i === slideIndex ? 'active' : ''}`}
                onClick={() => setSlideIndex(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            className="ok-slider-btn"
            onClick={() => setSlideIndex((i) => (i + 1) % slideCount)}
            aria-label="Next slide"
          >
            <ChevRight size={16} />
          </button>
        </div>

        <div className="ok-scroll-hint">
          <ChevronDown size={18} />
          <span>Scroll</span>
        </div>
      </section>

      {/* ══ STATS STRIP ══ */}
      <section className="ok-stats-strip" ref={statsRef}>
        <div className="ok-stats-inner">
          <StatCounter value={1250} suffix="+" label="Enrolled Students" trigger={statsVisible} />
          <StatCounter value={98} suffix="%" label="WAEC Pass Rate" trigger={statsVisible} />
          <StatCounter value={24} suffix="" label="Teaching Staff" trigger={statsVisible} />
          <StatCounter value={100} suffix="%" label="Verified Results" trigger={statsVisible} />
        </div>
      </section>

      {/* ══ ABOUT ══ */}
      <section className="ok-editorial" id="about">
        <div className="ok-editorial-inner">
          <div>
            <p className="ok-section-label">About Oakland</p>
            <h2 className="ok-h2">
              A Legacy of<br /><em>Intellectual Courage</em><br />& Character.
            </h2>
            <p className="ok-body-text">
              Founded on the belief that African excellence deserves world-class infrastructure, Oakland Schools has grown into one of Lagos's most respected secondary institutions. Our graduates consistently succeed in WAEC, JAMB, and international scholarship programmes.
            </p>
            <blockquote className="ok-pull-quote">
              "We do not merely educate minds — we build the conscience and character of tomorrow's leaders."
            </blockquote>
            <p className="ok-body-text">
              From JSS 1 through SS 3, every student learns in a structured, technology-supported environment: smart classrooms, a two-storey library, science and ICT laboratories, and a staff of over 24 qualified professionals.
            </p>
            <div style={{ marginTop: 36 }}>
              <Link href="/admissions" className="ok-btn-primary">
                Begin Your Application <ArrowRight size={14} />
              </Link>
            </div>
          </div>
          <div className="ok-img-stack">
            <Image src="/hero-campus.jpg" alt="Oakland Campus" width={520} height={420} className="ok-img-main" style={{ objectFit: 'cover' }} />
            <Image src="/students-lab.jpg" alt="Science Lab" width={320} height={260} className="ok-img-accent" style={{ objectFit: 'cover' }} />
            <div className="ok-img-badge">18 Years of Excellence</div>
          </div>
        </div>
      </section>

      {/* ══ PILLARS ══ */}
      <section className="ok-pillars" id="pillars" ref={pillarsRef}>
        <div className="ok-pillars-inner">
          <div className={`ok-pillars-header ${pillarsVisible ? 'in' : ''}`}>
            <p className="ok-section-label">The Oakland Standard</p>
            <h2 className="ok-h2">
              Six Pillars of<br /><em>Institutional</em> Excellence.
            </h2>
          </div>

          <div className={`ok-px-row ${pillarsVisible ? 'in' : ''}`}>
            {PILLARS.map((pillar, i) => {
              const Icon = pillar.icon;
              const isActive = activePillar === i;
              return (
                <button
                  key={pillar.title}
                  type="button"
                  className={`ok-px ${isActive ? 'active' : ''}`}
                  onMouseEnter={() => setActivePillar(i)}
                  onFocus={() => setActivePillar(i)}
                  onClick={() => setActivePillar(i)}
                  aria-expanded={isActive}
                  aria-label={pillar.title}
                >
                  <span className="ok-px-img">
                    <Image
                      src={pillar.image}
                      alt=""
                      fill
                      sizes="(max-width: 900px) 100vw, 60vw"
                      quality={80}
                    />
                  </span>
                  <span className="ok-px-shade" />
                  <span className="ok-px-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="ok-px-vlabel">{pillar.title}</span>
                  <span className="ok-px-body">
                    <span className="ok-px-icon"><Icon size={24} strokeWidth={1.5} /></span>
                    <span className="ok-px-title" style={{ display: 'block' }}>{pillar.title}</span>
                    <span className="ok-px-text" style={{ display: 'block' }}>{pillar.text}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ GALLERY ══ */}
      <section className="ok-gallery">
        <div className="ok-gallery-inner">
          <div className="ok-gallery-header">
            <div>
              <p className="ok-section-label">Campus Life</p>
              <h2 className="ok-h2-dark">Life at <em>Oakland</em><br />Schools.</h2>
            </div>
            <Link href="/admissions" className="ok-btn-primary" style={{ marginBottom: 8 }}>
              Schedule a Visit <ArrowRight size={14} />
            </Link>
          </div>
          <div className="ok-gallery-grid">
            <div className="ok-gal-item ok-gal-span-col">
              <Image src="/hero-campus.jpg" alt="Oakland Campus" fill style={{ objectFit: 'cover' }} />
              <div className="ok-gal-caption">
                <span className="ok-gal-caption-text">Main Campus — Victoria Island</span>
              </div>
            </div>
            <div className="ok-gal-item">
              <Image src="/students-lab.jpg" alt="Science Lab" fill style={{ objectFit: 'cover' }} />
              <div className="ok-gal-caption">
                <span className="ok-gal-caption-text">Science Labs</span>
              </div>
            </div>
            <div className="ok-gal-item">
              <Image src="/library.jpg" alt="Library" fill style={{ objectFit: 'cover' }} />
              <div className="ok-gal-caption">
                <span className="ok-gal-caption-text">Grand Library</span>
              </div>
            </div>
            <div className="ok-gal-item">
              <Image src="/classroom.jpg" alt="Smart Classroom" fill style={{ objectFit: 'cover' }} />
              <div className="ok-gal-caption">
                <span className="ok-gal-caption-text">Smart Classrooms</span>
              </div>
            </div>
            <div className="ok-gal-item" style={{ background: '#d4a85a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 32 }}>
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 48, fontWeight: 700, color: '#07181a', lineHeight: 1 }}>6</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#07181a' }}>Facilities</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ ACADEMICS ══ */}
      <section className="ok-academics" id="academics">
        <div className="ok-academics-inner">
          <div>
            <p className="ok-section-label">Academic Structure</p>
            <h2 className="ok-h2">
              JSS 1 through<br /><em>SS 3</em> — A Clear Path.
            </h2>
            <p className="ok-body-text">
              Our curriculum covers Junior (JSS 1–3) and Senior (SS 1–3) Secondary School, with progressively deeper engagement in STEM, Humanities, and Arts — culminating in WAEC examinations.
            </p>
            <p className="ok-body-text">
              Continuous Assessment (CA1 & CA2) accounts for 40% of total scores, so teachers and parents always have clear progress feedback throughout the term.
            </p>
            <div className="ok-term-list">
              {[
                { n: '01', name: 'First Term — In Session', dates: 'September 1 – December 18, 2026', active: true },
                { n: '02', name: 'Second Term', dates: 'January 11 – April 9, 2027', active: false },
                { n: '03', name: 'Third Term', dates: 'April 26 – July 23, 2027', active: false },
              ].map((t) => (
                <div className="ok-term-item" key={t.n} style={{ opacity: t.active ? 1 : 0.55 }}>
                  <span className="ok-term-num">{t.n}</span>
                  <div>
                    <div className="ok-term-name">{t.name}</div>
                    <div className="ok-term-dates">{t.dates}</div>
                  </div>
                  {t.active && <span className="ok-term-badge">Active</span>}
                </div>
              ))}
            </div>
          </div>
          <Image src="/classroom.jpg" alt="Smart Classroom Teaching" width={600} height={480} className="ok-curriculum-img" style={{ objectFit: 'cover' }} />
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="ok-cta-section">
        <Image src="/library.jpg" alt="Oakland Library" fill className="ok-cta-bg" style={{ objectFit: 'cover' }} />
        <div className="ok-cta-overlay" />
        <div className="ok-cta-content">
          <p className="ok-section-label" style={{ justifyContent: 'center', color: '#d4a85a' }}>
            Admissions Open
          </p>
          <h2 className="ok-cta-title">
            Secure Your Child's<br /><em>Future</em> at Oakland.
          </h2>
          <div className="ok-divider" />
          <p className="ok-cta-sub">
            Applications for 2026/2027 are now open. Join a community that has produced scholars, leaders, and innovators across Africa and beyond.
          </p>
          <div className="ok-cta-btns">
            <Link href="/admissions" className="ok-btn-primary">
              Apply Now <ArrowRight size={14} />
            </Link>
            <Link href="/login" className="ok-btn-ghost">
              Staff Login
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
