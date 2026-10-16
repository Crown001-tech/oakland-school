'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Send,
  X,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  Printer,
  Clock,
  FileText,
  CalendarCheck,
  PenTool,
  Award,
  ArrowDown,
  ChevronRight,
  Phone,
  Mail,
  User,
  GraduationCap,
  Building,
  HeartPulse,
  BadgeCheck
} from 'lucide-react';
import { addAdmissionToQueue } from '@/lib/admissions-utils';

interface FormData {
  surname: string;
  firstName: string;
  middleName: string;
  gender: string;
  dateOfBirth: string;
  classApplyingFor: string;
  stateOfOrigin: string;
  lga: string;
  religion: string;
  previousSchool: string;
  lastClassPassed: string;
  fatherName: string;
  fatherPhone: string;
  fatherEmail: string;
  motherName: string;
  motherPhone: string;
  motherEmail: string;
  residentialAddress: string;
  bloodGroup: string;
  genotype: string;
  medicalConditions: string;
}

const INITIAL_FORM: FormData = {
  surname: '',
  firstName: '',
  middleName: '',
  gender: 'Male',
  dateOfBirth: '',
  classApplyingFor: 'JSS 1',
  stateOfOrigin: '',
  lga: '',
  religion: 'Christianity',
  previousSchool: '',
  lastClassPassed: '',
  fatherName: '',
  fatherPhone: '',
  fatherEmail: '',
  motherName: '',
  motherPhone: '',
  motherEmail: '',
  residentialAddress: '',
  bloodGroup: 'O+',
  genotype: 'AA',
  medicalConditions: '',
};

const ADMISSION_STEPS = [
  {
    num: '01',
    badge: 'Stage 01',
    shapeName: 'Cathedral Arch',
    title: 'Digital Application',
    tagline: '10-minute online registration',
    desc: 'Submit scholar biodata, previous academic records, and verified guardian contact details through our secure digital admissions portal.',
    metric: 'Instant Reference Issued',
    image: '/library.jpg',
    caption: 'Rotunda Library — Digital Intake Portal',
  },
  {
    num: '02',
    badge: 'Stage 02',
    shapeName: 'Discernment Lens',
    title: 'Credential Screening',
    tagline: 'Admissions committee review',
    desc: 'Academic records and background credentials are evaluated. Shortlisted candidates receive their official entrance examination docket and venue schedule.',
    metric: 'Docket Dispatched in 48h',
    image: '/classroom.jpg',
    caption: 'Collegiate Hall — Screening & Briefing',
  },
  {
    num: '03',
    badge: 'Stage 03',
    shapeName: 'Collegiate Crest',
    title: 'Assessment Day',
    tagline: 'On-campus academic evaluation',
    desc: 'Scholars sit a proctored assessment evaluated across Mathematics, English, and analytical problem-solving, accompanied by an interactive pastoral interview.',
    metric: 'Proctored Campus Session',
    image: '/stem-lab.jpg',
    caption: 'STEM Laboratories — Proctored Testing',
  },
  {
    num: '04',
    badge: 'Stage 04',
    shapeName: 'Sovereign Portal',
    title: 'Offer & Enrollment',
    tagline: 'Matriculation & house induction',
    desc: 'Successful candidates receive their formal Letter of Offer and welcome pack. Guardians confirm acceptance to secure class placement and house assignment.',
    metric: 'Official Decision in 5 Days',
    image: '/campus-quad.jpg',
    caption: 'Central Quadrangle — Scholar Matriculation',
  },
];

let seqCounter = 1000;

