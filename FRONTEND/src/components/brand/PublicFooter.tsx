'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

interface SchoolProfile {
  name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  currentSession: string;
  currentTerm: string;
}

const DEFAULT_PROFILE: SchoolProfile = {
  name: 'Oakland International College',
  motto: 'Excellence, Integrity, Leadership',
  address: '14 Academic Crescent, Victoria Island, Lagos',
  phone: '+234 800 625 5263',
  email: 'info@oaklandschools.edu',
  currentSession: '2026/2027',
  currentTerm: 'First Term',
};

export function PublicFooter() {
  const [profile, setProfile] = useState<SchoolProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    fetch('/api/schools/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.data) {
          setProfile({
            name: json.data.name || DEFAULT_PROFILE.name,
            motto: json.data.motto || DEFAULT_PROFILE.motto,
            address: json.data.address || DEFAULT_PROFILE.address,
            phone: json.data.phone || DEFAULT_PROFILE.phone,
            email: json.data.email || DEFAULT_PROFILE.email,
            currentSession: json.data.currentSession || DEFAULT_PROFILE.currentSession,
            currentTerm: json.data.currentTerm || DEFAULT_PROFILE.currentTerm,
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
              An elite British-Nigerian educational institution cultivating scholars of moral distinction, intellectual rigor, and visionary leadership.
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
              <li><span>Current Session: {profile.currentSession}</span></li>
              <li><span>{profile.currentTerm} in Progress</span></li>
            </ul>
          </div>

          <div className="ok-footer-col">
            <h5>Contact</h5>
            <ul>
              <li>
                <span>
                  <MapPin size={13} style={{ color: '#b3141f', marginTop: 2, flexShrink: 0 }} />
                  {profile.address}
                </span>
              </li>
              <li>
                <span>
                  <Phone size={13} style={{ color: '#b3141f', marginTop: 2, flexShrink: 0 }} />
                  {profile.phone}
                </span>
              </li>
              <li>
                <span>
                  <Mail size={13} style={{ color: '#b3141f', marginTop: 2, flexShrink: 0 }} />
                  {profile.email}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="ok-footer-bottom">
          <p className="ok-footer-copy">
            © {new Date().getFullYear()} {profile.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
