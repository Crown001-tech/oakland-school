# Eductive Demo School

A demo school any buyer can try on a phone in under ten minutes, without seeing Oakland's records.
It runs as its own deployment on its own database. Sample records exist only here (AGENTS.md rule 1.11).

## What is here

| Path | Purpose |
|---|---|
| `sql/001_install_demo_school.sql` | Installs `reset_demo_school()`, which wipes the database and rebuilds the sample school. Not a migration, so it never reaches Oakland. |
| `setup-demo-accounts.mjs` | One-time script that creates the seven demo sign-in accounts. |

Nothing under `FRONTEND/src` may import from this folder.

## How it stays safe

1. The install SQL refuses to run if the database already holds any student, guardian or staff record. Oakland's database does.
2. `reset_demo_school()` refuses to run unless the install marker table exists, and only the service role may call it.
3. Demo sign-in answers 404 unless `DEMO_MODE=true` **and** every school in the connected database has the code `EDUCTIVE-DEMO`.
4. The setup script refuses to create accounts unless every school in the database is the demo school.
5. Every sample person has the surname "Sample", and the site shows a banner on every page.

## Set up the demo database (once)

1. Create a new Supabase project for the demo (the free tier is enough). Do not reuse Oakland's.
2. In its SQL editor, run `supabase/migrations/001` to `022` in order. **Skip `005`**: it cannot run on an empty database, and `010` creates the same tables.
3. Run `demo/sql/001_install_demo_school.sql`, then `select public.reset_demo_school();`.
4. Create `FRONTEND/.env.demo` (ignored by git) with the demo project's `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and a long random `DEMO_ACCOUNT_PASSWORD`, then run:

   ```bash
   node --env-file=.env.demo demo/setup-demo-accounts.mjs
   ```

5. For the nightly reset, enable the `pg_cron` extension (Dashboard, Database, Extensions), then run the install SQL again. It schedules the reset for 02:00 each night.

## Deploy the demo site

Create a second deployment of this repository (for example a second Vercel project) with these environment variables, set **before** it builds:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_BRAND` | `eductive` |
| `DEMO_MODE` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | the demo project's values |
| `DEMO_ACCOUNT_PASSWORD` | the same password used in step 4 |
| `AUTH_COOKIE_SECRET` | a new random secret, different from Oakland's |

Visitors land on `/demo` and sign in with one tap per role. Sign-in pages and Oakland's public pages redirect there.

## Sample values you will see

The parent's gate pickup PIN is `4827`. Fee payments, attendance and JSS 1 scores are generated, then reset each night.

## Not in the sample yet

Report cards, expenditures, payroll runs, visitors and incidents. Report cards need the missing report-card step in the app first (see the M1 notes).
