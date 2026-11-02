import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asRole, createMigratedDb } from './migrated-db';
import { insertSchool } from './fixtures';

let db: PGlite;
let schoolId: string;

beforeAll(async () => {
  db = await createMigratedDb();
  schoolId = await insertSchool(db, 'REQ', {});
}, 120000);

const insert = (status: string, approach: string | null, days: number | null) =>
  db.query(
    `INSERT INTO public.custom_requests (school_id, title, status, approach, estimated_days) VALUES ($1, 'T', $2, $3, $4)`,
    [schoolId, status, approach, days]
  );

describe('custom_requests table', () => {
  it('accepts every known status and approach', async () => {
    for (const status of ['open', 'accepted', 'in_progress', 'done', 'declined']) await insert(status, null, null);
    for (const approach of ['setting', 'module', 'product_feature', 'custom_work']) await insert('open', approach, 1);
    expect((await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM public.custom_requests`)).rows[0].n).toBe(9);
  });

  it('rejects an unknown status, an unknown approach and negative days', async () => {
    await expect(insert('finished', null, null)).rejects.toThrow();
    await expect(insert('open', 'copy_the_code', null)).rejects.toThrow();
    await expect(insert('open', null, -1)).rejects.toThrow();
  });

  it('shows nothing to the browser or to a signed-in person with no role in the school', async () => {
    const stranger = { sub: randomUUID(), email: 'nobody@example.test' };
    const anon = await asRole(db, 'anon', {}, async (tx) => (await tx.query(`SELECT * FROM public.custom_requests`)).rows).catch(() => []);
    expect(anon).toEqual([]);
    const rows = await asRole(db, 'authenticated', stranger, async (tx) => (await tx.query(`SELECT * FROM public.custom_requests`)).rows);
    expect(rows).toEqual([]);
  });
});
