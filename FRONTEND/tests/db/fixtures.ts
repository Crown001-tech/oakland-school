import type { PGlite } from '@electric-sql/pglite';

/** Inserts rows as the database owner (bypassing RLS) and returns the new ids. */

export async function insertSchool(db: PGlite, code: string, settings: Record<string, unknown>): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO public.schools (name, code, slug, settings) VALUES ($1, $2, $3, $4) RETURNING id`,
    [`Test School ${code}`, code, code.toLowerCase(), JSON.stringify(settings)]
  );
  return rows[0].id;
}

export async function insertSession(db: PGlite, schoolId: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO public.academic_sessions (school_id, name, start_date, end_date, is_current)
     VALUES ($1, '2026/2027', '2026-09-01', '2027-07-31', TRUE) RETURNING id`,
    [schoolId]
  );
  return rows[0].id;
}

export async function insertClass(db: PGlite, schoolId: string, name: string, gradeLevel: number): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO public.classes (school_id, name, grade_level) VALUES ($1, $2, $3) RETURNING id`,
    [schoolId, name, gradeLevel]
  );
  return rows[0].id;
}

let admissionSeq = 0;

export async function insertStudent(
  db: PGlite,
  schoolId: string,
  opts: { classId?: string; sessionId?: string } = {}
): Promise<string> {
  admissionSeq += 1;
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO public.students (school_id, admission_number, first_name, last_name, gender)
     VALUES ($1, $2, 'Test', $3, 'female') RETURNING id`,
    [schoolId, `TST-${admissionSeq}`, `Student ${admissionSeq}`]
  );
  const studentId = rows[0].id;
  if (opts.classId && opts.sessionId) {
    await db.query(
      `INSERT INTO public.class_enrollments (student_id, class_id, session_id, status) VALUES ($1, $2, $3, 'active')`,
      [studentId, opts.classId, opts.sessionId]
    );
  }
  return studentId;
}

export async function insertGuardian(
  db: PGlite,
  schoolId: string,
  email: string,
  userId: string,
  studentIds: string[]
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO public.guardians (school_id, first_name, last_name, email, phone, relationship, user_id)
     VALUES ($1, 'Test', 'Guardian', $2, '', 'parent', $3) RETURNING id`,
    [schoolId, email, userId]
  );
  for (const studentId of studentIds) {
    await db.query(`INSERT INTO public.student_guardians (student_id, guardian_id) VALUES ($1, $2)`, [
      studentId,
      rows[0].id,
    ]);
  }
  return rows[0].id;
}
