/**
 * Verified role resolution, safe for both Edge middleware and Node route handlers.
 *
 * A role is trusted only when it comes from one of two places:
 *   1. `app_metadata.role` on the Supabase user (writable only with the service key), or
 *   2. the `oakland_auth_role` cookie, which is HMAC-signed and bound to the user id.
 *
 * `user_metadata` is writable by the signed-in user and an unsigned role cookie can be typed
 * into any HTTP client, so neither is ever treated as proof of a role.
 */

export const ROLE_COOKIE = 'oakland_auth_role';
export const ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const VALID_ROLES = [
  'proprietor',
  'admin',
  'principal',
  'bursar',
  'teacher',
  'parent',
  'student',
  'security',
] as const;

export type VerifiedRole = (typeof VALID_ROLES)[number];

const encoder = new TextEncoder();

function isValidRole(value: unknown): value is VerifiedRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value);
}

function getSecret(): string | undefined {
  return process.env.AUTH_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || undefined;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Builds the cookie value `role.userId.expiresAt.signature` for a freshly authenticated user. */
export async function signRoleCookie(role: string, userId: string): Promise<string> {
  const secret = getSecret();
  if (!secret) {
    throw new Error('Missing AUTH_COOKIE_SECRET or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  }
  if (!isValidRole(role)) {
    throw new Error(`Unsupported role "${role}"`);
  }
  const expiresAt = Date.now() + ROLE_COOKIE_MAX_AGE * 1000;
  const payload = `${role}.${userId}.${expiresAt}`;
  return `${payload}.${await sign(payload, secret)}`;
}

/** Returns the role carried by a role cookie only if its signature is valid, unexpired, and for this user. */
export async function verifyRoleCookie(
  value: string | undefined,
  userId: string | undefined
): Promise<VerifiedRole | undefined> {
  const secret = getSecret();
  if (!value || !userId || !secret) return undefined;
  const parts = value.split('.');

  // Timestamped format: role.userId.expiresAt.signature
  if (parts.length === 4) {
    const [role, cookieUserId, expiresAtStr, signature] = parts;
    if (!isValidRole(role) || cookieUserId !== userId) return undefined;
    const expiresAt = Number(expiresAtStr);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return undefined; // Cookie has expired
    }
    const expected = await sign(`${role}.${cookieUserId}.${expiresAtStr}`, secret);
    return timingSafeEqual(signature, expected) ? role : undefined;
  }

  // Legacy 3-part format: role.userId.signature
  if (parts.length === 3) {
    const [role, cookieUserId, signature] = parts;
    if (!isValidRole(role) || cookieUserId !== userId) return undefined;
    const expected = await sign(`${role}.${cookieUserId}`, secret);
    return timingSafeEqual(signature, expected) ? role : undefined;
  }

  return undefined;
}

/** Resolves the trusted role for an already-verified Supabase user. */
export async function resolveVerifiedRole(
  user: { id: string; app_metadata?: Record<string, unknown> | null } | null | undefined,
  roleCookieValue: string | undefined
): Promise<VerifiedRole | undefined> {
  if (!user) return undefined;
  const appRole = user.app_metadata?.role;
  if (isValidRole(appRole)) return appRole;
  return verifyRoleCookie(roleCookieValue, user.id);
}

export function roleCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: ROLE_COOKIE_MAX_AGE,
  };
}
