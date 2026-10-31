import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asRole, createMigratedDb } from './migrated-db';
import { insertSchool, insertStudent } from './fixtures';
import { DEMO_ROLES, DEMO_SCHOOL_CODE } from '@/lib/demo-mode';

// Installs the demo school's SQL on a database built from the real migrations and checks that
// it refuses to touch a real school, resets cleanly, and leaves a school the app can sign in to.

const INSTALL_SQL = fs.readFileSync(path.resolve(import.meta.dirname, '../../demo/sql/001_install_demo_school.sql'), 'utf8');

let db: PGlite;

const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> =>
  (await db.query<T>(sql, params)).rows[0];
const count = async (table: string) => (await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.${table}`)).n;

beforeAll(async () => {
  db = await createMigratedDb();
  await db.exec(INSTALL_SQL);
  await db.query('SELECT public.reset_demo_school()');
}, 180000);

describe('Installing on a real school', () => {
  it('refuses when the database already holds students', async () => {
    const real = await createMigratedDb();
    const schoolId = await insertSchool(real, 'REAL', {});
    await insertStudent(real, schoolId);
    await expect(real.exec(INSTALL_SQL)).rejects.toThrow('REFUSED');
    expect(await real.query(`SELECT to_regclass('public.demo_database_marker') AS t`)).toMatchObject({ rows: [{ t: null }] });
    expect(await real.query(`SELECT to_regproc('public.reset_demo_school') AS f`)).toMatchObject({ rows: [{ f: null }] });
  }, 180000);

  it('refuses when the database already holds staff', async () => {
    const real = await createMigratedDb();
    const schoolId = await insertSchool(real, 'REAL2', {});
    await real.query(
      `INSERT INTO public.staff_profiles (school_id, employee_id, first_name, last_name, email, role)
       VALUES ($1, 'X-1', 'Real', 'Person', 'real@example.com', 'teacher')`,
      [schoolId]
    );
    await expect(real.exec(INSTALL_SQL)).rejects.toThrow('REFUSED');
  }, 180000);

  it('refuses to reset once the marker is gone', async () => {
    const other = await createMigratedDb();
    await other.exec(INSTALL_SQL);
    await other.exec('DELETE FROM public.demo_database_marker');
    await expect(other.query('SELECT public.reset_demo_school()')).rejects.toThrow('REFUSED');
  }, 180000);
});

describe('The reset demo school', () => {
  it('is the only school and carries the demo marker', async () => {
    const schools = (await db.query<{ code: string; name: string }>(`SELECT code, name FROM public.schools`)).rows;
    expect(schools).toEqual([{ code: DEMO_SCHOOL_CODE, name: 'Eductive Demo School' }]);
  });

  it('holds no Oakland name, address or contact anywhere', async () => {
    const { rows: columns } = await db.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND data_type IN ('text', 'character varying', 'jsonb', 'ARRAY')`
    );
    const hits: string[] = [];
    for (const { table_name, column_name } of columns) {
      const { rows } = await db.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM public."${table_name}" WHERE "${column_name}"::text ~* '(oakland|victoria island|oaklandschools)'`
      );
      if (rows[0].n > 0) hits.push(`${table_name}.${column_name} (${rows[0].n})`);
    }
    expect(hits).toEqual([]);
  });

  it('keeps the migration reference data the app depends on', async () => {
    for (const table of ['permissions', 'role_permissions', 'assessment_categories', 'grading_scales']) {
      expect(await count(table), table).toBeGreaterThan(0);
    }
  });

  it('has the six classes, twelve enrolled students and a staff member for every role', async () => {
    expect(await count('classes')).toBe(6);
    expect(await count('students')).toBe(12);
    expect((await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.class_enrollments WHERE status = 'active'`)).n).toBe(12);
    const roles = (await db.query<{ role: string }>(`SELECT DISTINCT role::text AS role FROM public.staff_profiles ORDER BY 1`)).rows;
    expect(roles.map((r) => r.role)).toEqual(['admin', 'bursar', 'proprietor', 'security', 'teacher']);
  });

  it('labels every person as a sample', async () => {
    const unlabelled = await one<{ n: number }>(
      `SELECT (
         (SELECT COUNT(*) FROM public.students WHERE last_name <> 'Sample') +
         (SELECT COUNT(*) FROM public.guardians WHERE last_name <> 'Sample') +
         (SELECT COUNT(*) FROM public.staff_profiles WHERE last_name <> 'Sample')
       )::int AS n`
    );
    expect(unlabelled.n).toBe(0);
  });

  it('resolves every demo role to a real account the login route can find', async () => {
    const { demoAccounts } = (await one<{ demoAccounts: Record<string, string> }>(
      `SELECT settings -> 'demoAccounts' AS "demoAccounts" FROM public.schools`
    ));
    expect(Object.keys(demoAccounts).sort()).toEqual([...DEMO_ROLES].sort());

    const staffRole: Record<string, string> = { proprietor: 'proprietor', principal: 'admin', bursar: 'bursar', teacher: 'teacher', security: 'security' };
    for (const [role, dbRole] of Object.entries(staffRole)) {
      const staff = await one<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM public.staff_profiles WHERE lower(email) = lower($1) AND role::text = $2 AND is_active AND must_change_password = FALSE`,
        [demoAccounts[role], dbRole]
      );
      expect(staff.n, role).toBe(1);
    }
    const parent = await one<{ children: number }>(
      `SELECT COUNT(*)::int AS children FROM public.guardians g JOIN public.student_guardians sg ON sg.guardian_id = g.id WHERE lower(g.email) = lower($1)`,
      [demoAccounts.parent]
    );
    expect(parent.children).toBe(2);
    const student = await one<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM public.students WHERE admission_number = $1`,
      [demoAccounts.student]
    );
    expect(student.n).toBe(1);
  });

  it('bills from the settings rates and ledgers every student', async () => {
    const { settings } = await one<{ settings: Record<string, number> }>(`SELECT settings FROM public.schools`);
    const rows = (await db.query<{ class: string; billed: string; paid: string; outstanding: string }>(
      `SELECT c.name AS class, a.total_billed AS billed, a.total_paid AS paid, a.outstanding_balance AS outstanding
       FROM public.student_financial_accounts a
       JOIN public.class_enrollments e ON e.student_id = a.student_id
       JOIN public.classes c ON c.id = e.class_id`
    )).rows;
    expect(rows).toHaveLength(12);
    for (const r of rows) {
      const rate = r.class.startsWith('JSS') ? settings.tuitionJSS : r.class === 'SS 3' ? settings.tuitionSS3 : settings.tuitionSS12;
      expect(Number(r.billed)).toBe(rate);
      expect(Number(r.paid) + Number(r.outstanding)).toBe(rate);
    }
    const mix = new Set(rows.map((r) => (Number(r.paid) === 0 ? 'none' : Number(r.outstanding) === 0 ? 'full' : 'part')));
    expect([...mix].sort()).toEqual(['full', 'none', 'part']);
  });

  it('numbers receipts in sequence and attributes them to the bursar, not a fixed label', async () => {
    const year = new Date().getFullYear();
    const { rows } = await db.query<{ receipt_number: string; recorded_by: string }>(
      `SELECT receipt_number, recorded_by FROM public.fee_transactions ORDER BY receipt_number`
    );
    expect(rows.map((r) => r.receipt_number)).toEqual(rows.map((_, i) => `REC-${year}-${String(i + 1).padStart(4, '0')}`));
    expect(new Set(rows.map((r) => r.recorded_by))).toEqual(new Set(['Chidi Sample']));
  });

  it('credits the sample bank account with exactly the money collected', async () => {
    const { collected, balance } = await one<{ collected: string; balance: string }>(
      `SELECT (SELECT COALESCE(SUM(amount), 0) FROM public.fee_transactions) AS collected, (SELECT balance FROM public.bank_accounts) AS balance`
    );
    expect(Number(balance)).toBe(Number(collected));
  });

  it('records ten school days of attendance for each student, never on a weekend', async () => {
    expect(await count('attendance_records')).toBe(120);
    const weekend = await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.attendance_records WHERE EXTRACT(ISODOW FROM date) > 5`);
    expect(weekend.n).toBe(0);
  });

  it('stores JSS 1 scores in the shape the scores page reads, within the 20, 20 and 60 limits', async () => {
    const { scores } = await one<{ scores: Record<string, { scores: { ca1: number; ca2: number; exam: number; admissionNo: string }[]; isLocked: boolean }> }>(
      `SELECT settings -> 'subject_scores' AS scores FROM public.schools`
    );
    expect(Object.keys(scores).sort()).toEqual(['JSS 1_Basic Science', 'JSS 1_English Language', 'JSS 1_Mathematics']);
    for (const entry of Object.values(scores)) {
      expect(entry.scores).toHaveLength(6);
      for (const s of entry.scores) {
        expect(s.ca1).toBeLessThanOrEqual(20);
        expect(s.ca2).toBeLessThanOrEqual(20);
        expect(s.exam).toBeLessThanOrEqual(60);
        expect(s.admissionNo).toMatch(/^DEMO-000[1-6]$/);
      }
    }
    expect(scores['JSS 1_Mathematics'].isLocked).toBe(true);
    expect(scores['JSS 1_English Language'].isLocked).toBe(false);
  });

  it('has no report cards, which stay empty states until the app creates them', async () => {
    expect(await count('report_cards')).toBe(0);
  });
});

describe('Nightly reset', () => {
  it('wipes everything a visitor added and rebuilds the same school', async () => {
    const schoolId = (await one<{ id: string }>(`SELECT id FROM public.schools`)).id;
    await insertStudent(db, schoolId);
    await db.query(`INSERT INTO public.audit_logs (school_id, actor_role, action, resource_type) VALUES ($1, 'visitor', 'test', 'test')`, [schoolId]);
    expect(await count('students')).toBe(13);

    await db.query('SELECT public.reset_demo_school()');

    expect(await count('students')).toBe(12);
    expect(await count('classes')).toBe(6);
    expect(await count('fee_transactions')).toBeGreaterThan(0);
    expect((await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.audit_logs WHERE action = 'test'`)).n).toBe(0);
    expect((await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.schools`)).n).toBe(1);
  }, 120000);

  it('restarts receipt numbers each night', async () => {
    const first = await one<{ receipt_number: string }>(`SELECT MIN(receipt_number) AS receipt_number FROM public.fee_transactions`);
    expect(first.receipt_number).toBe(`REC-${new Date().getFullYear()}-0001`);
  });
});

describe('Who may run the reset', () => {
  it.each(['anon', 'authenticated'] as const)('denies %s', async (role) => {
    await expect(asRole(db, role, {}, (tx) => tx.query('SELECT public.reset_demo_school()'))).rejects.toThrow('permission denied');
  });

  it('allows the service role', async () => {
    await expect(asRole(db, 'service_role', {}, (tx) => tx.query('SELECT public.reset_demo_school()'))).resolves.toBeDefined();
  }, 120000);
});
