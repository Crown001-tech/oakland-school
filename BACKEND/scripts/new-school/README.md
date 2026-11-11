# Adding a school

All schools run on **one database and one deployment**. A school is a row in `schools` with its own subdomain; every record it owns carries that school's id, and the app only ever shows a person their own school's records. Nothing in the code is copied or changed per school: identity, classes, grading, fees and modules are data and settings. Target: a school live in 5 working days or less.

Adding a school never changes or deletes another school's data. The setup script only adds.

## 1. Add the school (about 15 minutes)

1. Make sure the shared database is on the latest migration (`supabase/migrations`, in order).
2. Open `scripts/new-school/001_add_school.sql`, fill in the config block and run it in the SQL editor of the shared Supabase project. The config holds: name, code, slug, **subdomain**, contact details, optional brand colours (hex), session and term dates, class capacity, tuition rates, starter pack, and module switches.

   It refuses a code, slug or subdomain that is already taken, and a subdomain that is reserved. It prints the new school's id.
3. Create the owner's sign-in. Put the shared project's `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `FRONTEND/.env.eductive` (git-ignored), then run:

   ```bash
   node --env-file=.env.eductive scripts/new-school/02-create-owner.mjs "Ada Obi" owner@school.example GFC-001
   ```

   The last value is the school's code. It prints a one-time password for that person. Send it privately. It works once and the owner must change it at first sign-in. Shared passwords are never used. It refuses a school that already has staff.

## 2. Give the school its address

The deployment has a wildcard domain (for example `*.eductive.example`) that points at the one deployment. The school's address is its subdomain: `greenfield.eductive.example`. Nothing is deployed per school.

What identifies the school's visitors:
- A person who is signed in belongs to the school on their staff, guardian or student record.
- A visitor (the admissions form, the sign-in page, the school's name and colours) gets the school whose subdomain they came in on.
- Someone who is signed in to one school and opens another school's address is refused.

Environment variables (set once, for the whole deployment):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | the shared project |
| `AUTH_COOKIE_SECRET` | one random secret for the deployment |
| `APP_ROOT_DOMAIN` | the product domain, for example `eductive.example`, so `greenfield.eductive.example` is read as the school `greenfield` |
| `DEFAULT_SCHOOL_SUBDOMAIN` | optional, for the single-school case: the school used on `localhost` and on an address with no school subdomain. With several schools and no value, such an address matches no school. |

## 3. What each school sets for itself

These live in the school's own record, never in the environment:

| What | Where | If not set |
|---|---|---|
| Brand colours | `settings.brandPrimary`, `settings.brandAccent` (hex) | the default theme |
| Generated numbers prefix (staff IDs, admission numbers, gate passes, incident numbers) | `settings.idPrefix` | the letters at the start of the school's code (`OAK-001` gives `OAK`) |
| Student sign-in domain | `settings.studentEmailDomain` | built from the subdomain: `student.<subdomain>.invalid`. Set it before creating students: changing it later means existing students cannot sign in. |
| Tuition, class capacity, grading rules, pass mark | `/proprietor/settings` | zero or the starter values; nothing is invented |
| Modules (`cbt`, `security`, `inventory`, `letters`) | `settings.modules`; set one to `false` to turn it off. A module that is off disappears from the menus and its API answers 404. | on |

**Not yet per school:** the school logo. The deployment's logo file is used for every school until logos are stored with each school. Brand colours and everything above are per school.

## 4. Fill in the school (day 1 to 3, by the school's staff)

Sign in as the owner and:
- complete the school profile (address, phone, email) at `/proprietor/profile`
- check the fee rates and grading rules at `/proprietor/settings`
- add classes: Add Class (a level plus an arm, such as JSS 1 and Diamond), or import them. Nursery and primary levels take a tuition fee set once for the level.
- import students and guardians (Students, Bulk Import) and staff (Staff, Bulk Import) from Excel (.xlsx) or CSV. Each import checks every row first: a class the school does not have, a missing or repeated admission number or email, or a subject that is not registered is shown with its row number and left out, and only clean rows are saved. Import classes before students and staff.
- invite staff, who each receive their own one-time password

## 5. Custom requests

Log every request the school makes at `/proprietor/requests`. Build it as a setting or a module switch where possible, never as a copy of the code for one school.

## Updating

A schema change is a new file in `supabase/migrations`, run once on the shared database. A code change is one deployment, and every school has it.

## How isolation is enforced

- Every table that holds a school's data has a required `school_id` (migration 028).
- Every API route gets its database from `getSchoolDb()` (`src/lib/school-db.ts`), a client that adds `school_id = <the request's school>` to every read, update and delete and stamps it on every insert. A route never holds the unrestricted client.
- `node scripts/audit-school-scope.mjs` lists any code that does, and any hardcoded school id. The isolation tests fail if either appears.
