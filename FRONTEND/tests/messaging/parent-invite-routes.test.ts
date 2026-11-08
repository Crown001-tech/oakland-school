import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createFakeDb, type Row } from '../helpers/fake-db';

// Inviting parents: the whole list at once, and the list of who has an account.

let tables: Record<string, Row[]>;

vi.mock('@/lib/caller', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/caller')>()),
  getAuthenticatedActor: async () => ({ userId: 'u1', email: 'head@example.test', role: 'principal', hasSession: true, actorName: 'The Head', actorRoleLabel: 'Principal' }),
}));
vi.mock('@/lib/school-db', async () => ({
  getSchoolDb: async () => {
    const db = createFakeDb(tables, {
      unique: { message_outbox: ['school_id', 'event_key'] },
      embeds: { student_guardians: { students: { table: 'students', from: 'student_id', to: 'id' } } },
    });
    const raw = db.from;
    // The school client stamps its school on every insert
    db.from = (t: string) => {
      const b = raw(t);
      const insert = b.insert;
      b.insert = (p: any, ...rest: any[]) => insert(Array.isArray(p) ? p.map((r) => ({ school_id: 'school-1', ...r })) : { school_id: 'school-1', ...p }, ...rest);
      const upsert = b.upsert;
      b.upsert = (p: any, o: any) => upsert(Array.isArray(p) ? p.map((r) => ({ school_id: 'school-1', ...r })) : { school_id: 'school-1', ...p }, o);
      return b;
    };
    return Object.assign(db, { schoolId: 'school-1' });
  },
}));

const route = await import('@/app/api/parent-invites/route');

const post = (body: Row) => route.POST(new NextRequest('https://greenfield.example.com/api/parent-invites', { method: 'POST', body: JSON.stringify(body), headers: { host: 'greenfield.example.com' } }));

beforeEach(() => {
  const future = new Date(Date.now() + 86400000).toISOString();
  tables = {
    schools: [{ id: 'school-1', name: 'Greenfield College' }],
    students: [{ id: 's1', first_name: 'Ada', last_name: 'Obi' }, { id: 's2', first_name: 'Ben', last_name: 'Eze' }, { id: 's3', first_name: 'Cy', last_name: 'Bello' }, { id: 's4', first_name: 'Di', last_name: 'Ola' }],
    guardians: [
      { id: 'g1', first_name: 'Ada', last_name: 'Obi', phone: '0803 123 4567', email: 'ada@example.test', user_id: null },
      { id: 'g2', first_name: 'Ben', last_name: 'Eze', phone: '0805 555 6666', email: 'parent.1700.1@student.example.ng', user_id: null },
      { id: 'g3', first_name: 'Cy', last_name: 'Bello', phone: '0807 777 8888', email: 'cy@example.test', user_id: 'user-3' },
      { id: 'g4', first_name: 'Di', last_name: 'Ola', phone: '—', email: 'parent.1700.2@student.example.ng', user_id: null },
      { id: 'g5', first_name: 'Left', last_name: 'Over', phone: '0809 999 0000', email: 'left@example.test', user_id: null },
      { id: 'g6', first_name: 'Already', last_name: 'Invited', phone: '0810 000 1111', email: 'inv@example.test', user_id: null },
    ],
    student_guardians: [
      { guardian_id: 'g1', student_id: 's1' },
      { guardian_id: 'g2', student_id: 's2' },
      { guardian_id: 'g3', student_id: 's3' },
      { guardian_id: 'g4', student_id: 's4' },
      { guardian_id: 'g6', student_id: 's1' },
    ],
    parent_invites: [{ id: 'i1', guardian_id: 'g6', token_hash: 'x', expires_at: future, used_at: null }],
    message_outbox: [],
    message_opt_outs: [],
    audit_logs: [],
  };
});

describe('Inviting every parent', () => {
  it('invites only parents with a child, no account, no open invite, and a phone or email to send to', async () => {
    const res = await post({ all: true });
    const json = await res.json();
    // g1 and g2 have a child, no account, no open invite and a number; g3 has an account; g4 has nowhere to send; g5 has no child; g6 is already invited
    expect(json.data).toMatchObject({ queued: 2, skipped: 0, failed: 0, nobodyToSendTo: 1 });
    expect(tables.parent_invites.filter((i) => i.id !== 'i1').map((i) => i.guardian_id).sort()).toEqual(['g1', 'g2']);
    expect(tables.message_outbox.map((m) => m.event).every((e) => e === 'parent_invite')).toBe(true);
    expect(tables.message_outbox).toHaveLength(2);
  });

  it('puts a working link in each message and never stores the link itself', async () => {
    await post({ all: true });
    const body = String(tables.message_outbox[0].body);
    expect(body).toMatch(/https:\/\/greenfield\.example\.com\/activate\/parent\?token=/);
    const stored = JSON.stringify(tables.parent_invites);
    const token = body.match(/token=([\w-]+)/)![1];
    expect(stored).not.toContain(token);
  });

  it('does nothing the second time', async () => {
    await post({ all: true });
    const again = await (await post({ all: true })).json();
    expect(again.data.queued).toBe(0);
    expect(tables.message_outbox).toHaveLength(2);
  });
});

describe('The parents list', () => {
  it('counts only guardians who have a child at the school', async () => {
    const json = await (await route.GET()).json();
    expect(json.data.total).toBe(5);
    expect(json.data.activated).toBe(1);
    expect(json.data.parents.some((p: { name: string }) => p.name === 'Left Over')).toBe(false);
  });
});
