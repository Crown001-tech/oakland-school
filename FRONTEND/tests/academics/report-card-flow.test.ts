import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Runs the real report card routes against a small in-memory database that applies filters,
// updates and upserts for real, so we can prove the flow and that one class never touches another.

type Row = Record<string, any>;
const db = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, rpcPatches: [] as any[] }));

function fakeTable(name: string) {
  const state: { op: 'select' | 'update' | 'upsert' | 'insert'; filters: ((r: Row) => boolean)[]; payload?: any; onConflict?: string } = {
    op: 'select',
    filters: [],
  };
  const rows = () => (db.tables[name] ??= []);
  const matching = () => rows().filter((r) => state.filters.every((f) => f(r)));

  const run = () => {
    if (state.op === 'update') {
      matching().forEach((r) => Object.assign(r, state.payload));
      return { data: null, error: null };
    }
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
    upsert: (payload: Row[], opts?: { onConflict?: string }) => (
      (state.op = 'upsert'), (state.payload = payload), (state.onConflict = opts?.onConflict), builder
    ),
    insert: (payload: Row) => ((state.op = 'insert'), (state.payload = payload), builder),
    maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
    single: async () => ({ data: matching()[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
  };
  return builder;
}

// Routes reach the database through the school client; these tests exercise the route's own logic, so the
// school client here is the same fake database, with a school id. Scoping itself is tested in school-scope.test.ts.
vi.mock('@/lib/school-db', async () => {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  return { getSchoolDb: async () => Object.assign(getSupabaseAdmin(), { schoolId: 'a0000000-0000-0000-0000-000000000001' }) };
});

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (name: string) => fakeTable(name),
    rpc: async (fn: string, args: any) => {
      if (fn === 'merge_school_settings') {
        db.rpcPatches.push(args.p_patch);
        const school = db.tables.schools[0];
        school.settings = { ...school.settings, ...args.p_patch };
      }
      return { data: null, error: null };
    },
  }),
}));

const session = vi.hoisted(() => ({ actor: {} as Row, linked: [] as string[] }));

vi.mock('@/lib/caller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/caller')>()),
  getAuthenticatedActor: vi.fn(async () => session.actor),
  getCaller: vi.fn(async () => session.actor),
  getLinkedStudentIds: vi.fn(async () => session.linked),
  getOwnStudentId: vi.fn(async () => null),
}));

const compile = await import('@/app/api/report-cards/route');
const results = await import('@/app/api/results/route');

const locked = (scores: Row[]) => ({ scores, isLocked: true, submittedBy: 'Teacher' });

const signIn = (role: string, extra: Row = {}) => {
  session.actor = {
    userId: `user-${role}`,
    email: `${role}@example.test`,
    role,
    hasSession: true,
    actorName: `Test ${role}`,
    actorRoleLabel: role,
    schoolId: 'school-1',
    ...extra,
  };
};

