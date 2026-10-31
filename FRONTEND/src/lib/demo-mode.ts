/**
 * Demo mode belongs only to the separate Eductive demo deployment. It has no imports so
 * middleware can use it. Set DEMO_MODE=true in the demo deployment's environment before it
 * builds; never set it for Oakland. A route that acts on demo mode must also pass the
 * database check in lib/demo.ts, so a stray DEMO_MODE on a real school's deployment does nothing.
 */

export const DEMO_SCHOOL_CODE = 'EDUCTIVE-DEMO';

export const DEMO_ROLES = ['proprietor', 'principal', 'bursar', 'teacher', 'parent', 'student', 'security'] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export const DEMO_ROLE_LABELS: Record<DemoRole, string> = {
  proprietor: 'Proprietor',
  principal: 'Principal',
  bursar: 'Bursar',
  teacher: 'Teacher',
  parent: 'Parent',
  student: 'Student',
  security: 'Security',
};

export const DEMO_ROLE_NOTES: Record<DemoRole, string> = {
  proprietor: 'School overview, fees, staff and admissions',
  principal: 'Academics, results and attendance',
  bursar: 'Fees, payroll and expenses',
  teacher: 'Attendance, scores and report cards',
  parent: 'Results, fees and gate pickup for a child',
  student: 'Results, lessons and assignments',
  security: 'Gate pickup, visitors and incidents',
};

export const DEMO_ENTRY_PATH = '/demo';

/** Marketing and sign-in pages that send a demo visitor to the demo entry page instead. */
const DEMO_REDIRECTED_PATHS = ['/', '/login', '/about', '/academics', '/our-values', '/admissions', '/register', '/activate'];

export function isDemoModeEnabled(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export function isDemoRole(value: unknown): value is DemoRole {
  return typeof value === 'string' && (DEMO_ROLES as readonly string[]).includes(value);
}

export function shouldRedirectToDemoEntry(pathname: string): boolean {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return DEMO_REDIRECTED_PATHS.some((p) => clean === p || (p !== '/' && clean.startsWith(`${p}/`)));
}
