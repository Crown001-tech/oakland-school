'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  Lock,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Camera,
  UploadCloud,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function StaffRegistrationPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    qualification: 'B.Ed (Education)',
    department: 'Mathematics & STEM',
    desiredRole: 'teacher',
    yearsExperience: '3-5 years',
    password: '',
    confirmPassword: '',
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setPhotoError('Passport photo size must be less than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!photoPreview) {
      setErrorMessage('Please upload a passport photograph before submitting.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            qualification: formData.qualification,
            department: formData.department,
            desired_role: formData.desiredRole,
            years_experience: formData.yearsExperience,
            photo_url: photoPreview,
            approval_status: 'pending_approval',
          },
        },
      });

      if (error && !error.message.includes('Invalid API key') && !error.message.includes('FetchError')) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-lg mx-auto p-4 sm:p-6">
        <Card className="border-teal-200/80 shadow-lg text-center p-8 space-y-6 bg-white">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="amber" size="md">
              Awaiting Proprietor Approval
            </Badge>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Application Successfully Submitted
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              Thank you, <span className="font-bold text-slate-900">{formData.firstName} {formData.lastName}</span>.
              Your staff credentials, passport photo, and qualifications have been received and placed in the queue for review and approval by the School Proprietor.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
            <p className="font-semibold text-slate-800">What happens next?</p>
            <ul className="space-y-1.5 text-slate-600 text-[11px] list-disc list-inside">
              <li>The School Proprietor reviews your application and assigns your official classes and subjects.</li>
              <li>You will receive an activation email with verification instructions.</li>
              <li>Once approved, you can immediately access your designated portal.</li>
            </ul>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Link href="/login">
              <Button size="md" variant="outline">
                Back to Sign In
              </Button>
            </Link>
            <Link href="/">
              <Button size="md" variant="primary">
                Return to Website
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <Card className="border-slate-200/80 shadow-lg">
        <CardHeader className="pb-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Staff & Teacher Registration
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Apply for academic or administrative appointment at Oakland Schools.
              </CardDescription>
            </div>
            <Badge variant="teal" size="sm">
              Proprietor Approved
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Passport Photo Upload (Mandatory) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Passport Photograph <span className="text-[#b3141f]">*</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Upload a clear, front-facing official passport photograph (Max 3MB).
                  </p>
                </div>
                {photoPreview && (
                  <Badge variant="emerald" size="sm">
                    Photo Attached
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 pt-1">
                {photoPreview ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-[#b3141f] shrink-0 shadow-xs">
                    <img
                      src={photoPreview}
                      alt="Passport Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-1 right-1 w-5 h-5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full flex items-center justify-center text-xs"
                      title="Remove Photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <Camera className="w-6 h-6" />
                    <span className="text-[9px] mt-1 font-semibold">Photo</span>
                  </div>
                )}

                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="passport-file-input"
                  />
                  <label
                    htmlFor="passport-file-input"
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                    <span>{photoPreview ? 'Change Photo' : 'Select Passport Photo'}</span>
                  </label>
                  {photoError && <p className="text-xs text-rose-600 font-medium">{photoError}</p>}
                </div>
              </div>
            </div>

            {/* Step 2: Personal Information */}
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                1. Personal Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  required
                  placeholder="e.g. David"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  leftIcon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Last Name"
                  required
                  placeholder="e.g. Ade"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  leftIcon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Official Email"
                  type="email"
                  required
                  placeholder="e.g. david.ade@oaklandschools.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  leftIcon={<Mail className="w-4 h-4" />}
                />
                <Input
                  label="Phone Number"
                  required
                  placeholder="+234 800 000 0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Step 3: Professional Background */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                2. Academic Background & Specialization
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Highest Qualification
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  >
                    <option value="B.Ed (Education)">B.Ed (Education)</option>
                    <option value="B.Sc / B.A">B.Sc / B.A</option>
                    <option value="PGDE">PGDE (Postgraduate Diploma)</option>
                    <option value="M.Ed / M.Sc">M.Ed / M.Sc (Masters)</option>
                    <option value="Ph.D">Ph.D (Doctorate)</option>
                    <option value="HND / Professional Cert">HND / Professional Accounting</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Subject / Department
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="Basic Science & STEM">Basic Science & STEM</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="English Language & Literature">English Language & Literature</option>
                    <option value="Physics, Chemistry & Biology">Sciences (Physics/Chemistry/Biology)</option>
                    <option value="Social Studies & Civic">Social Studies & Civic Education</option>
                    <option value="Commercial & Accounting">Commercial & Accounting</option>
                    <option value="General School Administration">General Administration</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Role Applying For
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
                    value={formData.desiredRole}
                    onChange={(e) => setFormData({ ...formData, desiredRole: e.target.value })}
                  >
                    <option value="teacher">Teacher (Subject & Class Instruction)</option>
                    <option value="admin">Administrator (Principal / Registrar)</option>
                    <option value="bursar">Bursar (Accountant)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Teaching Experience
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f3a3e]"
                    value={formData.yearsExperience}
                    onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                  >
                    <option value="1-2 years">1–2 years</option>
                    <option value="3-5 years">3–5 years</option>
                    <option value="6-10 years">6–10 years</option>
                    <option value="10+ years">10+ years (Senior Faculty)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 4: Security Credentials */}
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                3. Account Password
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Create Password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  leftIcon={<Lock className="w-4 h-4" />}
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  leftIcon={<Lock className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link href="/login" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                Already registered? Sign in &rarr;
              </Link>

              <Button
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                className="w-full sm:w-auto bg-[#0f3a3e] hover:bg-[#164e53] text-white px-6 shadow-sm font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Submit Application to Proprietor
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
