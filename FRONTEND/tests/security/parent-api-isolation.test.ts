import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// The API routes read with the service key, which bypasses row-level security, so each
// route's own family check is what stands between one parent and another family's child.
// These tests call the real route handlers with a signed-in parent and a stubbed database.

const CHILD_A = '11111111-1111-4111-8111-111111111111';
const CHILD_B = '22222222-2222-4222-8222-222222222222';

type Rows = Record<string, unknown>[];
const db = vi.hoisted(() => ({ fixtures: {} as Record<string, Rows>, queried: [] as string[] }));

// Chainable stand-in for the Supabase query builder: every filter returns the same builder,
// and awaiting it yields that table's fixture rows. Filters are deliberately ignored, so any
// family scoping in the response must come from the route itself.
function tableQuery(table: string): unknown {
  const rows = () => db.fixtures[table] ?? [];
  const builder: unknown = new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve({ data: rows(), error: null }).then(resolve, reject);
      }
      if (prop === 'maybeSingle' || prop === 'single') {
        return () => Promise.resolve({ data: rows()[0] ?? null, error: null });
      }
      return () => builder;
    },
  });
  return builder;
}

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      db.queried.push(table);
      return tableQuery(table);
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  }),
}));

vi.mock('@/lib/caller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/caller')>()),
  getCaller: vi.fn(),
  getLinkedStudentIds: vi.fn(),
  getOwnStudentId: vi.fn(),
}));

const caller = await import('@/lib/caller');
const attendanceRoute = await import('@/app/api/attendance/route');
const resultsRoute = await import('@/app/api/results/route');
const financesRoute = await import('@/app/api/finances/route');

function signInAs(role: string, linkedStudentIds: string[] = []) {
  vi.mocked(caller.getCaller).mockResolvedValue({
    userId: `user-${role}`,
    email: `${role}@example.test`,
    role,
    hasSession: true,
  });
  vi.mocked(caller.getLinkedStudentIds).mockResolvedValue(linkedStudentIds);
  vi.mocked(caller.getOwnStudentId).mockResolvedValue(null);
}

const student = (id: string, admission: string) => ({
  id,
  admission_number: admission,
  first_name: 'Test',
  last_name: admission,
  gender: 'female',
  status: 'active',
  class_enrollments: [{ id: `ce-${id}`, class_id: 'class-jss1', status: 'active', classes: { id: 'class-jss1', name: 'JSS 1' } }],
  student_guardians: [],
});

beforeEach(() => {
  db.queried = [];
  db.fixtures = {
    schools: [{ id: 'school-1', settings: { tuitionJSS: 100000, salaryPrincipal: 500000 } }],
    students: [student(CHILD_A, 'TST-A'), student(CHILD_B, 'TST-B')],
    student_financial_accounts: [
      { student_id: CHILD_A, total_billed: 100000, total_paid: 40000, outstanding_balance: 60000 },
      { student_id: CHILD_B, total_billed: 100000, total_paid: 70000, outstanding_balance: 30000 },
    ],
    fee_transactions: [
      { id: 'tx-a', student_id: CHILD_A, amount: 40000, receipt_number: 'REC-A', status: 'successful', created_at: '2026-10-01' },
      { id: 'tx-b', student_id: CHILD_B, amount: 70000, receipt_number: 'REC-B', status: 'successful', created_at: '2026-10-02' },
    ],
    attendance_records: [
      { id: 'att-a', student_id: CHILD_A, status: 'present', date: '2026-10-01' },
      { id: 'att-b', student_id: CHILD_B, status: 'absent', date: '2026-10-01' },
    ],
    staff_profiles: [{ id: 'staff-1', role: 'admin', first_name: 'Test', last_name: 'Principal', is_active: true }],
  };
});

describe('M0 exit gate: a parent cannot read another family’s child through the API', () => {
  it('attendance: refuses the other family’s child without touching attendance records', async () => {
    signInAs('parent', [CHILD_A]);
    const res = await attendanceRoute.GET(new NextRequest(`http://localhost/api/attendance?studentId=${CHILD_B}`));
    expect(res.status).toBe(403);
    expect(db.queried).not.toContain('attendance_records');
  });

  it('attendance: allows the parent’s own child', async () => {
    signInAs('parent', [CHILD_A]);
    const res = await attendanceRoute.GET(new NextRequest(`http://localhost/api/attendance?studentId=${CHILD_A}`));
    expect(res.status).toBe(200);
  });

  it('results: refuses the other family’s report card', async () => {
    signInAs('parent', [CHILD_A]);
    const res = await resultsRoute.GET(new NextRequest(`http://localhost/api/results?studentId=${CHILD_B}`));
    expect(res.status).toBe(403);
  });

  it('fees: returns only the parent’s own child and payments, and no school-wide finance data', async () => {
    signInAs('parent', [CHILD_A]);
    const res = await financesRoute.GET();
    expect(res.status).toBe(200);
    const { data } = await res.json();

    expect(data.studentLedger.map((s: { id: string }) => s.id)).toEqual([CHILD_A]);
    expect(data.payments.map((p: { id: string }) => p.id)).toEqual(['tx-a']);
    expect(JSON.stringify(data)).not.toContain(CHILD_B);
    for (const key of ['payrollRecords', 'expenditures', 'pettyCash', 'institutionalBankAccounts', 'salaryRates']) {
      expect(data).not.toHaveProperty(key);
    }
  });

  it('fees: a parent with no linked children sees an empty ledger', async () => {
    signInAs('parent', []);
    const { data } = await (await financesRoute.GET()).json();
    expect(data.studentLedger).toEqual([]);
    expect(data.payments).toEqual([]);
  });

  it('fees: refuses roles with no finance access', async () => {
    for (const role of ['teacher', 'student', 'security']) {
      signInAs(role);
      expect((await financesRoute.GET()).status).toBe(403);
    }
  });
});
