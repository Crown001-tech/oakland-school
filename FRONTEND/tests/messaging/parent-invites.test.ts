import crypto from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createMigratedDb } from '../db/migrated-db';
import { insertSchool } from '../db/fixtures';
import { pgSupabase } from '../helpers/pg-supabase';
import { scopeClient } from '@/lib/school-scope';
import { INVITE_DAYS, acceptInvite, createInvite, hashToken, previewInvite, realEmail, validPassword } from '@/lib/parent-invites';

// Invite links, against the real tables. Only the sign-in service is replaced: a small list of accounts.

let db: PGlite;
let admin: any;
let schoolA: string;
let schoolB: string;
const accounts = new Map<string, { id: string; email: string; password: string }>();
let placeholder = 0;

const authAdmin = {
  createUser: async ({ email, password, user_metadata }: any) => {
    if ([...accounts.values()].some((a) => a.email === email)) return { data: null, error: { message: 'A user with this email address has already been registered' } };
    const id = crypto.randomUUID();
    accounts.set(id, { id, email, password });
    // The real sign-in service keeps its accounts where the audit log can point at them
    await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [id, email]);
    return { data: { user: { id, email, user_metadata } }, error: null };
  },
  updateUserById: async (id: string, patch: any) => {
    const a = accounts.get(id);
    if (!a) return { data: null, error: { message: 'not found' } };
    if (patch.password) a.password = patch.password;
    return { data: { user: a }, error: null };
  },
};

