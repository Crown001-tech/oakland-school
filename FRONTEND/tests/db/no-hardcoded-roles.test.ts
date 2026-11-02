import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asRole, createMigratedDb } from './migrated-db';
import { insertSchool } from './fixtures';

// A role must come from the school's own records. No email address may grant one.

let db: PGlite;
let schoolId: string;

const hasRole = (claims: { sub: string; email: string }, roles: string[]) =>
  asRole(db, 'authenticated', claims, async (tx) => {
    const { rows } = await tx.query<{ ok: boolean }>(`SELECT public.current_user_has_role($1::text[], $2) AS ok`, [roles, schoolId]);
    return rows[0].ok;
  });

beforeAll(async () => {
  db = await createMigratedDb();
  schoolId = await insertSchool(db, 'ROLE', {});
}, 120000);

describe('current_user_has_role', () => {
  it('gives the old hardcoded proprietor email no role', async () => {
    expect(await hasRole({ sub: randomUUID(), email: 'proprietor@oaklandschool.com.ng' }, ['proprietor'])).toBe(false);
  });

  it('still honours a staff record with that role in that school', async () => {
    const userId = randomUUID();
    await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'bursar@example.test')`, [userId]);
    await db.query(
      `INSERT INTO public.staff_profiles (school_id, user_id, employee_id, first_name, last_name, email, role, is_active)
       VALUES ($1, $2, 'R-1', 'Test', 'Bursar', 'bursar@example.test', 'bursar', TRUE)`,
      [schoolId, userId]
    );
    expect(await hasRole({ sub: userId, email: 'bursar@example.test' }, ['bursar'])).toBe(true);
    expect(await hasRole({ sub: userId, email: 'bursar@example.test' }, ['proprietor'])).toBe(false);
  });

  it('gives a stranger no role', async () => {
    expect(await hasRole({ sub: randomUUID(), email: 'nobody@example.test' }, ['proprietor', 'admin', 'bursar', 'teacher'])).toBe(false);
  });
});
