# M2 verification checklist

Work through this top to bottom. Each step says what to run or open, and what you should see.
Paths are relative to `FRONTEND` unless a URL is given.

## 0. Database changes

Migrations 027 and 028 are applied to Oakland's database. **Migrations 029 and 030 are not.**

- 029: row-level security, so the database itself keeps schools apart, not just the app.
- 030: report card columns for remarks and ratings, and `publicSite = full` for Oakland.

**Until 030 is applied:** compiling a report card fails (it writes the new columns), and Oakland's public site shows the short page instead of the full pages. Apply both together:

```bash
cd FRONTEND
pnpm add -D pg
node scripts/apply-migrations.mjs 029 030
```

Each file runs in its own transaction; if one fails it rolls back and the rest are not run. Expect `applied 029_...`, `applied 030_...` and `school_isolation policies in the database: 72` or more. If you prefer, paste each file from `supabase/migrations` into the Supabase SQL editor instead.

After applying, restart `pnpm dev` and repeat sections 3, 6, 7 and 12 below.

## 1. Automated checks (all must pass)

| Run | Expect |
|---|---|
| `pnpm test` | 27 files, 353 tests pass. Close other apps first: the database tests need memory, and a crash with "Array buffer allocation failed" means low memory, not a code error. |
| `npx tsc --noEmit` | no output |
| `npx eslint src tests --quiet` | no output |
| `npx next build` | "Compiled successfully" |
| `node scripts/audit-school-scope.mjs` | "outside the allow-list: 0" and "Hardcoded school ids: 0" |

## 2. Every school's data is separate (the shared database)

