'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { PRODUCT_NAME, isEductiveBrand } from '@/lib/brand';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

interface SchoolProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  currentSession: string;
  currentTerm: string;
}

const EMPTY_PROFILE: SchoolProfile = {
  name: '',
  address: '',
  phone: '',
  email: '',
  currentSession: '',
  currentTerm: '',
};

export function PublicFooter({ showLongPages = false }: { showLongPages?: boolean }) {
  const [profile, setProfile] = useState<SchoolProfile>(EMPTY_PROFILE);

  // Everything shown here comes from the school's record; a missing field is left out
  useEffect(() => {
    fetch('/api/schools/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.data) {
          setProfile({
            name: json.data.name || '',
            address: json.data.address || '',
            phone: json.data.phone || '',
            email: json.data.email || '',
            currentSession: json.data.currentSession || '',
            currentTerm: json.data.currentTerm || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="ok-footer">
      <div className="ok-footer-inner">
        <div className="ok-footer-top">
          <div className="ok-footer-brand">
            <Logo theme="dark" size="sm" />
            <p>
              {showLongPages
                ? 'An elite British-Nigerian educational institution cultivating scholars of moral distinction, intellectual rigor, and visionary leadership.'
                : profile.name}
            </p>
          </div>

          <div className="ok-footer-col">
            <h5>Quick Links</h5>
            <ul>
              <li><Link href="/">Home</Link></li>
              {showLongPages && (
                <>
                  <li><Link href="/about">About {profile.name}</Link></li>
                  <li><Link href="/academics">Curriculum &amp; Academics</Link></li>
                  <li><Link href="/our-values">Our Values</Link></li>
                </>
              )}
              <li><Link href="/admissions">Admissions</Link></li>
              <li><Link href="/login">Staff Portal</Link></li>
            </ul>
          </div>

          <div className="ok-footer-col">
            <h5>School Hours</h5>
            <ul>
              <li><span>Mon – Thu: 7:45am – 3:30pm</span></li>
              <li><span>Friday: 7:45am – 1:00pm</span></li>
              {profile.currentSession && <li><span>Current Session: {profile.currentSession}</span></li>}
              {profile.currentTerm && <li><span>{profile.currentTerm} in Progress</span></li>}
            </ul>
          </div>

          <div className="ok-footer-col">
            <h5>Contact</h5>
            <ul>
              {profile.address && (
                <li>
                  <span>
                    <MapPin size={13} style={{ color: 'var(--brand-accent)', marginTop: 2, flexShrink: 0 }} />
                    {profile.address}
                  </span>
                </li>
              )}
              {profile.phone && (
                <li>
                  <span>
                    <Phone size={13} style={{ color: 'var(--brand-accent)', marginTop: 2, flexShrink: 0 }} />
                    {profile.phone}
                  </span>
                </li>
              )}
              {profile.email && (
                <li>
                  <span>
                    <Mail size={13} style={{ color: 'var(--brand-accent)', marginTop: 2, flexShrink: 0 }} />
                    {profile.email}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="ok-footer-bottom">
          {profile.name && (
            <p className="ok-footer-copy">
              © {new Date().getFullYear()} {profile.name}. All rights reserved.
            </p>
          )}
          {!isEductiveBrand() && <p className="ok-footer-copy">Powered by {PRODUCT_NAME}</p>}
        </div>
      </div>
    </footer>
  );
}
