import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { checkApiAccess } from '@/lib/api-guard';

type Row = Record<string, any>;
const db = vi.hoisted(() => ({ rows: [] as Row[], session: {} as Row }));

// Routes reach the database through the school client; these tests exercise the route's own logic, so the
// school client here is the same fake database, with a school id. Scoping itself is tested in school-scope.test.ts.
vi.mock('@/lib/school-db', async () => {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  return { getSchoolDb: async () => Object.assign(getSupabaseAdmin(), { schoolId: 'school-1' }) };
});

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = [];
      let op: 'select' | 'insert' | 'update' = 'select';
      let payload: Row = {};
      const target = () => (table === 'schools' ? [{ id: 'school-1' }] : db.rows);
      const run = () => {
        if (op === 'insert') {
          const row = { id: `req-${db.rows.length + 1}`, status: 'open', created_at: new Date().toISOString(), ...payload };
          db.rows.push(row);
          return [row];
        }
        const hits = target().filter((r) => filters.every((f) => f(r)));
        if (op === 'update') hits.forEach((r) => Object.assign(r, payload));
        return hits;
      };
      const b: any = {
        select: () => b,
        order: () => b,
        limit: () => b,
        eq: (col: string, val: unknown) => (filters.push((r) => r[col] === val), b),
        insert: (p: Row) => ((op = 'insert'), (payload = p), b),
        update: (p: Row) => ((op = 'update'), (payload = p), b),
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
        single: async () => ({ data: run()[0] ?? null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: run(), error: null }).then(res),
      };
      return b;
    },
  }),
}));

vi.mock('@/lib/caller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/caller')>()),
  getAuthenticatedActor: vi.fn(async () => db.session),
}));

const route = await import('@/app/api/custom-requests/route');

const signIn = (role: string) => {
  db.session = { userId: `u-${role}`, role, hasSession: true, actorName: `Test ${role}`, actorRoleLabel: role };
};
const send = (method: 'POST' | 'PATCH', body: Row) =>
  route[method](new NextRequest('http://localhost/api/custom-requests', { method, body: JSON.stringify(body) }));

beforeEach(() => {
  db.rows = [];
  signIn('proprietor');
});

describe('Custom request log', () => {
  it('records a request with who logged it', async () => {
    const res = await send('POST', { title: ' Add a house system ', requestedBy: 'Principal', approach: 'setting', estimatedDays: 2 });
    expect(res.status).toBe(200);
    expect(db.rows[0]).toMatchObject({
      title: 'Add a house system',
      requested_by: 'Principal',
      approach: 'setting',
      estimated_days: 2,
      created_by_name: 'Test proprietor',
      school_id: 'school-1',
    });
  });

  it('needs a title and refuses unknown approaches and negative days', async () => {
    expect((await send('POST', { title: '   ' })).status).toBe(400);
    expect((await send('POST', { title: 'X', approach: 'copy_the_code' })).status).toBe(400);
    expect((await send('POST', { title: 'X', estimatedDays: -1 })).status).toBe(400);
    expect((await send('POST', { title: 'X', estimatedDays: 'many' })).status).toBe(400);
    expect(db.rows).toEqual([]);
  });

  it('moves a request through its statuses and only to known ones', async () => {
    await send('POST', { title: 'Report card layout' });
    const id = db.rows[0].id;
    expect((await send('PATCH', { id, status: 'accepted' })).status).toBe(200);
    expect(db.rows[0].status).toBe('accepted');
    expect((await send('PATCH', { id, status: 'finished' })).status).toBe(400);
    expect(db.rows[0].status).toBe('accepted');
    expect((await send('PATCH', { id: 'missing', status: 'done' })).status).toBe(404);
    expect((await send('PATCH', { id })).status).toBe(400);
  });

  it('lists requests for the proprietor and the principal', async () => {
    await send('POST', { title: 'One' });
    for (const role of ['proprietor', 'admin', 'principal']) {
      signIn(role);
      const res = await route.GET();
      expect(res.status, role).toBe(200);
      expect((await res.json()).data).toHaveLength(1);
    }
  });

  it.each(['teacher', 'bursar', 'parent', 'student', 'security'])('refuses the %s role', async (role) => {
    signIn(role);
    expect((await route.GET()).status).toBe(403);
    expect((await send('POST', { title: 'Nope' })).status).toBe(403);
    expect(db.rows).toEqual([]);
  });

  it('is behind the central access rules for admin roles only', () => {
    const base = { hasSession: true, searchParams: new URLSearchParams() };
    for (const role of ['teacher', 'bursar', 'parent', 'student', 'security']) {
      expect(checkApiAccess({ ...base, role, pathname: '/api/custom-requests', method: 'GET' })?.status, role).toBe(403);
    }
    expect(checkApiAccess({ ...base, role: 'proprietor', pathname: '/api/custom-requests', method: 'POST' })).toBeNull();
    expect(checkApiAccess({ ...base, role: undefined, hasSession: false, pathname: '/api/custom-requests', method: 'GET' })?.status).toBe(401);
  });
});
