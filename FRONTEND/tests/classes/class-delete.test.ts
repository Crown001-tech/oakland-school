import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Runs the real delete route against a small in-memory database.

type Row = Record<string, any>;
const db = vi.hoisted(() => ({ tables: {} as Record<string, Row[]> }));

function fakeTable(name: string) {
  const state: { op: 'select' | 'update' | 'delete' | 'insert'; filters: ((r: Row) => boolean)[]; payload?: any } = { op: 'select', filters: [] };
  const rows = () => (db.tables[name] ??= []);
  const matching = () => rows().filter((r) => state.filters.every((f) => f(r)));
  const run = () => {
    if (state.op === 'update') {
      matching().forEach((r) => Object.assign(r, state.payload));
      return { data: null, error: null, count: null };
    }
    if (state.op === 'delete') {
      const gone = new Set(matching());
      db.tables[name] = rows().filter((r) => !gone.has(r));
      return { data: null, error: null, count: null };
    }
    if (state.op === 'insert') {
      rows().push(state.payload);
      return { data: null, error: null, count: null };
    }
    const hits = matching();
    return { data: hits, error: null, count: hits.length };
  };
  const builder: any = {
    select: () => builder,
    eq: (col: string, val: unknown) => (state.filters.push((r) => r[col] === val), builder),
    update: (payload: Row) => ((state.op = 'update'), (state.payload = payload), builder),
    delete: () => ((state.op = 'delete'), builder),
    insert: (payload: Row) => ((state.op = 'insert'), (state.payload = payload), builder),
    maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
  };
  return builder;
}

vi.mock('@/lib/school-db', async () => ({
  getSchoolDb: async () => ({ schoolId: 'school-1', from: (name: string) => fakeTable(name) }),
}));

const route = await import('@/app/api/classes/route');
const remove = (id?: string) => route.DELETE(new NextRequest(`http://localhost/api/classes${id ? `?id=${id}` : ''}`, { method: 'DELETE' }));

beforeEach(() => {
  db.tables = {
    classes: [
      { id: 'c-empty', name: 'Primary 6 Diamond' },
      { id: 'c-full', name: 'JSS 1' },
      { id: 'c-past', name: 'JSS 2' },
    ],
    class_enrollments: [
      { id: 'e1', class_id: 'c-full', status: 'active' },
      { id: 'e2', class_id: 'c-past', status: 'withdrawn' },
    ],
    staff_profiles: [
      { id: 't1', assigned_class: 'Primary 6 Diamond' },
      { id: 't2', assigned_class: 'JSS 1' },
    ],
    audit_logs: [],
  };
});

describe('Deleting a class', () => {
  it('deletes a class with no students, clears it as a teacher\'s own class, and records it', async () => {
    const res = await remove('c-empty');
    expect(res.status).toBe(200);
    expect(db.tables.classes.map((c) => c.id)).toEqual(['c-full', 'c-past']);
    expect(db.tables.staff_profiles.find((t) => t.id === 't1')!.assigned_class).toBeNull();
    expect(db.tables.staff_profiles.find((t) => t.id === 't2')!.assigned_class).toBe('JSS 1');
    expect(db.tables.audit_logs[0]).toMatchObject({ action: 'CLASS_DELETED', resource_id: 'c-empty' });
  });

  it('keeps a class that has students, and says how many', async () => {
    const res = await remove('c-full');
    expect(res.status).toBe(409);
    expect((await res.json()).message).toContain('1 student');
    expect(db.tables.classes.map((c) => c.id)).toContain('c-full');
  });

  it('keeps a class whose students have left, because their records belong to it', async () => {
    const res = await remove('c-past');
    expect(res.status).toBe(409);
    expect(db.tables.classes.map((c) => c.id)).toContain('c-past');
  });

  it('answers 404 for a class that is not there, and 400 when no class is chosen', async () => {
    expect((await remove('missing')).status).toBe(404);
    expect((await remove()).status).toBe(400);
  });
});
