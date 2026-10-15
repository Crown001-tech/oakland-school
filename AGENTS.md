# Oakland School Agent Invariants & Repository Directives

## 1. ABSOLUTE ZERO TOLERANCE FOR PLACEHOLDER DATA
The user has established an absolute, non-negotiable rule across all development:
**NEVER USE PLACEHOLDER, FABRICATED, HARDCODED, OR MOCK DATA ANYWHERE IN THIS APPLICATION.**

### What Constitutes Placeholder Data (STRICTLY FORBIDDEN):
1. **Mock / Fictional Names**:
   - Never invent fake student names (e.g., "Emeka Adeleke", "Chidera Okafor"), fake staff names, fake guardian names, or fake executive names (e.g., "Dr. Sarah Williams").
   - The official Head of School / Principal is **Mr Seyi Bankole**.
   - Real students in PostgreSQL are **Chinedu Okafor** and **Amina Bello**.
2. **Fake Academic Scores, Broadsheets & Grades**:
   - Never hardcode test scores, CA marks, exam scores, cumulative averages, percentages, or class standings (e.g., `88.4%`, `91`, `534 of 600`, `2nd of 38`).
   - If assessment scores or report cards have not been submitted or recorded in PostgreSQL, show a clean empty state (`—` or "No examination scores recorded yet").
3. **Hardcoded Values Overriding Master Settings**:
   - **Class Capacity**: NEVER hardcode `50`. Class capacity MUST be resolved dynamically from `schools.settings.classCapacity` and PostgreSQL `classes.capacity`.
   - **Tuition & Fees**: NEVER hardcode tuition numbers on student profiles or financial views. Tuition rates MUST be resolved dynamically from `schools.settings` (`tuitionJSS`, `tuitionSS12`, `tuitionSS3`).
   - **Staff Salaries**: NEVER hardcode individual base salaries or allow per-staff salary editing. Salaries MUST be resolved dynamically from `schools.settings` (`salaryPrincipal`, `salaryBursar`, `salaryClassTeacher`, `salarySubjectTeacher`, `salarySupportStaff`, `allowanceClassTeacher`).
4. **Empty State Requirement**:
   - If a table, roster, broadsheet, activity log, or ledger is empty, ALWAYS display a clean, professional, empty state (e.g., "No examination scores recorded yet", "0 students enrolled", "No applications pending").
   - NEVER fall back to hardcoded mock arrays (`SAMPLE_SUBJECTS`, `SAMPLE_CHILDREN`, `DEFAULT_CLASSES` with fake averages, mock broadsheets).
   - Real database records in PostgreSQL are the sole source of truth across all portals.
5. **Mandatory Automated Pre-Completion Sweep**:
   - Before concluding ANY task, phase, or milestone, the agent MUST run an automated codebase sweep to ensure ZERO mock data remains:
     - Grep for prohibited fallback constants: `SAMPLE_`, `MOCK_`, `DEFAULT_*` (with fake stats).
     - Grep for prohibited fictional names: `Adeleke`, `Dr. Sarah Williams`, etc.
     - Grep for hardcoded test scores/percentages: `88.4%`, `2nd of 38`, `91`, etc.
     - Grep for hardcoded status strings: `1 score pending`, etc.
   - If ANY match is found in production routes, components, or API endpoints, it is a critical blocker that MUST be purged immediately.
6. **Universal Multi-Portal Invariant**:
   - All portals (**Proprietor, Admin/Principal, Teacher, Parent, Student, Public**) are subject to the EXACT same zero-placeholder standard.
   - When an entity or setting is updated (e.g., tuition, class capacity, academic results, enrolled students), it MUST be validated across ALL affected portals simultaneously. No portal may be left running on legacy mock data.
7. **Strict Filter Scoping in API Routes**:
   - NEVER write permissive fallback filters such as `(classId && e.class_id === classId) || e.status === 'active'`.
   - Filters must strictly isolate entities to their true database foreign keys.
   - If a class has zero submitted marks in PostgreSQL, its status is strictly `Scores Pending` and its average is strictly `—`. Never display fake averages or premature statuses.
