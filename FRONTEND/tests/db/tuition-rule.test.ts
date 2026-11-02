import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createMigratedDb } from './migrated-db';
import { insertClass, insertSchool, insertSession, insertStudent } from './fixtures';
import { resolveTuition } from '@/lib/tuition';

// The tuition rule exists twice: in SQL (what a payment is checked against) and in TypeScript (what screens
// show). They must always agree, for JSS and SS classes and for classes with any other name.

const settings = { tuitionJSS: 120000, tuitionSS12: 150000, tuitionSS3: 170000 };
const feeRows = [
  { class_name: 'Primary 3', total_amount: 90000 },
  { class_name: 'Year 7', total_amount: 200000 },
  { class_name: 'Year 8 Gold', total_amount: 260000 },
];

// Classes that are a level plus an arm: the arm does not change the tuition
const arms: { name: string; level: string; arm: string }[] = [
  { name: 'JSS 1 Diamond', level: 'JSS 1', arm: 'Diamond' },
  { name: 'Silver', level: 'JSS 2', arm: 'Silver' },
  { name: 'SS 3 B', level: 'SS 3', arm: 'B' },
  { name: 'Primary 3 Diamond', level: 'Primary 3', arm: 'Diamond' },
  { name: 'Year 7 B', level: 'Year 7', arm: 'B' },
  { name: 'Year 8 Gold', level: 'Year 8', arm: 'Gold' },
  { name: 'Nursery 2 Red', level: 'Nursery 2', arm: 'Red' },
];

const classNames = ['JSS 1', 'JSS 3', 'JSS 1A', 'SS 1', 'SS 2', 'SS 3', 'SS 3 Science', 'SS 12', 'Primary 3', 'Year 7', 'Nursery 1'];

let db: PGlite;
let schoolId: string;
const students: Record<string, string> = {};

beforeAll(async () => {
  db = await createMigratedDb();
  schoolId = await insertSchool(db, 'TUI', settings);
  const sessionId = await insertSession(db, schoolId);
  for (const f of feeRows) {
    await db.query(`INSERT INTO public.fee_structures (school_id, class_name, term, total_amount) VALUES ($1, $2, 'First Term', $3)`, [schoolId, f.class_name, f.total_amount]);
  }
  let level = 1;
  for (const name of classNames) {
    const classId = await insertClass(db, schoolId, name, level++);
    students[name] = await insertStudent(db, schoolId, { classId, sessionId });
  }
  for (const a of arms) {
    const classId = await insertClass(db, schoolId, a.name, level++, a.level, a.arm);
    students[a.name] = await insertStudent(db, schoolId, { classId, sessionId });
  }
}, 120000);

const billed = async (name: string) =>
  Number((await db.query<{ v: string }>(`SELECT public.resolve_student_billed_tuition($1, $2) AS v`, [schoolId, students[name]])).rows[0].v);

describe('Tuition rule', () => {
  it.each(classNames)('the database and the code agree for %s', async (name) => {
    expect(await billed(name)).toBe(resolveTuition(name, settings, feeRows));
  });

  it.each(arms)('the database and the code agree for $name, level $level', async ({ name, level }) => {
    expect(await billed(name)).toBe(resolveTuition(name, settings, feeRows, level));
  });

  it('bills every arm of a level the same, whatever the arm is called', async () => {
    expect(await billed('JSS 1 Diamond')).toBe(120000);
    expect(await billed('Silver')).toBe(120000);
    expect(await billed('SS 3 B')).toBe(170000);
    expect(await billed('Primary 3 Diamond')).toBe(90000);
    expect(await billed('Year 7 B')).toBe(200000);
  });

  it('prefers an arm\'s own fee structure, and bills 0 when its level has none', async () => {
    expect(await billed('Year 8 Gold')).toBe(260000);
    expect(await billed('Nursery 2 Red')).toBe(0);
  });

  it('bills JSS and SS classes from the settings rates', async () => {
    expect(await billed('JSS 1A')).toBe(120000);
    expect(await billed('SS 2')).toBe(150000);
    expect(await billed('SS 3 Science')).toBe(170000);
  });

  it('bills any other class from its own fee structure', async () => {
    expect(await billed('Primary 3')).toBe(90000);
    expect(await billed('Year 7')).toBe(200000);
  });

  it('bills 0, never an invented amount, for a class with no rate', async () => {
    expect(await billed('Nursery 1')).toBe(0);
    expect(await billed('SS 12')).toBe(0);
    expect(resolveTuition('Nursery 1', settings, feeRows)).toBe(0);
  });

  it('does not let a fee structure override a JSS or SS setting', () => {
    expect(resolveTuition('JSS 1', settings, [{ class_name: 'JSS 1', total_amount: 480000 }])).toBe(120000);
  });

  it('bills 0 when a setting is missing, blank or not a number', () => {
    expect(resolveTuition('JSS 1', {}, [])).toBe(0);
    expect(resolveTuition('JSS 1', { tuitionJSS: '' }, [])).toBe(0);
    expect(resolveTuition('JSS 1', { tuitionJSS: 'abc' }, [])).toBe(0);
    expect(resolveTuition('JSS 1', { tuitionJSS: '95000' }, [])).toBe(95000);
  });
});
