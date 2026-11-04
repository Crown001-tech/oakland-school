import type { SupabaseClient } from '@supabase/supabase-js';
import { scopeClient } from '@/lib/school-scope';
import { idPrefixFor, studentEmailDomainFor } from '@/lib/school-config';
import { enqueueForGuardians } from '@/lib/messaging/outbox';
import { lagosDate } from '@/lib/messaging/events';
import { instalmentStatus, type Instalment } from '@/lib/fee-adjustments';
import { roundNaira } from '@/lib/money';

/**
 * Fee reminders: a message to the parents of a student who still owes fees, a set number of days before the
 * due date and after it has passed. The days are the school's own setting; a school that has set none sends none.
 *
 *   settings.feeReminders = { enabled: true, daysBefore: [7, 1], daysAfter: [1, 7, 14], dueDate: "2026-11-15" }
 *
 * A student on an instalment plan is reminded about the instalment that is next due; any other student about
 * the school's due date. A reminder is keyed by student, due date and day, so running the job twice in a day, or
 * on every day, sends each one once.
 */

export interface ReminderSettings {
  enabled?: boolean;
  daysBefore?: number[];
  daysAfter?: number[];
  /** The date fees fall due for students not on an instalment plan (YYYY-MM-DD) */
  dueDate?: string;
}

export function readReminderSettings(settings: unknown): ReminderSettings {
  const r = ((settings as { feeReminders?: unknown } | null)?.feeReminders ?? {}) as ReminderSettings;
  return typeof r === 'object' && r ? r : {};
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whole days from one date to another (b minus a), ignoring the time of day. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/** The cleaned list of days: whole numbers from 0 to 60, no repeats. */
export function cleanDays(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 60))].sort((a, b) => b - a);
}

export type ReminderDue = { kind: 'upcoming' | 'overdue'; offset: number } | null;

/** Is a reminder due today for this due date? */
export function reminderDueToday(today: string, dueDate: string, daysBefore: number[], daysAfter: number[]): ReminderDue {
  if (!DATE.test(today) || !DATE.test(dueDate)) return null;
  const diff = daysBetween(today, dueDate); // positive: the due date is still ahead
  if (diff > 0 && daysBefore.includes(diff)) return { kind: 'upcoming', offset: diff };
  if (diff < 0 && daysAfter.includes(-diff)) return { kind: 'overdue', offset: -diff };
  if (diff === 0 && daysBefore.includes(0)) return { kind: 'upcoming', offset: 0 };
  return null;
}

export interface StudentFees {
  studentId: string;
  outstanding: number;
  paid: number;
  instalments: Instalment[];
}

export interface PlannedReminder {
  studentId: string;
  kind: 'upcoming' | 'overdue';
  offset: number;
  dueDate: string;
  amount: number;
  eventKey: string;
}

/** The reminder, if any, a student is due today. */
export function planReminder(student: StudentFees, today: string, schoolDueDate: string | undefined, s: ReminderSettings): PlannedReminder | null {
  if (student.outstanding <= 0) return null;
  const before = cleanDays(s.daysBefore);
  const after = cleanDays(s.daysAfter);

  if (student.instalments.length > 0) {
    // The instalment that matters: the earliest one not yet fully paid
    const next = instalmentStatus(student.instalments, student.paid, today).find((i) => i.state !== 'paid');
    if (!next) return null;
    const due = reminderDueToday(today, next.due_date, before, after);
    if (!due) return null;
    return { studentId: student.studentId, kind: due.kind, offset: due.offset, dueDate: next.due_date, amount: roundNaira(next.amount - next.paid), eventKey: `reminder:${student.studentId}:${next.due_date}:${due.kind}:${due.offset}` };
  }

  if (!schoolDueDate) return null;
  const due = reminderDueToday(today, schoolDueDate, before, after);
  if (!due) return null;
  return { studentId: student.studentId, kind: due.kind, offset: due.offset, dueDate: schoolDueDate, amount: roundNaira(student.outstanding), eventKey: `reminder:${student.studentId}:${schoolDueDate}:${due.kind}:${due.offset}` };
}

export interface ReminderRun {
  schools: number;
  students: number;
  queued: number;
  skipped: number;
}

/** Queues today's reminders for every school that has switched them on. Runs once a day (see /api/cron/reminders). */
export async function queueFeeReminders(admin: SupabaseClient, today: string): Promise<ReminderRun> {
  const run: ReminderRun = { schools: 0, students: 0, queued: 0, skipped: 0 };
  const { data: schools } = await admin.from('schools').select('id, name, code, subdomain, settings');

  for (const school of schools || []) {
    const s = readReminderSettings(school.settings);
    if (!s.enabled) continue;
    run.schools += 1;
    const db = scopeClient(admin, school.id, { idPrefix: idPrefixFor(school), studentEmailDomain: studentEmailDomainFor(school) });

    const { data: students } = await db.from('students').select('id, first_name, last_name, status').eq('status', 'active');
    for (const st of students || []) {
      const [{ data: account }, { data: plan }] = await Promise.all([
        db.from('student_financial_accounts').select('outstanding_balance, total_paid').eq('student_id', st.id).maybeSingle(),
        db.from('fee_instalments').select('sequence, due_date, amount').eq('student_id', st.id).order('sequence', { ascending: true }),
      ]);
      // A student who has never paid has no account row yet: ask the ledger what they are billed
      let outstanding = account ? Number(account.outstanding_balance) : NaN;
      const paid = account ? Number(account.total_paid) : 0;
      if (!account) {
        const { data: net } = await db.rpc('resolve_student_net_billed', { p_school_id: school.id, p_student_id: st.id });
        outstanding = Number(net ?? 0);
      }
      const fees: StudentFees = { studentId: st.id, outstanding: Number.isFinite(outstanding) ? outstanding : 0, paid, instalments: (plan || []).map((p: any) => ({ sequence: p.sequence, due_date: String(p.due_date).slice(0, 10), amount: Number(p.amount) })) };

      const planned = planReminder(fees, today, s.dueDate, s);
      if (!planned) continue;
      run.students += 1;
      const results = await enqueueForGuardians(
        db,
        st.id,
        planned.kind === 'upcoming' ? 'fee_reminder_upcoming' : 'fee_reminder_overdue',
        planned.eventKey,
        { school: school.name, student: `${st.first_name} ${st.last_name}`.trim(), amount: planned.amount, dueDate: lagosDate(new Date(`${planned.dueDate}T12:00:00Z`)) }
      );
      for (const r of results) r.status === 'queued' ? (run.queued += 1) : (run.skipped += 1);
    }
  }
  return run;
}
