import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Parent invite links. The school sends a parent a link by WhatsApp; the parent opens it, confirms their
 * email, and chooses their own password. There is no shared or default password.
 *
 *   - The link carries a long random token. Only its hash is kept, so a copy of the database cannot be used to
 *     sign anyone up.
 *   - It works once and for 7 days. A new invite replaces older ones.
 *   - It can only create or activate the account of the guardian it was made for. It can never set the password of
 *     an account that already belongs to someone else, even if the parent types that person's email.
 */

export const INVITE_DAYS = 7;

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('base64url');

type Db = { from: (table: string) => any; schoolId: string };

/** Makes an invite for a guardian of the school and replaces any earlier one that was not used. */
export async function createInvite(db: Db, guardianId: string, createdByName: string, now: Date = new Date()): Promise<{ token: string; expiresAt: string } | { error: string }> {
  const { data: guardian } = await db.from('guardians').select('id').eq('id', guardianId).maybeSingle();
  if (!guardian) return { error: 'Guardian not found.' };
  await db.from('parent_invites').delete().eq('guardian_id', guardianId).is('used_at', null);
  const token = newToken();
  const expiresAt = new Date(now.getTime() + INVITE_DAYS * 86400000).toISOString();
  const { error } = await db.from('parent_invites').insert({ guardian_id: guardianId, token_hash: hashToken(token), expires_at: expiresAt, created_by_name: createdByName });
  if (error) return { error: error.message };
  return { token, expiresAt };
}

export function validPassword(p: unknown): p is string {
  return typeof p === 'string' && p.length >= 8 && p.length <= 72 && /[A-Za-z]/.test(p) && /\d/.test(p);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The system gives a guardian with no email a made-up address (parent.1700000000.123@student.example.ng, or one
 * ending .invalid). Nobody can read mail sent there, so it is not an email a parent can sign in with.
 */
export function realEmail(value: unknown): string {
  const e = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!EMAIL.test(e) || e.endsWith('.invalid') || /^parent[.-][\w.-]*@/.test(e)) return '';
  return e;
}

interface InviteRow {
  id: string;
  school_id: string;
  guardian_id: string;
  expires_at: string;
  used_at: string | null;
}

async function findInvite(admin: SupabaseClient, token: string): Promise<InviteRow | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
  const { data } = await admin.from('parent_invites').select('id, school_id, guardian_id, expires_at, used_at').eq('token_hash', hashToken(token)).maybeSingle();
  return (data as InviteRow) ?? null;
}

const usable = (i: InviteRow | null, now: Date): i is InviteRow => Boolean(i) && !i!.used_at && new Date(i!.expires_at).getTime() > now.getTime();

/** What the invite page shows: the school, and the guardian's first name and email if the school has them. */
export async function previewInvite(admin: SupabaseClient, token: string, now: Date = new Date()) {
  const invite = await findInvite(admin, token);
  if (!usable(invite, now)) return { valid: false as const };
  const [{ data: guardian }, { data: school }] = await Promise.all([
    admin.from('guardians').select('first_name, email').eq('id', invite.guardian_id).eq('school_id', invite.school_id).maybeSingle(),
    admin.from('schools').select('name').eq('id', invite.school_id).maybeSingle(),
  ]);
  if (!guardian) return { valid: false as const };
  return { valid: true as const, schoolName: String(school?.name ?? ''), firstName: String(guardian.first_name ?? ''), email: realEmail(guardian.email) || null };
}

export type AcceptResult = { ok: true; email: string } | { ok: false; status: number; message: string };

/** The parent chooses a password. Creates the account, or sets the password on this guardian's own account. */
export async function acceptInvite(admin: SupabaseClient, input: { token: string; password: unknown; email?: unknown }, now: Date = new Date()): Promise<AcceptResult> {
  const invite = await findInvite(admin, input.token);
  if (!usable(invite, now)) return { ok: false, status: 410, message: 'This link has expired or was already used. Ask the school for a new one.' };
  if (!validPassword(input.password)) return { ok: false, status: 400, message: 'Choose a password of at least 8 characters with a letter and a number.' };

  const { data: guardian } = await admin.from('guardians').select('id, school_id, first_name, last_name, email, user_id').eq('id', invite.guardian_id).eq('school_id', invite.school_id).maybeSingle();
  if (!guardian) return { ok: false, status: 404, message: 'This invite is no longer valid.' };

  const given = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const email = realEmail(given) || realEmail(guardian.email);
  if (!email) return { ok: false, status: 400, message: 'Enter your email address. It is what you will sign in with.' };

  // Another guardian at this school must not already use this email
  const { data: clash } = await admin.from('guardians').select('id').eq('school_id', invite.school_id).eq('email', email).neq('id', guardian.id).limit(1);
  if (clash && clash.length > 0) return { ok: false, status: 409, message: 'That email is already used by someone else at the school. Use another email.' };

  let userId: string | null = guardian.user_id ?? null;
  if (userId) {
    // This guardian already has an account: set its password, and never change whose email it is
    const { error } = await admin.auth.admin.updateUserById(userId, { password: input.password as string, email_confirm: true });
    if (error) return { ok: false, status: 500, message: 'Could not set the password. Try again.' };
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: input.password as string,
      email_confirm: true,
      user_metadata: { role: 'parent', school_id: invite.school_id, full_name: `${guardian.first_name} ${guardian.last_name}`.trim(), password_changed: true },
    });
    if (error || !data?.user) {
      // An account with this email already exists and is not this guardian's: it is never taken over
      const taken = /already|registered|exists/i.test(error?.message ?? '');
      return { ok: false, status: taken ? 409 : 500, message: taken ? 'That email already has an account. Use another email, or ask the school to help.' : 'Could not create your account. Try again.' };
    }
    userId = data.user.id;
  }

  const { error: linkError } = await admin.from('guardians').update({ user_id: userId, email }).eq('id', guardian.id).eq('school_id', invite.school_id);
  // The link stays usable if the account could not be tied to the parent, so they can try again
  if (linkError) return { ok: false, status: 500, message: 'Could not finish setting up your account. Try the link again.' };
  await admin.from('parent_invites').update({ used_at: now.toISOString() }).eq('id', invite.id);
  await admin.from('audit_logs').insert({ school_id: invite.school_id, actor_id: userId, actor_name: `${guardian.first_name} ${guardian.last_name}`.trim(), actor_role: 'Parent', action: 'auth.parent_account_activated', resource_type: 'guardians', resource_id: guardian.id, metadata: { summary: 'A parent set up their account from an invite link' } });
  return { ok: true, email };
}
