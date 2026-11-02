import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asRole, createMigratedDb, type JwtClaims } from './migrated-db';
import { insertClass, insertGuardian, insertSchool, insertSession, insertStudent } from './fixtures';

// The database itself keeps schools apart: these run the real policies as PostgREST would, for the public
// browser key (anon) and for signed-in people of two different schools.

let db: PGlite;
let schoolA: string;
let schoolB: string;
let studentA: string;
let studentB: string;
const teacherA: JwtClaims = { sub: randomUUID(), email: 'teacher.a@a.test' };
const teacherB: JwtClaims = { sub: randomUUID(), email: 'teacher.b@b.test' };
const parentA: JwtClaims = { sub: randomUUID(), email: 'parent.a@a.test' };
const stranger: JwtClaims = { sub: randomUUID(), email: 'nobody@x.test' };

const staff = async (school: string, c: JwtClaims) => {
  await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [c.sub, c.email]);
  return db.query(
    `INSERT INTO public.staff_profiles (school_id, user_id, employee_id, first_name, last_name, email, role) VALUES ($1, $2, $3, 'T', 'T', $4, 'teacher')`,
    [school, c.sub, `E-${c.sub!.slice(0, 6)}`, c.email]
  );
};

async function visible(role: 'anon' | 'authenticated', claims: JwtClaims, table: string): Promise<string[]> {
  return asRole(db, role, claims, async (tx) => {
    const { rows } = await tx.query<{ school_id: string }>(`SELECT school_id FROM public.${table}`);
    return [...new Set(rows.map((r) => r.school_id))].sort();
  });
}

beforeAll(async () => {
  db = await createMigratedDb();
  schoolA = await insertSchool(db, 'RLSA', {});
  schoolB = await insertSchool(db, 'RLSB', {});
  for (const [school, name] of [[schoolA, 'Year 7'], [schoolB, 'Year 8']] as const) {
    const session = await insertSession(db, school);
    const cls = await insertClass(db, school, name, 1);
    const student = await insertStudent(db, school, { classId: cls, sessionId: session });
    if (school === schoolA) studentA = student;
    else studentB = student;
    await db.query(`INSERT INTO public.fee_structures (school_id, class_name, term, total_amount) VALUES ($1, $2, 'First Term', 90000)`, [school, name]);
    await db.query(`INSERT INTO public.fee_transactions (school_id, student_id, amount, receipt_number, payment_method, status) VALUES ($1, $2, 1000, $3, 'Cash', 'successful')`, [school, student, `R-${name}`]);
  }
  await staff(schoolA, teacherA);
  await staff(schoolB, teacherB);
  await insertGuardian(db, schoolA, parentA.email!, parentA.sub!, [studentA]);
}, 180000);

describe('Signed-in people see only their own school', () => {
  it.each(['students', 'classes', 'class_enrollments', 'fee_structures', 'academic_sessions'])(
    'a teacher of school A sees only school A rows in %s',
    async (table) => {
      expect(await visible('authenticated', teacherA, table)).toEqual([schoolA]);
    }
  );

  it('a teacher of school B sees only school B', async () => {
    expect(await visible('authenticated', teacherB, 'students')).toEqual([schoolB]);
  });

  it('a parent of school A sees only school A, even where an older policy let everyone read', async () => {
    expect(await visible('authenticated', parentA, 'fee_structures')).toEqual([schoolA]);
    expect(await visible('authenticated', parentA, 'fee_transactions')).toEqual([schoolA]);
  });

  it('each person sees only their own school in the schools table', async () => {
    const rows = await asRole(db, 'authenticated', teacherA, async (tx) => (await tx.query<{ id: string }>(`SELECT id FROM public.schools`)).rows);
    expect(rows.map((r) => r.id)).toEqual([schoolA]);
  });
});

describe('Nobody else sees any school rows', () => {
  it('shows a visitor with only the public browser key nothing, even in tables with an open policy', async () => {
    for (const table of ['students', 'classes', 'fee_structures', 'fee_transactions', 'student_financial_accounts']) {
      expect(await visible('anon', {}, table), table).toEqual([]);
    }
    // The browser key is refused on the schools table outright, which is stricter than an empty result
    const schools = await asRole(db, 'anon', {}, async (tx) => (await tx.query(`SELECT id FROM public.schools`)).rows).catch(() => []);
    expect(schools).toEqual([]);
  });

  it('shows a signed-in person who belongs to no school nothing', async () => {
    expect(await visible('authenticated', stranger, 'students')).toEqual([]);
    expect(await visible('authenticated', stranger, 'fee_structures')).toEqual([]);
  });
});

describe('Nobody can write into another school', () => {
  it('refuses a teacher of school A adding a class to school B', async () => {
    await expect(
      asRole(db, 'authenticated', teacherA, (tx) => tx.query(`INSERT INTO public.classes (school_id, name, grade_level) VALUES ($1, 'Intruder', 9)`, [schoolB]))
    ).rejects.toThrow();
  });

  it('refuses a teacher of school A changing a school B row, changing nothing', async () => {
    const touched = await asRole(db, 'authenticated', teacherA, async (tx) => (await tx.query(`UPDATE public.classes SET capacity = 1 WHERE school_id = $1 RETURNING id`, [schoolB])).rows);
    expect(touched).toEqual([]);
    expect((await db.query<{ capacity: number | null }>(`SELECT capacity FROM public.classes WHERE school_id = $1`, [schoolB])).rows[0].capacity).not.toBe(1);
  });

  it('refuses the browser key adding a row anywhere', async () => {
    await expect(asRole(db, 'anon', {}, (tx) => tx.query(`INSERT INTO public.classes (school_id, name, grade_level) VALUES ($1, 'Intruder', 9)`, [schoolA]))).rejects.toThrow();
  });
});

describe('The server is not affected', () => {
  it('lets the service role, which the app\'s server uses, see every school', async () => {
    const seen = await asRole(db, 'service_role', {}, async (tx) => (await tx.query<{ school_id: string }>(`SELECT DISTINCT school_id FROM public.students`)).rows);
    expect(seen.map((r) => r.school_id).sort()).toEqual([schoolA, schoolB].sort());
  });
});
