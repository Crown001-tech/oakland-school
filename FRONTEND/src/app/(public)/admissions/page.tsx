'use client';

import React, { useState } from 'react';
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
  ChevronRight
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

const ADMISSION_PHASES = [
  {
    num: '01',
    tabTitle: 'Online Application',
    badge: 'Stage 01 • Application Submission',
    title: 'Complete Online Application',
    tagline: 'Streamlined, 10-minute digital enrollment portal.',
    desc: 'Families begin the admissions journey by completing our secure digital application. Enter your child’s biodata, previous academic performance records, and authorized guardian contact details.',
    highlights: [
      { label: 'Instant Reference', detail: 'A unique application reference number (e.g. OSC-ADM-2026-XXXX) is issued immediately upon submission.' },
      { label: 'Direct Intake', detail: 'Upload digital copies of birth certificates and previous term report cards without physical campus visits.' },
      { label: 'Committee Review', detail: 'Applications are instantly routed to the Admissions Board for preliminary credential vetting.' },
    ],
    image: '/library.jpg',
    imageCaption: 'Rotunda Library — Digital Admissions & Research Portal',
    nextTitle: 'Proceed to Step 02: Entrance Screening',
  },
  {
    num: '02',
    tabTitle: 'Entrance Screening',
    badge: 'Stage 02 • Credential Vetting & Docket',
    title: 'Entrance Screening & Invitation',
    tagline: 'Shortlisted candidates receive official assessment passes.',
    desc: 'Our academic review board inspects academic transcripts and background information. Qualified applicants receive an official invitation slip detailing their examination date, venue, and reporting schedule.',
    highlights: [
      { label: 'Direct Notification', detail: 'Examination passes are dispatched directly via SMS and secure email to primary guardians.' },
      { label: 'Guidance Notes', detail: 'Candidates receive preparation syllabus evaluated across Mathematics, English, and Aptitude.' },
      { label: 'Accommodations', detail: 'Special arrangements available for diaspora and out-of-state transferring scholars.' },
    ],
    image: '/classroom.jpg',
    imageCaption: 'Collegiate Lecture Hall — Admissions Screening & Briefing',
    nextTitle: 'Proceed to Step 03: Assessment Day',
  },
  {
    num: '03',
    tabTitle: 'Assessment Day',
    badge: 'Stage 03 • Academic & Character Evaluation',
    title: 'Assessment Day & Pastoral Interview',
    tagline: 'Rigorous cognitive evaluation in collegiate seminar rooms.',
    desc: 'Candidates visit our campus for a proctored examination evaluating English proficiency, mathematical agility, and analytical problem-solving, accompanied by an interactive pastoral conversation.',
    highlights: [
      { label: 'Holistic Evaluation', detail: 'We assess intellectual curiosity, communication clarity, and values alignment alongside test scores.' },
      { label: 'Proctored Standard', detail: 'Examinations are administered in small seminar formats to ensure calm, focused performance.' },
      { label: 'Campus Tour', detail: 'Parents enjoy an escorted private walkthrough of our STEM laboratories and residential halls.' },
    ],
    image: '/stem-lab.jpg',
    imageCaption: 'STEM & Applied Science Labs — Proctored Testing Facility',
    nextTitle: 'Proceed to Step 04: Offer & Enrolment',
  },
  {
    num: '04',
    tabTitle: 'Offer & Enrolment',
    badge: 'Stage 04 • Formal Admission & Onboarding',
    title: 'Offer of Admission & Matriculation',
    tagline: 'Welcoming future leaders into the Oakland community.',
    desc: 'Successful applicants receive an official Letter of Offer and Welcome Dossier. Guardians confirm acceptance to secure class placement, receive house assignments, and access the school uniform and books portal.',
    highlights: [
      { label: 'Swift Decision', detail: 'Official decisions are communicated within 5 business days following the on-campus assessment.' },
      { label: 'House Induction', detail: 'Scholars are formally inducted into one of our four historic collegiate houses upon enrollment.' },
      { label: 'Orientation', detail: 'Comprehensive induction program for new scholars and families prior to term resumption.' },
    ],
    image: '/campus-quad.jpg',
    imageCaption: 'The Central Quadrangle — Matriculation & Scholar Induction',
    nextTitle: 'Start Online Application (Step 1)',
  },
];

let seqCounter = 1000;