const post = (handler: (r: NextRequest) => Promise<Response>, body: Row) =>
  handler(new NextRequest('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }));

const cardsOf = (className: string) => db.tables.report_cards.filter((c) => c.class_name === className);

beforeEach(() => {
  db.rpcPatches = [];
  const student = (id: string, adm: string, first: string) => ({ id, admission_number: adm, first_name: first, last_name: 'Sample' });
  const enrolled = (id: string, studentId: string, classId: string) => ({
    id,
    student_id: studentId,
    class_id: classId,
    status: 'active',
    students: student(studentId, `ADM-${studentId}`, studentId),
  });
  db.tables = {
    schools: [
      {
        id: 'school-1',
        settings: {
          subject_scores: {
            'JSS 1_Mathematics': locked([
              { id: 'st1', ca1: 18, ca2: 17, exam: 55 },
              { id: 'st2', ca1: 10, ca2: 10, exam: 40 },
            ]),
            'JSS 1_English Language': { scores: [{ id: 'st1', ca1: 5, ca2: 5, exam: 5 }], isLocked: false },
            'JSS 2_Mathematics': locked([{ id: 'st4', ca1: 12, ca2: 12, exam: 40 }]),
          },
        },
      },
    ],
    academic_terms: [{ id: 'term-1', is_current: true }],
    classes: [
      { id: 'c1', school_id: 'school-1', name: 'JSS 1', teacher_assignments: [] },
      { id: 'c2', school_id: 'school-1', name: 'JSS 2', teacher_assignments: [] },
    ],
    class_enrollments: [enrolled('en1', 'st1', 'c1'), enrolled('en2', 'st2', 'c1'), enrolled('en3', 'st3', 'c1'), enrolled('en4', 'st4', 'c2')],
    staff_profiles: [{ user_id: 'user-teacher', email: 'teacher@example.test', assigned_class: 'JSS 1' }],
    attendance_records: [
      { student_id: 'st1', term_id: 'term-1', status: 'present' },
      { student_id: 'st1', term_id: 'term-1', status: 'late' },
      { student_id: 'st1', term_id: 'term-1', status: 'absent' },
    ],
    report_cards: [],
    audit_logs: [],
  };
});

describe('Step 1: the class teacher compiles', () => {
  it('saves a card for each student with locked scores, built on the server', async () => {
    signIn('teacher');
    const res = await post(compile.POST, { action: 'compile', className: 'JSS 1', remarks: { st1: ' Keep it up. ' } });
    expect(res.status).toBe(200);

    const cards = cardsOf('JSS 1');
    expect(cards.map((c) => c.enrollment_id).sort()).toEqual(['en1', 'en2']);
    const first = cards.find((c) => c.enrollment_id === 'en1')!;
    expect(first).toMatchObject({
      status: 'submitted',
      principal_approved: false,
      proprietor_endorsed: false,
      average_score: 90,
      rank: 1,
      teacher_comment: 'Keep it up.',
      attendance_present: 2,
      attendance_total: 3,
    });
    // The unlocked English scores are left off the card
    expect(first.subjects.map((s: Row) => s.name)).toEqual(['Mathematics']);
    expect(first.subjects[0]).toMatchObject({ total: 90, grade: 'A+' });
    expect(cards.find((c) => c.enrollment_id === 'en2')?.rank).toBe(2);
    expect(db.tables.audit_logs[0]).toMatchObject({ action: 'results.report_cards_compiled', actor_name: 'Test teacher' });

    const body = await res.json();
    expect(body.studentsWithoutScores).toBe(1);
    expect(body.unlockedSubjects).toEqual(['English Language']);
  });

  it('makes no card for a student with no locked scores', async () => {
    signIn('teacher');
    await post(compile.POST, { action: 'compile', className: 'JSS 1' });
    expect(db.tables.report_cards.some((c) => c.enrollment_id === 'en3')).toBe(false);
  });

  it('does not let a teacher compile a class they are not class teacher of', async () => {
    signIn('teacher');
    const res = await post(compile.POST, { action: 'compile', className: 'JSS 2' });
    expect(res.status).toBe(403);
    expect(db.tables.report_cards).toEqual([]);
  });

  it.each(['parent', 'student', 'bursar', 'security'])('refuses the %s role', async (role) => {
    signIn(role);
    expect((await post(compile.POST, { action: 'compile', className: 'JSS 1' })).status).toBe(403);
    expect(db.tables.report_cards).toEqual([]);
  });

  it('lets the principal compile any class', async () => {
    signIn('admin');
    expect((await post(compile.POST, { action: 'compile', className: 'JSS 2' })).status).toBe(200);
    expect(cardsOf('JSS 2')).toHaveLength(1);
  });

  it('says so, and saves nothing, when no scores are locked', async () => {
    signIn('teacher');
    db.tables.schools[0].settings.subject_scores = { 'JSS 1_Mathematics': { scores: [{ id: 'st1', ca1: 9, ca2: 9, exam: 9 }], isLocked: false } };
    const res = await post(compile.POST, { action: 'compile', className: 'JSS 1' });
    expect(res.status).toBe(422);
    expect((await res.json()).message).toContain('Mathematics');
    expect(db.tables.report_cards).toEqual([]);
  });

  it('freezes the cards once the principal has approved them', async () => {
    signIn('teacher');
    await post(compile.POST, { action: 'compile', className: 'JSS 1' });
    signIn('admin');
    await post(results.POST, { action: 'forward', classNames: ['JSS 1'] });

    signIn('teacher');
    const again = await post(compile.POST, { action: 'compile', className: 'JSS 1', remarks: { st1: 'Changed' } });
    expect(again.status).toBe(409);
    expect(cardsOf('JSS 1').find((c) => c.enrollment_id === 'en1')?.teacher_comment).toBeNull();
  });

  it('lets the teacher recompile before the principal acts, keeping a saved remark', async () => {
    signIn('teacher');
    await post(compile.POST, { action: 'compile', className: 'JSS 1', remarks: { st1: 'First remark' } });
    await post(compile.POST, { action: 'compile', className: 'JSS 1' });
    expect(cardsOf('JSS 1')).toHaveLength(2);
    expect(cardsOf('JSS 1').find((c) => c.enrollment_id === 'en1')?.teacher_comment).toBe('First remark');
  });
});

describe('Steps 2 and 3: principal approves, proprietor endorses', () => {
  beforeEach(async () => {
    signIn('admin');
    await post(compile.POST, { action: 'compile', className: 'JSS 1' });
    await post(compile.POST, { action: 'compile', className: 'JSS 2' });
  });

  it('forwarding approves only the named class', async () => {
    signIn('admin');
    const res = await post(results.POST, { action: 'forward', classNames: ['JSS 1'] });
    expect(res.status).toBe(200);
    expect(cardsOf('JSS 1').every((c) => c.principal_approved === true && c.status === 'approved')).toBe(true);
    expect(cardsOf('JSS 2').every((c) => c.principal_approved === false && c.status === 'submitted')).toBe(true);
    expect(db.tables.schools[0].settings.forwarded_results).toEqual(['JSS 1']);
  });

  it('refuses to forward a class with no submitted cards', async () => {
    signIn('admin');
    const res = await post(results.POST, { action: 'forward', classNames: ['SS 3'] });
    expect(res.status).toBe(422);
  });

  it('only the proprietor may endorse', async () => {
    for (const role of ['admin', 'principal', 'teacher', 'bursar']) {
      signIn(role);
      expect((await post(results.POST, { action: 'endorse', classNames: ['JSS 1'] })).status).toBe(403);
    }
    expect(db.tables.report_cards.every((c) => c.proprietor_endorsed === false)).toBe(true);
  });

  it('will not endorse cards the principal has not approved', async () => {
    signIn('proprietor');
    const res = await post(results.POST, { action: 'endorse', classNames: ['JSS 1'] });
    expect(res.status).toBe(422);
    expect(db.tables.report_cards.every((c) => c.proprietor_endorsed === false)).toBe(true);
    expect(db.tables.schools[0].settings.endorsed_results).toBeUndefined();
  });

  it('endorsing publishes only that class’s approved cards', async () => {
    signIn('admin');
    await post(results.POST, { action: 'forward', classNames: ['JSS 1', 'JSS 2'] });
    signIn('proprietor');
    const res = await post(results.POST, { action: 'endorse', classNames: ['JSS 1'] });
    expect(res.status).toBe(200);

    expect(cardsOf('JSS 1').every((c) => c.proprietor_endorsed === true && c.status === 'published' && c.published_at)).toBe(true);
    expect(cardsOf('JSS 2').every((c) => c.proprietor_endorsed === false && c.status === 'approved')).toBe(true);
    expect(db.tables.schools[0].settings.endorsed_results).toEqual(['JSS 1']);
  });
});

describe('What families see', () => {
  const readAs = async (role: string, studentId: string, linked: string[]) => {
    signIn(role);
    session.linked = linked;
    db.tables.students = [
      { id: 'st1', status: 'active', first_name: 'st1', last_name: 'Sample', admission_number: 'ADM-st1', class_enrollments: [{ id: 'en1', class_id: 'c1', status: 'active' }], student_guardians: [] },
      { id: 'st2', status: 'active', first_name: 'st2', last_name: 'Sample', admission_number: 'ADM-st2', class_enrollments: [{ id: 'en2', class_id: 'c1', status: 'active' }], student_guardians: [] },
    ];
    return results.GET(new NextRequest(`http://localhost/api/results?studentId=${studentId}`));
  };

  beforeEach(async () => {
    signIn('admin');
    await post(compile.POST, { action: 'compile', className: 'JSS 1', remarks: { st1: 'Well done.' } });
  });

  it('shows a parent no marks until the proprietor has endorsed', async () => {
    signIn('admin');
    await post(results.POST, { action: 'forward', classNames: ['JSS 1'] });
    const { data } = await (await readAs('parent', 'st1', ['st1'])).json();
    expect(data.studentReportCard).toMatchObject({ isEndorsed: false, averageScore: null, position: null, subjects: [], teacherRemark: null });
  });

  it('shows the endorsed card, with position and remark, to the child’s parent', async () => {
    signIn('admin');
    await post(results.POST, { action: 'forward', classNames: ['JSS 1'] });
    signIn('proprietor');
    await post(results.POST, { action: 'endorse', classNames: ['JSS 1'] });

    const { data } = await (await readAs('parent', 'st1', ['st1'])).json();
    expect(data.studentReportCard).toMatchObject({ isEndorsed: true, averageScore: 90, position: '1 of 2', teacherRemark: 'Well done.' });
    expect(data.studentReportCard.subjects).toEqual([expect.objectContaining({ name: 'Mathematics', total: 90, grade: 'A+' })]);
  });

  it('still refuses another family’s child', async () => {
    const res = await readAs('parent', 'st2', ['st1']);
    expect(res.status).toBe(403);
  });
});
