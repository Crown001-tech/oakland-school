import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const UNAMBIGUOUS_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Returns an authenticated Supabase service-role client.
 * Explicitly fails loudly if `SUPABASE_SERVICE_ROLE_KEY` is missing or
 * misconfigured as the public anon key (M0.2 security requirement).
 */
export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in server environment.');
  }

  if (!serviceRoleKey || serviceRoleKey.trim() === '') {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY in server environment. Refusing to fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  if (anonKey && serviceRoleKey.trim() === anonKey.trim()) {
    throw new Error(
      'Invalid SUPABASE_SERVICE_ROLE_KEY: matches NEXT_PUBLIC_SUPABASE_ANON_KEY. Configure the real service_role secret.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Generates a unique, per-person one-time password (`Oak-XXXXXX`) using
 * cryptographically random unambiguous characters.
 */
export function generateStaffTempPassword(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const idx = crypto.randomInt(0, UNAMBIGUOUS_CHARS.length);
    code += UNAMBIGUOUS_CHARS[idx];
  }
  return `Oak-${code}`;
}

/**
 * Computes a SHA-256 hex digest of a temporary password or invite token
 * for non-plaintext storage in `staff_profiles.invite_token_hash`.
 */
export function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

