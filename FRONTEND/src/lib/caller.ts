import { cookies, headers } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ROLE_COOKIE, resolveVerifiedRole, verifyRoleCookie } from '@/lib/auth-role';

export interface Caller {
  userId: string | null;
  email: string | null;
  role: string | undefined;
  hasSession: boolean;
}

export interface AuthenticatedActor extends Caller {
  actorName: string;
  actorRoleLabel: string;
  schoolId: string;
}

// Trusted role for an already-verified Supabase user (never read from user_metadata or an unsigned cookie).
export async function getVerifiedRole(
  user: { id: string; app_metadata?: Record<string, unknown> | null } | null | undefined
): Promise<string | undefined> {
  if (!user) return undefined;
  const cookieStore = await cookies();
  return resolveVerifiedRole(user, cookieStore.get(ROLE_COOKIE)?.value);
}

// Resolve the verified caller from the Supabase session cookie or Bearer header.
export async function getCaller(): Promise<Caller> {
  try {
    const supabase = await createClient();
    let user: any = null;

    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) user = data.user;
    } catch {
      // Handled by Bearer or signed cookie fallback below
    }

    if (!user) {
      try {
        const headerStore = await headers();
        const authHeader = headerStore.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const { data: tokenData } = await supabase.auth.getUser(token);
          if (tokenData?.user) user = tokenData.user;
        }
      } catch {}
    }

    // Resilient fallback if upstream auth network call timed out, verified via HMAC-signed ROLE_COOKIE
    if (!user) {
      const cookieStore = await cookies();
      const roleCookieVal = cookieStore.get(ROLE_COOKIE)?.value;
      if (roleCookieVal) {
        const parts = roleCookieVal.split('.');
        if (parts.length === 3 || parts.length === 4) {
          const candidateUserId = parts[1];
          const verifiedRole = await verifyRoleCookie(roleCookieVal, candidateUserId);
          if (verifiedRole) {
            const admin = createAdminClient();
            const { data: adminUserRes } = await admin.auth.admin.getUserById(candidateUserId).catch(() => ({ data: null }));
            if (adminUserRes?.user) {
              user = adminUserRes.user;
            }
          }
        }
      }
    }

    if (!user) return { userId: null, email: null, role: undefined, hasSession: false };
    const role = await getVerifiedRole(user);
    return { userId: user.id, email: user.email?.toLowerCase() || null, role, hasSession: true };
  } catch {
    return { userId: null, email: null, role: undefined, hasSession: false };
  }
}

export function formatRoleLabel(role: string | undefined): string {
  switch (role) {
    case 'proprietor':
      return 'Proprietor';
    case 'admin':
    case 'principal':
      return 'Principal';
    case 'bursar':
      return 'Bursar';
    case 'teacher':
      return 'Teacher';
    case 'security':
      return 'Security';
    case 'parent':
      return 'Parent';
    case 'student':
      return 'Student';
    default:
      return 'Staff';
  }
}

/**
 * The school of the signed-in person: the one on their record, else the one their account belongs to.
 * A person who belongs to no school is refused; a school is never guessed.
 */
async function schoolIdFor(admin: ReturnType<typeof createAdminClient>, caller: Caller, known: string | null | undefined): Promise<string> {
  if (known) return known;
  // Loaded when needed: school-db.ts depends on this file
  const { findSchoolIdForUser } = await import('@/lib/school-db');
  const id = caller.userId ? await findSchoolIdForUser(admin, caller.userId, caller.email) : null;
  if (!id) throw new Error('This account is not linked to a school.');
  return id;
}

/**
 * Resolves the real signed-in user's identity (userId, fullName, role label, and schoolId)
 * from PostgreSQL so financial and audit logs record the actual person, never hardcoded role strings.
 */
