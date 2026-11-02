import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createMigratedDb } from './migrated-db';
import { insertClass, insertSchool, insertSession, insertStudent } from './fixtures';

// Runs the real add-a-school script on a database built from the real migrations, next to a school that is
// already in use. Adding a school must leave every other school exactly as it was.

const SQL = fs.readFileSync(path.resolve(import.meta.dirname, '../../scripts/new-school/001_add_school.sql'), 'utf8');

const config = {
  name: 'Greenfield College',
  code: 'GFC-001',
  slug: 'greenfield',
  subdomain: 'greenfield',
  motto: 'Learn and grow',
  address: '5 Example Road',
  phone: '',
  email: 'office@greenfield.example',
  brandPrimary: '#0b5d3b',
  brandAccent: '#c8a24a',
  academicSession: '2026/2027',
  firstTermName: 'First Term',
  termStart: '2026-09-14',
  termEnd: '2026-12-18',
  classCapacity: 35,
  tuitionJSS: 100000,
  tuitionSS12: 130000,
  tuitionSS3: 150000,
  starterPack: 'nigerian_secondary',
  modules: { cbt: true, security: false, inventory: true, letters: true },
};

// Swaps the edit-me config block for the values under test
const withConfig = (values: Record<string, unknown>) =>
  SQL.replace(
    /v_config CONSTANT JSONB := '\{[\s\S]*?\}'::jsonb;/,
    `v_config CONSTANT JSONB := '${JSON.stringify(values).replace(/'/g, "''")}'::jsonb;`
  );

let db: PGlite;
let existingSchool: string;
let newSchool: string;
const one = async <T = Record<string, any>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];

// A snapshot of every school-data table's rows for one school, to compare before and after
async function snapshot(schoolId: string) {
  const { rows: tables } = await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'school_id'`
  );
  const out: Record<string, number> = {};
  for (const { table_name } of tables) {
    out[table_name] = (await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public."${table_name}" WHERE school_id = $1`, [schoolId])).n;
  }
  const school = await one<any>(`SELECT name, code, slug, settings FROM public.schools WHERE id = $1`, [schoolId]);
  return { out, school };
}

let before: Awaited<ReturnType<typeof snapshot>>;

beforeAll(async () => {
  db = await createMigratedDb();
  // A school that is already in use, with students and a class
  existingSchool = await insertSchool(db, 'INUSE', { tuitionJSS: 90000 });
  const sessionId = await insertSession(db, existingSchool);
  const classId = await insertClass(db, existingSchool, 'JSS 1', 1);
  await insertStudent(db, existingSchool, { classId, sessionId });
  before = await snapshot(existingSchool);

  await db.exec(withConfig(config));
  newSchool = (await one<{ id: string }>(`SELECT id FROM public.schools WHERE code = 'GFC-001'`)).id;
}, 180000);

