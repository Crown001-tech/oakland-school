import fs from 'node:fs';
import path from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

/**
 * Builds an in-process Postgres from the real files in `supabase/migrations`, so the
 * database tests exercise the same SQL functions and row-level security that run in
 * production. Supabase's roles, default grants and `auth` helpers are recreated first.
 */

const MIGRATIONS_DIR =
  [
    path.resolve(import.meta.dirname, '../../../BACKEND/supabase/migrations'),
    path.resolve(import.meta.dirname, '../../../supabase/migrations'),
  ].find((d) => fs.existsSync(d)) || path.resolve(import.meta.dirname, '../../../BACKEND/supabase/migrations');

// Migration 005 cannot run on an empty database: migration 001 already created
// `fee_structures` without `class_name`. Migration 010 later recreates every table 005
// would have made, so a fresh replay skips it. Any other failure fails the test run.
const KNOWN_REPLAY_FAILURES = new Set(['005_deep_fee_management_and_payments.sql']);

const SUPABASE_BOOTSTRAP = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  raw_user_meta_data JSONB,
  raw_app_meta_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')::uuid
$$;
CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() ->> 'role'
$$;

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
  id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]
);
CREATE TABLE storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT, owner UUID
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Supabase grants every new table, sequence and function in public to the API roles,
-- leaving row-level security and explicit REVOKEs to restrict them.
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
`;

export async function createMigratedDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { uuid_ossp, pgcrypto } });
  await db.exec(SUPABASE_BOOTSTRAP);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    try {
      await db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
    } catch (err) {
      if (!KNOWN_REPLAY_FAILURES.has(file)) {
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
  }

  return db;
}

export interface JwtClaims {
  sub?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

/**
 * Runs `fn` as a Supabase API role, the way PostgREST does: inside a transaction with
 * the role switched and the caller's JWT claims set, so RLS policies apply.
 */
export async function asRole<T>(
  db: PGlite,
  role: 'anon' | 'authenticated' | 'service_role',
  claims: JwtClaims,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ ...claims, role }),
    ]);
    await tx.exec(`SET LOCAL ROLE ${role}`);
    return fn(tx);
  });
}
