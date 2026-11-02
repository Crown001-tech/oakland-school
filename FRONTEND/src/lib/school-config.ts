/**
 * What a school's own record says about its generated numbers and student sign-in addresses. All schools
 * share one deployment, so these come from the school's record (schools.code, schools.subdomain and
 * schools.settings), never from the environment.
 */

/**
 * The letters that start the school's generated numbers (staff IDs, admission numbers, gate passes, incident
 * numbers). settings.idPrefix when the school has set one, else the letters at the start of its code
 * (OAK-001 gives OAK).
 */
export function idPrefixFor(school: { code?: string | null; settings?: Record<string, unknown> | null }): string {
  const own = String(school.settings?.idPrefix ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (own.length >= 2 && own.length <= 6) return own;
  const fromCode = String(school.code ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return fromCode.length >= 2 ? fromCode : 'SCH';
}

/**
 * The domain of the generated sign-in address for a student, built from the admission number
 * (adm-001@student.example.ng). It is never delivered mail, so it only has to be different for every school:
 * a student's admission number is unique within a school, not across schools. settings.studentEmailDomain
 * when set (Oakland keeps the domain its students already use), else one built from the school's subdomain.
 * Changing it later means existing students cannot sign in.
 */
export function studentEmailDomainFor(school: { subdomain?: string | null; settings?: Record<string, unknown> | null }): string {
  const own = String(school.settings?.studentEmailDomain ?? '').trim().toLowerCase();
  if (own) return own;
  const sub = String(school.subdomain ?? '').trim().toLowerCase();
  return sub ? `student.${sub}.invalid` : 'student.school.invalid';
}

export const studentAuthEmail = (admissionNumber: string, domain: string) => `${admissionNumber.toLowerCase()}@${domain}`;
