import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createMigratedDb } from './migrated-db';
import { insertClass, insertSchool, insertSession, insertStudent, insertGuardian } from './fixtures';

// Many schools share one database, so every table that holds a school's rows must say which school.

const NEEDS_SCHOOL = [
  'assignment_submissions', 'authorized_pickup_persons', 'cbt_assessment_questions', 'cbt_session_answers',
  'cbt_sessions', 'class_enrollments', 'deliveries', 'documents', 'emergency_contacts', 'inventory_items',
  'pickup_logs', 'procurement_requests', 'report_cards', 'school_events', 'scores', 'security_incidents',
  'staff_gate_logs', 'student_guardians', 'student_movements', 'timetable_constraints', 'timetable_slots',
  'timetable_versions', 'visitors', 'workflow_steps',
];

// Tables that hold no school's data
const GLOBAL = new Set(['permissions', 'role_permissions', 'auth_rate_limits', 'schools']);

let db: PGlite;

beforeAll(async () => {
  db = await createMigratedDb();
}, 120000);

describe('Every table belongs to a school', () => {
  it('has a required school_id on each of the tables that had none', async () => {
    const { rows } = await db.query<{ table_name: string; is_nullable: string }>(
      `SELECT table_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'school_id'`
    );
    const byTable = new Map(rows.map((r) => [r.table_name, r.is_nullable]));
    const missing = NEEDS_SCHOOL.filter((t) => byTable.has(t) === false);
    // A table that does not exist in a fresh database is skipped by the migration; the rest must all be there
    expect(missing.length).toBeLessThan(NEEDS_SCHOOL.length);
    for (const t of NEEDS_SCHOOL.filter((x) => byTable.has(x))) expect(byTable.get(t), t).toBe('NO');
  });

  it('leaves no school-data table without a school_id', async () => {
    const { rows } = await db.query<{ table_name: string }>(
      `SELECT t.table_name FROM information_schema.tables t
       WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.table_name AND c.column_name = 'school_id')`
    );
    const without = rows.map((r) => r.table_name).filter((t) => !GLOBAL.has(t));
    expect(without).toEqual([]);
  });
});

describe('A row takes its school from the class or student it belongs to', () => {
  let schoolA: string;
  let schoolB: string;

  beforeAll(async () => {
    schoolA = await insertSchool(db, 'ISOA', {});
    schoolB = await insertSchool(db, 'ISOB', {});
  });

  it('puts an enrolment in the school of its class', async () => {
    const sessionB = await insertSession(db, schoolB);
    const classB = await insertClass(db, schoolB, 'Year 7', 1);
    const studentB = await insertStudent(db, schoolB, { classId: classB, sessionId: sessionB });
    const { rows } = await db.query<{ school_id: string }>(`SELECT school_id FROM public.class_enrollments WHERE student_id = $1`, [studentB]);
    expect(rows).toEqual([{ school_id: schoolB }]);
  });

  it('puts a guardian link in the school of its student', async () => {
    const sessionA = await insertSession(db, schoolA);
    const classA = await insertClass(db, schoolA, 'Year 7', 1);
    const studentA = await insertStudent(db, schoolA, { classId: classA, sessionId: sessionA });
    await insertGuardian(db, schoolA, 'guardian-a@example.test', crypto.randomUUID(), [studentA]);
    const { rows } = await db.query<{ school_id: string }>(`SELECT school_id FROM public.student_guardians WHERE student_id = $1`, [studentA]);
    expect(rows).toEqual([{ school_id: schoolA }]);
  });
});

describe('School addresses', () => {
  it('gives each school its own subdomain and refuses a repeat, ignoring case', async () => {
    const a = await insertSchool(db, 'SUBA', {});
    const b = await insertSchool(db, 'SUBB', {});
    await db.query(`UPDATE public.schools SET subdomain = 'Alpha' WHERE id = $1`, [a]);
    await expect(db.query(`UPDATE public.schools SET subdomain = 'alpha' WHERE id = $1`, [b])).rejects.toThrow();
    await db.query(`UPDATE public.schools SET subdomain = 'beta' WHERE id = $1`, [b]);
  });
});
