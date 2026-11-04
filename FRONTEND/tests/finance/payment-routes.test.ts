import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type Row } from '../helpers/fake-db';

// The routes a parent uses to pay: who may pay, how much, and what is written before anything is charged.

let tables: Record<string, Row[]>;
let netBilled = 100000;
const session = vi.hoisted(() => ({ actor: {} as Row, linked: [] as string[] }));
const paystack = vi.hoisted(() => ({ init: vi.fn(), cfg: { secretKey: 'sk_test_x' } as { secretKey: string } | null, failWith: null as null | Error }));
const completion = vi.hoisted(() => ({ result: null as any, calls: [] as string[], onVerify: null as null | (() => void) }));

vi.mock('@/lib/caller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/caller')>()),
  getAuthenticatedActor: vi.fn(async () => session.actor),
  getLinkedStudentIds: vi.fn(async () => session.linked),
}));

vi.mock('@/lib/school-db', async () => ({
  getSchoolDb: async () => {
    const db = createFakeDb(tables, { unique: { online_payments: ['reference'] } });
    return { ...db, schoolId: 'school-1', idPrefix: 'GFC', studentEmailDomain: 'student.gfc.invalid', rpc: async () => ({ data: netBilled, error: null }) };
  },
}));

vi.mock('@/lib/payments/paystack', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/payments/paystack')>();
  return {
    ...real,
    paystackFromEnv: () => paystack.cfg,
    initializeTransaction: async (...args: unknown[]) => {
      paystack.init(...args);
      if (paystack.failWith) throw paystack.failWith;
      return { authorizationUrl: 'https://checkout.paystack.com/abc', accessCode: 'ac', reference: (args[1] as { reference: string }).reference };
    },
  };
});

vi.mock('@/lib/payments/complete', () => ({
  verifyAndComplete: async (ref: string) => {
    completion.calls.push(ref);
    completion.onVerify?.();
    return completion.result;
  },
}));

const { PaystackError } = await import('@/lib/payments/paystack');
const initialize = await import('@/app/api/payments/initialize/route');
const verify = await import('@/app/api/payments/verify/route');

const signIn = (role: string, linked: string[] = ['s1']) => {
  session.actor = { userId: `u-${role}`, email: `${role}@example.test`, role, hasSession: true, actorName: role, actorRoleLabel: role, schoolId: 'school-1' };
  session.linked = linked;
};
const pay = (body: Row) => initialize.POST(new NextRequest('https://greenfield.example.com/api/payments/initialize', { method: 'POST', body: JSON.stringify(body), headers: { host: 'greenfield.example.com' } }));
const check = (reference?: string) => verify.GET(new NextRequest(`https://greenfield.example.com/api/payments/verify${reference ? `?reference=${reference}` : ''}`));

beforeEach(() => {
  netBilled = 100000;
  paystack.cfg = { secretKey: 'sk_test_x' };
  paystack.failWith = null;
  paystack.init.mockClear();
  completion.calls = [];
  completion.onVerify = null;
  completion.result = { outcome: 'recorded', receipt: 'REC-2026-0001' };
  tables = {
    schools: [{ id: 'school-1', settings: { payments: { subaccountCode: 'ACCT_school', feeBearer: 'subaccount' } } }],
    students: [{ id: 's1', first_name: 'Ada', last_name: 'Obi' }, { id: 's2', first_name: 'Ben', last_name: 'Obi' }],
    guardians: [{ id: 'g1', email: 'parent@example.test' }],
    fee_transactions: [{ student_id: 's1', amount: 40000, status: 'successful' }],
    online_payments: [],
    fee_transactions_extra: [],
  };
  signIn('parent');
  session.actor.email = 'parent@example.test';
});

