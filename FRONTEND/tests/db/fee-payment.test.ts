import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asRole, createMigratedDb } from './migrated-db';
import { insertClass, insertSchool, insertSession, insertStudent } from './fixtures';

// Runs the real record_fee_payment_tx and resolve_student_billed_tuition from supabase/migrations.

interface PaymentResult {
  idempotent_replay: boolean;
  transaction: { id: string; receipt_number: string; amount: string; recorded_by: string };
  account: { total_billed: string; total_paid: string; outstanding_balance: string; credit_balance: string };
}

let db: PGlite;
let schoolId: string;
let sessionId: string;
let jss1: string;
let ss3: string;

const TUITION = { tuitionJSS: 200000, tuitionSS12: 250000, tuitionSS3: 300000 };

function pay(params: {
  studentId: string;
  amount: number;
  idempotencyKey: string;
  reference?: string;
  receivingAccount?: string;
  allowOverpayment?: boolean;
  school?: string;
}): Promise<PaymentResult> {
  return asRole(db, 'service_role', {}, async (tx) => {
    const { rows } = await tx.query<{ r: PaymentResult }>(
      `SELECT public.record_fee_payment_tx(
         p_school_id => $1, p_student_id => $2, p_amount => $3, p_reference => $4,
         p_idempotency_key => $5, p_receiving_account => $6, p_actor_name => 'Test Bursar',
         p_actor_role => 'Bursar', p_allow_overpayment => $7) AS r`,
      [
        params.school ?? schoolId,
        params.studentId,
        params.amount,
        params.reference ?? null,
        params.idempotencyKey,
        params.receivingAccount ?? null,
        params.allowOverpayment ?? false,
      ]
    );
    return rows[0].r;
  });
}

async function billed(studentId: string, school = schoolId): Promise<number> {
  const { rows } = await db.query<{ v: string }>(`SELECT public.resolve_student_billed_tuition($1, $2) AS v`, [
    school,
    studentId,
  ]);
  return Number(rows[0].v);
}

