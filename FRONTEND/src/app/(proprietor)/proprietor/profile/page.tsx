'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Save,
  Globe,
  FileCheck,
  Edit3,
} from 'lucide-react';

export default function SchoolProfilePage() {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // School Identity State
  const [schoolName, setSchoolName] = useState('Oakland International College');
  const [motto, setMotto] = useState('Excellence, Integrity, Leadership');
  const [code, setCode] = useState('OAK-001');
  const [rcNumber, setRcNumber] = useState('RC-1849204');
  const [foundedYear, setFoundedYear] = useState('2014');
  const [accreditation, setAccreditation] = useState('Approved National Examination Centre #LAG-8891');

  // Contact & Campus
  const [address, setAddress] = useState('14 Academic Crescent, Victoria Island, Lagos');
  const [primaryPhone, setPrimaryPhone] = useState('+234 800 625 5263');
  const [secondaryPhone, setSecondaryPhone] = useState('+234 802 123 4567');
  const [primaryEmail, setPrimaryEmail] = useState('admin@oaklandschools.edu');
  const [admissionsEmail, setAdmissionsEmail] = useState('admissions@oaklandschools.edu');
  const [websiteUrl, setWebsiteUrl] = useState('https://oaklandschools.edu');

  // Academic Calendar
  const [currentSession, setCurrentSession] = useState('2026/2027');
  const [currentTerm, setCurrentTerm] = useState('First Term');
  const [termStartDate, setTermStartDate] = useState('2026-09-01');
  const [termEndDate, setTermEndDate] = useState('2026-12-18');
  const [nextTermResumption, setNextTermResumption] = useState('2027-01-11');

  // Leadership
  const [principalName, setPrincipalName] = useState('Mr Seyi Bankole');
  const [proprietorName, setProprietorName] = useState('School Proprietor');

  useEffect(() => {
    let isMounted = true;
    async function loadSchoolProfile() {
      try {
        const res = await fetch('/api/schools/profile');
        const json = await res.json();
        if (json.success && json.data && isMounted) {
          const d = json.data;
          setSchoolName(d.name || 'Oakland International College');
          setMotto(d.motto || 'Excellence, Integrity, Leadership');
          setCode(d.code || 'OAK-001');
          setRcNumber(d.rcNumber || 'RC-1849204');
          setFoundedYear(d.foundedYear || '2014');
          setAccreditation(d.accreditation || 'Approved National Examination Centre #LAG-8891');
          setAddress(d.address || '14 Academic Crescent, Victoria Island, Lagos');
          setPrimaryPhone(d.phone || '+234 800 625 5263');
          setSecondaryPhone(d.secondaryPhone || '+234 802 123 4567');
          setPrimaryEmail(d.email || 'admin@oaklandschools.edu');
          setAdmissionsEmail(d.admissionsEmail || 'admissions@oaklandschools.edu');
          setWebsiteUrl(d.websiteUrl || 'https://oaklandschools.edu');
          setCurrentSession(d.currentSession || '2026/2027');
          setCurrentTerm(d.currentTerm || 'First Term');
          setTermStartDate(d.termStartDate || '2026-09-01');
          setTermEndDate(d.termEndDate || '2026-12-18');
          setNextTermResumption(d.nextTermResumption || '2027-01-11');
          setPrincipalName(d.principalName || 'Mr Seyi Bankole');
          setProprietorName(d.proprietorName || 'School Proprietor');
        }
      } catch (err) {
        console.error('Failed to load school profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSchoolProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/schools/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: schoolName,
          motto,
          code,
          address,
          phone: primaryPhone,
          email: primaryEmail,
          rcNumber,
          foundedYear,
          accreditation,
          secondaryPhone,
          admissionsEmail,
          websiteUrl,
          nextTermResumption,
          proprietorName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsEditing(false);
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 4000);
      } else {
        alert(json.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Error updating school profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <BrandLoader size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            School Profile
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official institutional information, campus contact details, and session dates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              isLoading={isSaving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {saveToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">
            School profile updated and saved to PostgreSQL successfully.
          </span>
        </div>
      )}

      {/* Main Identity Card */}
      <Card className="p-6 border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100">
          <div className="w-28 h-28 rounded-2xl bg-white border-2 border-slate-200/80 p-2 shrink-0 flex items-center justify-center shadow-xs">
            <Image
              src="/logo.jpg"
              alt="Oakland Crest"
              width={100}
              height={100}
              className="object-contain rounded-lg"
              priority
            />
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1 w-full">
            {!isEditing ? (
              <>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight font-serif">
                    {schoolName}
                  </h2>
                  <span className="font-mono text-xs font-bold text-[#b3141f] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {code}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Motto: "{motto}"
                </p>

                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                  Co-educational secondary institution offering rigorous academic instruction from JSS 1 through SS 3 with comprehensive STEM, humanities, and moral leadership.
                </p>
              </>
            ) : (
              <div className="space-y-3 w-full text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official School Name</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">School Motto</label>
                    <input
                      type="text"
                      value={motto}
                      onChange={(e) => setMotto(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">School Code</label>
                    <input
                      type="text"
                      disabled
                      value={code}
                      className="w-full px-3 py-1.5 bg-slate-200/70 border border-slate-300 rounded-lg text-slate-600 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          {/* Campus Contacts */}
          <div className="space-y-3">
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#b3141f]" /> Campus Contacts
            </p>

            {!isEditing ? (
              <div className="space-y-2.5 text-slate-600">
                <p className="flex items-start gap-2">
                  <span className="font-semibold text-slate-800">Address:</span> {address}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Phones:</span> {primaryPhone} &bull; {secondaryPhone}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Emails:</span> {primaryEmail} &bull; {admissionsEmail}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Website:</span>{' '}
                  <a href={websiteUrl} target="_blank" rel="noreferrer" className="text-[#0f3a3e] font-semibold underline">
                    {websiteUrl}
                  </a>
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Campus Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Primary Phone</label>
                    <input
                      type="tel"
                      value={primaryPhone}
                      onChange={(e) => setPrimaryPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Admin Email</label>
                    <input
                      type="email"
                      value={primaryEmail}
                      onChange={(e) => setPrimaryEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Academic Calendar */}
          <div className="space-y-3">
            <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#b3141f]" /> Academic Calendar Dates
            </p>

            {!isEditing ? (
              <div className="space-y-2.5 text-slate-600">
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Active Session:</span> {currentSession}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Current Term:</span> {currentTerm}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Term Dates:</span> {termStartDate} to {termEndDate}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Next Term Resumes:</span> {nextTermResumption}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Academic Session</label>
                    <input
                      type="text"
                      value={currentSession}
                      disabled
                      className="w-full px-2.5 py-1.5 bg-slate-200/70 border border-slate-300 rounded-lg text-xs text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Current Term</label>
                    <input
                      type="text"
                      value={currentTerm}
                      disabled
                      className="w-full px-2.5 py-1.5 bg-slate-200/70 border border-slate-300 rounded-lg text-xs text-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">Next Term Resumes</label>
                  <input
                    type="date"
                    value={nextTermResumption}
                    onChange={(e) => setNextTermResumption(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leadership & Registry */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Accreditation
            </span>
            <p className="font-bold text-slate-900">{accreditation}</p>
            <p className="text-[11px] text-slate-500">Ministry Registration: {rcNumber}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Principal (Academics)
            </span>
            <p className="font-bold text-slate-900">{principalName}</p>
            <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5" /> Appointed Principal Active
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
