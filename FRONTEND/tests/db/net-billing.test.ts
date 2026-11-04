import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createMigratedDb } from './migrated-db';
import { insertClass, insertSchool, insertSession, insertStudent } from './fixtures';
import { netBilled, type Adjustment } from '@/lib/fee-adjustments';

// The rule for what a student is billed exists in SQL (what a payment is checked against) and in code (what
// screens show). They must agree for every kind of adjustment.

let db: PGlite;
let schoolId: string;
let classId: string;
let sessionId: string;
const GROSS = 100000;

beforeAll(async () => {
  db = await createMigratedDb();
  schoolId = await insertSchool(db, 'NET', { tuitionJSS: GROSS });
  sessionId = await insertSession(db, schoolId);
  classId = await insertClass(db, schoolId, 'JSS 1', 1);
}, 120000);

const newStudent = () => insertStudent(db, schoolId, { classId, sessionId });
const net = async (studentId: string) => Number((await db.query<{ v: string }>(`SELECT public.resolve_student_net_billed($1, $2) AS v`, [schoolId, studentId])).rows[0].v);
const adjust = (studentId: string, a: { kind: string; amount?: number; percent?: number; active?: boolean }) =>
  db.query(
    `INSERT INTO public.fee_adjustments (school_id, student_id, kind, amount, percent, reason, is_active) VALUES ($1, $2, $3, $4, $5, 'Test reason', $6)`,
    [schoolId, studentId, a.kind, a.amount ?? null, a.percent ?? null, a.active ?? true]
  );
const pay = (studentId: string, amount: number, key: string, allowOverpayment = false) =>
  db.query<{ r: any }>(
    `SELECT public.record_fee_payment_tx(p_school_id => $1, p_student_id => $2, p_amount => $3, p_idempotency_key => $4, p_actor_name => 'Test', p_actor_role => 'Bursar', p_allow_overpayment => $5) AS r`,
    [schoolId, studentId, amount, key, allowOverpayment]
  );

describe('Net billing: the database and the code agree', () => {
  const cases: { name: string; adjustments: { kind: string; amount?: number; percent?: number; active?: boolean }[] }[] = [
    { name: 'no adjustment', adjustments: [] },
    { name: 'a fixed scholarship', adjustments: [{ kind: 'scholarship', amount: 25000 }] },
    { name: 'a percentage sibling discount', adjustments: [{ kind: 'sibling', percent: 10 }] },
    { name: 'a percentage and a fixed amount together', adjustments: [{ kind: 'scholarship', percent: 50 }, { kind: 'discount', amount: 5000 }] },
    { name: 'a full waiver', adjustments: [{ kind: 'waiver', percent: 100 }] },
    { name: 'adjustments that add up to more than the tuition', adjustments: [{ kind: 'scholarship', percent: 80 }, { kind: 'discount', percent: 80 }] },
    { name: 'a percentage that needs rounding', adjustments: [{ kind: 'discount', percent: 7.5 }, { kind: 'discount', percent: 3.33 }] },
    { name: 'an adjustment switched off', adjustments: [{ kind: 'scholarship', amount: 25000, active: false }] },
  ];

  it.each(cases)('agree for $name', async ({ adjustments }) => {
    const student = await newStudent();
    for (const a of adjustments) await adjust(student, a);
    const asCode: Adjustment[] = adjustments.map((a) => ({ kind: a.kind as Adjustment['kind'], amount: a.amount ?? null, percent: a.percent ?? null, is_active: a.active ?? true }));
    expect(await net(student)).toBe(netBilled(GROSS, asCode));
  });
});

describe('The ledger bills the net amount', () => {
  it('accepts a payment up to the net amount and refuses one above it', async () => {
    const student = await newStudent();
    await adjust(student, { kind: 'scholarship', amount: 25000 });
    await expect(pay(student, 80000, 'net-over-1')).rejects.toThrow('OVERPAYMENT_REJECTED');
    const { rows } = await pay(student, 75000, 'net-ok-1');
    expect(Number(rows[0].r.account.total_billed)).toBe(75000);
    expect(Number(rows[0].r.account.outstanding_balance)).toBe(0);
  });

  it('records a part payment against the net amount', async () => {
    const student = await newStudent();
    await adjust(student, { kind: 'sibling', percent: 10 });
    const { rows } = await pay(student, 30000, 'net-part-1');
    expect(Number(rows[0].r.account.outstanding_balance)).toBe(60000);
  });

  it('records the same payment only once, however many times it arrives', async () => {
    const student = await newStudent();
    const first = await pay(student, 10000, 'net-idem-1');
    const second = await pay(student, 10000, 'net-idem-1');
    expect(first.rows[0].r.idempotent_replay).toBe(false);
    expect(second.rows[0].r.idempotent_replay).toBe(true);
    const { rows } = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.fee_transactions WHERE student_id = $1`, [student]);
    expect(rows[0].n).toBe(1);
  });

  it('lets a waived student pay nothing, and refuses a payment', async () => {
    const student = await newStudent();
    await adjust(student, { kind: 'waiver', percent: 100 });
    expect(await net(student)).toBe(0);
    await expect(pay(student, 1000, 'net-waived-1')).rejects.toThrow('OVERPAYMENT_REJECTED');
  });
});

describe('An adjustment must be well formed', () => {
  const insert = (sql: string) => db.query(sql);

  it('refuses one with both an amount and a percentage, or neither', async () => {
    const student = await newStudent();
    await expect(insert(`INSERT INTO public.fee_adjustments (school_id, student_id, kind, amount, percent, reason) VALUES ('${schoolId}', '${student}', 'discount', 100, 5, 'x')`)).rejects.toThrow();
    await expect(insert(`INSERT INTO public.fee_adjustments (school_id, student_id, kind, reason) VALUES ('${schoolId}', '${student}', 'discount', 'x')`)).rejects.toThrow();
  });

  it('refuses a blank reason, an unknown kind, and a percentage above 100', async () => {
    const student = await newStudent();
    await expect(insert(`INSERT INTO public.fee_adjustments (school_id, student_id, kind, amount, reason) VALUES ('${schoolId}', '${student}', 'discount', 100, '  ')`)).rejects.toThrow();
    await expect(insert(`INSERT INTO public.fee_adjustments (school_id, student_id, kind, amount, reason) VALUES ('${schoolId}', '${student}', 'gift', 100, 'x')`)).rejects.toThrow();
    await expect(insert(`INSERT INTO public.fee_adjustments (school_id, student_id, kind, percent, reason) VALUES ('${schoolId}', '${student}', 'discount', 101, 'x')`)).rejects.toThrow();
  });
});
