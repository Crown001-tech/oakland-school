/**
 * Central API access policy, enforced in middleware for every `/api/*` request.
 * Pure function so it can be reasoned about and tested without a server.
 *
 * Order of evaluation:
 *   1. Public endpoints (sign in, activation, public admission form, school profile).
 *   2. A verified session with a verified role is required for everything else.
 *   3. Gate security data (`/api/security`, `/api/pickup`) has its own role rules.
 *   4. Remaining endpoints follow the per-prefix role rules below.
 */

export interface ApiAccessInput {
  pathname: string;
  method: string;
  role: string | undefined;
  hasSession: boolean;
  searchParams: URLSearchParams;
}

export interface ApiAccessDenial {
  status: 401 | 403;
  message: string;
}

const ADMIN_ROLES = ['admin', 'principal', 'proprietor'];
const STAFF_ROLES = [...ADMIN_ROLES, 'bursar', 'teacher', 'security'];

interface PublicRule {
  path: string;
  methods: string[];
}

const PUBLIC_ENDPOINTS: PublicRule[] = [
  { path: '/api/auth/login', methods: ['POST'] },
  { path: '/api/auth/activate-student', methods: ['POST'] },
  { path: '/api/auth/logout', methods: ['POST'] },
  // Reports `authenticated: false` for visitors, so the sign-in page can call it safely.
  { path: '/api/auth/me', methods: ['GET'] },
  // The public application forms and the school contact details in the site footer.
  { path: '/api/admissions', methods: ['POST'] },
  { path: '/api/register/staff', methods: ['POST'] },
  { path: '/api/schools/profile', methods: ['GET'] },
];

interface RoleRule {
  prefix: string;
  /** Optional extra match on the full path (used for per-record endpoints). */
  pattern?: RegExp;
  /** Methods the rule applies to; omitted means every method. */
  methods?: string[];
  roles: string[];
}

const READ = ['GET', 'HEAD'];
const WRITE = ['POST', 'PUT', 'PATCH', 'DELETE'];

// First match wins, so more specific prefixes come first. Prefixes with no rule need only a verified session.
const ROLE_RULES: RoleRule[] = [
  { prefix: '/api/audit-logs', roles: ADMIN_ROLES },
  { prefix: '/api/staff-approvals', roles: ADMIN_ROLES },
  { prefix: '/api/letters', roles: ADMIN_ROLES },
  { prefix: '/api/inventory', roles: ADMIN_ROLES },
  { prefix: '/api/executives', roles: ADMIN_ROLES },
  { prefix: '/api/admissions', roles: ADMIN_ROLES },
  { prefix: '/api/auth/generate-activation-token', roles: ADMIN_ROLES },

  // Single-record endpoints carry personal and credential data
  { prefix: '/api/staff', pattern: /^\/api\/staff\/(?!broadcasts(\/|$))[^/]+/, roles: ADMIN_ROLES },
  { prefix: '/api/students', pattern: /^\/api\/students\/[^/]+/, roles: ADMIN_ROLES },

  { prefix: '/api/staff/broadcasts', methods: WRITE, roles: ADMIN_ROLES },
  { prefix: '/api/staff', methods: WRITE, roles: ADMIN_ROLES },
  { prefix: '/api/students', methods: READ, roles: [...ADMIN_ROLES, 'teacher', 'bursar'] },
  { prefix: '/api/students', methods: WRITE, roles: ADMIN_ROLES },

  { prefix: '/api/classes', methods: WRITE, roles: ADMIN_ROLES },
  { prefix: '/api/subjects', methods: WRITE, roles: ADMIN_ROLES },
  { prefix: '/api/calendar', methods: WRITE, roles: ADMIN_ROLES },
  { prefix: '/api/documents', methods: WRITE, roles: ADMIN_ROLES },
  { prefix: '/api/results', methods: WRITE, roles: ADMIN_ROLES },
  { prefix: '/api/schools', methods: WRITE, roles: ADMIN_ROLES },
  { prefix: '/api/timetable', methods: WRITE, roles: ADMIN_ROLES },

  { prefix: '/api/leave', methods: WRITE.filter((m) => m !== 'POST'), roles: ADMIN_ROLES },
  { prefix: '/api/leave', methods: ['POST'], roles: STAFF_ROLES },
  { prefix: '/api/leave', methods: READ, roles: STAFF_ROLES },

  { prefix: '/api/materials', methods: WRITE, roles: [...ADMIN_ROLES, 'teacher'] },
  { prefix: '/api/attendance', methods: WRITE, roles: [...ADMIN_ROLES, 'teacher'] },
  { prefix: '/api/scores', roles: [...ADMIN_ROLES, 'teacher'] },
  { prefix: '/api/finances', methods: WRITE, roles: [...ADMIN_ROLES, 'bursar'] },
  { prefix: '/api/finances', methods: READ, roles: [...ADMIN_ROLES, 'bursar', 'parent'] },
  { prefix: '/api/results', methods: READ, roles: [...ADMIN_ROLES, 'parent', 'student'] },
  { prefix: '/api/communications', methods: READ, roles: [...ADMIN_ROLES, 'parent'] },
  { prefix: '/api/attendance', methods: READ, roles: [...ADMIN_ROLES, 'teacher', 'parent', 'student'] },
];

