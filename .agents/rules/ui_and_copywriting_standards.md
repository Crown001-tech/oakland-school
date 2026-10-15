# UI, Copywriting & Architectural Standards

### 1. Copywriting & Terminology Invariants
* **Strict Ban on Compound Slashes or Ampersands**:
  * Never use compound slashed or ampersand labels (e.g., `word1/word2` or `word1 & word2`).
  * Pick ONE clear, concise word, or use natural phrasing:
    * `Role` (NOT `Role / Category`)
    * `Assignment` (NOT `Assignment / Specialization`)
    * `Guardian` (NOT `Parent / Guardian`)
    * `Tuition` or `School Fees` (NOT `Tuition / Student Fees`)
    * `Staff` (NOT `Staff / Faculty`)
    * `Attendance Log` (NOT `Check-in / Check-out`)
    * `Student Details` (NOT `Personal & Academic Profile`)
* **Elimination of Pretentious Filler Words**:
  * Use direct, clean English:
    * `Pending Review` (NOT `Pending Executive Review`)
    * `Administration` or `Admin` (NOT `Administrative Leadership`)
    * `Directive` or `Important Notice` (NOT `Executive Direct Mandate`)
    * `Documents` (NOT `Official Institutional Documents`)
    * `Enrolled` (NOT `Matriculated`)
    * `Profile` or `Details` (NOT `Dossier`)
    * Strict ban on uncommon, dramatic, or pretentious vocabulary (e.g. NEVER use 'dossier', 'mandate', 'cohort', etc.). Use plain, everyday terms: 'Profile', 'Details', 'Records', 'Staff', 'Students'.

### 2. UI Aesthetics & Clutter Reduction
* **Clean, Sleek & Breathable**:
  * Generous padding and whitespace; avoid dense walls of text.
  * No overcrowded stat rings or decorative progress gauges.
* **Removal of Meaningless Clutter Tags**:
  * Do not display arbitrary bureaucratic or regulatory tags (e.g., `TRCN`, `NERDC`, `Verified`, `WAEC Accredited`).
  * Tags/badges must only represent functional states (e.g. `Active`, `Pending`, `Inactive`).
* **Removal of Merits & Demerits**:
  * Do not include merits/demerits points, behaviour scores, or disciplinary point widgets in student profiles.

### 3. Loading Screen Standard
* **School Logo Only**:
  * All full-page or section loading states must render the centered Oakland School logo (`/logo.jpg`) with a smooth breathing/pulse animation.
  * **Zero attached text**: Never include text spinners (e.g., "Loading student profile...", "Fetching data...").

### 4. Security & Authentication Standards
* **Gate Security**:
  * Student gate checkout uses a clean **Pickup PIN** assigned to authorized guardians. No biometric complexity.
* **Staff Password Handling**:
  * The universal default password for staff accounts is **`Oakland@2026`**.
  * Staff profile must provide an unmasked copy button, visibility toggle, and a 1-click **Reset Password** button reverting the account to `Oakland@2026`.

### 5. Workflow Simplification
* **Admissions Flow**:
  * Public Application -> Status: **Pending Review**.
  * Proprietor reviews -> **Accept** (enrolls student) or **Decline**.
  * No "Interview Stage" or "Offer Extended" pipeline stages.
  * Entrance exam dates are configured in **Settings** by application date windows (e.g., applications submitted between July 1 - August 15 write on Date A).
* **Payroll & Finance**:
  * Omit pension deductions from staff payroll, financial ledgers, and staff profiles. Keep payroll simple: Basic Salary, Allowances, Total/Net Pay.

### 6. Data Integrity & Strict Ban on Placeholder Data
* **Absolute Zero Tolerance for Untracked Placeholder Data**:
  * Never render fake, fabricated, or hardcoded placeholder records (e.g., invented student names like "Emeka Adeleke", fake staff names, fake executive names like "Dr. Sarah Williams").
  * Never render fake academic marks, mock assessment broadsheets, or fabricated exam scores (e.g. `88.4%`, `91`, `534 of 600`, `2nd of 38`).
  * Never hardcode values that have institutional settings:
    * Class capacity must always read from `schools.settings.classCapacity` (or database `classes.capacity`), never hardcoded 50.
    * Tuition fees must always read from `schools.settings` (`tuitionJSS`, `tuitionSS12`, `tuitionSS3`).
    * Staff salaries must always read from `schools.settings` (`salaryPrincipal`, `salaryBursar`, `salaryClassTeacher`, etc.).
  * If a database table, ledger, broadsheet, or student record has no submitted marks or data, ALWAYS render clean, professional empty states (e.g., `—`, "No examination scores recorded yet", "0 students enrolled", "No applications pending") rather than injecting fictional placeholder entities.
  * **Strict Ban on Fallback Mock Arrays**: Never define constants like `const SAMPLE_SUBJECTS = [...]`, `const SAMPLE_CHILDREN = [...]`, or `const MOCK_DATA = [...]` as UI fallbacks. Every component must directly query PostgreSQL or render an explicit typed empty state.
  * Real database records in PostgreSQL are the sole source of truth across all portals.
* **Controlled Dummy Data for Testing**:
  * Temporary dummy records may be created solely for automated verification when required.
  * **Explicit Notification**: You must explicitly inform the user whenever dummy test data is being created.
  * **Mandatory Cleanup Across Backend & Frontend**: You must immediately erase and purge all dummy records from both the backend (PostgreSQL and Supabase Auth) and the frontend (browser localStorage, sessionStorage, and client caches) as soon as verification is complete, leaving all environments pristine.
