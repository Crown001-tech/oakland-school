# Staff / Teacher Portal (/teacher) Phased Implementation Plan

## Goal Description
Conduct an exhaustive, route-by-route audit and remediation of the **Staff / Teacher Portal (`/teacher`)** across all 7 routes and layout shell. 
Ensure 100% strict adherence to repository invariants: absolute zero tolerance for placeholder/mock data, complete purge of prototype `localStorage` dependencies, clean copywriting (no compound slashes or ampersands), branded `<BrandLoader />` with zero text spinners, and full alignment with authenticated teacher roles (Class Teacher vs. Subject Teacher) backed by live PostgreSQL database endpoints.

---

## Phased Execution Roadmap

| Phase | Focus Area | Routes & APIs Covered | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Foundation & Shell Layout** | `(teacher)/layout.tsx` | Completed |
| **Phase 2** | **Overview Suite** | `/teacher` (Dashboard)<br>`/teacher/profile` (My Profile) | Completed |
| **Phase 3** | **My Class Suite** | `/teacher/students`<br>`/teacher/attendance`<br>`/api/attendance` (POST handler) | Completed |
| **Phase 4** | **Teaching Suite** | `/teacher/scores`<br>`/api/scores` (GET/POST route)<br>`/teacher/report-cards`<br>`/teacher/timetable` | Completed |
| **Phase 5** | **Invariant Audit & Sign-off** | All Routes (`npx tsc`, HTTP 200 verification) | Completed |

---

## Detailed Specifications by Phase

### Phase 1: Foundation & Shell Layout (`(teacher)/layout.tsx`) - COMPLETED
1. **Purged Text Spinners & Pretentious Vocabulary**:
   - Replaced `<div className="animate-spin" />` with centered `<BrandLoader fullScreen size="lg" />`.
   - Purged pompous phrase `"Verifying Faculty Mandate..."`.
2. **Standardized Navigation Structure**:
   - **OVERVIEW**: Dashboard (`/teacher`), My Profile (`/teacher/profile`).
   - **MY CLASS**: Students (`/teacher/students`), Attendance (`/teacher/attendance`), Report Cards (`/teacher/report-cards`).
   - **TEACHING**: Scores (`/teacher/scores`), Timetable (`/teacher/timetable`).
3. **Session Pill & Header**:
   - Active session: `2026/2027 Session • Term 1`.
   - Dynamic teacher badge reflecting live assigned class or role.

### Phase 2: Overview Suite (`/teacher`, `/teacher/profile`) - COMPLETED
1. **Teacher Dashboard (`/teacher`)**:
   - Purged `localStorage.getItem('oakland_staff_broadcasts')`.
   - Connected announcements feed directly to live `/api/communications`.
   - Distinct student population calculation scoped strictly to classes the teacher is assigned to teach or manage as homeroom.
   - Clean empty states when zero students exist.
2. **My Profile (`/teacher/profile`)**:
   - Purged `localStorage` reading/writing of `oakland_staff_directory`.
   - Replaced text spinner with clean state and `<BrandLoader />`.
   - Purged compound slashes: `Next of Kin / Emergency Contact` -> `Next of Kin`, tab labels cleaned of compound ampersands.
   - Connected profile updates directly to live `PATCH /api/auth/me` updating PostgreSQL `staff_profiles` and Supabase Auth metadata.

### Phase 3: My Class Suite (`/teacher/students`, `/teacher/attendance`, `/api/attendance`) - COMPLETED
1. **Students Directory (`/teacher/students`)**:
   - Replaced `Loading student roster...` with `<BrandLoader size="sm" />`.
   - Purged compound slashes and ampersands:
     - `Parent / Guardian` -> `Guardian`
     - `Father / Male Guardian` -> `Father`
     - `Mother / Female Guardian` -> `Mother`
     - `Class Student Profiles & Records` -> `Class Student Records`
     - `Designated Pickup Guardian & Security Authorization` -> `Pickup Authorization`
     - `Medical & Health Record` -> `Medical Record`
     - `Special Instructions & Clinic Notes` -> `Clinic Notes`
     - `Academic Standing & Attendance Record` -> `Academic Standing`
   - Strict filter scoping: teacher only views students enrolled in classes they are assigned to.
2. **Attendance Register (`/teacher/attendance`)**:
   - Built `POST /api/attendance` endpoint resolving active session, term, class ID, and upserting directly to PostgreSQL `attendance_records` table on conflict `(student_id, date)`.
   - Purged `localStorage.setItem('oakland_attendance_...')`.
   - Replaced `Loading attendance records...` with centered `<BrandLoader size="lg" />`.
   - Role enforcement: Class Teachers take morning roll call; Subject Teachers view instructional status.
   - Purged compound labels: `Confirm & Submit Register` -> `Submit Register`.

### Phase 4: Teaching Suite (`/teacher/scores`, `/api/scores`, `/teacher/report-cards`, `/teacher/timetable`) - COMPLETED
1. **Subject Assessment Scores (`/teacher/scores`)**:
   - Built dedicated Next.js API route `FRONTEND/src/app/api/scores/route.ts` (GET and POST) storing subject scores directly in PostgreSQL (`schools.settings.subject_scores`).
   - Eradicate `oakland_class_subject_scores` from `localStorage`.
   - Clean titles: `Enter Subject Scores & Grades` -> `Subject Scores`, `Homeroom & Subject Gradebook` -> `Homeroom Gradebook`.
   - Real database score auto-calculation (CA 1, CA 2, Exam).
2. **Terminal Report Cards (`/teacher/report-cards`)**:
   - Purged `localStorage.getItem('oakland_class_subject_scores')`.
   - Connected scores lookup directly to live `/api/scores`.
   - Purged hardcoded fake scores (`ca1 = 17`, `ca2 = 18`, `exam = 52`, `classHighest: 94`, `classAverage: 72`, `1st of 38`): unentered subjects resolve strictly to clean empty states (`0` marks, `'—'` remark, `'—'` rank).
   - Purged fake pre-filled remarks: remarks strictly initialize empty (`''`).
   - Cleaned compound ampersands in subjects and domain ratings (`Creative & Cultural Arts` -> `Creative and Cultural Arts`, `Physical Education`, `Practical Craft`, `Creative Arts`).
3. **Class Timetable (`/teacher/timetable`)**:
   - Purged `oakland_master_timetable` from `localStorage`.
   - Fetches authoritative timetable directly from live `/api/timetable` in PostgreSQL.
   - Table header cleaned: `Period / Time` -> `Period`.
   - Rendered centered `<BrandLoader size="lg" />` during loading.

### Phase 5: Invariant Audit, Type Check, and Verification - COMPLETED
1. **Automated Grep Sweeps**:
   - ZERO `localStorage` across `FRONTEND/src/app/(teacher)` (verified).
   - ZERO `localhost:5000` (verified).
   - ZERO prohibited mock names (`Adeleke`, etc.) (verified).
   - ZERO compound slashes or ampersands in titles and labels (verified).
   - ZERO text loading spinners (verified).
2. **Type Compilation**:
   - `npx tsc --noEmit` exited with code 0 (zero errors).
3. **HTTP 200 Verification**:
   - All 7 teacher routes verified HTTP 200:
     - `http://localhost:3000/teacher` -> 200
     - `http://localhost:3000/teacher/profile` -> 200
     - `http://localhost:3000/teacher/students` -> 200
     - `http://localhost:3000/teacher/attendance` -> 200
     - `http://localhost:3000/teacher/report-cards` -> 200
     - `http://localhost:3000/teacher/scores` -> 200
     - `http://localhost:3000/teacher/timetable` -> 200
