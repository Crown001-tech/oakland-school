import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asRole, createMigratedDb } from './migrated-db';
import { insertSchool } from './fixtures';

// POST /api/scores saves one class and subject with merge_school_settings (DEF-113). These tests run
// the real function to show that concurrent teachers, and unrelated settings, survive each other.

let db: PGlite;
let schoolId: string;

const entry = (name: string, exam: number, isLocked = false) => ({
  subject_scores: { [name]: { scores: [{ id: 's1', ca1: 10, ca2: 10, exam }], isLocked, submittedBy: 'Test Teacher' } },
});

const merge = (patch: Record<string, unknown>) =>
  asRole(db, 'service_role', {}, (tx) => tx.query(`SELECT public.merge_school_settings($1, $2::jsonb)`, [schoolId, JSON.stringify(patch)]));

const settings = async () =>
  (await db.query<{ settings: Record<string, any> }>(`SELECT settings FROM public.schools WHERE id = $1`, [schoolId])).rows[0].settings;

beforeAll(async () => {
  db = await createMigratedDb();
  schoolId = await insertSchool(db, 'MRG', { tuitionJSS: 100000, classCapacity: 40 });
}, 120000);

describe('merge_school_settings', () => {
  it('keeps both teachers’ scores when they submit different subjects', async () => {
    await Promise.all([merge(entry('JSS 1_Mathematics', 55)), merge(entry('JSS 1_English Language', 41))]);
    const s = await settings();
    expect(Object.keys(s.subject_scores).sort()).toEqual(['JSS 1_English Language', 'JSS 1_Mathematics']);
    expect(s.subject_scores['JSS 1_Mathematics'].scores[0].exam).toBe(55);
    expect(s.subject_scores['JSS 1_English Language'].scores[0].exam).toBe(41);
  });

  it('leaves unrelated settings alone', async () => {
    const s = await settings();
    expect(s.tuitionJSS).toBe(100000);
    expect(s.classCapacity).toBe(40);
  });

  it('replaces the saved scores for a subject when it is submitted again, without leftovers', async () => {
    await merge({ subject_scores: { 'JSS 1_Mathematics': { scores: [{ id: 's1', ca1: 12, ca2: 14, exam: 60 }, { id: 's2', ca1: 1, ca2: 2, exam: 3 }], isLocked: true, submittedBy: 'Test Teacher' } } });
    const s = await settings();
    expect(s.subject_scores['JSS 1_Mathematics'].scores).toHaveLength(2);
    expect(s.subject_scores['JSS 1_Mathematics'].isLocked).toBe(true);
    expect(s.subject_scores['JSS 1_English Language'].scores).toHaveLength(1);
  });

  it('cannot be called from the browser', async () => {
    await expect(
      asRole(db, 'authenticated', { sub: crypto.randomUUID() }, (tx) => tx.query(`SELECT public.merge_school_settings($1, '{}'::jsonb)`, [schoolId]))
    ).rejects.toThrow('permission denied');
  });
});
