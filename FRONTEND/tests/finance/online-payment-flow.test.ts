import crypto from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createMigratedDb } from '../db/migrated-db';
import { insertClass, insertSchool, insertSession, insertStudent } from '../db/fixtures';
import { pgSupabase } from '../helpers/pg-supabase';
import { completeOnlinePayment, handlePaystackWebhook } from '@/lib/payments/complete';
import type { PaystackConfig } from '@/lib/payments/paystack';

// The whole path from Paystack's webhook to the ledger, against the real tables, constraints and ledger
// function. Only Paystack itself is replaced.

const SECRET = 'sk_test_flow';
let db: PGlite;
let admin: any;
let schoolA: string;
let schoolB: string;
let guardianId: string;
const students: string[] = [];

// What Paystack will say about each reference
const paystackSays = new Map<string, any>();
let paystackDown = false;
const calls: string[] = [];
const cfg: PaystackConfig = {
  secretKey: SECRET,
  fetchImpl: vi.fn(async (url: string) => {
    calls.push(String(url));
    if (paystackDown) throw new Error('network');
    const ref = decodeURIComponent(String(url).split('/transaction/verify/')[1] ?? '');
    const says = paystackSays.get(ref);
    if (!says) return new Response(JSON.stringify({ status: false, message: 'Transaction reference not found' }), { status: 400 });
    return new Response(JSON.stringify({ status: true, message: 'Verification successful', data: says }), { status: 200 });
  }) as unknown as typeof fetch,
};

const sign = (body: string) => crypto.createHmac('sha512', SECRET).update(body).digest('hex');
const webhook = (reference: string, signature?: string) => {
  const body = JSON.stringify({ event: 'charge.success', data: { reference } });
  return handlePaystackWebhook(admin, cfg, body, signature ?? sign(body));
};
const says = (reference: string, over: Record<string, unknown> = {}) =>
  paystackSays.set(reference, { reference, status: 'success', amount: 4000000, currency: 'NGN', channel: 'card', paid_at: '2026-11-04T10:00:00.000Z', fees: 60000, customer: { email: 'p@x.test', customer_code: 'CUS_1' }, ...over });

let n = 0;
async function startPayment(student: string, school: string, amount: number) {
  const reference = `OAK-FLOW-${String(++n).padStart(4, '0')}`;
  await db.query(`INSERT INTO public.online_payments (school_id, student_id, guardian_id, reference, amount) VALUES ($1, $2, $3, $4, $5)`, [school, student, guardianId, reference, amount]);
  return reference;
}
const ledger = async (student: string) => (await db.query<{ n: number; total: string }>(`SELECT COUNT(*)::int AS n, COALESCE(SUM(amount), 0) AS total FROM public.fee_transactions WHERE student_id = $1`, [student])).rows[0];
const attempt = async (reference: string) => (await db.query<any>(`SELECT * FROM public.online_payments WHERE reference = $1`, [reference])).rows[0];
const outbox = async (school: string) => (await db.query<any>(`SELECT * FROM public.message_outbox WHERE school_id = $1 ORDER BY created_at`, [school])).rows;

async function newStudent(school: string) {
  const sessionId = (await db.query<{ id: string }>(`SELECT id FROM public.academic_sessions WHERE school_id = $1 LIMIT 1`, [school])).rows[0].id;
  const classId = (await db.query<{ id: string }>(`SELECT id FROM public.classes WHERE school_id = $1 LIMIT 1`, [school])).rows[0].id;
  const s = await insertStudent(db, school, { classId, sessionId });
  await db.query(`INSERT INTO public.student_guardians (student_id, guardian_id) VALUES ($1, $2)`, [s, guardianId]);
  return s;
}

beforeAll(async () => {
  db = await createMigratedDb();
  admin = pgSupabase(db);
  schoolA = await insertSchool(db, 'FLOWA', { tuitionJSS: 100000 });
  schoolB = await insertSchool(db, 'FLOWB', { tuitionJSS: 100000 });
  for (const s of [schoolA, schoolB]) {
    await insertSession(db, s);
    await insertClass(db, s, 'JSS 1', 1);
  }
  const g = await db.query<{ id: string }>(
    `INSERT INTO public.guardians (school_id, first_name, last_name, email, phone, relationship) VALUES ($1, 'Ada', 'Obi', 'ada@example.test', '08031234567', 'parent') RETURNING id`,
    [schoolA]
  );
  guardianId = g.rows[0].id;
  for (let i = 0; i < 12; i++) students.push(await newStudent(schoolA));
}, 180000);

let next = 0;
const fresh = () => students[next++];

