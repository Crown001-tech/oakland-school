// Add a school, step 2 of 2: the owner's (proprietor's) sign-in.
//
//   node --env-file=.env.eductive scripts/new-school/02-create-owner.mjs "<Full Name>" <email> <school code>
//
// .env.eductive (never committed) holds the shared project's Supabase values:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// It creates the proprietor's staff record with a one-time password that is unique to this person, shown
// once here and stored only as a hash. The login route accepts it once and forces a new password at the
// first sign-in. It refuses unless step 1 has run (a school with that code exists) and that school has no staff yet. It never
// touches another school.

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const [fullName, rawEmail, rawCode] = process.argv.slice(2);
const fail = (message) => {
  console.error(`\nStopped: ${message}\n`);
  process.exit(1);
};

const email = (rawEmail || '').trim().toLowerCase();
if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail('Usage: 02-create-owner.mjs "<Full Name>" <email> <school code>');
}
const schoolCode = (rawCode || '').trim().toUpperCase();
if (!schoolCode) fail('Give the school code, the one used in step 1.');
const parts = fullName.trim().split(/\s+/);
if (parts.length < 2) fail('Give the first and last name, for example "Ada Obi".');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for the new school.');

const sb = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: school, error: schoolError } = await sb.from('schools').select('id, name, code').ilike('code', schoolCode).maybeSingle();
if (schoolError) fail(`Could not read the school: ${schoolError.message}`);
if (!school) fail(`No school has the code ${schoolCode}. Run step 1 (001_add_school.sql) first.`);

const { count, error: countError } = await sb.from('staff_profiles').select('id', { count: 'exact', head: true }).eq('school_id', school.id);
if (countError) fail(`Could not read staff: ${countError.message}`);
if (count && count > 0) fail('This school already has staff records. The owner is created only once, on a new school.');

// Unique to this person, from letters and digits that are not easily confused
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let code = '';
for (let i = 0; i < 6; i += 1) code += alphabet[crypto.randomInt(0, alphabet.length)];
const oneTimePassword = `Start-${code}`;

const { error: insertError } = await sb.from('staff_profiles').insert({
  school_id: school.id,
  employee_id: `${school.code}-STF-0001`,
  first_name: parts[0],
  last_name: parts.slice(1).join(' '),
  email,
  role: 'proprietor',
  department: 'Management',
  is_active: true,
  status: 'Active',
  must_change_password: true,
  invite_token_hash: crypto.createHash('sha256').update(oneTimePassword).digest('hex'),
  invite_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
});
if (insertError) fail(`Could not create the owner: ${insertError.message}`);

console.log(`
Owner created for ${school.name}.

  Email:              ${email}
  One-time password:  ${oneTimePassword}

Send these to ${parts[0]} privately. The password works once, expires in 14 days, and the owner must choose
a new password at the first sign-in. It is not stored anywhere else, so note it now.
`);