- [ ] `pnpm vitest run tests/security/school-isolation.test.ts tests/security/school-scope.test.ts` passes (a person on another school's address is refused; a visitor is never given a guessed school).
- [ ] `pnpm vitest run tests/db/school-id-everywhere.test.ts` passes (every table has a required school).
- [ ] `pnpm vitest run tests/db/new-school.test.ts` passes (adding a school leaves an existing school unchanged).
- [ ] Add a real second school to a **copy** of the database (not Oakland's live one): run `scripts/new-school/001_add_school.sql` with a test school, then `02-create-owner.mjs`. Set `DEFAULT_SCHOOL_SUBDOMAIN=<its subdomain>` and restart. Sign in as its owner at http://localhost:3000/login and confirm none of Oakland's students, staff or classes appear at http://localhost:3000/proprietor/students and /staff.
- [ ] Time it. The PRD gate is: school number two live in 5 working days or less.

## 3. Sign-in and the role switcher (http://localhost:3000/login)

- [ ] Tap Proprietor, Principal, Bursar, Teacher, Parent, Student, Security. Each lands on its own portal with no "not found" message.
- [ ] A wrong password gives the normal error, not a crash.

## 4. School identity is data, not code

- [ ] http://localhost:3000/proprietor/profile shows the school's own name, motto, address. Edit and save one field.
- [ ] A receipt (http://localhost:3000/bursar), a letter (http://localhost:3000/admin/letters) and the broadsheet print (http://localhost:3000/proprietor/results) show the school's name, principal and session from its record, not a fixed one.
- [ ] `grep -rn "Oakland" src/app --include=*.tsx` shows only the public website pages (home, about, values, academics, admissions) and comments.

## 5. Classes (http://localhost:3000/proprietor/classes)

- [ ] The six classes load.
- [ ] Add Class: pick level JSS 1, arm "Other", type Diamond. It previews "Will be added as JSS 1 Diamond", and no tuition box appears (JSS tuition comes from Settings). **There is no Delete button yet.** To remove a test class, run `delete from classes where name = 'JSS 1 Diamond'` or ask me to.
- [ ] Add Class with the level "Other" typed as Nursery 1 (or Primary 3): a tuition box appears. It is the fee for that level, shared by every arm.
- [ ] Add Class with "Type the full class name myself" works, and a duplicate name is refused.
- [ ] Import Classes (paste text): `Level,Arm,Capacity,Tuition` with a repeated class and a bad capacity shows each problem with its row number. Do not click Import unless you want the classes.
- [ ] A class with an arm appears right after its level in lists and timetables.

## 6. Import (Excel and CSV)

- [ ] http://localhost:3000/proprietor/students, Bulk Import: download the template, fill it in Excel, save as .xlsx, upload. A row with a class the school does not have, a missing gender, a repeated admission number and a bad guardian email are each flagged with a reason. Only clean rows import.
- [ ] http://localhost:3000/proprietor/staff, Bulk Import: a repeated email, an unknown subject, and an unknown role are flagged.
- [ ] Phone width (375 wide): the import dialog has no sideways scroll and every button is at least 44px tall.

## 7. Grading and report cards are school settings

- [ ] http://localhost:3000/proprietor/settings: change CA 1, CA 2 and exam weights so they do not add to 100. Saving is refused. A pass mark of 0 or 101 is refused. Put them back (20, 20, 60 and your pass mark).
- [ ] Teacher: http://localhost:3000/teacher/scores. A mark above the school's limit for that assessment is refused.
- [ ] Report card flow: teacher compiles, principal approves, proprietor endorses, parent sees it only after endorsement (`pnpm vitest run tests/academics`).

## 8. Fees follow the level

- [ ] `pnpm vitest run tests/db/tuition-rule.test.ts` passes: JSS 1 Diamond, JSS 1 Silver and JSS 1 all bill the same, and a class outside JSS and SS bills from its level's fee, or zero when none is set.
- [ ] http://localhost:3000/parent/fees and http://localhost:3000/parent show the amounts the bursar sees at http://localhost:3000/bursar for the same child.

## 9. Modules and requests

- [ ] Turn a module off in the school's settings (`settings.modules.cbt = false`). Its menu item disappears and its API answers 404. Turn it back on.
- [ ] http://localhost:3000/proprietor/requests: log a request, move it through its statuses.
- [ ] Letters now has a menu link for the principal (http://localhost:3000/admin/letters).

## 10. Messages tell the truth

- [ ] http://localhost:3000/admin/communications: Parent Portal is on; Email, SMS and WhatsApp show "Not connected yet"; sent notices say "Posted", never "Delivered". Real sending is M3.

## 11. Placeholder sweep (from AGENTS.md)

```bash
grep -rnE "SAMPLE_|MOCK_|Adeleke|Sarah Williams|88\.4%|2nd of 38|1 score pending|4821" src --include=*.ts --include=*.tsx
```

Expect no output.

## 12. Added in the last round

- [ ] **Row-level security** (after 029): `pnpm vitest run tests/db/rls-school-isolation.test.ts` passes. With the public browser key, `https://<project>.supabase.co/rest/v1/fee_structures` returns no rows.
- [ ] **Middleware**: `pnpm vitest run tests/security/modules.test.ts` passes. The middleware makes one request to Supabase per address per minute, and none to the app's own `/api/schools/modules`.
- [ ] **Nursery and primary packs**: `pnpm vitest run tests/db/new-school.test.ts` passes. In `001_add_school.sql` set `"starterPacks": ["nigerian_nursery", "nigerian_primary"]` for a nursery and primary school, or list all three for a school that runs every stage.
- [ ] **Remark cards and ratings** (after 030): `pnpm vitest run tests/academics` passes. The API takes `mode: "descriptive"` with `cards`, and `traits` on a marks card. **There is no teacher screen for entering them yet.**
- [ ] **Public pages**: http://localhost:3000, /about, /academics, /our-values load as before for Oakland (after 030). For a school without `settings.publicSite = "full"`, they show a short page of that school's own details, and the menu and footer hide the long pages.
- [ ] **Delete a class**: http://localhost:3000/proprietor/classes shows "Delete class" only on a class with no students. A class that has ever had a student is refused with the number of students.

## Still open in M2 (not built)

| Item | State |
|---|---|
| Nursery and primary: teacher screen for remark cards and ratings, and the parent and student view of them | Not built. The packs, the data model and the API are built; confirm the card layout with a real nursery or primary school before the screens. |
| Archiving a class that has had students | Not built. Such a class can only be kept; delete works for classes with no students. |
| Roles for schools with no separate proprietor, bursar or security officer | Not built |
| Signatures per school on letters and report cards | Not built |
| School logo per school | Not built. One logo file is shared by all schools. |
| Invite links by SMS or email | Waits for M3 messaging. Per-person one-time passwords already avoid shared passwords. |
| Grade-band editor screen | Not built. Bands are stored as a setting. |
| Delete or rename a class | Not built |
| Wildcard domain and `APP_ROOT_DOMAIN` for real subdomains | Needs your hosting set up |
| Isolation proven against a real second school on real data | Step 2 above |