describe('A confirmed payment reaches the ledger', () => {
  it('records the payment, links it, and queues the receipt message to the parent', async () => {
    const student = fresh();
    const reference = await startPayment(student, schoolA, 40000);
    says(reference);
    const res = await webhook(reference);
    expect(res).toEqual({ status: 200, body: { success: true, outcome: 'recorded' } });

    expect(await ledger(student)).toEqual({ n: 1, total: '40000.00' });
    const tx = (await db.query<any>(`SELECT * FROM public.fee_transactions WHERE student_id = $1`, [student])).rows[0];
    expect(tx).toMatchObject({ school_id: schoolA, status: 'successful', reference, idempotency_key: `paystack:${reference}`, payment_method: 'Paystack (card)', recorded_by: 'Paystack (online payment)' });
    expect(tx.receipt_number).toMatch(/^REC-\d{4}-\d{4}$/);

    const a = await attempt(reference);
    expect(a).toMatchObject({ status: 'success', channel: 'card', fee_transaction_id: tx.id });
    expect(Number(a.provider_fee)).toBe(600);

    const account = (await db.query<any>(`SELECT * FROM public.student_financial_accounts WHERE student_id = $1`, [student])).rows[0];
    expect(Number(account.outstanding_balance)).toBe(60000);

    const mail = (await outbox(schoolA)).filter((m) => m.student_id === student);
    expect(mail).toHaveLength(1);
    expect(mail[0]).toMatchObject({ event: 'payment_received', category: 'payment', status: 'queued', recipient_phone: '2348031234567' });
    expect(mail[0].body).toContain(`Receipt ${tx.receipt_number}`);
    expect(mail[0].body).toContain('₦60,000.00');
  });

  it('records a payment once, however many times the webhook arrives, even at the same moment', async () => {
    const student = fresh();
    const reference = await startPayment(student, schoolA, 25000);
    says(reference, { amount: 2500000 });
    const results = await Promise.all([webhook(reference), webhook(reference), webhook(reference), completeOnlinePayment(admin, cfg, reference)]);
    expect(results.slice(0, 3).every((r) => (r as { status: number }).status === 200)).toBe(true);
    expect(await ledger(student)).toEqual({ n: 1, total: '25000.00' });
    expect((await outbox(schoolA)).filter((m) => m.student_id === student)).toHaveLength(1);
    expect((await attempt(reference)).status).toBe('success');
  });

  it('answers a repeat after it was recorded without asking Paystack again', async () => {
    const student = fresh();
    const reference = await startPayment(student, schoolA, 10000);
    says(reference, { amount: 1000000 });
    await webhook(reference);
    const before = calls.length;
    const again = await webhook(reference);
    expect(again.body).toEqual({ success: true, outcome: 'already_recorded' });
    expect(calls.length).toBe(before);
    expect(await ledger(student)).toEqual({ n: 1, total: '10000.00' });
  });
});

describe('What is refused', () => {
  it('refuses a webhook that is not signed with the secret, and changes nothing', async () => {
    const student = fresh();
    const reference = await startPayment(student, schoolA, 40000);
    says(reference);
    expect((await webhook(reference, 'deadbeef')).status).toBe(401);
    expect((await webhook(reference, sign('{"event":"charge.success","data":{"reference":"other"}}'))).status).toBe(401);
    expect(await ledger(student)).toEqual({ n: 0, total: '0' });
    expect((await attempt(reference)).status).toBe('initiated');
  });

  it('does not record a payment for a different amount than was asked, and keeps it for the bursar to look at', async () => {
    const student = fresh();
    const reference = await startPayment(student, schoolA, 40000);
    says(reference, { amount: 3000000 });
    expect((await webhook(reference)).body).toEqual({ success: true, outcome: 'mismatch' });
    expect(await ledger(student)).toEqual({ n: 0, total: '0' });
    const a = await attempt(reference);
    expect(a.status).toBe('mismatch');
    expect(a.failure_reason).toContain('asked for');
  });

  it('does not record a payment in another currency', async () => {
    const student = fresh();
    const reference = await startPayment(student, schoolA, 40000);
    says(reference, { currency: 'USD' });
    expect((await webhook(reference)).body).toMatchObject({ outcome: 'mismatch' });
    expect(await ledger(student)).toEqual({ n: 0, total: '0' });
  });

  it('does not record a payment that failed or was abandoned, and notes it', async () => {
    const failed = fresh();
    const r1 = await startPayment(failed, schoolA, 40000);
    says(r1, { status: 'failed' });
    expect((await webhook(r1)).body).toMatchObject({ outcome: 'not_successful' });
    expect((await attempt(r1)).status).toBe('failed');

    const left = fresh();
    const r2 = await startPayment(left, schoolA, 40000);
    says(r2, { status: 'abandoned' });
    await webhook(r2);
    expect((await attempt(r2)).status).toBe('abandoned');
    expect((await ledger(failed)).n + (await ledger(left)).n).toBe(0);
  });

  it('leaves a payment still pending alone', async () => {
    const student = fresh();
    const reference = await startPayment(student, schoolA, 40000);
    says(reference, { status: 'pending' });
    await webhook(reference);
    expect((await attempt(reference)).status).toBe('initiated');
    expect((await ledger(student)).n).toBe(0);
  });

  it('ignores a reference it never issued, and every other kind of event', async () => {
    says('SOMEONE-ELSES-1', {});
    expect((await webhook('SOMEONE-ELSES-1')).body).toEqual({ success: true, outcome: 'unknown_reference' });
    const body = JSON.stringify({ event: 'transfer.success', data: { reference: 'x' } });
    expect(await handlePaystackWebhook(admin, cfg, body, sign(body))).toEqual({ status: 200, body: { success: true, ignored: 'transfer.success' } });
    const junk = 'not json';
    expect((await handlePaystackWebhook(admin, cfg, junk, sign(junk))).status).toBe(400);
  });

  it('asks Paystack to try again later when it cannot confirm the payment right now, and records nothing', async () => {
    const student = fresh();
    const reference = await startPayment(student, schoolA, 40000);
    says(reference);
    paystackDown = true;
    expect((await webhook(reference)).status).toBe(500);
    paystackDown = false;
    expect((await ledger(student)).n).toBe(0);
    expect((await webhook(reference)).status).toBe(200);
    expect((await ledger(student)).n).toBe(1);
  });
});