export default function PublicAdmissionsPage() {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationNo, setApplicationNo] = useState('');
  const [step, setStep] = useState(1);
  const [activeJourneyStep, setActiveJourneyStep] = useState<number>(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const totalSteps = 3;

  useEffect(() => {
    const handleScroll = () => {
      const focalY = window.innerHeight * 0.45;
      let closestIdx = 0;
      let minDistance = Infinity;

      stepRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height * 0.5;
        const dist = Math.abs(centerY - focalY);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      setActiveJourneyStep(closestIdx);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    seqCounter += 1;
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const appNo = `OSC-ADM-2026-${randSuffix}`;
    setApplicationNo(appNo);

    const fullName = `${formData.firstName} ${formData.surname}`.trim();
    const primaryPhone = formData.fatherPhone || formData.motherPhone || '—';
    const primaryEmail = formData.fatherEmail || formData.motherEmail || '—';
    const guardianName = formData.fatherName || formData.motherName || 'Guardian';

    // 1. Post directly into shared admissions queue with all rich profile info
    addAdmissionToQueue({
      referenceNumber: appNo,
      applicantName: fullName,
      firstName: formData.firstName,
      middleName: formData.middleName,
      surname: formData.surname,
      gender: formData.gender === 'Female' ? 'Female' : 'Male',
      appliedClass: formData.classApplyingFor || 'JSS 1',
      dob: formData.dateOfBirth,
      stateOfOrigin: formData.stateOfOrigin,
      lga: formData.lga,
      religion: formData.religion,
      previousSchool: formData.previousSchool,
      lastClassPassed: formData.lastClassPassed,
      parentName: guardianName,
      parentPhone: primaryPhone,
      parentEmail: primaryEmail,
      fatherName: formData.fatherName,
      fatherPhone: formData.fatherPhone,
      fatherEmail: formData.fatherEmail,
      motherName: formData.motherName,
      motherPhone: formData.motherPhone,
      motherEmail: formData.motherEmail,
      residentialAddress: formData.residentialAddress,
      bloodGroup: formData.bloodGroup,
      genotype: formData.genotype,
      medicalConditions: formData.medicalConditions,
      stage: 'In Review',
    });

    // 2. Also send to backend admissions endpoint if active
    fetch('http://localhost:5000/api/v1/admissions/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicantName: fullName,
        gender: formData.gender,
        applyingForClass: formData.classApplyingFor || 'JSS 1',
        guardianName,
        guardianPhone: primaryPhone,
        guardianEmail: primaryEmail,
        previousSchool: formData.previousSchool,
      }),
    }).catch(() => {});

    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isSubmitted) {
    return (
      <SuccessScreen
        appNo={applicationNo}
        name={`${formData.firstName} ${formData.surname}`}
        classFor={formData.classApplyingFor}
        email={formData.fatherEmail || formData.motherEmail}
        formData={formData}
      />
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

        /* ── ADMISSIONS HERO ── */
        .adm-hero {
          position: relative;
          height: 480px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
        }
        .adm-hero-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%; height: 100%;
        }
        .adm-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(7,24,26,0.92) 0%, rgba(7,24,26,0.45) 60%, transparent 100%);
        }
        .adm-hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 32px 60px;
        }
        .adm-eyebrow {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #d4a85a;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .adm-eyebrow::before { content: ''; display: block; width: 40px; height: 1px; background: #d4a85a; }
        .adm-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(36px, 5vw, 64px);
          font-weight: 900;
          color: #ffffff;
          line-height: 1.05;
          letter-spacing: -0.02em;
          max-width: 680px;
          margin-bottom: 0;
        }
        .adm-title em { font-style: italic; color: #d4a85a; }

        /* ── SECTION: ADMISSIONS SCROLL SHOWCASE (STICKY IMAGE CROSSFADE) ── */
        .adm-scroll-section {
          background: #07181a;
          position: relative;
          padding: 120px 32px 140px;
          border-top: 1px solid rgba(212, 168, 90, 0.25);
          border-bottom: 1px solid rgba(212, 168, 90, 0.25);
          color: #ffffff;
        }
        .adm-scroll-ambient {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 70% 30%, rgba(212, 168, 90, 0.08) 0%, transparent 60%),
                      radial-gradient(circle at 20% 70%, rgba(15, 58, 62, 0.35) 0%, transparent 50%);
          pointer-events: none;
        }
        .adm-scroll-inner {
          max-width: 1280px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        .adm-scroll-header {
          text-align: left;
          max-width: 760px;
          margin-bottom: 70px;
        }
        .adm-scroll-eyebrow {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #d4a85a;
          margin-bottom: 14px;
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }
        .adm-scroll-eyebrow::before {
          content: '';
          display: block;
          width: 36px;
          height: 1px;
          background: #d4a85a;
        }
        .adm-scroll-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(34px, 4vw, 54px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 16px;
        }
        .adm-scroll-title em {
          font-style: italic;
          color: #d4a85a;
        }
        .adm-scroll-sub {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 300;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.72);
        }

        /* ── TWO-COLUMN STICKY SCROLL SHOWCASE ── */
        .adm-scroll-showcase {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 80px;
          align-items: start;
          position: relative;
        }

        /* ── LEFT: SCROLLING STEPS ── */
        .adm-steps-col {
          position: relative;
          padding-left: 54px;
        }
        .adm-timeline-spine {
          position: absolute;
          left: 14px;
          top: 40px;
          bottom: 120px;
          width: 2px;
          background: rgba(212, 168, 90, 0.15);
        }
        .adm-timeline-glow {
          position: absolute;
          left: 0;
          top: 0;
          width: 2px;
          background: #d4a85a;
          box-shadow: 0 0 12px rgba(212, 168, 90, 0.85);
          transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .adm-step-item {
          min-height: 380px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 30px 0;
          position: relative;
          cursor: pointer;
          opacity: 0.28;
          transform: translateY(12px);
          filter: blur(0.4px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                      filter 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .adm-step-item.is-active {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }
        .adm-step-item:hover {
          opacity: 0.8;
        }
        .adm-step-item.is-active:hover {
          opacity: 1;
        }

        .adm-step-indicator-node {
          position: absolute;
          left: -54px;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid rgba(212, 168, 90, 0.35);
          background: #07181a;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.4s ease;
          z-index: 3;
        }
        .adm-step-item.is-active .adm-step-indicator-node {
          border-color: #d4a85a;
          box-shadow: 0 0 16px rgba(212, 168, 90, 0.9);
          background: #d4a85a;
        }
        .adm-step-node-core {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(212, 168, 90, 0.4);
          transition: all 0.3s ease;
        }
        .adm-step-item.is-active .adm-step-node-core {
          background: #07181a;
        }

        .adm-step-meta {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 12px;
        }
        .adm-step-num {
          font-family: 'Playfair Display', serif;
          font-size: clamp(48px, 4.5vw, 68px);
          font-weight: 900;
          line-height: 1;
          color: #d4a85a;
          letter-spacing: -0.03em;
        }
        .adm-step-badge {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #d4a85a;
          background: rgba(212, 168, 90, 0.12);
          border: 1px solid rgba(212, 168, 90, 0.3);
          padding: 4px 12px;
          border-radius: 20px;
        }
        .adm-step-metric {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.05em;
        }

        .adm-step-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(26px, 2.8vw, 38px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          margin-bottom: 8px;
        }
        .adm-step-tagline {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 15px;
          font-style: italic;
          color: #d4a85a;
          margin-bottom: 14px;
        }
        .adm-step-desc {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.82);
          font-weight: 300;
          max-width: 520px;
        }

        .adm-steps-action {
          padding-top: 40px;
          padding-bottom: 20px;
        }
        .adm-scroll-cta {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          background: #d4a85a;
          color: #07181a;
          padding: 16px 34px;
          border-radius: 2px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          transition: all 0.25s ease;
          box-shadow: 0 10px 30px rgba(212, 168, 90, 0.3);
        }
        .adm-scroll-cta:hover {
          background: #c4943e;
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(212, 168, 90, 0.45);
        }

        /* ── RIGHT: STICKY CINEMATIC IMAGE WINDOW ── */
        .adm-sticky-col {
          position: sticky;
          top: 110px;
          align-self: flex-start;
          height: 540px;
          z-index: 10;
        }
        .adm-sticky-frame {
          position: relative;
          width: 100%;
          height: 100%;
          border: 1.5px solid rgba(212, 168, 90, 0.5);
          box-shadow: 0 30px 80px -15px rgba(0, 0, 0, 0.85),
                      0 0 50px rgba(212, 168, 90, 0.16);
          overflow: hidden;
          background: #040c0d;
          transition: border-radius 0.9s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.9s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.9s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.9s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: border-radius, transform;
        }

        /* ── DYNAMIC ARCHITECTURAL SHAPE MORPHING PER STEP ── */
        .adm-sticky-frame.shape-0 {
          /* Stage 01: Cathedral Arch (Noble curved arch dome) */
          border-radius: 260px 260px 28px 28px;
          transform: translateY(0) scale(1);
        }
        .adm-sticky-frame.shape-1 {
          /* Stage 02: Discernment Lens (Asymmetric diagonal leaf/eye) */
          border-radius: 28px 240px 28px 240px;
          transform: translateY(2px) scale(0.995);
        }
        .adm-sticky-frame.shape-2 {
          /* Stage 03: Collegiate Crest (Heraldic scholastic shield) */
          border-radius: 44px 44px 240px 240px;
          transform: translateY(0) scale(1);
        }
        .adm-sticky-frame.shape-3 {
          /* Stage 04: Sovereign Portal (Opposing majestic diagonal portal) */
          border-radius: 240px 28px 240px 28px;
          transform: translateY(-2px) scale(1.005);
        }

        /* Ambient contour halo that follows the morphing shape */
        .adm-sticky-halo {
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          border: 1px solid rgba(212, 168, 90, 0.3);
          pointer-events: none;
          z-index: 2;
          transition: border-radius 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* The crossfading image layers */
        .adm-image-layer {
          position: absolute;
          inset: 0;
          opacity: 0;
          transform: scale(1.08) translateY(8px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 1s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          will-change: opacity, transform;
        }
        .adm-image-layer.is-active {
          opacity: 1;
          transform: scale(1) translateY(0);
          pointer-events: auto;
        }
        .adm-layer-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .adm-layer-vignette {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(7, 24, 26, 0.1) 0%, rgba(7, 24, 26, 0.75) 100%);
          pointer-events: none;
        }



        /* ── SECTION: ADMISSIONS FORM ── */
        .adm-body {
          background: radial-gradient(circle at 10% 12%, rgba(212, 168, 90, 0.08) 0%, transparent 45%),
                      radial-gradient(circle at 90% 88%, rgba(15, 58, 62, 0.06) 0%, transparent 45%),
                      #f8f6f2;
          padding: 96px 32px 120px;
          position: relative;
          border-top: 1px solid rgba(212, 168, 90, 0.22);
        }
        .adm-body-inner {
          max-width: 1320px;
          margin: 0 auto;
        }

        /* Intro Banner */
        .adm-form-intro {
          text-align: center;
          max-width: 780px;
          margin: 0 auto 54px;
        }
        .adm-form-intro-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 40px;
          font-weight: 700;
          color: #07181a;
          line-height: 1.2;
          margin-bottom: 14px;
          letter-spacing: -0.015em;
        }
        .adm-form-intro-title em {
          font-style: italic;
          color: #b88a38;
        }
        .adm-form-intro-sub {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 400;
          color: #64748b;
          line-height: 1.65;
          max-width: 620px;
          margin: 0 auto;
        }

        /* 2-Column Grid */
        .adm-form-grid {
          display: grid;
          grid-template-columns: 1fr 390px;
          gap: 48px;
          align-items: start;
        }

        /* ── LUXURY FORM CARD ── */
        .adm-form-card {
          background: #ffffff;
          border: 1px solid #e7dfd4;
          border-radius: 18px;
          box-shadow: 0 20px 48px -16px rgba(7, 24, 26, 0.08), 0 2px 6px rgba(7, 24, 26, 0.02);
          overflow: hidden;
          transition: border-color 0.3s ease;
        }
        .adm-form-card:hover {
          border-color: rgba(212, 168, 90, 0.45);
        }

        /* Header & Stepper */
        .adm-form-header {
          background: linear-gradient(135deg, #07181a 0%, #0d262a 100%);
          padding: 30px 40px 22px;
          position: relative;
          border-bottom: 1px solid rgba(212, 168, 90, 0.22);
        }
        .adm-form-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 22px;
        }
        .adm-form-eyebrow {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #d4a85a;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .adm-form-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.01em;
          line-height: 1.25;
        }

        /* Stepper Pills */
        .adm-stepper-pills {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .adm-step-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.55);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .adm-step-pill.is-active {
          background: rgba(212, 168, 90, 0.15);
          border-color: #d4a85a;
          color: #ffffff;
          box-shadow: 0 0 16px rgba(212, 168, 90, 0.25);
        }
        .adm-step-pill.is-done {
          background: rgba(16, 185, 129, 0.12);
          border-color: rgba(16, 185, 129, 0.35);
          color: #a7f3d0;
        }
        .adm-step-pill-num {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
        }
        .adm-step-pill.is-active .adm-step-pill-num {
          background: #d4a85a;
          color: #07181a;
        }
        .adm-step-pill.is-done .adm-step-pill-num {
          background: #10b981;
          color: #ffffff;
        }

        /* Stepper Progress Bar */
        .adm-stepper-progress-track {
          width: 100%;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }
        .adm-stepper-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #d4a85a 0%, #f3d79b 100%);
          border-radius: 999px;
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 8px rgba(212, 168, 90, 0.8);
        }

        /* Form Body & Sections */
        .adm-form-body {
          padding: 44px 44px 40px;
        }

        .adm-section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 14px;
          border-bottom: 1px solid #ebe5dc;
        }
        .adm-section-badge {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8b651f;
          background: rgba(212, 168, 90, 0.14);
          border: 1px solid rgba(212, 168, 90, 0.35);
          padding: 4px 10px;
          border-radius: 999px;
        }
        .adm-section-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 18px;
          font-weight: 700;
          color: #07181a;
          letter-spacing: -0.01em;
        }
        .adm-section-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, #ebe5dc 0%, transparent 100%);
        }

        .adm-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
          margin-bottom: 22px;
        }
        .adm-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 22px;
          margin-bottom: 22px;
        }
        .adm-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          position: relative;
        }
        .adm-label {
          font-family: 'Inter', sans-serif;
          font-size: 11.5px;
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .adm-req {
          color: #d4a85a;
          font-weight: 700;
        }

        .adm-input {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #07181a;
          background: #ffffff;
          border: 1.5px solid #ded8ce;
          border-radius: 8px;
          padding: 13px 16px;
          outline: none;
          transition: all 0.2s ease-in-out;
          width: 100%;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }
        .adm-input:hover {
          border-color: #c5bcae;
        }
        .adm-input:focus {
          border-color: #d4a85a;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(212, 168, 90, 0.16);
        }
        .adm-input::placeholder {
          color: #9ca3af;
          font-weight: 300;
        }

        /* Custom Dropdown Chevron */
        select.adm-input {
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2307181a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 14px;
          padding-right: 40px;
        }

        /* Form Footer Buttons */
        .adm-nav-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 32px;
          border-top: 1px solid #ebe5dc;
          margin-top: 16px;
        }
        .adm-btn-back {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #4b5563;
          background: #fdfbf8;
          border: 1px solid #dcd5ca;
          border-radius: 8px;
          padding: 13px 26px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .adm-btn-back:hover {
          border-color: #07181a;
          color: #07181a;
          background: #ffffff;
        }
        .adm-btn-next {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #07181a;
          background: linear-gradient(135deg, #d4a85a 0%, #b88a38 100%);
          border: none;
          border-radius: 8px;
          padding: 14px 34px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 8px 24px -4px rgba(212, 168, 90, 0.45);
          transition: all 0.25s ease;
        }
        .adm-btn-next:hover {
          background: linear-gradient(135deg, #dfb46c 0%, #c4943e 100%);
          transform: translateY(-1px);
          box-shadow: 0 12px 28px -4px rgba(212, 168, 90, 0.55);
        }
        .adm-btn-next:active {
          transform: translateY(0);
        }

        /* ── PRESTIGE SIDEBAR ── */
        .adm-sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .adm-sidebar-card {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 12px 36px -10px rgba(7, 24, 26, 0.07);
        }

        /* 1. Protocol Card */
        .adm-protocol-card {
          background: linear-gradient(165deg, #07181a 0%, #0d262a 100%);
          border: 1px solid rgba(212, 168, 90, 0.25);
          padding: 34px 28px;
          color: #ffffff;
          position: relative;
        }
        .adm-protocol-card::before {
          content: '';
          position: absolute;
          top: -30px; right: -30px;
          width: 140px; height: 140px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212, 168, 90, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .adm-protocol-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #d4a85a;
          margin-bottom: 10px;
        }
        .adm-protocol-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 21px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.3;
          margin-bottom: 22px;
        }
        .adm-protocol-timeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
        }
        .adm-protocol-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          position: relative;
        }
        .adm-protocol-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(212, 168, 90, 0.15);
          border: 1px solid rgba(212, 168, 90, 0.35);
          color: #d4a85a;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .adm-protocol-content {
          flex: 1;
        }
        .adm-protocol-heading {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 2px;
          line-height: 1.35;
        }
        .adm-protocol-text {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.5;
        }

        /* 2. Cohort Availability Card */
        .adm-cohort-card {
          background: #ffffff;
          border: 1px solid #e5ded2;
          padding: 28px 26px;
        }
        .adm-cohort-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .adm-cohort-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 18px;
          font-weight: 700;
          color: #07181a;
        }
        .adm-cohort-pulse-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #15803d;
          background: #f0fdf4;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid #bbf7d0;
        }
        .adm-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: admPulse 2s infinite;
        }
        @keyframes admPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .adm-cohort-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .adm-cohort-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: #fbf9f6;
          border: 1px solid #eee7dc;
          border-radius: 8px;
        }
        .adm-cohort-class {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #07181a;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .adm-cohort-status {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .adm-cohort-status.open {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .adm-cohort-status.limited {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        /* 3. Admissions Desk Support Card */
        .adm-desk-card {
          background: linear-gradient(135deg, #f7f3eb 0%, #ede6da 100%);
          border: 1px solid rgba(212, 168, 90, 0.35);
          padding: 28px 26px;
          border-left: 4px solid #d4a85a;
        }
        .adm-desk-badge {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #8b651f;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .adm-desk-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 19px;
          font-weight: 700;
          color: #07181a;
          margin-bottom: 14px;
        }
        .adm-desk-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .adm-desk-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: #374151;
          line-height: 1.5;
        }
        .adm-desk-icon {
          color: #0f3a3e;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .adm-desk-strong {
          color: #07181a;
          font-weight: 600;
        }

        /* ── SUCCESS SCREEN ── */
        .adm-success-page {
          background: #f5f2ed;
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 32px;
        }
        .adm-success-card {
          max-width: 680px;
          width: 100%;
        }
        .adm-success-header {
          background: #07181a;
          padding: 48px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .adm-success-header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: rgba(212,168,90,0.08);
        }
        .adm-success-check {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #d4a85a;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .adm-success-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 32px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 12px;
        }
        .adm-success-sub {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 300;
          color: rgba(255,255,255,0.55);
          line-height: 1.6;
        }
        .adm-success-body {
          background: #ffffff;
          padding: 40px 48px;
        }
        .adm-ref-box {
          background: #f5f2ed;
          border: 1px dashed #d4c9b8;
          padding: 24px 32px;
          text-align: center;
          margin: 24px 0 32px;
        }
        .adm-ref-label {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #9ca3af;
          margin-bottom: 8px;
        }
        .adm-ref-num {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 28px;
          font-weight: 700;
          color: #07181a;
          letter-spacing: 0.05em;
        }
        .adm-next-steps { display: flex; flex-direction: column; gap: 16px; }
        .adm-next-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: #374151;
          line-height: 1.55;
        }
        .adm-next-item-num {
          width: 24px; height: 24px;
          background: #07181a;
          color: #d4a85a;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .adm-step-mobile-media {
          display: none;
        }

        @media (max-width: 1024px) {
          .adm-form-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .adm-sidebar {
            order: 2;
          }
          .adm-scroll-showcase {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .adm-sticky-col {
            position: sticky;
            top: 75px;
            height: 360px;
            margin-bottom: 20px;
          }
          .adm-sticky-frame.shape-0 { border-radius: 160px 160px 20px 20px; }
          .adm-sticky-frame.shape-1 { border-radius: 20px 160px 20px 160px; }
          .adm-sticky-frame.shape-2 { border-radius: 24px 24px 160px 160px; }
          .adm-sticky-frame.shape-3 { border-radius: 160px 20px 160px 20px; }
          .adm-steps-col {
            padding-left: 40px;
          }
          .adm-timeline-spine {
            left: 10px;
          }
          .adm-step-indicator-node {
            left: -40px;
          }
        }
        @media (max-width: 768px) {
          .adm-sticky-col { display: none !important; }
          .adm-step-mobile-media {
            display: block;
            position: relative;
            width: 100%;
            height: 190px;
            border-radius: 6px;
            overflow: hidden;
            margin: 14px 0 12px;
            border: 1px solid rgba(212, 168, 90, 0.3);
          }
          .adm-step-item { min-height: auto !important; padding: 20px 0 28px !important; }
          .adm-steps-col { padding-left: 28px !important; }
          .adm-timeline-spine { left: 4px !important; }
          .adm-step-indicator-node { left: -28px !important; }
        }
        @media (max-width: 640px) {
          .adm-hero { height: 280px; }
          .adm-title { font-size: clamp(28px, 6vw, 44px); }
          .adm-hero-content, .adm-body, .adm-scroll-section { padding-left: 16px; padding-right: 16px; }
          .adm-body { padding-top: 48px; padding-bottom: 60px; }
          .adm-form-intro { margin-bottom: 24px; }
          .adm-form-intro-title { font-size: 26px; }
          .adm-form-card { border-radius: 4px; }
          .adm-form-header { padding: 20px 16px 16px; }
          .adm-form-body { padding: 20px 16px; }
          .adm-form-header-top { flex-direction: column; align-items: flex-start; gap: 14px; }
          .adm-stepper-pills { width: 100%; justify-content: space-between; }
          .adm-step-pill-label { display: none; }
          .adm-scroll-section { padding-top: 48px; padding-bottom: 48px; }
          .adm-scroll-cta { width: 100%; justify-content: center; }
          .adm-grid-2, .adm-grid-3 { grid-template-columns: 1fr; gap: 14px; }
          .adm-protocol-card, .adm-cohort-card, .adm-desk-card { padding: 20px 16px; }
          .adm-success-body { padding: 24px 18px; }
          .adm-success-header { padding: 28px 18px; }
          .adm-nav-row { flex-direction: column-reverse; gap: 10px; align-items: stretch; }
          .adm-btn-next, .adm-btn-prev, .adm-btn-submit { width: 100%; justify-content: center; }
          .adm-step-meta { flex-wrap: wrap; gap: 6px; }
          .adm-step-metric { margin-left: 0; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="adm-hero">
        <Image src="/library.jpg" alt="Oakland Admissions" fill priority quality={85} className="adm-hero-img" style={{ objectFit: 'cover', objectPosition: 'center 30%' }} />
        <div className="adm-hero-overlay" />
        <div className="adm-hero-content">
          <p className="adm-eyebrow">2026 / 2027 Academic Session</p>
          <h1 className="adm-title">
            Admissions — <em>Join</em><br />Oakland Schools.
          </h1>
        </div>
      </section>

      {/* ── SECTION: ADMISSIONS SCROLL SHOWCASE (STICKY IMAGE CROSSFADE) ── */}
      <section className="adm-scroll-section" id="admissions-pathway">
        <div className="adm-scroll-ambient" />
        <div className="adm-scroll-inner">
          <div className="adm-scroll-header">
            <div className="adm-scroll-eyebrow">Admissions Pathway</div>
            <h2 className="adm-scroll-title">
              The Four Milestones to <em>Enrollment</em>
            </h2>
            <p className="adm-scroll-sub">
              A transparent, merit-guided journey welcoming exceptional scholars to Oakland Schools.
            </p>
          </div>

          <div className="adm-scroll-showcase">
            {/* LEFT: Scrolling Steps Milestones */}
            <div className="adm-steps-col">
              <div className="adm-timeline-spine">
                <div
                  className="adm-timeline-glow"
                  style={{
                    height: `${(activeJourneyStep / (ADMISSION_STEPS.length - 1)) * 100}%`,
                  }}
                />
              </div>

              {ADMISSION_STEPS.map((step, idx) => {
                const isActive = activeJourneyStep === idx;
                return (
                  <div
                    key={step.num}
                    ref={(el) => {
                      stepRefs.current[idx] = el;
                    }}
                    className={`adm-step-item ${isActive ? 'is-active' : ''}`}
                    onClick={() => {
                      stepRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    <div className="adm-step-indicator-node">
                      <div className="adm-step-node-core" />
                    </div>

                    <div className="adm-step-meta">
                      <span className="adm-step-num">{step.num}</span>
                      <span className="adm-step-badge">{step.badge}</span>
                      <span className="adm-step-metric">{step.metric}</span>
                    </div>

                    <h3 className="adm-step-heading">{step.title}</h3>
                    <div className="adm-step-mobile-media">
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <p className="adm-step-tagline">{step.tagline}</p>
                    <p className="adm-step-desc">{step.desc}</p>
                  </div>
                );
              })}

              <div className="adm-steps-action">
                <a href="#admission-form" className="adm-scroll-cta">
                  <span>Begin Online Application</span>
                  <ArrowDown size={14} />
                </a>
              </div>
            </div>

            {/* RIGHT: Sticky Image Stage */}
            <div className="adm-sticky-col">
              <div className={`adm-sticky-frame shape-${activeJourneyStep}`}>
                <div className="adm-sticky-halo" />
                {ADMISSION_STEPS.map((step, idx) => {
                  const isActive = activeJourneyStep === idx;
                  return (
                    <div
                      key={step.num}
                      className={`adm-image-layer ${isActive ? 'is-active' : ''}`}
                    >
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 550px"
                        className="adm-layer-img"
                        priority={idx === 0}
                      />
                      <div className="adm-layer-vignette" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: APPLICATION DOSSIER & SIDEBAR ── */}
      <div className="adm-body" id="admission-form">
        <div className="adm-body-inner">
          {/* Section Introduction */}
          <div className="adm-form-intro">
            <h2 className="adm-form-intro-title">
              Student <em>Application Form</em>
            </h2>
            <p className="adm-form-intro-sub">
              Please fill out the form below to apply for admission for the 2026 / 2027 academic session.
            </p>
          </div>

          <div className="adm-form-grid">
            {/* FORM CARD */}
            <form onSubmit={handleSubmit}>
              <div className="adm-form-card">
                {/* Prestige Header & Stepper */}
                <div className="adm-form-header">
                  <div className="adm-form-header-top">
                    <div>
                      <div className="adm-form-eyebrow">
                        <GraduationCap size={13} />
                        <span>Step {step} of 3</span>
                      </div>
                      <span className="adm-form-title">
                        {step === 1 ? 'Student Details' : step === 2 ? 'Guardian Details' : 'Declaration'}
                      </span>
                    </div>

                    {/* Stepper Pills */}
                    <div className="adm-stepper-pills">
                      {[
                        { num: 1, label: 'Student' },
                        { num: 2, label: 'Guardian' },
                        { num: 3, label: 'Declaration' }
                      ].map((item) => {
                        const isDone = item.num < step;
                        const isActive = item.num === step;
                        return (
                          <div
                            key={item.num}
                            className={`adm-step-pill ${isActive ? 'is-active' : isDone ? 'is-done' : ''}`}
                            onClick={() => {
                              // Allow moving back to already visited steps
                              if (item.num < step) setStep(item.num);
                            }}
                            style={{ cursor: item.num < step ? 'pointer' : 'default' }}
                          >
                            <span className="adm-step-pill-num">
                              {isDone ? <Check size={11} strokeWidth={3} /> : item.num}
                            </span>
                            <span className="adm-step-pill-label">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Progress Indicator Track */}
                  <div className="adm-stepper-progress-track">
                    <div
                      className="adm-stepper-progress-fill"
                      style={{
                        width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%'
                      }}
                    />
                  </div>
                </div>

                {/* Step 1 — Candidate */}
                {step === 1 && (
                  <div className="adm-form-body">
                    <div className="adm-section-header">
                      <span className="adm-section-badge">Part 01</span>
                      <h3 className="adm-section-title">Student Details</h3>
                      <div className="adm-section-line" />
                    </div>

                    <div className="adm-grid-3">
                      <div className="adm-field">
                        <label className="adm-label">Surname <span className="adm-req">*</span></label>
                        <input required name="surname" value={formData.surname} onChange={handleChange} className="adm-input" placeholder="e.g. Balogun" />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">First Name <span className="adm-req">*</span></label>
                        <input required name="firstName" value={formData.firstName} onChange={handleChange} className="adm-input" placeholder="e.g. Adewale" />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Middle Name</label>
                        <input name="middleName" value={formData.middleName} onChange={handleChange} className="adm-input" placeholder="Optional" />
                      </div>
                    </div>

                    <div className="adm-grid-3">
                      <div className="adm-field">
                        <label className="adm-label">Gender <span className="adm-req">*</span></label>
                        <select required name="gender" value={formData.gender} onChange={handleChange} className="adm-input">
                          <option>Male</option>
                          <option>Female</option>
                        </select>
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Date of Birth <span className="adm-req">*</span></label>
                        <input required type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="adm-input" />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Class Applying For <span className="adm-req">*</span></label>
                        <select required name="classApplyingFor" value={formData.classApplyingFor} onChange={handleChange} className="adm-input">
                          {['JSS 1','JSS 2','JSS 3','SS 1','SS 2','SS 3'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="adm-grid-3">
                      <div className="adm-field">
                        <label className="adm-label">State of Origin <span className="adm-req">*</span></label>
                        <input required name="stateOfOrigin" value={formData.stateOfOrigin} onChange={handleChange} className="adm-input" placeholder="e.g. Lagos State" />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">LGA <span className="adm-req">*</span></label>
                        <input required name="lga" value={formData.lga} onChange={handleChange} className="adm-input" placeholder="e.g. Eti-Osa" />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Religion</label>
                        <select name="religion" value={formData.religion} onChange={handleChange} className="adm-input">
                          <option>Christianity</option>
                          <option>Islam</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="adm-section-header" style={{ marginTop: 36 }}>
                      <span className="adm-section-badge">Part 02</span>
                      <h3 className="adm-section-title">Previous School</h3>
                      <div className="adm-section-line" />
                    </div>

                    <div className="adm-grid-2">
                      <div className="adm-field">
                        <label className="adm-label">Previous School <span className="adm-req">*</span></label>
                        <input required name="previousSchool" value={formData.previousSchool} onChange={handleChange} className="adm-input" placeholder="e.g. Corona Primary School" />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Last Class Passed <span className="adm-req">*</span></label>
                        <input required name="lastClassPassed" value={formData.lastClassPassed} onChange={handleChange} className="adm-input" placeholder="e.g. Primary 6 or JSS 3" />
                      </div>
                    </div>

                    <div className="adm-nav-row">
                      <span />
                      <button type="button" className="adm-btn-next" onClick={() => setStep(2)}>
                        <span>Next: Guardian Details</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2 — Guardian */}
                {step === 2 && (
                  <div className="adm-form-body">
                    <div className="adm-section-header">
                      <span className="adm-section-badge">Part 01</span>
                      <h3 className="adm-section-title">Father Details</h3>
                      <div className="adm-section-line" />
                    </div>

                    <div className="adm-grid-3">
                      <div className="adm-field">
                        <label className="adm-label">Full Name <span className="adm-req">*</span></label>
                        <input required name="fatherName" value={formData.fatherName} onChange={handleChange} className="adm-input" placeholder="Title and Full Name" />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Phone <span className="adm-req">*</span></label>
                        <input required name="fatherPhone" value={formData.fatherPhone} onChange={handleChange} className="adm-input" placeholder="+234 800 000 0000" />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Email <span className="adm-req">*</span></label>
                        <input required type="email" name="fatherEmail" value={formData.fatherEmail} onChange={handleChange} className="adm-input" placeholder="father@email.com" />
                      </div>
                    </div>

                    <div className="adm-section-header" style={{ marginTop: 36 }}>
                      <span className="adm-section-badge">Part 02</span>
                      <h3 className="adm-section-title">Mother Details</h3>
                      <div className="adm-section-line" />
                    </div>

                    <div className="adm-grid-3">
                      <div className="adm-field">
                        <label className="adm-label">Full Name <span className="adm-req">*</span></label>
                        <input required name="motherName" value={formData.motherName} onChange={handleChange} className="adm-input" placeholder="Title and Full Name" />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Phone <span className="adm-req">*</span></label>
                        <input required name="motherPhone" value={formData.motherPhone} onChange={handleChange} className="adm-input" placeholder="+234 800 000 0000" />
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Email</label>
                        <input type="email" name="motherEmail" value={formData.motherEmail} onChange={handleChange} className="adm-input" placeholder="mother@email.com" />
                      </div>
                    </div>

                    <div className="adm-section-header" style={{ marginTop: 36 }}>
                      <span className="adm-section-badge">Part 03</span>
                      <h3 className="adm-section-title">Home Address</h3>
                      <div className="adm-section-line" />
                    </div>

                    <div className="adm-field">
                      <label className="adm-label">Residential Address <span className="adm-req">*</span></label>
                      <input required name="residentialAddress" value={formData.residentialAddress} onChange={handleChange} className="adm-input" placeholder="House No, Street, Estate, City, State" />
                    </div>

                    <div className="adm-nav-row">
                      <button type="button" className="adm-btn-back" onClick={() => setStep(1)}>
                        ← Back
                      </button>
                      <button type="button" className="adm-btn-next" onClick={() => setStep(3)}>
                        <span>Next: Declaration</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3 — Medical & Declaration */}
                {step === 3 && (
                  <div className="adm-form-body">
                    <div className="adm-section-header">
                      <span className="adm-section-badge">Part 01</span>
                      <h3 className="adm-section-title">Medical Information</h3>
                      <div className="adm-section-line" />
                    </div>

                    <div className="adm-grid-3">
                      <div className="adm-field">
                        <label className="adm-label">Blood Group <span className="adm-req">*</span></label>
                        <select required name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="adm-input">
                          {['A+','A−','B+','B−','O+','O−','AB+','AB−'].map(b => <option key={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Genotype <span className="adm-req">*</span></label>
                        <select required name="genotype" value={formData.genotype} onChange={handleChange} className="adm-input">
                          {['AA','AS','SS','AC','SC'].map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="adm-field">
                        <label className="adm-label">Medical Conditions</label>
                        <input name="medicalConditions" value={formData.medicalConditions} onChange={handleChange} className="adm-input" placeholder="None or specify condition" />
                      </div>
                    </div>

                    <div className="adm-section-header" style={{ marginTop: 36 }}>
                      <span className="adm-section-badge">Part 02</span>
                      <h3 className="adm-section-title">Declaration</h3>
                      <div className="adm-section-line" />
                    </div>

                    <div style={{ background: '#fbf9f6', border: '1px solid #ebe5dc', borderRadius: 10, padding: '20px 24px', marginBottom: 28 }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4b5563', lineHeight: 1.7, margin: 0 }}>
                        By submitting this application, I confirm that all information provided is accurate and complete. I understand that false information will lead to disqualification. I agree to Oakland Schools using this information for admission assessment and enrollment.
                      </p>
                    </div>

                    <div className="adm-nav-row">
                      <button type="button" className="adm-btn-back" onClick={() => setStep(2)}>
                        ← Back
                      </button>
                      <button type="submit" className="adm-btn-next">
                        <span>Submit Application</span>
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* PRESTIGE SIDEBAR */}
            <div className="adm-sidebar">
              {/* 1. Protocol Card */}
              <div className="adm-sidebar-card adm-protocol-card">
                <div className="adm-protocol-badge">
                  <ShieldCheck size={13} />
                  <span>Admissions Guide</span>
                </div>
                <div className="adm-protocol-title">
                  What to Expect After Applying
                </div>

                <div className="adm-protocol-timeline">
                  {[
                    {
                      num: '1',
                      title: 'Confirmation Email',
                      desc: 'You will receive a confirmation email with your application reference number within minutes.'
                    },
                    {
                      num: '2',
                      title: 'Exam Slip',
                      desc: 'Shortlisted candidates will receive an entrance exam slip within 10 business days.'
                    },
                    {
                      num: '3',
                      title: 'Entrance Assessment',
                      desc: 'The student will write an entrance test in English, Mathematics, and General Science.'
                    },
                    {
                      num: '4',
                      title: 'Results',
                      desc: 'Results are sent directly to the guardian email address provided.'
                    },
                    {
                      num: '5',
                      title: 'Admission Offer',
                      desc: 'Successful applicants receive an official Oakland Schools Admission Offer Letter.'
                    }
                  ].map((item) => (
                    <div className="adm-protocol-item" key={item.num}>
                      <div className="adm-protocol-num">{item.num}</div>
                      <div className="adm-protocol-content">
                        <div className="adm-protocol-heading">{item.title}</div>
                        <div className="adm-protocol-text">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Cohort Availability Card */}
              <div className="adm-sidebar-card adm-cohort-card">
                <div className="adm-cohort-header">
                  <div className="adm-cohort-title">Available Classes</div>
                  <div className="adm-cohort-pulse-badge">
                    <div className="adm-pulse-dot" />
                    <span>2026 / 2027</span>
                  </div>
                </div>

                <div className="adm-cohort-list">
                  {[
                    { grade: 'JSS 1', status: 'Limited Spaces', type: 'limited' },
                    { grade: 'JSS 2', status: 'Available', type: 'open' },
                    { grade: 'SS 1', status: 'Available', type: 'open' },
                    { grade: 'SS 2', status: 'Limited Spaces', type: 'limited' }
                  ].map((cohort) => (
                    <div className="adm-cohort-row" key={cohort.grade}>
                      <div className="adm-cohort-class">
                        <CheckCircle2 size={14} style={{ color: cohort.type === 'open' ? '#059669' : '#d97706' }} />
                        <span>{cohort.grade}</span>
                      </div>
                      <span className={`adm-cohort-status ${cohort.type}`}>
                        {cohort.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Admissions Bureau Contact Card */}
              <div className="adm-sidebar-card adm-desk-card">
                <div className="adm-desk-badge">
                  <Building size={13} />
                  <span>Admissions Office</span>
                </div>
                <div className="adm-desk-title">Contact Us</div>

                <div className="adm-desk-items">
                  <div className="adm-desk-item">
                    <Phone size={15} className="adm-desk-icon" />
                    <div>
                      <div className="adm-desk-strong">+234 800 625 5263</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>Direct admissions desk helpline</div>
                    </div>
                  </div>

                  <div className="adm-desk-item">
                    <Mail size={15} className="adm-desk-icon" />
                    <div>
                      <div className="adm-desk-strong">admissions@oaklandschools.edu</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>Admissions correspondence</div>
                    </div>
                  </div>

                  <div className="adm-desk-item">
                    <Clock size={15} className="adm-desk-icon" />
                    <div>
                      <div className="adm-desk-strong">Office Hours</div>
                      <div style={{ fontSize: 12 }}>Monday – Friday: 8:00am – 4:00pm</div>
                      <div style={{ fontSize: 12 }}>Saturday: 9:00am – 12:00pm</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── SUCCESS SCREEN ── */
function SuccessScreen({
  appNo,
  name,
  classFor,
  email,
  formData,
}: {
  appNo: string;
  name: string;
  classFor: string;
  email: string;
  formData?: FormData;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(appNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const primaryPhone = formData?.fatherPhone || formData?.motherPhone || '—';
  const guardian = formData?.fatherName || formData?.motherName || 'Guardian';

  return (
    <div className="min-h-screen bg-slate-50/60 py-12 px-4 sm:px-6 flex items-center justify-center print:bg-white print:p-0 print:m-0">
      {/* Main Success Container */}
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 animate-in fade-in zoom-in-95 duration-300">
        {/* Print-Only Formal Header */}
        <div className="hidden print:block text-center border-b border-slate-300 pb-4 mb-4 pt-2">
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">Oakland Schools</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official Admission Application Slip &bull; 2026/2027 Academic Session
          </p>
        </div>

        {/* Header Banner */}
        <div className="bg-gradient-to-b from-teal-50/60 to-white px-8 pt-10 pb-6 text-center border-b border-slate-100 print:bg-white print:border-none print:pt-0 print:pb-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-xs mb-4 print:hidden">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Application Submitted
          </h1>
          <p className="text-slate-600 text-sm mt-2 max-w-lg mx-auto leading-relaxed">
            Thank you, <strong className="text-slate-900 font-semibold">{name || 'Applicant'}</strong>. Your admission application for{' '}
            <strong className="text-teal-800 font-semibold">{classFor}</strong> has been received and is in review.
          </p>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-6 print:p-0 print:space-y-4">
          {/* Reference Number Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center print:bg-slate-50 print:border print:border-slate-300">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Application Reference Number
            </p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 tracking-wider">
                {appNo}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="print:hidden px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Keep this reference safe — you will need it for all future correspondence.
            </p>
          </div>

          {/* Application Details Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 print:bg-white print:border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Applicant Name
              </span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{name}</p>
              <p className="text-[11px] text-slate-500">{formData?.gender || 'Student'}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 print:bg-white print:border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Target Class
              </span>
              <p className="font-bold text-teal-800 text-sm mt-0.5">{classFor}</p>
              <p className="text-[11px] text-slate-500">2026/2027 Academic Session</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 print:bg-white print:border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Guardian
              </span>
              <p className="font-semibold text-slate-800 text-xs mt-0.5">{guardian}</p>
              <p className="text-[11px] text-slate-500 font-mono">{primaryPhone}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 print:bg-white print:border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Notification Email
              </span>
              <p className="font-semibold text-slate-800 text-xs mt-0.5 truncate">{email || '—'}</p>
              <p className="text-[11px] text-slate-500">Confirmation dispatched</p>
            </div>
          </div>

          {/* Action Buttons (Strictly Hidden on Print) */}
          <div className="print:hidden flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto flex-1 px-5 py-3 rounded-xl bg-[#0f3a3e] hover:bg-[#134b50] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Save / Print Application Slip</span>
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <span>Return to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
