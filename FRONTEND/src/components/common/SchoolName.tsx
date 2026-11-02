'use client';

import { useSchoolProfile } from '@/lib/use-school-profile';

/** The school's name from its database record. Renders nothing until it has loaded. */
export function SchoolName({ upper = false }: { upper?: boolean }) {
  const { name } = useSchoolProfile();
  return <>{upper ? name.toUpperCase() : name}</>;
}

/** The school's address, phone and email on one line, leaving out whatever is not recorded. */
export function SchoolContactLine() {
  const { address, phone, email } = useSchoolProfile();
  return <>{[address, phone, email].filter(Boolean).join(' • ')}</>;
}

/** School name, current session and term on one line, leaving out whatever is not recorded. */
export function SchoolSessionLine() {
  const { name, currentSession, currentTerm } = useSchoolProfile();
  return <>{[name, currentSession && `Academic Session ${currentSession}`, currentTerm].filter(Boolean).join(' • ')}</>;
}

/** The school's motto from its database record. */
export function SchoolMotto() {
  const { motto } = useSchoolProfile();
  return <>{motto}</>;
}

/** The principal’s name from the school’s staff records. Renders nothing if no principal is appointed. */
export function PrincipalName() {
  const { principalName } = useSchoolProfile();
  return <>{principalName}</>;
}

/** The principal's initials, for an avatar. Renders nothing if no principal is appointed. */
export function PrincipalInitials() {
  const { principalName } = useSchoolProfile();
  const initials = principalName
    .replace(/^(mr|mrs|ms|dr|engr|prof|alhaji|alhaja|chief)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  return <>{initials}</>;
}