async function countPayments(studentId: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.fee_transactions WHERE student_id = $1`,
    [studentId]
  );
  return rows[0].n;
}

beforeAll(async () => {
  db = await createMigratedDb();
  schoolId = await insertSchool(db, 'PAY', TUITION);
  sessionId = await insertSession(db, schoolId);
  jss1 = await insertClass(db, schoolId, 'JSS 1', 7);
  ss3 = await insertClass(db, schoolId, 'SS 3', 12);
}, 120000);

describe('Tuition comes only from master settings (AGENTS.md 1.3)', () => {
  it('bills each level at its settings rate', async () => {
    const junior = await insertStudent(db, schoolId, { classId: jss1, sessionId });
    const senior = await insertStudent(db, schoolId, { classId: ss3, sessionId });
    expect(await billed(junior)).toBe(200000);
    expect(await billed(senior)).toBe(300000);
  });

  it('bills a student with no class 0, not JSS tuition', async () => {
    const unplaced = await insertStudent(db, schoolId);
    expect(await billed(unplaced)).toBe(0);
  });

  it('bills 0, never an invented amount, when the tuition setting is missing', async () => {
    const bareSchool = await insertSchool(db, 'BARE', {});
    const bareSession = await insertSession(db, bareSchool);
    const bareClass = await insertClass(db, bareSchool, 'SS 3', 12);
    const student = await insertStudent(db, bareSchool, { classId: bareClass, sessionId: bareSession });
    expect(await billed(student, bareSchool)).toBe(0);
  });

  it('respects a tuition setting of 0 instead of replacing it', async () => {
    const freeSchool = await insertSchool(db, 'FREE', { tuitionJSS: 0 });
    const freeSession = await insertSession(db, freeSchool);
    const freeClass = await insertClass(db, freeSchool, 'JSS 1', 7);
    const student = await insertStudent(db, freeSchool, { classId: freeClass, sessionId: freeSession });
    expect(await billed(student, freeSchool)).toBe(0);
  });
});

describe('M0 exit gate: a double-submitted payment is recorded once (DEF-109)', () => {
  it('replays the first payment for a repeated idempotency key without crediting twice', async () => {
    const student = await insertStudent(db, schoolId, { classId: jss1, sessionId });

    const first = await pay({ studentId: student, amount: 50000, idempotencyKey: 'double-click-1' });
    const second = await pay({ studentId: student, amount: 50000, idempotencyKey: 'double-click-1' });

    expect(first.idempotent_replay).toBe(false);
    expect(second.idempotent_replay).toBe(true);
    expect(second.transaction.id).toBe(first.transaction.id);
    expect(await countPayments(student)).toBe(1);
    expect(Number(second.account.total_paid)).toBe(50000);
    expect(Number(second.account.outstanding_balance)).toBe(150000);
  });

  it('refuses an idempotency key that already belongs to another student', async () => {
    const a = await insertStudent(db, schoolId, { classId: jss1, sessionId });
    const b = await insertStudent(db, schoolId, { classId: jss1, sessionId });
    await pay({ studentId: a, amount: 10000, idempotencyKey: 'shared-key' });
    await expect(pay({ studentId: b, amount: 10000, idempotencyKey: 'shared-key' })).rejects.toThrow(
      'IDEMPOTENCY_CONFLICT'
    );
    expect(await countPayments(b)).toBe(0);
  });

  it('refuses a bank reference already recorded for another student', async () => {
    const a = await insertStudent(db, schoolId, { classId: jss1, sessionId });
    const b = await insertStudent(db, schoolId, { classId: jss1, sessionId });
    await pay({ studentId: a, amount: 10000, idempotencyKey: 'ref-a', reference: 'BANK-REF-77' });
    await expect(
      pay({ studentId: b, amount: 10000, idempotencyKey: 'ref-b', reference: 'BANK-REF-77' })
    ).rejects.toThrow('DUPLICATE_REFERENCE');
  });
});

describe('Overpayments and balances (DEF-107, DEF-110)', () => {
  it('rejects a payment above the outstanding balance', async () => {
    const student = await insertStudent(db, schoolId, { classId: jss1, sessionId });
    await expect(pay({ studentId: student, amount: 200001, idempotencyKey: 'over-1' })).rejects.toThrow(
      'OVERPAYMENT_REJECTED'
    );
    expect(await countPayments(student)).toBe(0);
  });

  it('carries a confirmed overpayment forward as credit', async () => {
    const student = await insertStudent(db, schoolId, { classId: jss1, sessionId });
    const result = await pay({ studentId: student, amount: 230000, idempotencyKey: 'over-2', allowOverpayment: true });
    expect(Number(result.account.outstanding_balance)).toBe(0);
    expect(Number(result.account.credit_balance)).toBe(30000);
  });

  it('treats any payment for a student with no class as an overpayment', async () => {
    const unplaced = await insertStudent(db, schoolId);
    await expect(pay({ studentId: unplaced, amount: 1000, idempotencyKey: 'unplaced-1' })).rejects.toThrow(
      'OVERPAYMENT_REJECTED'
    );
  });
});

describe('Receipts, bank balances and attribution (DEF-112, DEF-119)', () => {
  it('numbers receipts from a per-school, per-year sequence', async () => {
    const receiptSchool = await insertSchool(db, 'RCPT', TUITION);
    const receiptSession = await insertSession(db, receiptSchool);
    const receiptClass = await insertClass(db, receiptSchool, 'JSS 1', 7);
    const student = await insertStudent(db, receiptSchool, { classId: receiptClass, sessionId: receiptSession });
    const year = new Date().getFullYear();

    const one = await pay({ school: receiptSchool, studentId: student, amount: 1000, idempotencyKey: 'rc-1' });
    const two = await pay({ school: receiptSchool, studentId: student, amount: 1000, idempotencyKey: 'rc-2' });
    expect(one.transaction.receipt_number).toBe(`REC-${year}-0001`);
    expect(two.transaction.receipt_number).toBe(`REC-${year}-0002`);
  });

  it('credits only the bank account whose number matches exactly', async () => {
    const { rows } = await db.query<{ id: string; account_number: string }>(
      `INSERT INTO public.bank_accounts (school_id, bank_name, account_number, account_name, is_active)
       VALUES ($1, 'Test Bank', '0011223344', 'Fees', TRUE), ($1, 'Test Bank', '1122334', 'Other', TRUE)
       RETURNING id, account_number`,
      [schoolId]
    );
    const student = await insertStudent(db, schoolId, { classId: jss1, sessionId });
    await pay({ studentId: student, amount: 25000, idempotencyKey: 'bank-1', receivingAccount: 'Test Bank (0011223344)' });

    const { rows: balances } = await db.query<{ account_number: string; balance: string }>(
      `SELECT account_number, balance FROM public.bank_accounts WHERE id = ANY($1)`,
      [rows.map((r) => r.id)]
    );
    const byNumber = Object.fromEntries(balances.map((b) => [b.account_number, Number(b.balance)]));
    expect(byNumber['0011223344']).toBe(25000);
    expect(byNumber['1122334']).toBe(0);
  });

  it('records the signed-in user on the payment and its audit entry', async () => {
    const student = await insertStudent(db, schoolId, { classId: jss1, sessionId });
    const result = await pay({ studentId: student, amount: 5000, idempotencyKey: 'actor-1' });
    expect(result.transaction.recorded_by).toBe('Test Bursar');
    const { rows } = await db.query<{ actor_name: string }>(
      `SELECT actor_name FROM public.audit_logs WHERE resource_id = $1`,
      [result.transaction.id]
    );
    expect(rows).toEqual([{ actor_name: 'Test Bursar' }]);
  });
});

describe('Money functions cannot be called from the browser', () => {
  const browserRoles = ['anon', 'authenticated'] as const;
  const calls = [
    `SELECT public.record_fee_payment_tx('00000000-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 1)`,
    `SELECT public.merge_school_settings('00000000-0000-0000-0000-000000000000'::uuid, '{}'::jsonb)`,
    `SELECT public.record_rate_limit_attempt('login:someone', 'login', TRUE)`,
    `SELECT public.repair_student_financial_accounts()`,
    `SELECT public.next_school_document_number('00000000-0000-0000-0000-000000000000'::uuid, 'REC')`,
  ];

  for (const role of browserRoles) {
    for (const sql of calls) {
      const fn = sql.match(/public\.(\w+)/)![1];
      it(`denies ${role} from calling ${fn}`, async () => {
        await expect(asRole(db, role, {}, (tx) => tx.query(sql))).rejects.toThrow('permission denied');
      });
    }
  }
});
