import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { STARTER_GRADING_CONFIG, resolveGradingConfig } from '@/lib/grading-config';
import { calculateGrade, computeSubjectGrade } from '@/lib/grading';
import { buildClassReportCards, type ClassStudent } from '@/lib/report-cards';

const db = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, patches: [] as unknown[] }));

// Routes reach the database through the school client; these tests exercise the route's own logic, so the
// school client here is the same fake database, with a school id. Scoping itself is tested in school-scope.test.ts.
vi.mock('@/lib/school-db', async () => {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  return { getSchoolDb: async () => Object.assign(getSupabaseAdmin(), { schoolId: 'school-1' }) };
});

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const b: any = {
        select: () => b,
        eq: () => b,
        limit: () => b,
        order: () => b,
        in: () => b,
        update: () => b,
        maybeSingle: async () => ({ data: { id: 'school-1', settings: db.settings }, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
      };
      return b;
    },
    rpc: async (_fn: string, args: { p_patch: unknown }) => {
      db.patches.push(args.p_patch);
      return { data: null, error: null };
    },
  }),
}));

const scoresRoute = await import('@/app/api/scores/route');
const settingsRoute = await import('@/app/api/schools/settings/route');

// A school that grades out of 30, 30 and 40, passes at 40, and has its own bands
const custom = {
  ca1Weight: 30,
  ca2Weight: 30,
  examWeight: 40,
  passMark: 40,
  gradingScale: [
    { min: 70, grade: 'Distinction', remark: 'Top', points: 4 },
    { min: 40, grade: 'Credit', remark: 'Pass', points: 2 },
    { min: 0, grade: 'Fail', remark: 'Fail', points: 0 },
  ],
};

describe('resolveGradingConfig', () => {
  it('gives a new school the starter pack: 20, 20, 60, pass at 50 and A+ to F', () => {
    expect(resolveGradingConfig({})).toEqual(STARTER_GRADING_CONFIG);
    expect(resolveGradingConfig(null)).toEqual(STARTER_GRADING_CONFIG);
    expect(STARTER_GRADING_CONFIG.scale.map((b) => b.grade)).toEqual(['A+', 'A', 'B', 'C', 'D', 'F']);
  });

  it('uses a school’s own weights, pass mark and grade bands', () => {
    const c = resolveGradingConfig(custom);
    expect(c).toMatchObject({ ca1Max: 30, ca2Max: 30, examMax: 40, passMark: 40 });
    expect(c.scale.map((b) => b.grade)).toEqual(['Distinction', 'Credit', 'Fail']);
  });

  it('ignores weights that do not add up to 100, rather than half-applying them', () => {
    const c = resolveGradingConfig({ ca1Weight: 30, ca2Weight: 30, examWeight: 30 });
    expect([c.ca1Max, c.ca2Max, c.examMax]).toEqual([20, 20, 60]);
  });

  it('allows a school with no second CA', () => {
    const c = resolveGradingConfig({ ca1Weight: 40, ca2Weight: 0, examWeight: 60 });
    expect([c.ca1Max, c.ca2Max, c.examMax]).toEqual([40, 0, 60]);
  });

  it('ignores a pass mark outside 1 to 100 and a grade scale that leaves some totals ungraded', () => {
    expect(resolveGradingConfig({ passMark: 0 }).passMark).toBe(50);
    expect(resolveGradingConfig({ passMark: 150 }).passMark).toBe(50);
    expect(resolveGradingConfig({ gradingScale: [{ min: 50, grade: 'P', remark: '' }] }).scale).toEqual(STARTER_GRADING_CONFIG.scale);
    expect(resolveGradingConfig({ gradingScale: 'nope' }).scale).toEqual(STARTER_GRADING_CONFIG.scale);
  });
});

describe('Grading by the school’s own rules', () => {
  const c = resolveGradingConfig(custom);

  it('caps each assessment at its own limit and grades on the school’s bands', () => {
    expect(computeSubjectGrade({ ca1: 99, ca2: 99, exam: 99 }, c)).toMatchObject({ total: 100, grade: 'Distinction' });
    expect(computeSubjectGrade({ ca1: 10, ca2: 10, exam: 22 }, c)).toMatchObject({ total: 42, grade: 'Credit' });
    expect(calculateGrade(39, c).grade).toBe('Fail');
  });

  it('is unchanged for a school on the starter pack', () => {
    expect(computeSubjectGrade({ ca1: 18, ca2: 17, exam: 55 })).toMatchObject({ total: 90, grade: 'A+' });
  });

  it('builds report cards on the school’s rules', () => {
    const students: ClassStudent[] = [{ id: 's1', enrollmentId: 'e1', admissionNo: 'A-1', name: 'One' }];
    const built = buildClassReportCards(
      'JSS 1',
      students,
      { 'JSS 1_Mathematics': { isLocked: true, scores: [{ id: 's1', ca1: 25, ca2: 28, exam: 35 }] } },
      c
    );
    expect(built.cards[0].subjects[0]).toMatchObject({ ca1: 25, ca2: 28, exam: 35, total: 88, grade: 'Distinction' });
  });
});

describe('API checks use the school’s limits', () => {
  beforeEach(() => {
    db.settings = { ...custom };
    db.patches = [];
  });

  const saveScores = (scores: object[]) =>
    scoresRoute.POST(new NextRequest('http://localhost/api/scores', { method: 'POST', body: JSON.stringify({ class: 'JSS 1', subject: 'Mathematics', scores }) }));
  const saveSettings = (body: object) =>
    settingsRoute.POST(new NextRequest('http://localhost/api/schools/settings', { method: 'POST', body: JSON.stringify(body) }));

  it('refuses marks above the school’s limits and saves nothing', async () => {
    const res = await saveScores([{ id: 's1', ca1: 31, ca2: 10, exam: 10 }]);
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain('30 for CA 1');
    expect(db.patches).toEqual([]);
  });

  it('accepts marks within the limits, including ones the starter pack would refuse', async () => {
    const res = await saveScores([{ id: 's1', ca1: 30, ca2: 30, exam: 40 }]);
    expect(res.status).toBe(200);
    expect(db.patches).toHaveLength(1);
  });

  it('refuses grading weights that do not add up to 100', async () => {
    for (const body of [{ ca1Weight: 20, ca2Weight: 20, examWeight: 70 }, { ca1Weight: 50, ca2Weight: 50 }, { ca1Weight: 50, ca2Weight: 50, examWeight: 0 }]) {
      expect((await saveSettings(body)).status).toBe(400);
    }
    expect(db.patches).toEqual([]);
  });

  it('refuses a pass mark outside 1 to 100', async () => {
    expect((await saveSettings({ passMark: 0 })).status).toBe(400);
    expect((await saveSettings({ passMark: 101 })).status).toBe(400);
  });

  it('accepts valid grading settings', async () => {
    expect((await saveSettings({ ca1Weight: 30, ca2Weight: 30, examWeight: 40, passMark: 45 })).status).toBe(200);
  });
});
