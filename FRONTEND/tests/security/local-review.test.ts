import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { isLocalReviewAllowed, isLoopbackHost } from '@/lib/local-review';

// The local review switcher signs in without a password, so it must exist only under `next dev`,
// with the flag on, and for requests addressed to localhost.

const switched = vi.hoisted(() => ({ roles: [] as string[] }));

vi.mock('@/lib/local-review-switch', () => ({
  switchToLocalRole: vi.fn(async (role: string) => {
    switched.roles.push(role);
    return NextResponse.json({ success: true, redirectUrl: '/proprietor' });
  }),
}));
vi.mock('@/app/api/auth/login/route', () => ({ POST: vi.fn() }));
vi.mock('@/lib/demo', () => ({ getDemoAccounts: vi.fn(async () => null) }));

const { POST } = await import('@/app/api/demo/sign-in/route');

const call = (host: string, role: unknown = 'proprietor') =>
  POST(new Request(`http://${host}/api/demo/sign-in`, { method: 'POST', headers: { host }, body: JSON.stringify({ role }) }));

beforeEach(() => {
  switched.roles = [];
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Local review guards', () => {
  it.each(['localhost', 'localhost:3000', '127.0.0.1:3100', '[::1]:3000', 'LOCALHOST'])('treats %s as local', (host) => {
    expect(isLoopbackHost(host)).toBe(true);
  });

  it.each([null, undefined, '', 'oakland.example.com', 'abc.ngrok.app', 'localhost.evil.com', '192.168.20.99:3000', '10.0.0.5'])(
    'does not treat %j as local',
    (host) => {
      expect(isLoopbackHost(host)).toBe(false);
    }
  );

  it('needs development mode, the flag and a local host together', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('LOCAL_ROLE_SWITCHER', 'true');
    expect(isLocalReviewAllowed('localhost:3000')).toBe(true);
    expect(isLocalReviewAllowed('abc.ngrok.app')).toBe(false);

    vi.stubEnv('LOCAL_ROLE_SWITCHER', '');
    expect(isLocalReviewAllowed('localhost:3000')).toBe(false);

    vi.stubEnv('LOCAL_ROLE_SWITCHER', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    expect(isLocalReviewAllowed('localhost:3000')).toBe(false);
  });
});

describe('Public role switcher', () => {
  it('lets any host switch role only when ROLE_SWITCHER=public is set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isLocalReviewAllowed('oakland.example.com')).toBe(false);
    vi.stubEnv('ROLE_SWITCHER', 'public');
    expect(isLocalReviewAllowed('oakland.example.com')).toBe(true);
  });

  it('ignores any other ROLE_SWITCHER value', () => {
    vi.stubEnv('NODE_ENV', 'production');
    for (const value of ['true', '1', 'local', 'PUBLIC', '']) {
      vi.stubEnv('ROLE_SWITCHER', value);
      expect(isLocalReviewAllowed('oakland.example.com')).toBe(false);
    }
  });

  it('switches role through the route on a public host', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ROLE_SWITCHER', 'public');
    expect((await call('oakland.example.com', 'teacher')).status).toBe(200);
    expect(switched.roles).toEqual(['teacher']);
  });
});

describe('Sign-in route with local review', () => {
  it('switches role on localhost in development with the flag on', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('LOCAL_ROLE_SWITCHER', 'true');
    const res = await call('localhost:3000', 'bursar');
    expect(res.status).toBe(200);
    expect(switched.roles).toEqual(['bursar']);
  });

  it.each([
    ['flag off', { NODE_ENV: 'development', LOCAL_ROLE_SWITCHER: '' }, 'localhost:3000'],
    ['production build', { NODE_ENV: 'production', LOCAL_ROLE_SWITCHER: 'true' }, 'localhost:3000'],
    ['public address', { NODE_ENV: 'development', LOCAL_ROLE_SWITCHER: 'true' }, 'oakland.example.com'],
    ['tunnel address', { NODE_ENV: 'development', LOCAL_ROLE_SWITCHER: 'true' }, 'abc.ngrok.app'],
  ])('answers 404 and switches nothing with %s', async (_name, env, host) => {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    const res = await call(host);
    expect(res.status).toBe(404);
    expect(switched.roles).toEqual([]);
  });

  it('refuses unknown roles even locally', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('LOCAL_ROLE_SWITCHER', 'true');
    expect((await call('localhost:3000', 'root')).status).toBe(400);
    expect(switched.roles).toEqual([]);
  });
});