export default function PublicAdmissionsPage() {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationNo, setApplicationNo] = useState('');
  const [step, setStep] = useState(1);
  const [activeJourneyStep, setActiveJourneyStep] = useState<number>(0);
  const totalSteps = 3;

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

        /* ── SECTION: ADMISSIONS JOURNEY WALKTHROUGH (NO CARDS) ── */
        .adm-journey-section {
          background: #07181a;
          position: relative;
          padding: 100px 32px 110px;
          border-top: 1px solid rgba(212, 168, 90, 0.25);
          border-bottom: 1px solid rgba(212, 168, 90, 0.25);
          overflow: hidden;
          color: #ffffff;
        }
        .adm-journey-ambient {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(212, 168, 90, 0.09) 0%, transparent 60%);
          pointer-events: none;
        }
        .adm-journey-inner {
          max-width: 1280px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        .adm-journey-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 50px;
        }
        .adm-journey-eyebrow {
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
        .adm-journey-eyebrow::before,
        .adm-journey-eyebrow::after {
          content: '';
          display: block;
          width: 36px;
          height: 1px;
          background: #d4a85a;
          opacity: 0.5;
        }
        .adm-journey-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(34px, 4vw, 52px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 16px;
        }
        .adm-journey-title em {
          font-style: italic;
          color: #d4a85a;
        }
        .adm-journey-sub {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 300;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.72);
        }

        /* ── HORIZONTAL STEPPER RAIL (NO CARDS) ── */
        .adm-stepper-rail {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid rgba(212, 168, 90, 0.25);
          position: relative;
          margin-bottom: 60px;
        }
        .adm-stepper-tab {
          background: transparent;
          border: none;
          padding: 20px 16px;
          cursor: pointer;
          text-align: left;
          position: relative;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .adm-stepper-tab:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .adm-tab-num {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 700;
          color: rgba(212, 168, 90, 0.4);
          transition: color 0.3s, transform 0.3s;
        }
        .adm-stepper-tab.active .adm-tab-num,
        .adm-stepper-tab:hover .adm-tab-num {
          color: #d4a85a;
          transform: scale(1.1);
        }
        .adm-tab-label {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
          transition: color 0.3s;
        }
        .adm-stepper-tab.active .adm-tab-label {
          color: #ffffff;
          font-weight: 700;
        }
        .adm-tab-indicator {
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #d4a85a;
          box-shadow: 0 0 12px rgba(212, 168, 90, 0.8);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .adm-stepper-tab.active .adm-tab-indicator {
          opacity: 1;
        }

        /* ── THE STAGE (EDITORIAL SPLIT - NO CARDS) ── */
        .adm-stage {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 70px;
          align-items: stretch;
          min-height: 520px;
        }
        .adm-stage-narrative {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 10px 0;
          animation: stageFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes stageFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .stage-eyebrow-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }
        .stage-watermark-num {
          font-family: 'Playfair Display', serif;
          font-size: clamp(52px, 5.5vw, 76px);
          font-weight: 900;
          line-height: 1;
          color: #d4a85a;
          letter-spacing: -0.02em;
        }
        .stage-phase-tag {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #d4a85a;
          background: rgba(212, 168, 90, 0.12);
          border: 1px solid rgba(212, 168, 90, 0.3);
          padding: 5px 12px;
          border-radius: 20px;
        }
        .stage-heading {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(28px, 3.2vw, 42px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          margin-bottom: 12px;
        }
        .stage-tagline {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 16px;
          font-style: italic;
          color: #d4a85a;
          margin-bottom: 16px;
        }
        .stage-desc {
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 300;
          margin-bottom: 28px;
        }
        .stage-highlights {
          display: flex;
          flex-direction: column;
          gap: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 24px;
          margin-bottom: 32px;
        }
        .stage-highlight-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.6;
        }
        .stage-highlight-icon {
          color: #d4a85a;
          margin-top: 2px;
          flex-shrink: 0;
        }
        .stage-highlight-item strong {
          color: #ffffff;
          font-weight: 600;
        }

        .stage-footer-actions {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          padding-top: 10px;
        }
        .stage-btn-primary {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          background: #d4a85a;
          color: #07181a;
          padding: 15px 30px;
          border-radius: 2px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.25s ease;
          box-shadow: 0 8px 24px rgba(212, 168, 90, 0.25);
        }
        .stage-btn-primary:hover {
          background: #c4943e;
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(212, 168, 90, 0.35);
        }
        .stage-btn-next {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 14px 24px;
          border-radius: 2px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.25s ease;
        }
        .stage-btn-next:hover {
          border-color: #d4a85a;
          color: #d4a85a;
          transform: translateX(3px);
        }

        /* ── RIGHT VISUAL STAGE ── */
        .adm-stage-media {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .adm-visual-frame {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 480px;
          border: 1px solid rgba(212, 168, 90, 0.35);
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
        }
        .adm-visual-img {
          object-fit: cover;
          width: 100%;
          height: 100%;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .adm-visual-frame:hover .adm-visual-img {
          transform: scale(1.03);
        }
        .adm-visual-badge {
          position: absolute;
          bottom: 24px;
          left: 24px;
          right: 24px;
          background: rgba(7, 24, 26, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(212, 168, 90, 0.5);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #ffffff;
        }
        .adm-visual-badge-text {
          font-family: 'Playfair Display', serif;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }
        .adm-visual-badge-step {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #d4a85a;
        }
        .stage-nav-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 24px;
        }
        .stage-dot-btn {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1px solid rgba(212, 168, 90, 0.4);
          background: transparent;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }
        .stage-dot-btn.active {
          background: #d4a85a;
          box-shadow: 0 0 10px rgba(212, 168, 90, 0.8);
          transform: scale(1.25);
        }

        /* ── FORM LAYOUT ── */
        .adm-body {
          background: #f5f2ed;
          padding: 80px 32px;
        }
        .adm-body-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 60px;
          align-items: start;
        }

        /* ── FORM CARD ── */
        .adm-form-wrap {
          background: #ffffff;
        }
        .adm-form-header {
          background: #07181a;
          padding: 32px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .adm-form-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
        }
        .adm-stepper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .adm-step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          transition: background 0.3s;
        }
        .adm-step-dot.active { background: #d4a85a; color: #07181a; }
        .adm-step-dot.done { background: #0f3a3e; color: #d4a85a; }
        .adm-step-dot.future { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); }
        .adm-step-line { width: 24px; height: 1px; background: rgba(255,255,255,0.15); }

        .adm-form-body { padding: 40px; }
        .adm-section-label {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #b3141f;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e8e4de;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .adm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .adm-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .adm-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
        .adm-label {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .adm-input {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #07181a;
          background: #f9f8f6;
          border: 1px solid #e0dbd3;
          padding: 13px 16px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          width: 100%;
          -webkit-appearance: none;
        }
        .adm-input:focus { border-color: #07181a; background: #ffffff; }
        .adm-input::placeholder { color: #9ca3af; }
        select.adm-input { cursor: pointer; }
        .adm-nav-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 32px;
          border-top: 1px solid #e8e4de;
          margin-top: 12px;
        }
        .adm-btn-back {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b7280;
          background: transparent;
          border: 1px solid #d1cbc2;
          padding: 12px 24px;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .adm-btn-back:hover { border-color: #07181a; color: #07181a; }
        .adm-btn-next {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #07181a;
          background: #d4a85a;
          border: none;
          padding: 14px 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }
        .adm-btn-next:hover { background: #c4943e; }

        /* ── SIDEBAR ── */
        .adm-sidebar { display: flex; flex-direction: column; gap: 24px; }
        .adm-info-block {
          background: #07181a;
          padding: 36px;
        }
        .adm-info-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 20px;
          line-height: 1.3;
        }
        .adm-info-list { display: flex; flex-direction: column; gap: 14px; }
        .adm-info-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 300;
          color: rgba(255,255,255,0.55);
          line-height: 1.55;
        }
        .adm-info-item-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #d4a85a;
          margin-top: 7px;
          flex-shrink: 0;
        }
        .adm-contact-block {
          background: #f0ebe3;
          padding: 32px;
          border-left: 3px solid #d4a85a;
        }
        .adm-contact-label {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #b3141f;
          margin-bottom: 12px;
        }
        .adm-contact-detail {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: #374151;
          line-height: 1.8;
        }
        .adm-contact-detail strong {
          display: block;
          font-size: 15px;
          font-weight: 600;
          color: #07181a;
          margin-bottom: 4px;
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

        @media (max-width: 1024px) {
          .adm-body-inner { grid-template-columns: 1fr; }
          .adm-sidebar { order: -1; }
          .adm-stepper-rail { grid-template-columns: repeat(2, 1fr); }
          .adm-stage { grid-template-columns: 1fr; gap: 40px; }
          .adm-visual-frame { min-height: 380px; height: 380px; }
        }
        @media (max-width: 640px) {
          .adm-hero { height: 360px; }
          .adm-hero-content, .adm-body, .adm-journey-section { padding-left: 20px; padding-right: 20px; }
          .adm-journey-section { padding-top: 60px; padding-bottom: 60px; }
          .adm-stepper-rail { grid-template-columns: 1fr; }
          .adm-visual-frame { min-height: 280px; height: 280px; }
          .stage-footer-actions { flex-direction: column; align-items: stretch; }
          .stage-btn-primary, .stage-btn-next { width: 100%; justify-content: center; }
          .adm-form-body { padding: 24px 20px; }
          .adm-form-header { padding: 24px 20px; }
          .adm-grid-2, .adm-grid-3 { grid-template-columns: 1fr; }
          .adm-success-body { padding: 28px 24px; }
          .adm-success-header { padding: 36px 24px; }
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

      {/* ── SECTION: ADMISSIONS JOURNEY WALKTHROUGH (CARDLESS EDITORIAL STAGE) ── */}
      <section className="adm-journey-section">
        <div className="adm-journey-ambient" />
        <div className="adm-journey-inner">
          <div className="adm-journey-header">
            <div className="adm-journey-eyebrow">Admissions Protocol</div>
            <h2 className="adm-journey-title">
              The Four-Stage Pathway to <em>Enrollment</em>
            </h2>
            <p className="adm-journey-sub">
              A transparent, merit-guided admissions journey designed to evaluate intellectual readiness, personal character, and welcome families into the Oakland community.
            </p>
          </div>

          {/* Stepper Rail - Sleek horizontal timeline, zero cards */}
          <div className="adm-stepper-rail">
            {ADMISSION_PHASES.map((p, idx) => {
              const isActive = activeJourneyStep === idx;
              return (
                <button
                  key={p.num}
                  type="button"
                  onClick={() => setActiveJourneyStep(idx)}
                  className={`adm-stepper-tab ${isActive ? 'active' : ''}`}
                >
                  <span className="adm-tab-num">{p.num}</span>
                  <span className="adm-tab-label">{p.tabTitle}</span>
                  <div className="adm-tab-indicator" />
                </button>
              );
            })}
          </div>

          {/* Editorial Stage - 2 column showcase */}
          {(() => {
            const currentPhase = ADMISSION_PHASES[activeJourneyStep] || ADMISSION_PHASES[0];
            const isLastPhase = activeJourneyStep === ADMISSION_PHASES.length - 1;
            return (
              <div key={currentPhase.num} className="adm-stage">
                {/* Left Narrative */}
                <div className="adm-stage-narrative">
                  <div>
                    <div className="stage-eyebrow-row">
                      <span className="stage-watermark-num">{currentPhase.num}</span>
                      <span className="stage-phase-tag">{currentPhase.badge}</span>
                    </div>

                    <h3 className="stage-heading">{currentPhase.title}</h3>
                    <p className="stage-tagline">{currentPhase.tagline}</p>
                    <p className="stage-desc">{currentPhase.desc}</p>

                    <div className="stage-highlights">
                      {currentPhase.highlights.map((h, hIdx) => (
                        <div key={hIdx} className="stage-highlight-item">
                          <CheckCircle2 size={16} className="stage-highlight-icon" />
                          <div>
                            <strong>{h.label}: </strong>
                            <span>{h.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="stage-footer-actions">
                    <a href="#admission-form" className="stage-btn-primary">
                      <span>Begin Online Application</span>
                      <ArrowDown size={14} />
                    </a>

                    <button
                      type="button"
                      onClick={() => setActiveJourneyStep((prev) => (prev + 1) % ADMISSION_PHASES.length)}
                      className="stage-btn-next"
                    >
                      <span>{isLastPhase ? 'Back to Step 01' : `Next: Step 0${activeJourneyStep + 2}`}</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Right Visual Stage */}
                <div className="adm-stage-media">
                  <div className="adm-visual-frame">
                    <Image
                      src={currentPhase.image}
                      alt={currentPhase.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="adm-visual-img"
                      priority
                    />
                    <div className="adm-visual-badge">
                      <span className="adm-visual-badge-text">{currentPhase.imageCaption}</span>
                      <span className="adm-visual-badge-step">Stage 0{activeJourneyStep + 1} of 04</span>
                    </div>
                  </div>

                  {/* Navigation Dots */}
                  <div className="stage-nav-dots">
                    {ADMISSION_PHASES.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        type="button"
                        aria-label={`Jump to stage ${dotIdx + 1}`}
                        onClick={() => setActiveJourneyStep(dotIdx)}
                        className={`stage-dot-btn ${activeJourneyStep === dotIdx ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── FORM BODY ── */}
      <div className="adm-body" id="admission-form">
        <div className="adm-body-inner">
          {/* FORM */}
          <form onSubmit={handleSubmit}>
            <div className="adm-form-wrap">
              {/* Header */}
              <div className="adm-form-header">
                <span className="adm-form-title">
                  {step === 1 ? 'Student Information' : step === 2 ? 'Guardian & Contact' : 'Medical & Declaration'}
                </span>
                <div className="adm-stepper">
                  {[1, 2, 3].map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={`adm-step-dot ${s === step ? 'active' : s < step ? 'done' : 'future'}`}>{s}</div>
                      {i < 2 && <div className="adm-step-line" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Step 1 — Student */}
              {step === 1 && (
                <div className="adm-form-body">
                  <div className="adm-section-label">Personal Biodata</div>
                  <div className="adm-grid-3">
                    <div className="adm-field">
                      <label className="adm-label">Surname *</label>
                      <input required name="surname" value={formData.surname} onChange={handleChange} className="adm-input" placeholder="e.g. Balogun" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">First Name *</label>
                      <input required name="firstName" value={formData.firstName} onChange={handleChange} className="adm-input" placeholder="e.g. Adewale" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Middle Name</label>
                      <input name="middleName" value={formData.middleName} onChange={handleChange} className="adm-input" placeholder="Optional" />
                    </div>
                  </div>
                  <div className="adm-grid-3">
                    <div className="adm-field">
                      <label className="adm-label">Gender *</label>
                      <select required name="gender" value={formData.gender} onChange={handleChange} className="adm-input">
                        <option>Male</option>
                        <option>Female</option>
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Date of Birth *</label>
                      <input required type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="adm-input" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Class Applying For *</label>
                      <select required name="classApplyingFor" value={formData.classApplyingFor} onChange={handleChange} className="adm-input">
                        {['JSS 1','JSS 2','JSS 3','SS 1','SS 2','SS 3'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="adm-grid-3">
                    <div className="adm-field">
                      <label className="adm-label">State of Origin *</label>
                      <input required name="stateOfOrigin" value={formData.stateOfOrigin} onChange={handleChange} className="adm-input" placeholder="e.g. Lagos State" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">LGA *</label>
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

                  <div className="adm-section-label" style={{ marginTop: 24 }}>Previous Education</div>
                  <div className="adm-grid-2">
                    <div className="adm-field">
                      <label className="adm-label">Previous School *</label>
                      <input required name="previousSchool" value={formData.previousSchool} onChange={handleChange} className="adm-input" placeholder="e.g. Corona Primary School" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Last Class Passed *</label>
                      <input required name="lastClassPassed" value={formData.lastClassPassed} onChange={handleChange} className="adm-input" placeholder="e.g. Primary 6 / JSS 3" />
                    </div>
                  </div>

                  <div className="adm-nav-row">
                    <span />
                    <button type="button" className="adm-btn-next" onClick={() => setStep(2)}>
                      Next: Guardian Info <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 — Guardian */}
              {step === 2 && (
                <div className="adm-form-body">
                  <div className="adm-section-label">Father / Male Guardian</div>
                  <div className="adm-grid-3">
                    <div className="adm-field">
                      <label className="adm-label">Full Name *</label>
                      <input required name="fatherName" value={formData.fatherName} onChange={handleChange} className="adm-input" placeholder="Title + Full Name" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Phone *</label>
                      <input required name="fatherPhone" value={formData.fatherPhone} onChange={handleChange} className="adm-input" placeholder="+234 800 000 0000" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Email *</label>
                      <input required type="email" name="fatherEmail" value={formData.fatherEmail} onChange={handleChange} className="adm-input" placeholder="father@email.com" />
                    </div>
                  </div>

                  <div className="adm-section-label" style={{ marginTop: 24 }}>Mother / Female Guardian</div>
                  <div className="adm-grid-3">
                    <div className="adm-field">
                      <label className="adm-label">Full Name *</label>
                      <input required name="motherName" value={formData.motherName} onChange={handleChange} className="adm-input" placeholder="Title + Full Name" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Phone *</label>
                      <input required name="motherPhone" value={formData.motherPhone} onChange={handleChange} className="adm-input" placeholder="+234 800 000 0000" />
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Email</label>
                      <input type="email" name="motherEmail" value={formData.motherEmail} onChange={handleChange} className="adm-input" placeholder="mother@email.com" />
                    </div>
                  </div>

                  <div className="adm-section-label" style={{ marginTop: 24 }}>Home Address</div>
                  <div className="adm-field">
                    <label className="adm-label">Residential Address *</label>
                    <input required name="residentialAddress" value={formData.residentialAddress} onChange={handleChange} className="adm-input" placeholder="House No, Street, Estate, City, State" />
                  </div>

                  <div className="adm-nav-row">
                    <button type="button" className="adm-btn-back" onClick={() => setStep(1)}>← Back</button>
                    <button type="button" className="adm-btn-next" onClick={() => setStep(3)}>
                      Next: Medical Info <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 — Medical */}
              {step === 3 && (
                <div className="adm-form-body">
                  <div className="adm-section-label">Medical Information</div>
                  <div className="adm-grid-3">
                    <div className="adm-field">
                      <label className="adm-label">Blood Group *</label>
                      <select required name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="adm-input">
                        {['A+','A−','B+','B−','O+','O−','AB+','AB−'].map(b => <option key={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Genotype *</label>
                      <select required name="genotype" value={formData.genotype} onChange={handleChange} className="adm-input">
                        {['AA','AS','SS','AC','SC'].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="adm-field">
                      <label className="adm-label">Known Allergies / Conditions</label>
                      <input name="medicalConditions" value={formData.medicalConditions} onChange={handleChange} className="adm-input" placeholder="None / specify if any" />
                    </div>
                  </div>

                  <div className="adm-section-label" style={{ marginTop: 24, color: '#07181a', borderColor: '#d4c9b8' }}>Declaration</div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 24 }}>
                    By submitting this application, I/we confirm that all information provided is accurate and complete. I/we understand that any false declaration will lead to disqualification. I/we consent to Oakland Schools collecting and processing this data for the purposes of admissions assessment and student enrolment.
                  </p>

                  <div className="adm-nav-row">
                    <button type="button" className="adm-btn-back" onClick={() => setStep(2)}>← Back</button>
                    <button type="submit" className="adm-btn-next">
                      Submit Application <Send size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* SIDEBAR */}
          <div className="adm-sidebar">
            <div className="adm-info-block">
              <div className="adm-info-title">What to Expect After Applying</div>
              <div className="adm-info-list">
                {[
                  'You will receive an automated acknowledgement email within minutes of submission.',
                  'Shortlisted candidates are contacted within 10 business days with an exam slip.',
                  'Entrance assessment covers English, Mathematics, and Basic Science / General Knowledge.',
                  'Results are communicated privately to the parent/guardian email provided.',
                  'Successful candidates receive an official Oakland Schools Admission Offer Letter.',
                  'Acceptance of offer must be confirmed within 7 days to secure placement.',
                ].map((t, i) => (
                  <div className="adm-info-item" key={i}>
                    <div className="adm-info-item-dot" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="adm-contact-block">
              <div className="adm-contact-label">Admissions Office</div>
              <div className="adm-contact-detail">
                <strong>+234 800 625 5263</strong>
                admissions@oaklandschools.edu
              </div>
              <div className="adm-contact-detail" style={{ marginTop: 12 }}>
                <strong>Office Hours</strong>
                Monday – Friday: 8:00am – 4:00pm<br />
                Saturday: 9:00am – 12:00pm
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: 28 }}>
              <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 18, fontWeight: 700, color: '#07181a', marginBottom: 16, lineHeight: 1.3 }}>
                Classes Currently Accepting Applications
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['JSS 1 — Limited Spaces', 'JSS 2 — Available', 'SS 1 — Available', 'SS 2 — Limited Spaces'].map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#374151' }}>
                    <CheckCircle2 size={15} style={{ color: '#0f3a3e', flexShrink: 0 }} />
                    {c}
                  </div>
                ))}
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
  const guardian = formData?.fatherName || formData?.motherName || 'Parent / Guardian';

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
                Parent / Guardian
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