export async function getAuthenticatedActor(): Promise<AuthenticatedActor> {
  const caller = await getCaller();
  const roleLabel = formatRoleLabel(caller.role);

  if (!caller.hasSession || !caller.userId) {
    return {
      ...caller,
      actorName: 'Unauthenticated',
      actorRoleLabel: roleLabel,
      schoolId: '',
    };
  }

  try {
    const admin = createAdminClient();

    // 1. Check staff_profiles by user_id or email
    const orFilters: string[] = [`user_id.eq.${caller.userId}`];
    if (caller.email) orFilters.push(`email.eq.${caller.email}`);

    const { data: staff } = await admin
      .from('staff_profiles')
      .select('first_name, last_name, email, school_id, role')
      .or(orFilters.join(','))
      .maybeSingle();

    if (staff) {
      const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
      return {
        ...caller,
        actorName: fullName || staff.email || caller.email || caller.userId,
        actorRoleLabel: roleLabel,
        schoolId: await schoolIdFor(admin, caller, staff.school_id),
      };
    }

    // 2. If Proprietor without a staff_profiles row, check school settings or auth user metadata
    if (caller.role === 'proprietor') {
      const { data: school } = await admin
        .from('schools')
        .select('id, settings')
        .limit(1)
        .maybeSingle();

      const propName =
        school?.settings?.proprietorName ||
        school?.settings?.proprietor_name ||
        null;

      if (propName && String(propName).trim()) {
        return {
          ...caller,
          actorName: String(propName).trim(),
          actorRoleLabel: 'Proprietor',
          schoolId: await schoolIdFor(admin, caller, school?.id),
        };
      }
    }

    // 3. Check guardians if parent
    if (caller.role === 'parent') {
      const { data: guardian } = await admin
        .from('guardians')
        .select('first_name, last_name, email, school_id')
        .or(orFilters.join(','))
        .maybeSingle();

      if (guardian) {
        const fullName = `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim();
        return {
          ...caller,
          actorName: fullName || guardian.email || caller.email || caller.userId,
          actorRoleLabel: 'Parent',
          schoolId: await schoolIdFor(admin, caller, guardian.school_id),
        };
      }
    }

    // 4. Fallback to auth user metadata full_name or email
    const { data: authUser } = await admin.auth.admin.getUserById(caller.userId).catch(() => ({ data: null }));
    const metaName =
      authUser?.user?.user_metadata?.full_name ||
      authUser?.user?.user_metadata?.name ||
      caller.email ||
      caller.userId;

    return {
      ...caller,
      actorName: String(metaName),
      actorRoleLabel: roleLabel,
      schoolId: await schoolIdFor(admin, caller, null),
    };
  } catch {
    return {
      ...caller,
      actorName: caller.email || caller.userId,
      actorRoleLabel: roleLabel,
      schoolId: await schoolIdFor(createAdminClient(), caller, null),
    };
  }
}

// Students linked to a guardian account through student_guardians.
export async function getLinkedStudentIds(email: string | null): Promise<string[]> {
  if (!email) return [];
  const admin = createAdminClient();
  // Only the guardian record in the caller's own school: the same email may be a guardian at another school
  const caller = await getCaller();
  let schoolId: string | null = null;
  if (caller.userId) {
    const { findSchoolIdForUser } = await import('@/lib/school-db');
    schoolId = await findSchoolIdForUser(admin, caller.userId, caller.email);
  }
  let query = admin.from('guardians').select('id').eq('email', email);
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data: guardians } = await query;
  if (!guardians || guardians.length === 0) return [];
  const { data: links } = await admin.from('student_guardians').select('student_id').in('guardian_id', guardians.map((g: { id: string }) => g.id));
  return (links || []).map((l: any) => l.student_id);
}

export const ADMIN_ROLES = ['admin', 'principal', 'proprietor'];

export function isAdminRole(role: string | undefined): boolean {
  return Boolean(role) && ADMIN_ROLES.includes(role as string);
}

// Homeroom class held in the staff record (set by administrators, so it can be trusted).
export async function getAssignedClassName(email: string | null): Promise<string | null> {
  if (!email) return null;
  const admin = createAdminClient();
  const { data } = await admin.from('staff_profiles').select('assigned_class').eq('email', email).maybeSingle();
  return data?.assigned_class || null;
}

// Student record linked to a student login (matched on the auth user id, never on user_metadata).
export async function getOwnStudentId(userId: string | undefined): Promise<string | null> {
  if (!userId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from('students').select('id').eq('user_id', userId).maybeSingle();
  return data?.id || null;
}
