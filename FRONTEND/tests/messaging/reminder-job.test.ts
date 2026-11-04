import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createMigratedDb } from '../db/migrated-db';
import { insertClass, insertSchool, insertSession, insertStudent } from '../db/fixtures';
import { pgSupabase } from '../helpers/pg-supabase';
import { queueFeeReminders } from '@/lib/reminders';

// The daily reminder job, against the real tables and ledger.

let db: PGlite;
let admin: any;
let schoolA: string;
let schoolB: string;
let owing: string;
let paidUp: string;
let onPlan: string;
let schoolBStudent: string;

const DUE = '2026-11-15';
const outbox = async (school: string) => (await db.query<any>(`SELECT * FROM public.message_outbox WHERE school_id = $1 ORDER BY event_key`, [school])).rows;

async function family(school: string, student: string, phone: string) {
  const g = await db.query<{ id: string }>(`INSERT INTO public.guardians (school_id, first_name, last_name, email, phone, relationship) VALUES ($1, 'Parent', 'Of', $2, $3, 'parent') RETURNING id`, [school, `p-${student.slice(0, 8)}@x.test`, phone]);
  await db.query(`INSERT INTO public.student_guardians (student_id, guardian_id) VALUES ($1, $2)`, [student, g.rows[0].id]);
}

beforeAll(async () => {
  db = await createMigratedDb();
  admin = pgSupabase(db);
  schoolA = await insertSchool(db, 'REMA', { tuitionJSS: 100000, feeReminders: { enabled: true, daysBefore: [7, 1], daysAfter: [1, 7], dueDate: DUE } });
  schoolB = await insertSchool(db, 'REMB', { tuitionJSS: 100000 }); // reminders not switched on
  const classIds: Record<string, string> = {};
  for (const s of [schoolA, schoolB]) {
    const sessionId = await insertSession(db, s);
    classIds[s] = await insertClass(db, s, 'JSS 1', 1);
    if (s === schoolA) {
      owing = await insertStudent(db, s, { classId: classIds[s], sessionId });
      paidUp = await insertStudent(db, s, { classId: classIds[s], sessionId });
      onPlan = await insertStudent(db, s, { classId: classIds[s], sessionId });
    } else {
      schoolBStudent = await insertStudent(db, s, { classId: classIds[s], sessionId });
    }
  }
  await family(schoolA, owing, '08031111111');
  await family(schoolA, paidUp, '08032222222');
  await family(schoolA, onPlan, '08033333333');
  await family(schoolB, schoolBStudent, '08034444444');

  // One student has paid in full; one has paid part and is on a two-instalment plan
  await db.query(`SELECT public.record_fee_payment_tx(p_school_id => $1, p_student_id => $2, p_amount => 100000, p_idempotency_key => 'rem-1', p_actor_name => 'T', p_actor_role => 'Bursar')`, [schoolA, paidUp]);
  await db.query(`SELECT public.record_fee_payment_tx(p_school_id => $1, p_student_id => $2, p_amount => 20000, p_idempotency_key => 'rem-2', p_actor_name => 'T', p_actor_role => 'Bursar')`, [schoolA, onPlan]);
  await db.query(`INSERT INTO public.fee_instalments (school_id, student_id, sequence, due_date, amount) VALUES ($1, $2, 1, '2026-11-12', 60000), ($1, $2, 2, '2027-01-12', 40000)`, [schoolA, onPlan]);
}, 180000);

describe('The daily reminder job', () => {
  it('queues the reminders due on the day, and only for those who owe', async () => {
    // Seven days before the school's due date
    const run = await queueFeeReminders(admin, '2026-11-08');
    expect(run.schools).toBe(1);
    const mail = await outbox(schoolA);
    const forOwing = mail.filter((m) => m.student_id === owing);
    expect(forOwing).toHaveLength(1);
    expect(forOwing[0]).toMatchObject({ event: 'fee_reminder_upcoming', category: 'reminder', status: 'queued', recipient_phone: '2348031111111', event_key: expect.stringContaining(`reminder:${owing}:${DUE}:upcoming:7`) });
    expect(forOwing[0].body).toContain('₦100,000.00');
    expect(forOwing[0].body).toContain('15 Nov 2026');
    expect(mail.some((m) => m.student_id === paidUp)).toBe(false);
  });

  it('reminds the student on a plan about their instalment, for what is left of it, not the school due date', async () => {
    // Four days before instalment 1 (12 Nov) is not a chosen day; the day before is
    await queueFeeReminders(admin, '2026-11-11');
    const forPlan = (await outbox(schoolA)).filter((m) => m.student_id === onPlan);
    expect(forPlan).toHaveLength(1);
    expect(forPlan[0].event_key).toContain('reminder:' + onPlan + ':2026-11-12:upcoming:1');
    expect(forPlan[0].body).toContain('₦40,000.00');
  });

  it('queues nothing twice, however often the job runs on the same day', async () => {
    const before = (await outbox(schoolA)).length;
    await queueFeeReminders(admin, '2026-11-08');
    await queueFeeReminders(admin, '2026-11-08');
    expect((await outbox(schoolA)).length).toBe(before);
  });

  it('sends the overdue reminder on the days after, with its own message', async () => {
    await queueFeeReminders(admin, '2026-11-16');
    const overdue = (await outbox(schoolA)).filter((m) => m.event === 'fee_reminder_overdue' && m.student_id === owing);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].body).toContain('still unpaid');
  });

  it('queues nothing on a day that is not one the school chose', async () => {
    const before = (await outbox(schoolA)).length;
    await queueFeeReminders(admin, '2026-11-10');
    expect((await outbox(schoolA)).length).toBe(before);
  });

  it('does nothing for a school that has not switched reminders on, and never mixes schools', async () => {
    expect(await outbox(schoolB)).toEqual([]);
    expect((await outbox(schoolA)).every((m) => m.school_id === schoolA)).toBe(true);
  });

  it('stops reminding a student once they have paid', async () => {
    await db.query(`SELECT public.record_fee_payment_tx(p_school_id => $1, p_student_id => $2, p_amount => 100000, p_idempotency_key => 'rem-3', p_actor_name => 'T', p_actor_role => 'Bursar')`, [schoolA, owing]);
    const before = (await outbox(schoolA)).filter((m) => m.student_id === owing).length;
    await queueFeeReminders(admin, '2026-11-22');
    expect((await outbox(schoolA)).filter((m) => m.student_id === owing).length).toBe(before);
  });
});
