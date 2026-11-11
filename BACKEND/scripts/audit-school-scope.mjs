// Checks that no code reaches the unrestricted database client except the files on the allow-list below.
//
// Every API route gets its database through getSchoolDb() (src/lib/school-db.ts), a client that can only see
// and change one school's rows. The unrestricted client (getSupabaseAdmin, createAdminClient) can see every
// school, so only code that has a reason to is allowed to use it, and each reason is written here.
//
//   node scripts/audit-school-scope.mjs          print the report
//   node scripts/audit-school-scope.mjs --json   print JSON (used by the isolation test)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot =
  [
    path.resolve(here, '../../FRONTEND/src'),
    path.resolve(here, '../src'),
  ].find((d) => fs.existsSync(d)) || path.resolve(here, '../../FRONTEND/src');

/** File (relative to src) and why it may use the unrestricted client. */
export const ALLOWED = new Map([
  ['lib/supabase/admin.ts', 'defines the unrestricted client'],
  ['lib/supabase/server.ts', 'defines createAdminClient for the files below'],
  ['lib/school-db.ts', 'builds the school client from the unrestricted client, and finds which school a request is for'],
  ['lib/caller.ts', 'works out who the signed-in person is, which comes before the school is known'],
  ['lib/rate-limit.ts', 'the sign-in lockout counter is keyed by the person signing in and holds no school data'],
  ['lib/school-edge.ts', 'the middleware reads the module switches of the school at the address, before any request is made as a person'],
  ['lib/auth-role.ts', 'uses the service key only as the fallback secret for signing the role cookie, and reads no data'],
  ['lib/payments/complete.ts', 'finds an online payment by its reference, before the school is known, then works only through that school\'s own client'],
  ['lib/messaging/drain.ts', 'sends the waiting messages of every school on a schedule, and applies a delivery report to the message it is about'],
  ['lib/parent-invites.ts', 'a parent opens an invite link before they have an account or a school address of their own; the token names the school, and the account is made for that guardian only'],
  ['lib/messaging/run.ts', 'the scheduled jobs and the delivery report webhook act across schools by design; the client is held here, not in the routes'],
  ['lib/reminders.ts', 'the daily reminder job runs across every school that has switched reminders on, and works through each school own client'],
  ['lib/school-brand.ts', 'reads the brand colours of the school at the address a visitor came in on, before anyone has signed in'],
  ['lib/local-review-switch.ts', 'the localhost-only role switcher, which signs in as another account'],
  ['lib/demo.ts', 'the demo sign-in, which reads the demo accounts'],
  ['app/api/demo/sign-in/route.ts', 'the demo and localhost role switcher sign-in'],
  ['app/api/auth/parent-invite/accept/route.ts', 'a parent opens an invite link before they have an account; the work is done by lib/parent-invites.ts'],
  ['app/api/auth/logout/route.ts', 'ends a session and reads no school data'],
  ['app/auth/callback/route.ts', 'finds the role of a person who has just signed in with a magic link, before any request is made as them'],
]);

const RAW = /getSupabaseAdmin|createAdminClient|SUPABASE_SERVICE_ROLE_KEY/;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield full;
  }
}

export function auditRoutes() {
  const findings = [];
  for (const file of walk(srcRoot)) {
    const rel = path.relative(srcRoot, file).replace(/\\/g, '/');
    if (ALLOWED.has(rel)) continue;
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      if (RAW.test(line)) findings.push({ file: 'src/' + rel, line: i + 1, text: line.trim().slice(0, 100) });
    });
  }
  return findings;
}

/** Hardcoded school ids anywhere in the source. */
export function hardcodedSchoolIds() {
  const findings = [];
  for (const file of walk(srcRoot)) {
    const rel = path.relative(srcRoot, file).replace(/\\/g, '/');
    const src = fs.readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/a0000000-0000-0000-0000-000000000001|DEFAULT_SCHOOL_ID/.test(line)) findings.push({ file: 'src/' + rel, line: i + 1, text: line.trim().slice(0, 100) });
    });
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raw = auditRoutes();
  const ids = hardcodedSchoolIds();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ raw, ids }));
  } else {
    console.log(`Unrestricted client used outside the allow-list: ${raw.length}`);
    for (const f of raw) console.log(`  ${f.file}:${f.line}  ${f.text}`);
    console.log(`Hardcoded school ids: ${ids.length}`);
    for (const f of ids) console.log(`  ${f.file}:${f.line}  ${f.text}`);
  }
}
