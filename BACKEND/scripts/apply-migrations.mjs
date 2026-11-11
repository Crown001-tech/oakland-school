// Applies migration files to the database named by DATABASE_URL in FRONTEND/.env.local, one transaction per file.
// If a file fails it is rolled back and nothing after it is run.
//
//   node scripts/apply-migrations.mjs 029 030
//
// The numbers are the start of the file names in supabase/migrations. Run each migration once. Needs `pg`:
//   pnpm add -D pg   (or run it from any folder where `pg` is installed)

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const wanted = process.argv.slice(2);
if (wanted.length === 0) {
  console.error('Give the migration numbers to apply, for example: node scripts/apply-migrations.mjs 029 030');
  process.exit(1);
}

const { Client } = createRequire(import.meta.url)('pg');
const envFile = fs.readFileSync(path.join(root, 'FRONTEND/.env.local'), 'utf8');
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const migrationsDir =
  [
    path.join(root, 'BACKEND/supabase/migrations'),
    path.join(root, 'supabase/migrations'),
  ].find((d) => fs.existsSync(d)) || path.join(root, 'BACKEND/supabase/migrations');

const files = wanted.map((n) => {
  const match = fs.readdirSync(migrationsDir).find((f) => f.startsWith(n + '_'));
  if (!match) {
    console.error(`No migration starts with ${n}_`);
    process.exit(1);
  }
  return match;
});

const client = new Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
for (const file of files) {
  try {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
    await client.query('COMMIT');
    console.log('applied', file);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('FAILED and rolled back:', file, err.message);
    await client.end();
    process.exit(1);
  }
}

const policies = (await client.query(`select count(*)::int n from pg_policies where schemaname = 'public' and policyname = 'school_isolation'`)).rows[0].n;
console.log(`school_isolation policies in the database: ${policies}`);
await client.end();