const guardian = async (school: string, over: Record<string, unknown> = {}) => {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO public.guardians (school_id, first_name, last_name, email, phone, relationship) VALUES ($1, $2, 'Obi', $3, '08031234567', 'parent') RETURNING id`,
    [school, over.first ?? 'Ada', over.email ?? `parent.${Date.now()}.${++placeholder}@student.greenfield.invalid`]
  );
  return rows[0].id;
};
const dbFor = (school: string) => scopeClient(pgSupabase(db) as any, school);
const invites = async () => (await db.query<any>(`SELECT * FROM public.parent_invites ORDER BY created_at`)).rows;

beforeAll(async () => {
  db = await createMigratedDb();
  admin = Object.assign(pgSupabase(db), { auth: { admin: authAdmin } });
  schoolA = await insertSchool(db, 'INVA', {});
  schoolB = await insertSchool(db, 'INVB', {});
  await db.query(`UPDATE public.schools SET name = 'Greenfield College' WHERE id = $1`, [schoolA]);
}, 180000);

describe('Making an invite', () => {
  it('keeps only the hash of the token, and lets it work for 7 days', async () => {
    const g = await guardian(schoolA);
    const now = new Date('2026-11-04T10:00:00Z');
    const made = (await createInvite(dbFor(schoolA), g, 'Bursar Ade', now)) as { token: string; expiresAt: string };
    expect(made.token.length).toBeGreaterThanOrEqual(40);
    const row = (await invites()).find((i) => i.guardian_id === g)!;
    expect(row.token_hash).toBe(hashToken(made.token));
    expect(JSON.stringify(row)).not.toContain(made.token);
    expect(new Date(row.expires_at).getTime() - now.getTime()).toBe(INVITE_DAYS * 86400000);
    expect(row.created_by_name).toBe('Bursar Ade');
  });

  it('replaces an earlier invite that was not used, so only the newest link works', async () => {
    const g = await guardian(schoolA);
    const first = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    const second = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    expect((await invites()).filter((i) => i.guardian_id === g)).toHaveLength(1);
    expect((await previewInvite(admin, first.token)).valid).toBe(false);
    expect((await previewInvite(admin, second.token)).valid).toBe(true);
  });

  it('refuses a guardian who is not in the school', async () => {
    const other = await guardian(schoolB);
    expect(await createInvite(dbFor(schoolA), other, 'A')).toEqual({ error: 'Guardian not found.' });
  });
});

describe('The invite page', () => {
  it('shows the school and the parent\'s first name, and the email on record', async () => {
    const g = await guardian(schoolA, { first: 'Chika', email: 'chika@example.test' });
    const { token } = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    expect(await previewInvite(admin, token)).toEqual({ valid: true, schoolName: 'Greenfield College', firstName: 'Chika', email: 'chika@example.test' });
  });

  it('says nothing for a link that is wrong, expired or already used', async () => {
    const g = await guardian(schoolA);
    const { token } = (await createInvite(dbFor(schoolA), g, 'A', new Date('2026-01-01T00:00:00Z'))) as { token: string };
    expect((await previewInvite(admin, token, new Date('2026-02-01T00:00:00Z'))).valid).toBe(false);
    for (const bad of ['', 'short', 'x'.repeat(300), 'not-a-real-token-but-long-enough-1234']) expect((await previewInvite(admin, bad)).valid, bad).toBe(false);
  });
});

describe('Choosing a password', () => {
  it('creates the account with the parent\'s own password, links it to them, and uses the link up', async () => {
    const g = await guardian(schoolA, { first: 'Dayo', email: 'dayo@example.test' });
    const { token } = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    const result = await acceptInvite(admin, { token, password: 'MyOwn-Pass1' });
    expect(result).toEqual({ ok: true, email: 'dayo@example.test' });

    const acct = [...accounts.values()].find((a) => a.email === 'dayo@example.test')!;
    expect(acct.password).toBe('MyOwn-Pass1');
    const row = (await db.query<any>(`SELECT user_id, email FROM public.guardians WHERE id = $1`, [g])).rows[0];
    expect(row).toEqual({ user_id: acct.id, email: 'dayo@example.test' });
    expect((await invites()).find((i) => i.guardian_id === g)!.used_at).not.toBeNull();
    const log = (await db.query<any>(`SELECT * FROM public.audit_logs WHERE resource_id = $1 AND action = 'auth.parent_account_activated'`, [g])).rows;
    expect(log).toHaveLength(1);
    expect(log[0].school_id).toBe(schoolA);
  });

  it('works once only', async () => {
    const g = await guardian(schoolA, { email: 'once@example.test' });
    const { token } = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    expect((await acceptInvite(admin, { token, password: 'First-pass1' })).ok).toBe(true);
    const again = await acceptInvite(admin, { token, password: 'Second-pass2' });
    expect(again).toMatchObject({ ok: false, status: 410 });
    expect([...accounts.values()].find((a) => a.email === 'once@example.test')!.password).toBe('First-pass1');
  });

  it('is refused after 7 days', async () => {
    const g = await guardian(schoolA, { email: 'late@example.test' });
    const { token } = (await createInvite(dbFor(schoolA), g, 'A', new Date('2026-01-01T00:00:00Z'))) as { token: string };
    expect(await acceptInvite(admin, { token, password: 'Late-pass1' }, new Date('2026-01-09T00:00:00Z'))).toMatchObject({ ok: false, status: 410 });
  });

  it.each(['short1', 'alllettersnodigit', '12345678', '', null, 'a1'.repeat(40)])('refuses the password %s', async (password) => {
    const g = await guardian(schoolA, { email: 'weak@example.test' });
    const { token } = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    expect(await acceptInvite(admin, { token, password })).toMatchObject({ ok: false, status: 400 });
    expect((await invites()).find((i) => i.guardian_id === g)!.used_at).toBeNull();
  });

  it('asks for an email when the school has none on record, and uses the one given', async () => {
    const g = await guardian(schoolA);
    const { token } = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    expect(await acceptInvite(admin, { token, password: 'Good-pass1' })).toMatchObject({ ok: false, status: 400, message: expect.stringContaining('email') });
    expect(await acceptInvite(admin, { token, password: 'Good-pass1', email: ' New@Example.test ' })).toEqual({ ok: true, email: 'new@example.test' });
    expect((await db.query<any>(`SELECT email FROM public.guardians WHERE id = $1`, [g])).rows[0].email).toBe('new@example.test');
  });

  it('refuses an email another parent at the school already uses', async () => {
    await guardian(schoolA, { email: 'taken@example.test' });
    const g = await guardian(schoolA);
    const { token } = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    expect(await acceptInvite(admin, { token, password: 'Good-pass1', email: 'taken@example.test' })).toMatchObject({ ok: false, status: 409 });
  });
});

describe('Never taking over someone else\'s account', () => {
  it('refuses an email that already has an account that is not this parent\'s, and leaves its password alone', async () => {
    accounts.set('auth-principal', { id: 'auth-principal', email: 'principal@school.test', password: 'Principal-secret1' });
    const g = await guardian(schoolA);
    const { token } = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    const result = await acceptInvite(admin, { token, password: 'Attacker-pass1', email: 'principal@school.test' });
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(accounts.get('auth-principal')!.password).toBe('Principal-secret1');
    expect((await db.query<any>(`SELECT user_id FROM public.guardians WHERE id = $1`, [g])).rows[0].user_id).toBeNull();
    expect((await invites()).find((i) => i.guardian_id === g)!.used_at).toBeNull();
  });

  it('sets a new password on the account the guardian already has, and never changes its email', async () => {
    accounts.set('auth-mine', { id: 'auth-mine', email: 'mine@example.test', password: 'Old-pass1' });
    const g = await guardian(schoolA, { email: 'mine@example.test' });
    await db.query(`UPDATE public.guardians SET user_id = NULL WHERE id = $1`, [g]);
    // The guardian row is linked to the account, as it is after an earlier activation
    await db.query(`INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'x@y.test') ON CONFLICT DO NOTHING`);
    await db.query(`ALTER TABLE public.guardians DROP CONSTRAINT IF EXISTS guardians_user_id_fkey`);
    await db.query(`UPDATE public.guardians SET user_id = $2 WHERE id = $1`, [g, '00000000-0000-0000-0000-00000000a001']);
    accounts.set('00000000-0000-0000-0000-00000000a001', { id: '00000000-0000-0000-0000-00000000a001', email: 'mine@example.test', password: 'Old-pass1' });
    const { token } = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    expect(await acceptInvite(admin, { token, password: 'Brand-new1', email: 'someone-else@example.test' })).toMatchObject({ ok: true });
    expect(accounts.get('00000000-0000-0000-0000-00000000a001')).toMatchObject({ password: 'Brand-new1', email: 'mine@example.test' });
  });

  it('only ever touches the guardian the link was made for, in the school it was made for', async () => {
    const mine = await guardian(schoolA, { email: 'g-a@example.test' });
    const theirs = await guardian(schoolB, { email: 'g-b@example.test' });
    const { token } = (await createInvite(dbFor(schoolA), mine, 'A')) as { token: string };
    await acceptInvite(admin, { token, password: 'Good-pass1' });
    expect((await db.query<any>(`SELECT user_id FROM public.guardians WHERE id = $1`, [theirs])).rows[0].user_id).toBeNull();
  });
});

describe('Which email is real', () => {
  it('does not count the made-up address the system gives a guardian with no email', () => {
    expect(realEmail('Ada@Example.test')).toBe('ada@example.test');
    expect(realEmail('parent.1700000000.123@student.oakland.ng')).toBe('');
    expect(realEmail('x@student.greenfield.invalid')).toBe('');
    expect(realEmail('—')).toBe('');
    expect(realEmail(null)).toBe('');
  });

  it('shows the invite page no email when the one on record is made up, so the parent is asked', async () => {
    const g = await guardian(schoolA, { first: 'Femi' });
    const { token } = (await createInvite(dbFor(schoolA), g, 'A')) as { token: string };
    expect(await previewInvite(admin, token)).toMatchObject({ valid: true, email: null });
  });
});

describe('Passwords', () => {
  it('need 8 to 72 characters with a letter and a number', () => {
    expect(validPassword('abcdefg1')).toBe(true);
    expect(validPassword('abcdefg')).toBe(false);
    expect(validPassword('abcdefgh')).toBe(false);
    expect(validPassword('12345678')).toBe(false);
    expect(validPassword('a1' + 'x'.repeat(71))).toBe(false);
    expect(validPassword(undefined)).toBe(false);
  });
});