8. **Ban on Migration Dummy Seed Records in Operational Tables**:
   - Migration files or databases often contain dummy seed items (e.g., sample inventory items, sample purchase orders, sample gate dismissal logs).
   - The agent MUST NEVER treat migration seed records as real data. Operational tables (inventory, procurement, pickup logs, leave requests) must hold ONLY real, user-created records.
   - If an operational table contains residual migration seed items, they MUST be purged from the database so the interface displays a pristine, professional empty state.
9. **Ban on Pre-Filled Form Placeholder Values**:
   - Modal and creation forms (e.g. "Add Stock Item", "New Purchase Request", "Admit Student", "Add Staff") must NEVER initialize state with arbitrary dummy numbers or placeholder strings (e.g. quantity `20`, unit cost `5000`, location `Main Store`).
   - All form inputs must strictly initialize to empty strings (`''`) or null, requiring deliberate user entry.
10. **Ban on Credential and Code Fallbacks**:
   - NEVER invent fallback codes or PINs (e.g. `pin || '4821'`, `token || '1234'`).
   - If an escort, guardian, or user lacks an assigned PIN or token in PostgreSQL, the field must strictly resolve to `—` or `null`.

---

## 2. STRICT COPYWRITING & AESTHETIC STANDARDS
1. **Ban on Compound Slashes or Ampersands**:
   - Never use compound slashed or ampersand labels (e.g., `word1/word2` or `word1 & word2`).
   - Pick ONE clear, concise word:
     - `Role` (NOT `Role / Category`)
     - `Assignment` (NOT `Assignment / Specialization`)
     - `Guardian` (NOT `Parent / Guardian`)
     - `Tuition` (NOT `Tuition / Student Fees`)
     - `Staff` (NOT `Staff / Faculty`)
     - `Attendance Log` (NOT `Check-in / Check-out`)
     - `Student Details` (NOT `Personal & Academic Profile`)
2. **Elimination of Pretentious Filler Words**:
   - Use plain, standard English:
     - `Pending Review` (NOT `Pending Executive Review`)
     - `Administration` or `Admin` (NOT `Administrative Leadership`)
     - `Notice` or `Important Notice` (NOT `Executive Direct Mandate`)
     - `Documents` (NOT `Official Institutional Documents`)
     - `Enrolled` (NOT `Matriculated`)
     - `Profile` or `Details` (NOT `Dossier`)
     - Ban dramatic or pompous vocabulary (`dossier`, `mandate`, `cohort`). Use plain terms: `Profile`, `Details`, `Records`, `Staff`, `Students`.
3. **Purge Meaningless Clutter Tags**:
   - Purge all visual noise badges (e.g., `TRCN`, `NERDC`, `Verified`, `WAEC Accredited`, redundant `Active` status tags).
4. **Branded Minimal Loading Screen**:
   - All loading screens must render the centered Oakland School logo (`/logo.jpg`) with a smooth breathing/pulse animation via `BrandLoader`.
   - **Zero attached text**: Never include text spinners (e.g., "Loading student profile...", "Fetching data...").
5. **Gate Security Standard**:
   - Simple 4-digit **Pickup PIN** assigned to authorized guardians. Zero over-engineered biometric complexity.
6. **Universal Staff Default Password**:
   - Staff accounts default to **`Oakland@2026`** with unmasked copy, eye toggle, and a 1-click **Reset Password** button.
7. **Simplified Admissions Workflow**:
   - Public Application -> Status: **Pending Review**.
   - Proprietor reviews -> **Accept** (enrolls student directly into DB) or **Decline**.
   - Zero bureaucratic intermediate pipeline stages.
8. **No Pension Deductions**:
   - Pension deductions are completely eliminated from staff payroll, financial ledgers, and staff profiles.
