// Creates the seven Eductive demo sign-in accounts in Supabase Auth, then relinks them to the
// demo school's records. Run once after demo/sql/001_install_demo_school.sql, from FRONTEND:
//
//   node --env-file=.env.demo demo/setup-demo-accounts.mjs
//
// .env.demo (never committed) must hold the DEMO project's values:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_ACCOUNT_PASSWORD
//
// The account list comes from the database (schools.settings.demoAccounts), so SQL stays the one
// source of truth. The script refuses to run unless every school in the database is the demo school.

import { createClient } from '@supabase/supabase-js';

const DEMO_SCHOOL_CODE = 'EDUCTIVE-DEMO';
const AUTH_ROLE = {
  proprietor: 'proprietor',
  principal: 'admin',
  bursar: 'bursar',
  teacher: 'teacher',
  parent: 'parent',
  student: 'student',
  security: 'security',
};

function fail(message) {
  console.error(`\nStopped: ${message}\n`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_ACCOUNT_PASSWORD;
if (!url || !serviceKey) fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for the demo project.');
if (!password || password.length < 12) fail('DEMO_ACCOUNT_PASSWORD must be set and at least 12 characters.');

const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: schools, error: schoolsError } = await sb.from('schools').select('code, settings');
if (schoolsError) fail(`Could not read schools: ${schoolsError.message}`);
if (!schools?.length) fail('No school found. Run demo/sql/001_install_demo_school.sql and call reset_demo_school() first.');
if (schools.some((s) => s.code !== DEMO_SCHOOL_CODE)) {
  fail(`This database holds a school that is not the demo school (${schools.map((s) => s.code).join(', ')}). Demo accounts are never created here.`);
}

const accounts = schools[0].settings?.demoAccounts;
if (!accounts || !Object.keys(accounts).length) fail('settings.demoAccounts is empty. Call reset_demo_school() first.');

// The login route signs students in with a generated address built from the admission number
const authEmail = (role, identifier) =>
  role === 'student' ? `${identifier.toLowerCase()}@student.oakland.ng` : identifier.toLowerCase();

const { data: existing, error: listError } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listError) fail(`Could not list users: ${listError.message}`);
const byEmail = new Map((existing?.users ?? []).map((u) => [u.email?.toLowerCase(), u]));

for (const [role, identifier] of Object.entries(accounts)) {
  const email = authEmail(role, identifier);
  const attributes = {
    password,
    email_confirm: true,
    user_metadata: { role: AUTH_ROLE[role], full_name: `Demo ${role}`, password_changed: true },
  };
  const current = byEmail.get(email);
  const { error } = current
    ? await sb.auth.admin.updateUserById(current.id, attributes)
    : await sb.auth.admin.createUser({ email, ...attributes });
  if (error) fail(`${role} (${email}): ${error.message}`);
  console.log(`${current ? 'updated' : 'created'}  ${role.padEnd(10)} ${email}`);
}

// Rebuild the sample school so each record picks up its new sign-in account
const { error: resetError } = await sb.rpc('reset_demo_school');
if (resetError) fail(`reset_demo_school failed: ${resetError.message}`);

console.log('\nDemo accounts are ready. Keep DEMO_ACCOUNT_PASSWORD in the demo deployment environment only.');