describe('When the bill changes while the parent is paying', () => {
  it('keeps the money as credit instead of dropping it, when a scholarship has lowered the bill since', async () => {
    const student = fresh();
    const reference = await startPayment(student, schoolA, 90000);
    await db.query(`INSERT INTO public.fee_adjustments (school_id, student_id, kind, amount, reason) VALUES ($1, $2, 'scholarship', 50000, 'Awarded while the payment was open')`, [schoolA, student]);
    says(reference, { amount: 9000000 });
    expect((await webhook(reference)).body).toEqual({ success: true, outcome: 'recorded' });
    const account = (await db.query<any>(`SELECT * FROM public.student_financial_accounts WHERE student_id = $1`, [student])).rows[0];
    expect(Number(account.total_billed)).toBe(50000);
    expect(Number(account.total_paid)).toBe(90000);
    expect(Number(account.credit_balance)).toBe(40000);
    expect((await attempt(reference)).status).toBe('success');
  });
});

describe('A transfer to a student\'s own account number', () => {
  it('is matched to the student by the account it was paid into, and recorded once', async () => {
    const student = fresh();
    await db.query(`INSERT INTO public.student_virtual_accounts (school_id, student_id, account_number, bank_name) VALUES ($1, $2, '9988776655', 'Wema Bank')`, [schoolA, student]);
    const reference = 'TRANSFER-REF-0001';
    paystackSays.set(reference, { reference, status: 'success', amount: 3500000, currency: 'NGN', channel: 'dedicated_nuban', paid_at: '2026-11-04T10:00:00.000Z', fees: 0, customer: { email: 'x@y.test', customer_code: 'CUS_9' }, authorization: { receiver_bank_account_number: '9988776655' } });
    const results = await Promise.all([webhook(reference), webhook(reference)]);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await ledger(student)).toEqual({ n: 1, total: '35000.00' });
    expect(await attempt(reference)).toMatchObject({ school_id: schoolA, student_id: student, channel: 'dedicated_nuban', status: 'success' });
  });

  it('ignores a transfer to an account number the school did not give out', async () => {
    const reference = 'TRANSFER-REF-0002';
    paystackSays.set(reference, { reference, status: 'success', amount: 1000000, currency: 'NGN', channel: 'dedicated_nuban', authorization: { receiver_bank_account_number: '0000000000' } });
    expect((await webhook(reference)).body).toEqual({ success: true, outcome: 'unknown_reference' });
  });
});

describe('Schools stay separate', () => {
  it('records a payment only in the school that issued it, and its message only in that school', async () => {
    const sessionB = (await db.query<{ id: string }>(`SELECT id FROM public.academic_sessions WHERE school_id = $1`, [schoolB])).rows[0].id;
    const classB = (await db.query<{ id: string }>(`SELECT id FROM public.classes WHERE school_id = $1`, [schoolB])).rows[0].id;
    const studentB = await insertStudent(db, schoolB, { classId: classB, sessionId: sessionB });
    const reference = await startPayment(studentB, schoolB, 20000);
    says(reference, { amount: 2000000 });
    await webhook(reference);
    const tx = (await db.query<any>(`SELECT school_id FROM public.fee_transactions WHERE student_id = $1`, [studentB])).rows;
    expect(tx).toEqual([{ school_id: schoolB }]);
    expect((await outbox(schoolB)).every((m) => m.school_id === schoolB)).toBe(true);
    expect((await outbox(schoolA)).some((m) => m.student_id === studentB)).toBe(false);
  });
});
