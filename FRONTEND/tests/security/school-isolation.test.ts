import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALLOWED, auditRoutes, hardcodedSchoolIds } from '../../scripts/audit-school-scope.mjs';

// ---------------------------------------------------------------------------------------------
// 1. The code never reaches across schools
// ---------------------------------------------------------------------------------------------

describe('No route can see another school', () => {
  it('uses the unrestricted database client only in the files on the allow-list', () => {
    expect(auditRoutes()).toEqual([]);
  });

  it('has no hardcoded school id anywhere in the source', () => {
    expect(hardcodedSchoolIds()).toEqual([]);
  });

  it('gives a reason for every file on the allow-list', () => {
    for (const [file, reason] of ALLOWED as Map<string, string>) {
      expect(reason.length, file).toBeGreaterThan(10);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// 2. A request is matched to the right school
// ---------------------------------------------------------------------------------------------

const state = vi.hoisted(() => ({
  caller: { userId: null as string | null, email: null as string | null, role: undefined as string | undefined, hasSession: false },
  host: 'localhost:3000' as string | null,
  tables: {} as Record<string, any[]>,
}));

vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => (name === 'host' ? state.host : null) }),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock('@/lib/caller', () => ({ getCaller: async () => state.caller }));
vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: () => fakeAdmin() }));

// A small in-memory stand-in for the database: eq, ilike, limit, maybeSingle
function fakeAdmin() {
  return {
    rpc: async () => ({}),
    auth: {},
    storage: {},
    from(table: string) {
      const rows = () => state.tables[table] ?? [];
      const make = (filters: ((r: any) => boolean)[], max?: number): any => {
        const run = () => rows().filter((r) => filters.every((f) => f(r))).slice(0, max);
        const b: any = {
          eq: (c: string, v: unknown) => make([...filters, (r) => r[c] === v], max),
          ilike: (c: string, v: string) => make([...filters, (r) => String(r[c] ?? '').toLowerCase() === v.toLowerCase()], max),
          limit: (n: number) => make(filters, n),
          maybeSingle: async () => ({ data: run()[0] ?? null }),
          then: (res: (v: unknown) => unknown) => Promise.resolve({ data: run() }).then(res),
        };
        return b;
      };
      return { select: () => make([]) };
    },
  };
}

const { getSchoolDb, clearSchoolCaches, SchoolAccessError } = await import('@/lib/school-db');

const A = 'school-a';
const B = 'school-b';

beforeEach(() => {
  clearSchoolCaches();
  state.caller = { userId: null, email: null, role: undefined, hasSession: false };
  state.host = 'localhost:3000';
  state.tables = {
    schools: [
      { id: A, subdomain: 'alpha' },
      { id: B, subdomain: 'beta' },
    ],
    staff_profiles: [
      { user_id: 'teacher-a', email: 'ta@a.test', school_id: A },
      { user_id: 'teacher-b', email: 'tb@b.test', school_id: B },
    ],
    guardians: [{ user_id: 'parent-b', school_id: B }],
    students: [{ user_id: 'student-a', school_id: A }],
  };
});

const signIn = (userId: string, email: string | null = null, role = 'teacher') => {
  state.caller = { userId, email, role, hasSession: true };
};

describe('Which school a request is for', () => {
  it('is the school of the signed-in person, whatever their role', async () => {
    signIn('teacher-a');
    expect((await getSchoolDb()).schoolId).toBe(A);
    clearSchoolCaches();
    signIn('parent-b', null, 'parent');
    expect((await getSchoolDb()).schoolId).toBe(B);
    clearSchoolCaches();
    signIn('student-a', null, 'student');
    expect((await getSchoolDb()).schoolId).toBe(A);
  });

  it('finds a staff member by email when their record is not linked to their account yet', async () => {
    signIn('new-user', 'tb@b.test');
    expect((await getSchoolDb()).schoolId).toBe(B);
  });

  it('refuses a person on the address of a different school', async () => {
    signIn('teacher-a');
    state.host = 'beta.eductive.test';
    await expect(getSchoolDb()).rejects.toBeInstanceOf(SchoolAccessError);
    await expect(getSchoolDb()).rejects.toMatchObject({ status: 403 });
  });

  it('accepts a person on their own school\'s address', async () => {
    signIn('teacher-a');
    state.host = 'alpha.eductive.test';
    expect((await getSchoolDb()).schoolId).toBe(A);
  });

  it('refuses an account that belongs to no school', async () => {
    signIn('someone-else', 'nobody@x.test');
    await expect(getSchoolDb()).rejects.toMatchObject({ status: 403 });
  });

  it('refuses a visitor on a route that is not open to visitors', async () => {
    state.host = 'alpha.eductive.test';
    await expect(getSchoolDb()).rejects.toMatchObject({ status: 401 });
  });

  it('gives a visitor the school of the address they came in on, only where visitors are allowed', async () => {
    state.host = 'beta.eductive.test';
    expect((await getSchoolDb({ allowVisitor: true })).schoolId).toBe(B);
  });

  it('never guesses a school for a visitor when there are several and the address does not say', async () => {
    state.host = 'localhost:3000';
    await expect(getSchoolDb({ allowVisitor: true })).rejects.toMatchObject({ status: 404 });
    state.host = 'unknown.eductive.test';
    clearSchoolCaches();
    await expect(getSchoolDb({ allowVisitor: true })).rejects.toMatchObject({ status: 404 });
  });

  it('uses the only school on localhost when the database holds just one', async () => {
    state.tables.schools = [{ id: A, subdomain: null }];
    expect((await getSchoolDb({ allowVisitor: true })).schoolId).toBe(A);
  });

  it('lets a proprietor with no staff record in yet act for the school of their address', async () => {
    signIn('new-owner', 'owner@b.test', 'proprietor');
    state.host = 'beta.eductive.test';
    expect((await getSchoolDb()).schoolId).toBe(B);
  });
});
