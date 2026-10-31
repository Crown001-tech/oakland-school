import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asRole, createMigratedDb, type JwtClaims } from './migrated-db';
import { insertClass, insertGuardian, insertSchool, insertSession, insertStudent } from './fixtures';

// Runs the real row-level security policies from supabase/migrations, as PostgREST would
// for a request carrying the browser's public key and a signed-in parent's session.

let db: PGlite;
let schoolId: string;
let childA: string;
let childB: string;
const parentA: JwtClaims = { sub: randomUUID(), email: 'parent.a@example.test' };
const parentB: JwtClaims = { sub: randomUUID(), email: 'parent.b@example.test' };

async function ids(claims: JwtClaims, sql: string, params: unknown[] = []): Promise<string[]> {
  return asRole(db, 'authenticated', claims, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(sql, params);
    return rows.map((r) => r.id).sort();
  });
}

beforeAll(async () => {
  db = await createMigratedDb();
  schoolId = await insertSchool(db, 'ISO', { tuitionJSS: 100000, staffBankAccounts: { someone: { accountNumber: '0123456789' } } });
  const sessionId = await insertSession(db, schoolId);
  const classId = await insertClass(db, schoolId, 'JSS 1', 7);
  childA = await insertStudent(db, schoolId, { classId, sessionId });
  childB = await insertStudent(db, schoolId, { classId, sessionId });
  await insertGuardian(db, schoolId, parentA.email!, parentA.sub!, [childA]);
  await insertGuardian(db, schoolId, parentB.email!, parentB.sub!, [childB]);

  for (const [studentId, amount, receipt] of [
    [childA, 40000, 'REC-ISO-A'],
    [childB, 60000, 'REC-ISO-B'],
  ] as const) {
    await db.query(
      `INSERT INTO public.fee_transactions (school_id, student_id, amount, receipt_number, payment_method, status)
       VALUES ($1, $2, $3, $4, 'Bank Transfer', 'successful')`,
      [schoolId, studentId, amount, receipt]
    );
    await db.query(
      `INSERT INTO public.student_financial_accounts (school_id, student_id, total_billed, total_paid, outstanding_balance)
       VALUES ($1, $2, 100000, $3, $4)`,
      [schoolId, studentId, amount, 100000 - amount]
    );
  }
}, 120000);

describe('M0 exit gate: a parent cannot read another family’s child', () => {
  it('shows each parent only their own child in students', async () => {
    expect(await ids(parentA, `SELECT id FROM public.students`)).toEqual([childA]);
    expect(await ids(parentB, `SELECT id FROM public.students`)).toEqual([childB]);
  });

  it('returns nothing when a parent asks for the other family’s child by id', async () => {
    expect(await ids(parentA, `SELECT id FROM public.students WHERE id = $1`, [childB])).toEqual([]);
    expect(await ids(parentA, `SELECT id FROM public.class_enrollments WHERE student_id = $1`, [childB])).toEqual([]);
  });

  it('keeps fee payments and balances inside each family', async () => {
    expect(await ids(parentA, `SELECT student_id AS id FROM public.fee_transactions`)).toEqual([childA]);
    expect(await ids(parentA, `SELECT student_id AS id FROM public.student_financial_accounts`)).toEqual([childA]);
    expect(await ids(parentB, `SELECT student_id AS id FROM public.fee_transactions`)).toEqual([childB]);
  });

  it('does not let a parent change their child’s balance', async () => {
    const changed = await asRole(db, 'authenticated', parentA, async (tx) => {
      const res = await tx.query(
        `UPDATE public.student_financial_accounts SET outstanding_balance = 0 WHERE student_id = $1`,
        [childA]
      );
      return res.affectedRows;
    });
    expect(changed).toBe(0);
  });

  it('shows a signed-in user with no linked children nothing', async () => {
    const stranger: JwtClaims = { sub: randomUUID(), email: 'stranger@example.test' };
    expect(await ids(stranger, `SELECT id FROM public.students`)).toEqual([]);
    expect(await ids(stranger, `SELECT student_id AS id FROM public.fee_transactions`)).toEqual([]);
  });
});

describe('Anonymous visitors and school settings', () => {
  it('shows an anonymous visitor no students or payments', async () => {
    const rows = await asRole(db, 'anon', {}, async (tx) => {
      const students = await tx.query(`SELECT id FROM public.students`);
      const payments = await tx.query(`SELECT id FROM public.fee_transactions`);
      return students.rows.length + payments.rows.length;
    });
    expect(rows).toBe(0);
  });

  it('refuses anyone outside the server the settings column (staff bank details, salaries, scores)', async () => {
    await expect(asRole(db, 'anon', {}, (tx) => tx.query(`SELECT settings FROM public.schools`))).rejects.toThrow(
      'permission denied'
    );
    await expect(
      asRole(db, 'authenticated', parentA, (tx) => tx.query(`SELECT settings FROM public.schools`))
    ).rejects.toThrow('permission denied');
  });

  it('still serves the public school profile without settings', async () => {
    const row = await asRole(db, 'anon', {}, async (tx) => {
      const { rows } = await tx.query<Record<string, unknown>>(
        `SELECT * FROM public.school_public_profiles WHERE id = $1`,
        [schoolId]
      );
      return rows[0];
    });
    expect(row?.name).toBe('Test School ISO');
    expect(row).not.toHaveProperty('settings');
  });
});
