import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Runs the real report card route for remark cards (nursery and primary) and for ratings on marks cards,
// against a small in-memory database.

type Row = Record<string, any>;
const db = vi.hoisted(() => ({ tables: {} as Record<string, Row[]> }));

function fakeTable(name: string) {
  const state: { op: 'select' | 'update' | 'upsert' | 'insert'; filters: ((r: Row) => boolean)[]; payload?: any; onConflict?: string } = { op: 'select', filters: [] };
  const rows = () => (db.tables[name] ??= []);
  const matching = () => rows().filter((r) => state.filters.every((f) => f(r)));
  const run = () => {
    if (state.op === 'upsert') {
      const keys = (state.onConflict || 'id').split(',');
      for (const incoming of state.payload as Row[]) {
        const hit = rows().find((r) => keys.every((k) => r[k] === incoming[k]));
        if (hit) Object.assign(hit, incoming);
        else rows().push({ id: `${name}-${rows().length + 1}`, ...incoming });
      }
      return { data: null, error: null };
    }
    if (state.op === 'insert') {
      rows().push({ id: `${name}-${rows().length + 1}`, ...state.payload });
      return { data: null, error: null };
    }
    return { data: matching(), error: null };
  };
  const builder: any = {
    select: () => builder,
    eq: (col: string, val: unknown) => (state.filters.push((r) => r[col] === val), builder),
    in: (col: string, vals: unknown[]) => (state.filters.push((r) => vals.includes(r[col])), builder),
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    update: (payload: Row) => ((state.op = 'update'), (state.payload = payload), builder),
    upsert: (payload: Row[], opts?: { onConflict?: string }) => ((state.op = 'upsert'), (state.payload = payload), (state.onConflict = opts?.onConflict), builder),
    insert: (payload: Row) => ((state.op = 'insert'), (state.payload = payload), builder),
    maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
    single: async () => ({ data: matching()[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
  };
  return builder;
}

vi.mock('@/lib/school-db', async () => ({
  getSchoolDb: async () => ({ schoolId: 'school-1', from: (name: string) => fakeTable(name), rpc: async () => ({ data: null, error: null }) }),
}));

const session = vi.hoisted(() => ({ actor: {} as Row }));
vi.mock('@/lib/caller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/caller')>()),
  getAuthenticatedActor: vi.fn(async () => session.actor),
}));

const route = await import('@/app/api/report-cards/route');

const signIn = (role: string) => {
  session.actor = { userId: `user-${role}`, email: `${role}@example.test`, role, hasSession: true, actorName: `Test ${role}`, actorRoleLabel: role, schoolId: 'school-1' };
};
const post = (body: Row) => route.POST(new NextRequest('http://localhost/api/report-cards', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  const student = (id: string, first: string) => ({ id, admission_number: `ADM-${id}`, first_name: first, last_name: 'Pupil' });
  const enrolled = (id: string, studentId: string) => ({ id, student_id: studentId, class_id: 'c1', status: 'active', students: student(studentId, studentId) });
  db.tables = {
    schools: [{ id: 'school-1', settings: { subject_scores: { 'Primary 3_Mathematics': { scores: [{ id: 'st1', ca1: 18, ca2: 17, exam: 55 }], isLocked: true } } } }],
    academic_terms: [{ id: 'term-1', is_current: true }],
    classes: [{ id: 'c1', school_id: 'school-1', name: 'Primary 3', teacher_assignments: [] }],
    class_enrollments: [enrolled('en1', 'st1'), enrolled('en2', 'st2')],
    staff_profiles: [{ user_id: 'user-teacher', email: 'teacher@example.test', assigned_class: 'Primary 3' }],
    subjects: [
      { name: 'Number Work', is_active: true },
      { name: 'Social Habits', is_active: true },
    ],
    attendance_records: [],
    report_cards: [],
    audit_logs: [],
  };
});

describe('Remark cards for nursery and primary', () => {
  it('saves a card with remarks and ratings and no marks, position or average', async () => {
    signIn('teacher');
    const res = await post({
      action: 'compile',
      className: 'Primary 3',
      mode: 'descriptive',
      cards: {
        st1: {
          subjects: [{ name: 'Number Work', remark: 'Counts and adds well.' }],
          traits: [{ name: 'Punctuality', group: 'behaviour', rating: 5 }],
          comment: 'A pleasure to teach.',
        },
      },
    });
    expect(res.status).toBe(200);
    expect(db.tables.report_cards).toHaveLength(1);
    expect(db.tables.report_cards[0]).toMatchObject({
      enrollment_id: 'en1',
      style: 'descriptive',
      subjects: [{ name: 'Number Work', remark: 'Counts and adds well.' }],
      traits: [{ name: 'Punctuality', group: 'behaviour', rating: 5 }],
      total_score: null,
      average_score: null,
      rank: null,
      teacher_comment: 'A pleasure to teach.',
      status: 'submitted',
      principal_approved: false,
    });
  });

  it('writes nothing for a student the teacher wrote nothing for, and refuses when nobody has anything', async () => {
    signIn('teacher');
    const res = await post({ action: 'compile', className: 'Primary 3', mode: 'descriptive', cards: { st1: {}, st2: {} } });
    expect(res.status).toBe(422);
    expect(db.tables.report_cards).toEqual([]);
  });

  it('refuses a subject the school has not registered, and says so', async () => {
    signIn('teacher');
    const res = await post({ action: 'compile', className: 'Primary 3', mode: 'descriptive', cards: { st1: { subjects: [{ name: 'Basket Weaving', remark: 'Fine.' }] } } });
    expect(res.status).toBe(422);
    expect((await res.json()).message).toContain('not a registered subject');
    expect(db.tables.report_cards).toEqual([]);
  });

  it('refuses a rating outside the scale', async () => {
    signIn('teacher');
    const res = await post({ action: 'compile', className: 'Primary 3', mode: 'descriptive', cards: { st1: { traits: [{ name: 'Neatness', group: 'skill', rating: 7 }] } } });
    expect(res.status).toBe(422);
    expect(db.tables.report_cards).toEqual([]);
  });

  it('lets only the class teacher write the cards of their own class', async () => {
    signIn('teacher');
    db.tables.staff_profiles[0].assigned_class = 'Primary 4';
    const res = await post({ action: 'compile', className: 'Primary 3', mode: 'descriptive', cards: { st1: { comment: 'Hello' } } });
    expect(res.status).toBe(403);
  });
});

describe('Ratings on a marks card', () => {
  it('saves the ratings with the card and keeps them when the card is compiled again', async () => {
    signIn('teacher');
    await post({ action: 'compile', className: 'Primary 3', traits: { st1: [{ name: 'Handwriting', group: 'skill', rating: 4 }] } });
    expect(db.tables.report_cards[0]).toMatchObject({ style: 'scored', traits: [{ name: 'Handwriting', group: 'skill', rating: 4 }] });
    await post({ action: 'compile', className: 'Primary 3' });
    expect(db.tables.report_cards[0].traits).toEqual([{ name: 'Handwriting', group: 'skill', rating: 4 }]);
  });

  it('refuses a bad rating before saving any card', async () => {
    signIn('teacher');
    const res = await post({ action: 'compile', className: 'Primary 3', traits: { st1: [{ name: 'Handwriting', group: 'skill', rating: 0 }] } });
    expect(res.status).toBe(400);
    expect(db.tables.report_cards).toEqual([]);
  });
});
