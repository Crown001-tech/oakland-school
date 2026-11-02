import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A database client for one school. It has the same calls as the Supabase client, but:
 *   select, update, delete   only rows of this school (school_id = the school)
 *   insert, upsert           every row is stamped with this school, replacing any school_id sent in
 *   the schools table        only this school's own row, and it can be read or updated, never created or deleted
 *
 * This file has no imports from Next.js so the isolation tests can run it directly.
 */

/** Tables that hold no school's data. */
export const SCHOOL_SCOPE_EXEMPT_TABLES = new Set(['permissions', 'role_permissions', 'auth_rate_limits']);

export interface SchoolInfo {
  /** Letters that start this school's generated numbers (OAK-INC-1234) */
  idPrefix: string;
  /** Domain of the generated student sign-in addresses */
  studentEmailDomain: string;
}

export interface SchoolDb extends SchoolInfo {
  schoolId: string;
  from: (table: string) => any;
  rpc: SupabaseClient['rpc'];
  auth: SupabaseClient['auth'];
  storage: SupabaseClient['storage'];
}

const stamp = (schoolId: string, rows: any) =>
  Array.isArray(rows) ? rows.map((r) => ({ ...r, school_id: schoolId })) : { ...rows, school_id: schoolId };

export function scopeClient(admin: SupabaseClient, schoolId: string, info: SchoolInfo = { idPrefix: 'SCH', studentEmailDomain: 'student.school.invalid' }): SchoolDb {
  const from = (table: string): any => {
    const qb: any = admin.from(table);
    if (SCHOOL_SCOPE_EXEMPT_TABLES.has(table)) return qb;

    if (table === 'schools') {
      const refuse = (what: string) => () => {
        throw new Error(`A school's own client cannot ${what} schools.`);
      };
      return {
        select: (...a: any[]) => qb.select(...a).eq('id', schoolId),
        update: (v: any, o?: any) => qb.update(v, o).eq('id', schoolId),
        insert: refuse('create'),
        upsert: refuse('create'),
        delete: refuse('delete'),
      };
    }

    return {
      select: (...a: any[]) => qb.select(...a).eq('school_id', schoolId),
      update: (v: any, o?: any) => qb.update(v, o).eq('school_id', schoolId),
      delete: (o?: any) => qb.delete(o).eq('school_id', schoolId),
      insert: (rows: any, o?: any) => qb.insert(stamp(schoolId, rows), o),
      upsert: (rows: any, o?: any) => qb.upsert(stamp(schoolId, rows), o),
    };
  };

  return { schoolId, ...info, from, rpc: admin.rpc.bind(admin), auth: admin.auth, storage: admin.storage };
}
