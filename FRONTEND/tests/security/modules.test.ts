import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { MODULE_IDS, isModuleEnabled, moduleForPath, readModuleSettings } from '@/lib/modules';

describe('moduleForPath', () => {
  it.each([
    ['/api/cbt/assessments', 'cbt'],
    ['/admin/cbt', 'cbt'],
    ['/teacher/cbt/banks/123', 'cbt'],
    ['/student/cbt/9', 'cbt'],
    ['/security', 'security'],
    ['/security/visitors', 'security'],
    ['/api/security/incidents', 'security'],
    ['/api/pickup', 'security'],
    ['/parent/pickup', 'security'],
    ['/admin/inventory', 'inventory'],
    ['/api/inventory', 'inventory'],
    ['/admin/letters', 'letters'],
    ['/api/letters', 'letters'],
  ])('puts %s in the %s module', (path, id) => {
    expect(moduleForPath(path)).toBe(id);
  });

  it.each(['/', '/login', '/admin', '/admin/results', '/teacher/scores', '/parent/fees', '/api/finances', '/api/schools/modules', '/securityguard', '/admin/cbtx', null, undefined, ''])(
    'leaves %j in the core system',
    (path) => {
      expect(moduleForPath(path as string)).toBeNull();
    }
  );

  it('lists the four switchable modules', () => {
    expect([...MODULE_IDS]).toEqual(['cbt', 'security', 'inventory', 'letters']);
  });
});

describe('isModuleEnabled and readModuleSettings', () => {
  it('counts a module as on unless the school turned it off', () => {
    expect(isModuleEnabled({}, 'cbt')).toBe(true);
    expect(isModuleEnabled(undefined, 'cbt')).toBe(true);
    expect(isModuleEnabled({ cbt: true }, 'cbt')).toBe(true);
    expect(isModuleEnabled({ cbt: false }, 'cbt')).toBe(false);
    expect(isModuleEnabled({ cbt: false }, 'letters')).toBe(true);
    expect(isModuleEnabled({ cbt: false }, null)).toBe(true);
  });

  it('keeps only real true and false switches for known modules', () => {
    expect(readModuleSettings({ modules: { cbt: false, security: 'no', inventory: 0, letters: true, other: false } })).toEqual({ cbt: false, letters: true });
    expect(readModuleSettings({ modules: 'x' })).toEqual({});
    expect(readModuleSettings(null)).toEqual({});
    expect(readModuleSettings({})).toEqual({});
  });
});

// The middleware: a module the school switched off disappears, everything else is untouched
const passthrough = vi.hoisted(() => ({ calls: 0 }));
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(async () => {
    passthrough.calls += 1;
    return NextResponse.next();
  }),
}));

describe('Middleware module gate', () => {
  it('reads the switches from the database, and never calls the app\'s own API', async () => {
    await run('/admin/cbt', { cbt: true });
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.every((u) => u.startsWith('https://project.supabase.test/rest/v1/schools'))).toBe(true);
    expect(urls.some((u) => u.includes('/api/schools/modules'))).toBe(false);
  });

  it('asks for the school of the subdomain the visitor came in on', async () => {
    await run('/admin/cbt', { cbt: true }, false, 'greenfield.example.com');
    expect(String(fetchMock.mock.calls[0][0])).toContain('subdomain=ilike.greenfield');
  });

  it('uses the switches of the school at that address, not another school\'s', async () => {
    const off = await run('/teacher/cbt', {}, false, 'alpha.example.com', [{ settings: { modules: { cbt: false } } }]);
    expect(off.status).toBe(307);
    const on = await run('/teacher/cbt', {}, false, 'beta.example.com', [{ settings: { modules: { cbt: true } } }]);
    expect(on.status).toBe(200);
  });

  it('chooses no school when there are several and the address does not say, so nothing is switched off', async () => {
    const res = await run('/teacher/cbt', {}, false, 'localhost:3000', [{ settings: { modules: { cbt: false } } }, { settings: { modules: { cbt: false } } }]);
    expect(res.status).toBe(200);
  });

  let fetchMock: ReturnType<typeof vi.fn>;

  // The middleware reads the school's settings straight from the database (one request to Supabase), never
  // from the app's own API. The stand-in answers like Supabase's REST interface: a list of school rows.
  const run = async (path: string, modules: unknown = {}, fetchFails = false, host = 'localhost:3000', schools?: unknown[]) => {
    fetchMock = vi.fn(async () => {
      if (fetchFails) throw new Error('network');
      return new Response(JSON.stringify(schools ?? [{ settings: { modules } }]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.resetModules();
    const { middleware } = await import('@/middleware');
    return middleware(new NextRequest(`http://${host}${path}`));
  };

  beforeEach(() => {
    passthrough.calls = 0;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('answers 404 to the API of a module that is off', async () => {
    const res = await run('/api/cbt/assessments', { cbt: false });
    expect(res.status).toBe(404);
    expect(passthrough.calls).toBe(0);
  });

  it('sends the pages of a module that is off to the home page', async () => {
    for (const path of ['/teacher/cbt', '/admin/letters', '/security/visitors', '/parent/pickup']) {
      const res = await run(path, { cbt: false, letters: false, security: false });
      expect(res.status, path).toBe(307);
      expect(res.headers.get('location'), path).toBe('http://localhost:3000/');
    }
  });

  it('lets a module that is on through to the normal checks', async () => {
    await run('/admin/cbt', { cbt: true });
    expect(passthrough.calls).toBe(1);
    await run('/admin/letters', { cbt: false });
    expect(passthrough.calls).toBe(2);
  });

  it('does not read the switches for core pages', async () => {
    await run('/admin/results', { cbt: false });
    expect(passthrough.calls).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('leaves modules on when the switches cannot be read', async () => {
    await run('/api/cbt/assessments', {}, true);
    expect(passthrough.calls).toBe(1);
  });
});
