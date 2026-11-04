import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type Row } from '../helpers/fake-db';

// The routes that say something to parents: attendance, and the school's notices.

let tables: Record<string, Row[]>;
const told = vi.hoisted(() => ({ attendance: [] as any[], broadcasts: [] as any[] }));

vi.mock('@/lib/school-db', async () => ({
  getSchoolDb: async () => ({ ...createFakeDb(tables, {}), schoolId: 'school-1' }),
}));
vi.mock('@/lib/caller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/caller')>()),
  getCaller: async () => ({ role: 'principal', email: 'head@example.test', userId: 'u1' }),
}));
vi.mock('@/lib/school-people', () => ({ getPrincipalName: async () => 'The Head' }));
vi.mock('@/lib/messaging/events', () => ({
  notifyAttendance: async (_db: unknown, p: unknown) => void told.attendance.push(p),
  notifyBroadcast: async (_db: unknown, p: any) => {
    told.broadcasts.push(p);
    return { queued: p.studentIds.length, skipped: 0 };
  },
}));

const attendance = await import('@/app/api/attendance/route');
const communications = await import('@/app/api/communications/route');

const post = (url: string, body: Row) => new NextRequest(`https://greenfield.example.com${url}`, { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
  told.attendance = [];
  told.broadcasts = [];
  tables = {
    classes: [{ id: 'c1', school_id: 'school-1', name: 'JSS 1 A' }],
    academic_sessions: [{ id: 'sess1', is_current: true }],
    academic_terms: [{ id: 'term1', is_current: true }],
    students: [
      { id: '11111111-1111-4111-8111-111111111111', admission_number: 'A1', status: 'active' },
      { id: '22222222-2222-4222-8222-222222222222', admission_number: 'A2', status: 'active' },
      { id: '33333333-3333-4333-8333-333333333333', admission_number: 'A3', status: 'active' },
    ],
    class_enrollments: [
      { id: 'e1', student_id: '11111111-1111-4111-8111-111111111111', class_id: 'c1', status: 'active' },
      { id: 'e2', student_id: '22222222-2222-4222-8222-222222222222', class_id: 'c1', status: 'active' },
    ],
    attendance_records: [],
    notifications: [],
    audit_logs: [],
  };
});

describe('Attendance', () => {
  const register = (records: Row[], extra: Row = {}) => attendance.POST(post('/api/attendance', { class: 'JSS 1 A', date: '2026-11-04', records, ...extra }));

  it('tells the parents of a child marked absent or late, and nobody else', async () => {
    const res = await register([
      { id: '11111111-1111-4111-8111-111111111111', status: 'absent' },
      { id: '22222222-2222-4222-8222-222222222222', status: 'late', arrivalTime: '08:20:00' },
      { id: '33333333-3333-4333-8333-333333333333', status: 'present' },
    ]);
    expect(res.status).toBe(200);
    expect(told.attendance.map((t) => [t.studentId, t.status, t.isoDate])).toEqual([
      ['11111111-1111-4111-8111-111111111111', 'absent', '2026-11-04'],
      ['22222222-2222-4222-8222-222222222222', 'late', '2026-11-04'],
    ]);
  });

  it('does not invent an arrival time for a child who was not given one', async () => {
    await register([{ id: '33333333-3333-4333-8333-333333333333', status: 'present' }]);
    expect(tables.attendance_records[0].check_in_time).toBeNull();
  });

  it('refuses to record a day when no session and term are current, rather than inventing them', async () => {
    tables.academic_terms = [];
    const res = await register([{ id: '11111111-1111-4111-8111-111111111111', status: 'absent' }]);
    expect(res.status).toBe(409);
    expect(tables.attendance_records).toHaveLength(0);
    expect(told.attendance).toHaveLength(0);
  });

  it('refuses a date that is not a date', async () => {
    const res = await register([{ id: '11111111-1111-4111-8111-111111111111', status: 'absent' }], { date: 'yesterday' });
    expect(res.status).toBe(400);
  });
});

describe('Notices', () => {
  const send = (body: Row) => communications.POST(post('/api/communications', { subject: 'Resumption', message: 'School resumes Monday.', ...body }));

  it('sends to the guardians of every active student when the audience is all parents', async () => {
    const res = await send({ audience: 'all_parents', recipientsGroup: 'All Guardians', recipientCount: 999 });
    const json = await res.json();
    expect(told.broadcasts[0].studentIds).toHaveLength(3);
    // the count is what the school's records give, not the number the page sent
    expect(json.record.recipientCount).toBe(3);
    expect(json.messages).toEqual({ queued: 3, skipped: 0 });
  });

  it('sends to one class only', async () => {
    await send({ audience: 'class', className: 'JSS 1 A', recipientsGroup: 'JSS 1 A Guardians' });
    expect(told.broadcasts[0].studentIds.sort()).toEqual(['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']);
  });

  it('posts nothing when the class does not exist', async () => {
    const res = await send({ audience: 'class', className: 'Nowhere', recipientsGroup: 'Nowhere Guardians' });
    expect(res.status).toBe(404);
    expect(tables.notifications).toHaveLength(0);
    expect(told.broadcasts).toHaveLength(0);
  });

  it('sends no parent messages for a staff notice', async () => {
    await send({ audience: 'all_staff', recipientsGroup: 'All Staff', recipientCount: 4 });
    expect(told.broadcasts).toHaveLength(0);
  });
});
