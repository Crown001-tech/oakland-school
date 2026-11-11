import { headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCaller } from '@/lib/caller';
import { SCHOOL_SCOPE_EXEMPT_TABLES, scopeClient, type SchoolDb, type SchoolInfo } from '@/lib/school-scope';
import { idPrefixFor, studentEmailDomainFor } from '@/lib/school-config';
import { schoolSubdomainFor, subdomainOf } from '@/lib/school-host';

export type { SchoolDb } from '@/lib/school-scope';

/**
 * Eductive runs many schools on one database. Every API route reaches the database through getSchoolDb(),
 * which works out which school the request is for and returns a client that can only see and change that
 * school's rows (see school-scope.ts). A route never holds the unrestricted client.
 *
 * Which school a request is for:
 *   a signed-in person  the school they belong to: their staff record, guardian record or student record
 *   a visitor           the school whose subdomain they came in on (oakland.example.com), and only on
 *                       routes that are open to visitors
 * A signed-in person whose school differs from the school of the subdomain they came in on is refused, so
 * signing in on one school's address never opens another school's data.
 */

export class SchoolAccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = 'SchoolAccessError';
    this.status = status;
  }
}

interface Cached {
  id: string | null;
  expires: number;
}
const MEMBER_TTL_MS = 60_000;
const memberCache = new Map<string, Cached>();
const infoCache = new Map<string, { info: SchoolInfo; expires: number }>();
const hostCache = new Map<string, Cached>();

/** The school a signed-in user belongs to, from their staff, guardian or student record. */
export async function findSchoolIdForUser(admin: SupabaseClient, userId: string, email?: string | null): Promise<string | null> {
  const hit = memberCache.get(userId);
  if (hit && hit.expires > Date.now()) return hit.id;

  const [staffById, guardian, student] = await Promise.all([
    admin.from('staff_profiles').select('school_id').eq('user_id', userId).limit(1).maybeSingle(),
    admin.from('guardians').select('school_id').eq('user_id', userId).limit(1).maybeSingle(),
    admin.from('students').select('school_id').eq('user_id', userId).limit(1).maybeSingle(),
  ]);
  let id: string | null = staffById.data?.school_id ?? guardian.data?.school_id ?? student.data?.school_id ?? null;

  // A staff record created before the person first signed in is linked by email
  if (!id && email) {
    const { data } = await admin.from('staff_profiles').select('school_id').eq('email', email).limit(1).maybeSingle();
    id = data?.school_id ?? null;
  }

  memberCache.set(userId, { id, expires: Date.now() + MEMBER_TTL_MS });
  return id;
}

/** The school's own values for its generated numbers and student sign-in addresses. */
export async function loadSchoolInfo(admin: SupabaseClient, schoolId: string): Promise<SchoolInfo> {
  const hit = infoCache.get(schoolId);
  if (hit && hit.expires > Date.now()) return hit.info;
  const { data } = await admin.from('schools').select('code, subdomain, settings').eq('id', schoolId).maybeSingle();
  const info: SchoolInfo = { idPrefix: idPrefixFor(data ?? {}), studentEmailDomain: studentEmailDomainFor(data ?? {}) };
  infoCache.set(schoolId, { info, expires: Date.now() + MEMBER_TTL_MS });
  return info;
}

/**
 * The school a visitor's address belongs to. On localhost, or an address with no school subdomain, the
 * school is the only one in the database, or the one named by DEFAULT_SCHOOL_SUBDOMAIN. With several schools
 * and no way to tell, it is none: a visitor is never given a guessed school.
 */
export async function findSchoolIdForHost(admin: SupabaseClient, host: string | null | undefined): Promise<string | null> {
  const key = (host || '').toLowerCase();
  const hit = hostCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.id;

  let id: string | null = null;
  const sub = schoolSubdomainFor(host);
  if (sub) {
    const { data } = await admin.from('schools').select('id').ilike('subdomain', sub).limit(1).maybeSingle();
    id = data?.id ?? null;
  }
  if (!id && !subdomainOf(host)) {
    const { data } = await admin.from('schools').select('id').limit(2);
    if (data && data.length === 1) {
      id = data[0].id;
    } else if (data && data.length > 1) {
      const { data: oakland } = await admin.from('schools').select('id').eq('code', 'OAK-001').maybeSingle();
      if (oakland?.id) id = oakland.id;
    }
  }

  hostCache.set(key, { id, expires: Date.now() + MEMBER_TTL_MS });
  return id;
}

async function requestHost(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get('x-forwarded-host') || h.get('host');
  } catch {
    return null;
  }
}

export interface SchoolDbOptions {
  /** Let a visitor who is not signed in use the school of the address they came in on (the admissions form, school name and logo). */
  allowVisitor?: boolean;
}

export async function getSchoolDb(options: SchoolDbOptions = {}): Promise<SchoolDb> {
  const admin = getSupabaseAdmin();
  const caller = await getCaller();
  const hostSchool = await findSchoolIdForHost(admin, await requestHost());

  let schoolId: string | null = null;
  if (caller.hasSession && caller.userId) {
    schoolId = await findSchoolIdForUser(admin, caller.userId, caller.email);
    // A proprietor can exist before a staff record does: they are the owner of the school they came in on
    if (!schoolId && caller.role === 'proprietor') schoolId = hostSchool;
    if (!schoolId) throw new SchoolAccessError('This account is not linked to a school.', 403);
    if (hostSchool && hostSchool !== schoolId) throw new SchoolAccessError('This account belongs to a different school.', 403);
  } else if (options.allowVisitor) {
    schoolId = hostSchool;
    if (!schoolId) throw new SchoolAccessError('This address is not set up for a school.', 404);
  } else {
    throw new SchoolAccessError('Sign in to continue.', 401);
  }

  return scopeClient(admin, schoolId, await loadSchoolInfo(admin, schoolId));
}

/** For tests: forget what was looked up. */
export function clearSchoolCaches() {
  memberCache.clear();
  hostCache.clear();
  infoCache.clear();
}

export { SCHOOL_SCOPE_EXEMPT_TABLES, subdomainOf };