describe('Adding a school leaves the others alone', () => {
  it('changes nothing about a school that is already in use', async () => {
    expect(await snapshot(existingSchool)).toEqual(before);
  });

  it('keeps that school\'s students billed and listed as before', async () => {
    const students = (await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.students WHERE school_id = $1`, [existingSchool])).n;
    expect(students).toBe(1);
  });
});

describe('Refusals', () => {
  it.each([
    ['a missing name', { ...config, name: '' }, 'MISSING'],
    ['a missing subdomain', { ...config, subdomain: '' }, 'MISSING'],
    ['a missing session', { ...config, academicSession: '' }, 'MISSING'],
    ['missing term dates', { ...config, termStart: '' }, 'MISSING'],
    ['a bad code', { ...config, code: 'bad code!' }, 'INVALID'],
    ['a bad subdomain', { ...config, code: 'NEW-1', slug: 'new-1', subdomain: 'Bad Domain' }, 'INVALID'],
    ['the reserved demo code', { ...config, code: 'EDUCTIVE-DEMO' }, 'INVALID'],
    ['a reserved subdomain', { ...config, code: 'NEW-2', slug: 'new-2', subdomain: 'admin' }, 'INVALID'],
    ['a term that ends before it starts', { ...config, termEnd: '2026-01-01' }, 'INVALID'],
    ['an unknown starter pack', { ...config, starterPack: 'primary' }, 'INVALID'],
    ['a brand colour that is not hex', { ...config, code: 'NEW-3', slug: 'new-3', subdomain: 'new-3', brandPrimary: 'green' }, 'INVALID'],
    ['a code that is taken', { ...config, slug: 'other', subdomain: 'other' }, 'TAKEN'],
    ['a slug that is taken', { ...config, code: 'NEW-4', subdomain: 'other-4' }, 'TAKEN'],
    ['a subdomain that is taken', { ...config, code: 'NEW-5', slug: 'new-5' }, 'TAKEN'],
  ])('refuses %s, and changes nothing', async (_label, values, message) => {
    const schoolsBefore = (await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.schools`)).n;
    await expect(db.exec(withConfig(values))).rejects.toThrow(message);
    expect((await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.schools`)).n).toBe(schoolsBefore);
  });
});

describe('A newly added school', () => {
  it('has its own details, its subdomain and nothing invented', async () => {
    const school = await one<any>(`SELECT name, code, slug, subdomain, motto, address, phone, email FROM public.schools WHERE id = $1`, [newSchool]);
    expect(school).toEqual({
      name: 'Greenfield College', code: 'GFC-001', slug: 'greenfield', subdomain: 'greenfield',
      motto: 'Learn and grow', address: '5 Example Road', phone: null, email: 'office@greenfield.example',
    });
  });

  it('holds no trace of Oakland in any of its rows', async () => {
    const { rows: columns } = await db.query<{ table_name: string; column_name: string }>(
      `SELECT c.table_name, c.column_name FROM information_schema.columns c
       WHERE c.table_schema = 'public' AND c.data_type IN ('text', 'character varying', 'jsonb', 'ARRAY')
         AND EXISTS (SELECT 1 FROM information_schema.columns s WHERE s.table_schema = 'public' AND s.table_name = c.table_name AND s.column_name = 'school_id')`
    );
    const hits: string[] = [];
    for (const { table_name, column_name } of columns) {
      const { rows } = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM public."${table_name}" WHERE school_id = $1 AND "${column_name}"::text ~* '(oakland|victoria island|academic crescent|0803-000-1234)'`,
        [newSchool]
      );
      if (rows[0].n > 0) hits.push(`${table_name}.${column_name}`);
    }
    expect(hits).toEqual([]);
  });

  it('starts with no fees, payments, audit entries or inventory', async () => {
    for (const table of ['fee_structures', 'fee_transactions', 'student_financial_accounts', 'audit_logs', 'inventory_items']) {
      expect((await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.${table} WHERE school_id = $1`, [newSchool])).n, table).toBe(0);
    }
  });

  it('writes the settings the app reads, including module switches and brand colours', async () => {
    const { settings } = await one<{ settings: Record<string, any> }>(`SELECT settings FROM public.schools WHERE id = $1`, [newSchool]);
    expect(settings).toMatchObject({
      academicSession: '2026/2027',
      currentTerm: 'First Term',
      classCapacity: 35,
      tuitionJSS: 100000,
      tuitionSS12: 130000,
      tuitionSS3: 150000,
      ca1Weight: 20,
      ca2Weight: 20,
      examWeight: 60,
      passMark: 50,
      brandPrimary: '#0b5d3b',
      brandAccent: '#c8a24a',
      modules: { cbt: true, security: false, inventory: true, letters: true },
    });
  });

  it('has one current session and term of its own', async () => {
    expect((await one<any>(`SELECT name FROM public.academic_sessions WHERE school_id = $1 AND is_current`, [newSchool])).name).toBe('2026/2027');
    expect((await one<any>(`SELECT start_date::text AS s FROM public.academic_terms WHERE school_id = $1 AND is_current`, [newSchool])).s).toBe('2026-09-14');
  });

  it('loads the starter pack: six classes in order, with levels, and the subject list', async () => {
    const classes = (await db.query<{ name: string; level: string; capacity: number }>(`SELECT name, level, capacity FROM public.classes WHERE school_id = $1 ORDER BY grade_level`, [newSchool])).rows;
    expect(classes.map((c) => c.name)).toEqual(['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3']);
    expect(classes.map((c) => c.level)).toEqual(['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3']);
    expect(new Set(classes.map((c) => c.capacity))).toEqual(new Set([35]));
    const subjects = (await db.query<{ name: string; category: string; code: string }>(`SELECT name, category, code FROM public.subjects WHERE school_id = $1`, [newSchool])).rows;
    expect(subjects.length).toBeGreaterThan(20);
    expect(subjects.find((s) => s.name === 'Mathematics')?.category).toBe('All');
    expect(subjects.find((s) => s.name === 'Basic Science')?.category).toBe('Junior');
    expect(subjects.find((s) => s.name === 'Physics')?.category).toBe('Senior');
    expect(new Set(subjects.map((s) => s.code)).size).toBe(subjects.length);
  });

  it('is ready to use: a student is billed from its own settings and a payment is recorded', async () => {
    const sessionId = (await one<{ id: string }>(`SELECT id FROM public.academic_sessions WHERE school_id = $1`, [newSchool])).id;
    const classId = (await one<{ id: string }>(`SELECT id FROM public.classes WHERE school_id = $1 AND name = 'JSS 1'`, [newSchool])).id;
    const studentId = await insertStudent(db, newSchool, { classId, sessionId });

    // The other school's rate (90,000) is never used for this school
    expect(Number((await one<any>(`SELECT public.resolve_student_billed_tuition($1, $2) AS v`, [newSchool, studentId])).v)).toBe(100000);
    const { r } = await one<any>(
      `SELECT public.record_fee_payment_tx(p_school_id => $1, p_student_id => $2, p_amount => 40000, p_idempotency_key => 'new-school-1', p_actor_name => 'Test Bursar', p_actor_role => 'Bursar') AS r`,
      [newSchool, studentId]
    );
    expect(Number(r.account.outstanding_balance)).toBe(60000);
  });
});

describe('Nursery and primary starter packs', () => {
  const packConfig = (code: string, packs: string[]) => ({ ...config, code, slug: code.toLowerCase(), subdomain: code.toLowerCase(), starterPack: undefined, starterPacks: packs });
  const classesOf = async (id: string) => (await db.query<{ name: string; level: string; grade_level: number }>(`SELECT name, level, grade_level FROM public.classes WHERE school_id = $1 ORDER BY grade_level`, [id])).rows;
  const idOf = async (code: string) => (await one<{ id: string }>(`SELECT id FROM public.schools WHERE code = $1`, [code])).id;

  it('adds Nursery 1 to 3 and Primary 1 to 6 for a nursery and primary school, with nothing from secondary', async () => {
    await db.exec(withConfig(packConfig('NPS-001', ['nigerian_nursery', 'nigerian_primary'])));
    const id = await idOf('NPS-001');
    const classes = await classesOf(id);
    expect(classes.map((c) => c.name)).toEqual(['Nursery 1', 'Nursery 2', 'Nursery 3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6']);
    expect(classes.map((c) => c.grade_level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(classes.every((c) => c.level === c.name)).toBe(true);
    const subjects = (await db.query<{ name: string; category: string }>(`SELECT name, category FROM public.subjects WHERE school_id = $1`, [id])).rows;
    expect(subjects.find((s) => s.name === 'Number Work')?.category).toBe('Nursery');
    expect(subjects.find((s) => s.name === 'Basic Science and Technology')?.category).toBe('Primary');
    expect(subjects.some((s) => ['Physics', 'Chemistry', 'Basic Science'].includes(s.name))).toBe(false);
  });

  it('puts the classes of a school that runs every stage in teaching order, whatever order the packs were listed', async () => {
    await db.exec(withConfig(packConfig('ALL-001', ['nigerian_secondary', 'nigerian_nursery', 'nigerian_primary'])));
    const id = await idOf('ALL-001');
    const classes = await classesOf(id);
    expect(classes).toHaveLength(15);
    expect(classes.map((c) => c.name)).toEqual([
      'Nursery 1', 'Nursery 2', 'Nursery 3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
      'JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3',
    ]);
    expect(classes.map((c) => c.grade_level)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });

  it('gives a subject shared by primary and secondary the category All, and each subject once with its own code', async () => {
    const id = await idOf('ALL-001');
    const subjects = (await db.query<{ name: string; category: string; code: string }>(`SELECT name, category, code FROM public.subjects WHERE school_id = $1`, [id])).rows;
    expect(subjects.find((s) => s.name === 'Mathematics')?.category).toBe('All');
    expect(subjects.find((s) => s.name === 'Physics')?.category).toBe('Senior');
    expect(subjects.find((s) => s.name === 'Handwriting')?.category).toBe('Primary');
    expect(new Set(subjects.map((s) => s.name)).size).toBe(subjects.length);
    expect(new Set(subjects.map((s) => s.code)).size).toBe(subjects.length);
  });

  it('bills a nursery or primary class from its level\'s fee, never an invented amount', async () => {
    const id = await idOf('NPS-001');
    const sessionId = (await one<{ id: string }>(`SELECT id FROM public.academic_sessions WHERE school_id = $1`, [id])).id;
    const classId = (await one<{ id: string }>(`SELECT id FROM public.classes WHERE school_id = $1 AND name = 'Primary 3'`, [id])).id;
    const studentId = await insertStudent(db, id, { classId, sessionId });
    expect(Number((await one<any>(`SELECT public.resolve_student_billed_tuition($1, $2) AS v`, [id, studentId])).v)).toBe(0);
    await db.query(`INSERT INTO public.fee_structures (school_id, class_name, term, total_amount) VALUES ($1, 'Primary 3', 'First Term', 85000)`, [id]);
    expect(Number((await one<any>(`SELECT public.resolve_student_billed_tuition($1, $2) AS v`, [id, studentId])).v)).toBe(85000);
  });

  it('refuses an unknown pack in the list', async () => {
    await expect(db.exec(withConfig(packConfig('BAD-001', ['nigerian_nursery', 'creche_only'])))).rejects.toThrow('INVALID');
  });

  it('adds no classes or subjects for an empty list of packs', async () => {
    await db.exec(withConfig(packConfig('NOP-001', [])));
    const id = await idOf('NOP-001');
    expect(await classesOf(id)).toEqual([]);
    expect((await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.subjects WHERE school_id = $1`, [id])).n).toBe(0);
  });
});

describe('Starter pack none', () => {
  it('adds the school with no classes or subjects, for a school that brings its own', async () => {
    await db.exec(withConfig({ ...config, code: 'BYO-001', slug: 'byo', subdomain: 'byo', starterPack: 'none' }));
    const id = (await one<{ id: string }>(`SELECT id FROM public.schools WHERE code = 'BYO-001'`)).id;
    expect((await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.classes WHERE school_id = $1`, [id])).n).toBe(0);
    expect((await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.subjects WHERE school_id = $1`, [id])).n).toBe(0);
  });
});
