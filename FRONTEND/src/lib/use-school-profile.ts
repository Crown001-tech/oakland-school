'use client';

import { useEffect, useState } from 'react';

/**
 * The school's own identity, read from its database record through /api/schools/profile.
 * Every screen, receipt and printout shows the school's name from here, never a hardcoded one,
 * so the same code serves any school. Fields are empty until loaded, and stay empty if the school
 * has not filled them in (nothing is invented).
 */
export interface SchoolIdentity {
  name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  currentSession: string;
  currentTerm: string;
  principalName: string;
  proprietorName: string;
  /** Letters that start the school's generated numbers */
  idPrefix: string;
}

const EMPTY: SchoolIdentity = { name: '', motto: '', address: '', phone: '', email: '', currentSession: '', currentTerm: '', principalName: '', proprietorName: '', idPrefix: '' };

// One request per page load, shared by every component that asks
let pending: Promise<SchoolIdentity> | null = null;

function loadSchoolIdentity(): Promise<SchoolIdentity> {
  if (!pending) {
    pending = fetch('/api/schools/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const d = json?.success ? json.data : null;
        if (!d) return EMPTY;
        return {
          name: d.name || '',
          motto: d.motto || '',
          address: d.address || '',
          phone: d.phone || '',
          email: d.email || '',
          currentSession: d.currentSession || '',
          currentTerm: d.currentTerm || '',
          // The profile API says 'Unassigned' when there is no principal; that is not a name
          principalName: d.principalName && d.principalName !== 'Unassigned' ? d.principalName : '',
          proprietorName: d.proprietorName && d.proprietorName !== 'Proprietor' ? d.proprietorName : '',
          idPrefix: d.idPrefix || '',
        };
      })
      .catch(() => EMPTY);
  }
  return pending;
}

export function useSchoolProfile(): SchoolIdentity {
  const [school, setSchool] = useState<SchoolIdentity>(EMPTY);
  useEffect(() => {
    let mounted = true;
    loadSchoolIdentity().then((s) => mounted && setSchool(s));
    return () => {
      mounted = false;
    };
  }, []);
  return school;
}