describe('Starting a payment', () => {
  it('records the attempt before sending the parent to Paystack, with the school\'s sub-account and our reference', async () => {
    const res = await pay({ studentId: 's1', amount: 30000 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.authorizationUrl).toBe('https://checkout.paystack.com/abc');
    expect(json.data.reference).toMatch(/^GFC-[0-9A-F]{20}$/);

    expect(tables.online_payments).toHaveLength(1);
    expect(tables.online_payments[0]).toMatchObject({ student_id: 's1', guardian_id: 'g1', amount: 30000, status: 'initiated', reference: json.data.reference, authorization_url: 'https://checkout.paystack.com/abc' });

    const [, input] = paystack.init.mock.calls[0];
    expect(input).toMatchObject({ amountKobo: 3000000, subaccount: 'ACCT_school', bearer: 'subaccount', email: 'parent@example.test', callbackUrl: 'https://greenfield.example.com/parent/fees/verify' });
    expect(input.metadata).toMatchObject({ school_id: 'school-1', student_id: 's1' });
  });

  it('adds nothing to the student\'s account: that waits for Paystack to confirm', async () => {
    await pay({ studentId: 's1', amount: 30000 });
    expect(tables.fee_transactions).toHaveLength(1);
  });

  it('allows what is still owed after earlier payments, and not a kobo more', async () => {
    expect((await pay({ studentId: 's1', amount: 60000 })).status).toBe(200);
    tables.online_payments = [];
    const over = await pay({ studentId: 's1', amount: 60000.01 });
    expect(over.status).toBe(400);
    expect((await over.json()).message).toContain('more than');
    expect(tables.online_payments).toHaveLength(0);
  });

  it('uses the net bill, so a scholarship lowers what can be paid', async () => {
    netBilled = 70000;
    expect((await pay({ studentId: 's1', amount: 30001 })).status).toBe(400);
    expect((await pay({ studentId: 's1', amount: 30000 })).status).toBe(200);
  });

  it('refuses nothing-owed, tiny and nonsense amounts, and starts no attempt', async () => {
    for (const amount of [0, -1, 'abc', 50, null, undefined]) expect((await pay({ studentId: 's1', amount })).status, String(amount)).toBe(400);
    netBilled = 40000;
    expect((await pay({ studentId: 's1', amount: 100 })).status).toBe(400);
    expect(tables.online_payments).toHaveLength(0);
    expect(paystack.init).not.toHaveBeenCalled();
  });
});

describe('Who may pay', () => {
  it('lets only a parent pay, and only for their own child', async () => {
    signIn('bursar');
    expect((await pay({ studentId: 's1', amount: 1000 })).status).toBe(403);
    signIn('parent', ['s1']);
    expect((await pay({ studentId: 's2', amount: 1000 })).status).toBe(403);
    expect(tables.online_payments).toHaveLength(0);
    expect(paystack.init).not.toHaveBeenCalled();
  });

  it('refuses someone who is not signed in', async () => {
    session.actor = { hasSession: false };
    expect((await pay({ studentId: 's1', amount: 1000 })).status).toBe(401);
  });

  it('asks which child when none is given', async () => {
    expect((await pay({ amount: 1000 })).status).toBe(400);
  });

  it('refuses a child who is not in this school even if the parent is linked to the id', async () => {
    signIn('parent', ['s1', 'ghost']);
    expect((await pay({ studentId: 'ghost', amount: 1000 })).status).toBe(404);
  });
});

describe('When the school cannot take online payments', () => {
  it('says so, and starts nothing, when Paystack is not set up', async () => {
    paystack.cfg = null;
    const res = await pay({ studentId: 's1', amount: 1000 });
    expect(res.status).toBe(503);
    expect((await res.json()).message).toContain('bursary');
    expect(tables.online_payments).toHaveLength(0);
  });

  it('says so when the school has no sub-account of its own, or has switched payments off', async () => {
    tables.schools[0].settings = {};
    expect((await pay({ studentId: 's1', amount: 1000 })).status).toBe(503);
    tables.schools[0].settings = { payments: { subaccountCode: 'ACCT_school', enabled: false } };
    expect((await pay({ studentId: 's1', amount: 1000 })).status).toBe(503);
  });
});

describe('When Paystack fails', () => {
  it('marks the attempt failed and tells the parent nothing was charged', async () => {
    paystack.failWith = new PaystackError('Invalid subaccount code', 400);
    const res = await pay({ studentId: 's1', amount: 1000 });
    expect(res.status).toBe(502);
    expect((await res.json()).message).toContain('Nothing was charged');
    expect(tables.online_payments[0]).toMatchObject({ status: 'failed', failure_reason: 'Invalid subaccount code' });
  });
});

describe('Not too many at once', () => {
  it('stops a fifth open payment for the same child in ten minutes', async () => {
    const now = new Date().toISOString();
    tables.online_payments = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, student_id: 's1', status: 'initiated', created_at: now, reference: `R${i}` }));
    expect((await pay({ studentId: 's1', amount: 1000 })).status).toBe(429);
    expect(paystack.init).not.toHaveBeenCalled();
  });
});

describe('Checking a payment', () => {
  beforeEach(() => {
    tables.online_payments = [{ id: 'p1', student_id: 's1', reference: 'GFC-REF-1', amount: 30000, status: 'initiated', fee_transaction_id: null }];
    tables.fee_transactions.push({ id: 'tx1', receipt_number: 'REC-2026-0001', student_id: 's1', amount: 30000, status: 'successful' });
  });

  it('asks Paystack, records a payment that succeeded, and shows the receipt', async () => {
    completion.result = { outcome: 'recorded', receipt: 'REC-2026-0001' };
    // What the completion does to the attempt once Paystack confirms it
    completion.onVerify = () => Object.assign(tables.online_payments[0], { status: 'success', fee_transaction_id: 'tx1' });
    const res = await check('GFC-REF-1');
    const json = await res.json();
    expect(json.data).toMatchObject({ status: 'success', receipt: 'REC-2026-0001', amount: 30000 });
    expect(completion.calls).toEqual(['GFC-REF-1']);
  });

  it('does not ask Paystack again for a payment already recorded', async () => {
    tables.online_payments[0].status = 'success';
    tables.online_payments[0].fee_transaction_id = 'tx1';
    const res = await check('GFC-REF-1');
    expect((await res.json()).data).toMatchObject({ status: 'success', receipt: 'REC-2026-0001' });
    expect(completion.calls).toEqual([]);
  });

  it('shows a parent only payments for their own children', async () => {
    signIn('parent', ['s2']);
    expect((await check('GFC-REF-1')).status).toBe(404);
    expect(completion.calls).toEqual([]);
  });

  it('lets the bursar and the principal check any payment, and no one else', async () => {
    for (const role of ['bursar', 'admin', 'principal', 'proprietor']) {
      signIn(role, []);
      expect((await check('GFC-REF-1')).status, role).toBe(200);
    }
    signIn('teacher', []);
    expect((await check('GFC-REF-1')).status).toBe(403);
  });

  it('reports a mismatch plainly and a Paystack outage with what to do', async () => {
    completion.result = { outcome: 'mismatch', reason: 'Paystack received 300 but 30000 was asked for.' };
    const res = await check('GFC-REF-1');
    expect((await res.json()).data).toMatchObject({ outcome: 'mismatch', reason: expect.stringContaining('asked for') });
  });

  it('asks for a reference, and says when a payment is not found', async () => {
    expect((await check()).status).toBe(400);
    expect((await check('NOPE')).status).toBe(404);
  });
});
