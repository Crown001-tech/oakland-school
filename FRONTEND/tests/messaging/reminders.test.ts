import { describe, expect, it } from 'vitest';
import { cleanDays, daysBetween, planReminder, reminderDueToday, type StudentFees } from '@/lib/reminders';

const settings = { enabled: true, daysBefore: [7, 1], daysAfter: [1, 7, 14] };
const owing = (over: Partial<StudentFees> = {}): StudentFees => ({ studentId: 's1', outstanding: 60000, paid: 40000, instalments: [], ...over });

describe('Days', () => {
  it('counts whole days between dates', () => {
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
    expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2026-11-04', '2026-11-04')).toBe(0);
  });

  it('keeps only sensible days, once each, furthest first', () => {
    expect(cleanDays([1, 7, 7, -1, 2.5, 'x', 99, 0])).toEqual([7, 1, 0]);
    expect(cleanDays('7')).toEqual([]);
    expect(cleanDays(undefined)).toEqual([]);
  });
});

describe('Is a reminder due today?', () => {
  it('is due exactly on the days the school chose, before and after the due date', () => {
    expect(reminderDueToday('2026-11-08', '2026-11-15', [7, 1], [1, 7])).toEqual({ kind: 'upcoming', offset: 7 });
    expect(reminderDueToday('2026-11-14', '2026-11-15', [7, 1], [1, 7])).toEqual({ kind: 'upcoming', offset: 1 });
    expect(reminderDueToday('2026-11-16', '2026-11-15', [7, 1], [1, 7])).toEqual({ kind: 'overdue', offset: 1 });
    expect(reminderDueToday('2026-11-22', '2026-11-15', [7, 1], [1, 7])).toEqual({ kind: 'overdue', offset: 7 });
  });

  it('is not due on any other day', () => {
    for (const today of ['2026-11-01', '2026-11-10', '2026-11-15', '2026-11-18', '2026-12-30']) expect(reminderDueToday(today, '2026-11-15', [7, 1], [1, 7]), today).toBeNull();
  });

  it('is due on the day itself only if the school asked for day zero', () => {
    expect(reminderDueToday('2026-11-15', '2026-11-15', [7, 1, 0], [])).toEqual({ kind: 'upcoming', offset: 0 });
    expect(reminderDueToday('2026-11-15', '2026-11-15', [7, 1], [1])).toBeNull();
  });

  it('is never due for a date that is not a date', () => {
    expect(reminderDueToday('today', '2026-11-15', [1], [1])).toBeNull();
    expect(reminderDueToday('2026-11-14', 'soon', [1], [1])).toBeNull();
  });
});

describe('Planning a reminder for a student', () => {
  it('reminds a student who owes, about the school\'s due date and what is still owed', () => {
    const r = planReminder(owing(), '2026-11-08', '2026-11-15', settings);
    expect(r).toEqual({ studentId: 's1', kind: 'upcoming', offset: 7, dueDate: '2026-11-15', amount: 60000, eventKey: 'reminder:s1:2026-11-15:upcoming:7' });
    expect(planReminder(owing(), '2026-11-22', '2026-11-15', settings)).toMatchObject({ kind: 'overdue', offset: 7, eventKey: 'reminder:s1:2026-11-15:overdue:7' });
  });

  it('never reminds a student who owes nothing', () => {
    expect(planReminder(owing({ outstanding: 0 }), '2026-11-08', '2026-11-15', settings)).toBeNull();
  });

  it('sends nothing when the school has set no due date and the student has no plan', () => {
    expect(planReminder(owing(), '2026-11-08', undefined, settings)).toBeNull();
  });

  it('sends nothing when the school chose no days', () => {
    expect(planReminder(owing(), '2026-11-08', '2026-11-15', { enabled: true })).toBeNull();
  });

  it('reminds a student on a plan about the instalment that is next due, for what is left of it', () => {
    const plan = [
      { sequence: 1, due_date: '2026-09-15', amount: 60000 },
      { sequence: 2, due_date: '2026-11-15', amount: 40000 },
    ];
    const r = planReminder(owing({ instalments: plan, paid: 70000, outstanding: 30000 }), '2026-11-14', '2026-12-31', settings);
    expect(r).toMatchObject({ kind: 'upcoming', offset: 1, dueDate: '2026-11-15', amount: 30000 });
  });

  it('counts an instalment that is part paid as still due, for the rest of it', () => {
    const plan = [{ sequence: 1, due_date: '2026-11-15', amount: 60000 }, { sequence: 2, due_date: '2027-01-15', amount: 40000 }];
    expect(planReminder(owing({ instalments: plan, paid: 20000, outstanding: 80000 }), '2026-11-16', undefined, settings)).toMatchObject({ kind: 'overdue', amount: 40000 });
  });

  it('does not remind about an instalment already paid', () => {
    const plan = [{ sequence: 1, due_date: '2026-11-15', amount: 60000 }, { sequence: 2, due_date: '2027-01-15', amount: 40000 }];
    expect(planReminder(owing({ instalments: plan, paid: 60000, outstanding: 40000 }), '2026-11-14', undefined, settings)).toBeNull();
  });

  it('gives the same key every day it would be planned, so it can only be sent once', () => {
    const a = planReminder(owing(), '2026-11-08', '2026-11-15', settings)!;
    const b = planReminder(owing({ outstanding: 55000 }), '2026-11-08', '2026-11-15', settings)!;
    expect(a.eventKey).toBe(b.eventKey);
  });
});
