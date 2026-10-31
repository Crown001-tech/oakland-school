import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { checkApiAccess } from '@/lib/api-guard';
import { DEMO_ROLES, DEMO_SCHOOL_CODE, shouldRedirectToDemoEntry } from '@/lib/demo-mode';

// The demo sign-in must work on the demo database and do nothing anywhere else, including on
// Oakland's own deployment if DEMO_MODE were ever set there by mistake.

const state = vi.hoisted(() => ({
  schools: [] as { code: string; settings: Record<string, unknown> | null }[],
  schoolQueries: 0,
  loginBodies: [] as { email: string; password: string }[],
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => {
        state.schoolQueries += 1;
        return Promise.resolve({ data: state.schools, error: null });
      },
    }),
  }),
}));

vi.mock('@/app/api/auth/login/route', () => ({
  POST: vi.fn(async (request: Request) => {
    state.loginBodies.push(await request.json());
    return NextResponse.json({ success: true, role: 'proprietor', redirectUrl: '/proprietor' });
  }),
}));

const { POST } = await import('@/app/api/demo/sign-in/route');

const demoSchool = (accounts: Record<string, string> = {}) => ({
  code: DEMO_SCHOOL_CODE,
  settings: { demoAccounts: accounts },
});

const signIn = (body: unknown) =>
  POST(
    new Request('http://localhost/api/demo/sign-in', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.9' },
      body: JSON.stringify(body),
    })
  );

beforeEach(() => {
  state.schools = [];
  state.schoolQueries = 0;
  state.loginBodies = [];
  vi.stubEnv('DEMO_ACCOUNT_PASSWORD', 'demo-test-password');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Demo sign-in guards', () => {
  it('answers 404 and touches nothing when DEMO_MODE is off', async () => {
    state.schools = [demoSchool({ proprietor: 'demo.proprietor@example.com' })];
    const res = await signIn({ role: 'proprietor' });
    expect(res.status).toBe(404);
    expect(state.schoolQueries).toBe(0);
    expect(state.loginBodies).toEqual([]);
  });

  it('answers 404 when DEMO_MODE is on but the database holds a real school', async () => {
    vi.stubEnv('DEMO_MODE', 'true');
    state.schools = [{ code: 'OAK-001', settings: { demoAccounts: { proprietor: 'someone@example.com' } } }];
    const res = await signIn({ role: 'proprietor' });
    expect(res.status).toBe(404);
    expect(state.loginBodies).toEqual([]);
  });

  it('answers 404 when a real school sits beside the demo school', async () => {
    vi.stubEnv('DEMO_MODE', 'true');
    state.schools = [demoSchool({ proprietor: 'demo.proprietor@example.com' }), { code: 'OAK-001', settings: {} }];
    const res = await signIn({ role: 'proprietor' });
    expect(res.status).toBe(404);
    expect(state.loginBodies).toEqual([]);
  });

  it('answers 404 when the database has no schools', async () => {
    vi.stubEnv('DEMO_MODE', 'true');
    expect((await signIn({ role: 'proprietor' })).status).toBe(404);
  });
});

describe('Demo sign-in on the demo database', () => {
  beforeEach(() => {
    vi.stubEnv('DEMO_MODE', 'true');
    state.schools = [
      demoSchool({
        proprietor: 'demo.proprietor@example.com',
        teacher: 'demo.teacher@example.com',
        student: 'DEMO-0001',
      }),
    ];
  });

  it('signs in through the real login route with the stored identifier and the environment password', async () => {
    const res = await signIn({ role: 'proprietor' });
    expect(res.status).toBe(200);
    expect(state.loginBodies).toEqual([{ email: 'demo.proprietor@example.com', password: 'demo-test-password' }]);
  });

  it('signs a student in by admission number', async () => {
    await signIn({ role: 'student' });
    expect(state.loginBodies[0].email).toBe('DEMO-0001');
  });

  it('never returns the demo password to the browser', async () => {
    const res = await signIn({ role: 'teacher' });
    expect(JSON.stringify(await res.json())).not.toContain('demo-test-password');
  });

  it.each([undefined, '', 'admin', 'root', 'Proprietor', 42])('refuses the unknown role %j', async (role) => {
    const res = await signIn({ role });
    expect(res.status).toBe(400);
    expect(state.loginBodies).toEqual([]);
  });

  it('says so when a role has no demo account yet', async () => {
    const res = await signIn({ role: 'bursar' });
    expect(res.status).toBe(404);
    expect(state.loginBodies).toEqual([]);
  });

  it('fails loudly when the demo password is not configured', async () => {
    vi.stubEnv('DEMO_ACCOUNT_PASSWORD', '');
    await expect(signIn({ role: 'proprietor' })).rejects.toThrow('DEMO_ACCOUNT_PASSWORD');
    expect(state.loginBodies).toEqual([]);
  });

  it('rejects a body that is not JSON', async () => {
    const res = await POST(new Request('http://localhost/api/demo/sign-in', { method: 'POST', body: 'nope' }));
    expect(res.status).toBe(400);
  });
});

describe('Demo routing and access policy', () => {
  it('lists the seven buyer roles', () => {
    expect([...DEMO_ROLES]).toEqual(['proprietor', 'principal', 'bursar', 'teacher', 'parent', 'student', 'security']);
  });

  it.each(['/', '/login', '/about', '/academics', '/our-values', '/admissions', '/admissions/', '/register', '/activate'])(
    'sends %s to the demo entry page',
    (path) => {
      expect(shouldRedirectToDemoEntry(path)).toBe(true);
    }
  );

  it.each(['/demo', '/proprietor', '/parent/fees', '/api/demo/sign-in', '/api/auth/login', '/aboutus'])(
    'leaves %s alone',
    (path) => {
      expect(shouldRedirectToDemoEntry(path)).toBe(false);
    }
  );

  it('lets visitors without a session POST to the demo sign-in and nothing else on it', () => {
    const base = { role: undefined, hasSession: false, searchParams: new URLSearchParams() };
    expect(checkApiAccess({ ...base, pathname: '/api/demo/sign-in', method: 'POST' })).toBeNull();
    expect(checkApiAccess({ ...base, pathname: '/api/demo/sign-in', method: 'GET' })?.status).toBe(401);
    expect(checkApiAccess({ ...base, pathname: '/api/demo/other', method: 'POST' })?.status).toBe(401);
  });
});