// The Security and Reception role may only reach its own modules and shared session endpoints.
const SECURITY_ROLE_ALLOWED_PREFIXES = [
  '/api/security',
  '/api/pickup',
  '/api/auth',
  '/api/notifications',
  '/api/nav-badges',
  '/api/calendar',
  '/api/schools/settings',
  '/api/schools/profile',
  '/api/staff',
];

const startsWithSegment = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

function isPublic(pathname: string, method: string): boolean {
  return PUBLIC_ENDPOINTS.some((rule) => rule.path === pathname && rule.methods.includes(method));
}

export function checkApiAccess(input: ApiAccessInput): ApiAccessDenial | null {
  const { pathname, role, hasSession, searchParams } = input;
  const method = input.method.toUpperCase();
  if (!pathname.startsWith('/api/')) return null;

  if (isPublic(pathname, method)) return null;

  if (!hasSession) {
    return { status: 401, message: 'Authentication is required.' };
  }
  if (!role) {
    return { status: 401, message: 'Your session is out of date. Please sign in again.' };
  }

  const isRead = method === 'GET' || method === 'HEAD';
  const isSecurityApi = startsWithSegment(pathname, '/api/security');
  const isPickupApi = startsWithSegment(pathname, '/api/pickup');

  // Security officers are confined to their own modules.
  if (role === 'security') {
    const allowed = SECURITY_ROLE_ALLOWED_PREFIXES.some((p) => startsWithSegment(pathname, p));
    if (!allowed) return { status: 403, message: 'Access denied for this role.' };
    // Shared endpoints stay read-only for the security role.
    const ownModule = isSecurityApi || isPickupApi || startsWithSegment(pathname, '/api/auth') || startsWithSegment(pathname, '/api/notifications');
    if (!ownModule && !isRead) return { status: 403, message: 'Access denied for this role.' };
    return null;
  }

  if (isSecurityApi) {
    if (ADMIN_ROLES.includes(role)) {
      return isRead ? null : { status: 403, message: 'Oversight roles have read access only.' };
    }
    // Parents may read movement passes of their own child only (ownership is checked in the route).
    if (
      role === 'parent' &&
      isRead &&
      pathname === '/api/security/movement' &&
      searchParams.get('studentId')
    ) {
      return null;
    }
    return { status: 403, message: 'Access denied for this role.' };
  }

  if (isPickupApi) {
    const allowedRoles = [...ADMIN_ROLES, 'parent'];
    return allowedRoles.includes(role) ? null : { status: 403, message: 'Access denied for this role.' };
  }

  const rule = ROLE_RULES.find(
    (r) =>
      startsWithSegment(pathname, r.prefix) &&
      (!r.pattern || r.pattern.test(pathname)) &&
      (!r.methods || r.methods.includes(method))
  );
  if (rule && !rule.roles.includes(role)) {
    return { status: 403, message: 'Access denied for this role.' };
  }

  return null;
}

/**
 * Validates whether a parent/guardian is cryptographically and relationally authorized
 * to view or interact with a specific student's records (DEF-001 Exit Gate).
 */
export function isParentAuthorizedForStudent(
  targetStudentId: string,
  guardianId: string | null | undefined,
  guardianLinks: Array<{ guardian_id?: string; student_id?: string; guardianId?: string; studentId?: string }>
): boolean {
  if (!guardianId || !targetStudentId) return false;
  return guardianLinks.some(
    (link) =>
      (link.guardian_id === guardianId || link.guardianId === guardianId) &&
      (link.student_id === targetStudentId || link.studentId === targetStudentId)
  );
}

