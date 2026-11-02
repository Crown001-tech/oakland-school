import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { EXPENDITURE_CATEGORIES, PETTY_CASH_CATEGORIES } from '@/types/finance';

// Both finance portals total spending by category, so the API must store only the
// shared category names. Calls the real POST /api/finances handler with a stubbed database.

const db = vi.hoisted(() => ({ inserts: [] as { table: string; row: Record<string, unknown> }[] }));

// Routes reach the database through the school client; these tests exercise the route's own logic, so the
// school client here is the same fake database, with a school id. Scoping itself is tested in school-scope.test.ts.
vi.mock('@/lib/school-db', async () => {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  return { getSchoolDb: async () => Object.assign(getSupabaseAdmin(), { schoolId: 'a0000000-0000-0000-0000-000000000001' }) };
});

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    rpc: (_fn: string, args: { p_doc_type: string }) => Promise.resolve({ data: `${args.p_doc_type}-2026-0001`, error: null }),
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      Object.assign(builder, {
        select: chain,
        eq: chain,
        insert: (row: Record<string, unknown>) => {
          db.inserts.push({ table, row });
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: 'new-id', ...row }, error: null }) }),
            then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve),
          };
        },
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
      });
      return builder;
    },
  }),
}));

vi.mock('@/lib/caller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/caller')>()),
  getAuthenticatedActor: vi.fn().mockResolvedValue({
    userId: 'user-bursar',
    email: 'bursar@example.test',
    role: 'bursar',
    hasSession: true,
    actorName: 'Test Bursar',
    actorRoleLabel: 'Bursar',
    schoolId: 'school-1',
  }),
}));

const { POST } = await import('@/app/api/finances/route');

const post = (body: Record<string, unknown>) =>
  POST(new NextRequest('http://localhost/api/finances', { method: 'POST', body: JSON.stringify(body) }));

const insertedInto = (table: string) => db.inserts.filter((i) => i.table === table).map((i) => i.row);

beforeEach(() => {
  db.inserts = [];
});

describe('Expenditure vouchers', () => {
  it.each(EXPENDITURE_CATEGORIES)('stores the shared category "%s" unchanged', async (category) => {
    const res = await post({ action: 'create_voucher', category, description: 'Generator fuel', amount: 1000 });
    expect(res.status).toBe(200);
    expect(insertedInto('expenditures')[0]).toMatchObject({ category, voucher_number: 'VCH-2026-0001' });
  });

  it.each([undefined, '', 'Diesel & Power', 'Miscellaneous'])('refuses category %j instead of inventing one', async (category) => {
    const res = await post({ action: 'create_voucher', category, description: 'Generator fuel', amount: 1000 });
    expect(res.status).toBe(400);
    expect(insertedInto('expenditures')).toEqual([]);
  });

  it('leaves vendor and payment account empty rather than inventing them', async () => {
    await post({ action: 'create_voucher', category: 'Power', description: 'Generator fuel', amount: 1000 });
    expect(insertedInto('expenditures')[0]).toMatchObject({ vendor: null, payment_account: null });
  });
});

describe('Petty cash', () => {
  it.each(PETTY_CASH_CATEGORIES)('stores the shared category "%s" unchanged', async (category) => {
    const res = await post({ action: 'create_petty_cash', category, description: 'Printer paper', amount: 500 });
    expect(res.status).toBe(200);
    expect(insertedInto('petty_cash')[0]).toMatchObject({ category, receipt_number: 'PC-2026-0001' });
  });

  it.each([undefined, 'Office Stationery'])('refuses category %j', async (category) => {
    const res = await post({ action: 'create_petty_cash', category, description: 'Printer paper', amount: 500 });
    expect(res.status).toBe(400);
    expect(insertedInto('petty_cash')).toEqual([]);
  });
});
