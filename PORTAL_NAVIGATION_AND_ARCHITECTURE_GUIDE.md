# Oakland International School — System Architecture & Portal Guide

This document explains in plain, simple English how the Oakland School system works, who can do what, and how every part of the system connects together.

---

## 1. Class Teacher vs. Subject Teacher: Authorizations & System Access

In Oakland School, teaching staff are divided into two distinct roles. They have completely different system permissions, different screens, and different jobs.

```
                    ┌────────────────────────────────────────┐
                    │            TEACHING FACULTY            │
                    └───────────────────┬────────────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
     ┌───────────────────────┐                     ┌───────────────────────┐
     │     CLASS TEACHER     │                     │    SUBJECT TEACHER    │
     └───────────┬───────────┘                     └───────────┬───────────┘
                 │                                             │
      • Exactly One Homeroom Class                  • Assigned Subjects & Classes Only
      • Can take Morning Roll Call                  • Can enter CA 1, CA 2 & Exam scores
      • Can view Class Student Details              • Can Lock & Seal Subject Scores
      • Can write Report Card Remarks               • BLOCKED from Morning Roll Call
      • Receives Monthly Allowance                  • BLOCKED from Conduct Remarks
```

### Class Teacher (Homeroom Teacher)
* **What they do**: Takes custody of **strictly one class** (for example, JSS 1).
* **Their specific authorizations**:
  1. **Daily Morning Attendance (Roll Call)**: Every morning, only the assigned Class Teacher is authorized to open the attendance register and mark pupils as *Present*, *Late*, or *Absent*.
  2. **Class Student Records**: Can view the complete student list for their homeroom, including emergency phone numbers and guardian contacts.
  3. **End-of-Term Conduct Remarks**: When term ends, the Class Teacher rates student behavior and writes the official teacher remarks on the report card.
  4. **Class Teacher Allowance**: Receives an extra monthly responsibility allowance (set in master settings, e.g. +₦35,000) added to their base pay.
* **What they are BLOCKED from doing**:
  * Cannot take morning attendance for any other class.
  * Cannot write conduct remarks for any other class.

### Subject Teacher
* **What they do**: Teaches specific subjects to specific classes (for example, *Computer Studies* for JSS 1 and JSS 2).
* **Their specific authorizations**:
  1. **Score Entry**: Authorized to enter marks for their assigned subjects only:
     * **CA 1** (Continuous Assessment 1, maximum 20 marks)
     * **CA 2** (Continuous Assessment 2, maximum 20 marks)
     * **Exam** (End of term examination, maximum 60 marks)
  2. **Locking Scores**: When done entering scores, they click **Synchronize and Lock**. This seals their scores, prevents accidental edits, and sends the marks directly to the broadsheets and report cards.
* **What they are BLOCKED from doing**:
  * **Cannot mark morning attendance**: If a Subject Teacher opens the attendance page, the system displays an authorization notice reminding them that only the appointed Class Teacher can submit the register.
  * **Cannot write conduct remarks**: They cannot rate behavioral traits or write class remarks on student report cards.
  * **Cannot view or grade other subjects**: They only see and grade the subjects they are officially assigned to teach.

### Dual Role (When a Teacher is Both)
* If a teacher is assigned as the **Class Teacher of JSS 1**, and ALSO teaches **Mathematics to JSS 1, JSS 2, and JSS 3**:
  * For **JSS 1**, they have full Class Teacher authorization (morning roll call, emergency contacts, and conduct remarks).
  * For **Mathematics**, they have Subject Teacher authorization across JSS 1, JSS 2, and JSS 3 to enter and lock test and exam marks.
  * They have NO Class Teacher authorization over JSS 2 or JSS 3.

### Non-Teaching Staff
* Roles like Security, Cleaners, Drivers, Maintenance, and Nurses.
* Have **zero access** to student grading, roll-call attendance, or report cards.

---

## 2. All System Relationships: How Every Part of Oakland School Connects

Here is a simple, complete explanation of how all data and actions connect across the entire system:

### Relationship 1: Curriculum ➔ Subject Assignments & Scores
* Teachers cannot be assigned random, made-up subjects.
* Only subjects that are already registered in the official **Curriculum** (e.g. Mathematics, English Language, Basic Science, Computer Studies) can be assigned to teachers.
* When assigning subjects to a teacher, the system only shows subjects from the Curriculum.
* When a teacher opens the scorebook, they can only enter marks for subjects registered in the Curriculum and assigned to their account.

### Relationship 2: Proprietor Delegations ➔ Principal Permissions
* The **Proprietor** owns the school and holds all master authority.
* The Proprietor can hand over (delegate) or revoke specific powers from the Principal using simple on/off switches in Settings:
  1. **Can Onboard Staff**: Allows the Principal to register new staff accounts.
  2. **Can Edit Curriculum**: Allows the Principal to add or change subjects.
  3. **Can Approve Admissions**: Allows the Principal to accept new students.
  4. **Can Set Calendar Events**: Allows the Principal to add school term dates and events.
  5. **Can Approve Leave**: Allows the Principal to approve teacher leave requests.
  6. **Can Endorse Results**: Allows the Principal to release report cards.
* **What happens when a power is turned OFF**: If the Proprietor turns a switch OFF, the Principal is instantly blocked from that action. The Principal’s screen displays: *"This authority has been reserved by the Proprietor"*.

### Relationship 3: Proprietor Broadcasts ➔ Staff Dashboards
* When the Proprietor types an announcement in **Staff Broadcast** (`/proprietor/broadcast`) and sends it, it instantly travels across the entire school.
* The message appears immediately as a live notice banner at the top of:
  * The Principal's dashboard
  * The Bursar's dashboard
  * All Teachers' dashboards
* Everyone sees the Proprietor's announcement the moment they log in.

### Relationship 4: Admissions Workflow (Public to Database)
* **Step 1**: A parent submits an admission application form on the public website.
* **Step 2**: The application appears on the Principal's admissions desk (`/admin/admissions`) with the status **Pending Review**. The Principal checks the child’s age, previous school report, and birth certificate.
* **Step 3**: The Proprietor reviews the application (`/proprietor/admissions`) and makes the final decision:
  * **Accept**: Clicking Accept automatically assigns the student a real admission number (e.g., `OAK-2026-004`), enrolls them directly into PostgreSQL, and places them into their class (e.g., JSS 1).
  * **Decline**: Marks the application as declined.
* No intermediate paperwork or confusing stages.

### Relationship 5: The 4-Step Report Card & Grading Chain
Report cards follow a strict step-by-step chain of approval before reaching parents:
```
[1. Subject Teacher] Enters CA 1 (20), CA 2 (20) & Exam (60), then clicks Synchronize & Lock.
         ▼
[2. Class Teacher]   Reviews combined marks for their homeroom and writes personal conduct remarks.
         ▼
[3. Principal]       Inspects class broadsheets, checks student averages, and adds Principal remarks.
         ▼
[4. Proprietor]      Gives the final Executive Endorsement to officially sign and release the report cards.
```

### Relationship 6: Financial Isolation (Bursar vs. Principal)
* The **Principal** is strictly kept away from school money. The Principal cannot see school bank balances, cannot collect tuition fees, and cannot view or edit staff salaries.
* The **Bursar** handles all money operations:
  * Invoices students based on the official tuition fees set by the Proprietor in master settings (`tuitionJSS`, `tuitionSS12`, `tuitionSS3`).
  * Records cash and bank transfer payments, and generates printable official stamped payment receipts.
  * Runs staff monthly payroll based on official base pay plus Class Teacher allowance.
  * Records operational school expenses (diesel, repairs, office supplies) and manages daily petty cash.
* **Zero Pension Deductions**: Pension deductions are 100% eliminated from all payroll, profiles, and ledgers. Staff take home their full base salary plus allowance.

### Relationship 7: One Class = One Class Teacher & Dynamic Capacity
* Each student belongs to strictly **one class**.
* Each class can have strictly **one Class Teacher**. The system actively prevents assigning two Class Teachers to the same class.
* Class capacity (maximum students per class, default 50) is pulled live from master school settings. The system counts enrolled students and prevents overcrowding.

### Relationship 8: Gate Security & 4-Digit Pickup PIN
* Every authorized parent or guardian is assigned a simple **4-digit Pickup PIN**.
* When picking up a student at dismissal time, the school gate security or Principal checks the student in the system and asks the guardian for their 4-digit PIN.
* If the PIN matches what is stored in the database, the pickup is logged and the child is released. If it does not match, the child stays safe inside.

### Relationship 9: Staff Passwords & 1-Click Reset
* When any staff account is created, it comes with a universal default password: **`Oakland@2026`**.
* The administrator can view the password, copy it with one click, or reset a teacher's password back to `Oakland@2026` with one click if they ever get locked out.

### Relationship 10: Morning Roll Call ➔ School Attendance Overview
* When a Class Teacher submits their morning attendance register, the live attendance counts update immediately on the Principal's and Proprietor's screens.
* If a Class Teacher forgets to submit morning roll call by the deadline (e.g. 9:00 AM), the system flags the missing register so the Principal can follow up.

### Relationship 11: Teacher Leave Requests ➔ Approval Line
* A teacher submits a leave request through their profile.
* The request goes to the Principal's Leave Requests desk (`/admin/leave`).
* The Principal reviews it and forwards the recommendation to the Proprietor (`/proprietor/staff-approvals`).
* The Proprietor makes the final decision to approve or reject the leave.

---

## 3. Proprietor Portal (`/proprietor`) — Complete List of Links

The Proprietor is the owner and head of the school. This portal gives total oversight and the final word on all school decisions.

```
Proprietor Portal Navigation
├── OVERVIEW
│   └── Dashboard (/proprietor)
├── STUDENTS
│   ├── Students (/proprietor/students)
│   ├── Admissions (/proprietor/admissions)
│   └── Attendance (/proprietor/attendance)
├── STAFF
│   ├── Staff Directory (/proprietor/staff)
│   ├── Staff Approvals (/proprietor/staff-approvals)
│   └── Staff Broadcast (/proprietor/broadcast)
├── ACADEMICS
│   ├── Classes (/proprietor/classes)
│   ├── Calendar (/proprietor/calendar)
│   ├── Timetable (/proprietor/timetable)
│   └── Results (/proprietor/results)
├── FINANCE
│   ├── Finances (/proprietor/finances)
│   └── Activity Log (/proprietor/activity)
└── GENERAL
    ├── Documents (/proprietor/documents)
    ├── School Profile (/proprietor/profile)
    ├── My Profile (/proprietor/my-profile)
    └── Settings (/proprietor/settings)
```

| Group | Link Name | Route | What It Does & What It Is For |
| :--- | :--- | :--- | :--- |
| **OVERVIEW** | **Dashboard** | `/proprietor` | Main summary screen. Shows total school tuition collected, total number of enrolled students, total staff employed, and pending admission requests that need approval. |
| **STUDENTS** | **Students** | `/proprietor/students` | Master student list. Lets the Proprietor search and view any student in the school from JSS 1 to SS 3, check their class, view parent contacts, and see their fee payment status. |
| **STUDENTS** | **Admissions** | `/proprietor/admissions` | Online admissions desk. Where the Proprietor views incoming student applications and clicks **Accept** (which immediately registers the student in the database) or **Decline**. |
| **STUDENTS** | **Attendance** | `/proprietor/attendance` | School attendance summary. Shows daily attendance percentages across all 6 classes and highlights if any class teacher forgot to take morning roll call. |
| **STAFF** | **Staff Directory**| `/proprietor/staff` | Master staff list. Add new staff, assign roles, view default login passwords (`Oakland@2026`), reset passwords, or deactivate accounts. |
| **STAFF** | **Staff Approvals**| `/proprietor/staff-approvals`| Approvals box. Where the Proprietor reviews and approves staff leave requests, promotions, or special requests sent by the Principal. |
| **STAFF** | **Staff Broadcast**| `/proprietor/broadcast` | Message center. Write an announcement that immediately displays on the dashboards of all teachers, the Principal, and the Bursar. |
| **ACADEMICS**| **Classes** | `/proprietor/classes` | Class oversight. View all 6 classes (JSS 1 to SS 3), see how many students are in each class, view the assigned Class Teacher, and check class capacity limits. |
| **ACADEMICS**| **Calendar** | `/proprietor/calendar` | School term calendar. Sets official term dates, exam dates, mid-term breaks, and national holidays. |
| **ACADEMICS**| **Timetable** | `/proprietor/timetable` | Master schedule view. Read-only view of the weekly teaching schedule for every class and teacher. |
| **ACADEMICS**| **Results** | `/proprietor/results` | Final report card approval. The Proprietor checks class broadsheets and clicks **Endorse All Classes** to officially release report cards to parents. |
| **FINANCE** | **Finances** | `/proprietor/finances` | School financial ledger. Audits tuition fees collected, unpaid student fee balances, school expenditures, and staff payroll totals. |
| **FINANCE** | **Activity Log** | `/proprietor/activity` | Security audit trail. Shows a live history of every action taken in the system (who logged in, who edited a mark, who printed a receipt, and when). |
| **GENERAL** | **Documents** | `/proprietor/documents` | School file storage. Stores official school documents like Ministry of Education accreditation, school policies, and legal agreements. |
| **GENERAL** | **School Profile**| `/proprietor/profile` | School identity. Sets the school name, official address, contact phone numbers, logo, and motto. |
| **GENERAL** | **My Profile** | `/proprietor/my-profile` | Personal account. Where the Proprietor can update their personal email, phone number, and password. |
| **GENERAL** | **Settings** | `/proprietor/settings` | Master school controls. Set official school fees (JSS, SS1-2, SS3), staff base salaries, class teacher allowances, class capacity (50), and turn Principal delegations on or off. |

---

## 4. Principal Portal (`/admin`) — Complete List of Links

The Principal is **Mr Seyi Bankole** (Head of School). This portal is used for day-to-day academic operations, teacher supervision, student behavior, and gate security.

```
Principal Portal Navigation
├── OVERVIEW
│   └── Dashboard (/admin)
├── ACADEMICS
│   ├── Timetable (/admin/timetable)
│   ├── School Calendar (/admin/calendar)
│   ├── Report Cards (/admin/results)
│   ├── Curriculum (/admin/academic)
│   └── Attendance (/admin/attendance)
├── PEOPLE
│   ├── Students (/admin/students)
│   ├── Staff (/admin/staff)
│   └── Leave Requests (/admin/leave)
├── OPERATIONS
│   ├── Gate Security (/admin/pickup)
│   └── Inventory (/admin/inventory)
└── ADMIN
    ├── Communications (/admin/communications)
    ├── Document Centre (/admin/documents)
    ├── Admissions (/admin/admissions)
    ├── Audit Log (/admin/audit)
    └── Settings (/admin/settings)
```

| Group | Link Name | Route | What It Does & What It Is For |
| :--- | :--- | :--- | :--- |
| **OVERVIEW** | **Dashboard** | `/admin` | Academic control center. Shows today’s pupil attendance count, which teachers have completed roll call, upcoming school events, and shortcut buttons. |
| **ACADEMICS**| **Timetable** | `/admin/timetable` | Timetable builder. Creates and edits the weekly teaching schedule for all classes, assigns teachers to periods, and prevents double-booking. |
| **ACADEMICS**| **School Calendar**| `/admin/calendar`| Term dates and events. Keeps track of school assemblies, exam timetables, visiting days, and public holidays. |
| **ACADEMICS**| **Report Cards** | `/admin/results` | Academic broadsheets. Inspects marks submitted by subject teachers, checks student rankings, writes official Principal remarks, and sends approved results to the Proprietor. |
| **ACADEMICS**| **Curriculum** | `/admin/academic` | Subject list. Manages the Junior Secondary subjects and Senior Secondary streams (Science, Commercial, Arts). Teachers can only be assigned subjects registered here. |
| **ACADEMICS**| **Attendance** | `/admin/attendance` | Daily attendance monitor. Checks every morning to verify which Class Teachers have marked attendance and lists absent students. |
| **PEOPLE** | **Students** | `/admin/students` | Student management. View student profiles, assign students to classes, update guardian contacts, and manage student status. |
| **PEOPLE** | **Staff** | `/admin/staff` | Teacher management. Assigns Class Teachers to homerooms (strictly one per class), allocates subjects to teachers, and manages staff contact info. |
| **PEOPLE** | **Leave Requests**| `/admin/leave` | Staff absence desk. Receives leave applications from teachers and forwards recommended approvals to the Proprietor. |
| **OPERATIONS**| **Gate Security** | `/admin/pickup` | Dismissal safety desk. Verifies the 4-digit Pickup PIN of parents picking up children at the school gate before allowing the student to leave. |
| **OPERATIONS**| **Inventory** | `/admin/inventory` | School assets. Tracks laboratory equipment, sports gear, library books, and examination answer booklets. |
| **ADMIN** | **Communications**| `/admin/communications`| School notices. Issues parent newsletters, circulars, and teacher memorandums. |
| **ADMIN** | **Document Centre**| `/admin/documents`| Document maker. Generates formal student transcripts, transfer certificates, and recommendation letters. |
| **ADMIN** | **Admissions** | `/admin/admissions` | Application screening. Reviews incoming student applications and checks their academic credentials before recommending them to the Proprietor. |
| **ADMIN** | **Audit Log** | `/admin/audit` | Academic history. Shows a log of score submissions, attendance updates, and student class transfers. |
| **ADMIN** | **Settings** | `/admin/settings` | Account settings. Manages the Principal's login password and notification preferences. |

---

## 5. Bursar Portal (`/bursar`) — Complete List of Links

The Bursar is **Mrs Folake Esther** (Chief Financial Officer). This portal handles fee collections, payment receipts, staff salary payouts, and petty cash.

```
Bursar Portal Navigation
├── OVERVIEW
│   ├── Dashboard (/bursar)
│   └── My Profile (/bursar/profile)
└── PAYMENTS
    ├── Fees and Receipts (/bursar/fees)
    ├── Salaries (/bursar/payroll)
    ├── Expenditures (/bursar/expenditures)
    └── Petty Cash (/bursar/petty-cash)
```

| Group | Link Name | Route | What It Does & What It Is For |
| :--- | :--- | :--- | :--- |
| **OVERVIEW** | **Dashboard** | `/bursar` | Financial dashboard. Displays total fees collected this term, outstanding fee arrears owed by parents, today's cash inflows, and quick receipt creation shortcuts. |
| **OVERVIEW** | **My Profile** | `/bursar/profile` | Personal account. Where the Bursar updates their contact email, phone number, and password. |
| **PAYMENTS** | **Fees and Receipts**| `/bursar/fees` | Daily fee workstation. Generates student fee invoices from master rates (`tuitionJSS`, `tuitionSS12`, `tuitionSS3`), records cash/bank transfer payments, tracks partial balances, and generates printable official stamped Payment Receipts. |
| **PAYMENTS** | **Salaries** | `/bursar/payroll` | Staff monthly payroll. Computes monthly staff pay based on master salary settings plus Class Teacher allowances. In line with school policy, pension deductions are completely removed. Exports bank transfer schedules. |
| **PAYMENTS** | **Expenditures**| `/bursar/expenditures`| Expense tracker. Records school expenses like generator diesel, utility bills, building maintenance, and vendor purchases with attached receipts. |
| **PAYMENTS** | **Petty Cash** | `/bursar/petty-cash`| Small cash float. Tracks small daily cash expenses for immediate office needs, transport, and emergency supplies with daily balance checks. |

---

## 6. Teacher Portal (`/teacher`) — Complete List of Links

The Teacher Portal is used by teaching faculty. What a teacher sees depends directly on whether they are a **Class Teacher** or a **Subject Teacher**.

```
Teacher Portal Navigation
├── OVERVIEW
│   ├── Dashboard (/teacher)
│   └── My Profile (/teacher/profile)
├── MY CLASS (Only for Class Teachers)
│   ├── Students (/teacher/students)
│   ├── Attendance (/teacher/attendance)
│   └── Report Cards (/teacher/report-cards)
└── TEACHING (For All Teachers)
    ├── Scores (/teacher/scores)
    └── Timetable (/teacher/timetable)
```

| Group | Link Name | Route | Who Uses It & What It Does |
| :--- | :--- | :--- | :--- |
| **OVERVIEW** | **Dashboard** | `/teacher` | Teacher home screen. Prominently shows their assigned homeroom class (e.g. JSS 1) if they are a Class Teacher, enrolled student count, subjects taught, and today's classes. |
| **OVERVIEW** | **My Profile** | `/teacher/profile` | Personal profile. Where teachers view their qualifications, contact details, bank account for salary payments, and change their login password. |
| **MY CLASS** | **Students** | `/teacher/students` | **Class Teachers Only**. View the official roster and emergency guardian phone numbers for the students in their homeroom class. |
| **MY CLASS** | **Attendance** | `/teacher/attendance`| **Class Teachers Only**. The official morning roll call register. The Class Teacher marks each student as Present, Late, or Absent each morning. |
| **MY CLASS** | **Report Cards**| `/teacher/report-cards`| **Class Teachers Only**. View the overall marks for their homeroom students across all subjects and write the final end-of-term Class Teacher conduct remarks. |
| **TEACHING** | **Scores** | `/teacher/scores` | **Subject Teachers**. The gradebook where teachers enter Continuous Assessment (CA 1, CA 2) and Exam marks for their assigned subjects and classes. Clicking **Synchronize and Lock** seals the marks. |
| **TEACHING** | **Timetable** | `/teacher/timetable` | **All Teachers**. Personal weekly teaching schedule showing which periods they are teaching and which classrooms they need to be in. |

---

## 7. Summary Table of Institutional Boundaries

| Action | Proprietor | Principal | Bursar | Class Teacher | Subject Teacher |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Change School Tuition & Salary Settings | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| Final Acceptance of New Students | ✅ Yes | 🔍 Screen only | ❌ No | ❌ No | ❌ No |
| Record Fee Payments & Issue Receipts | 🔍 View only | ❌ No | ✅ Yes | ❌ No | ❌ No |
| Compute Staff Payroll | 🔍 Audit only | ❌ No | ✅ Yes | ❌ No | ❌ No |
| Create Weekly Timetable | 🔍 View only | ✅ Yes | ❌ No | 🔍 View only | 🔍 View only |
| Mark Daily Morning Attendance (Roll Call)| 🔍 View summary | 🔍 Monitor all | ❌ No | ✅ Yes (Their class only) | ❌ No |
| Enter Test & Exam Subject Marks | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Yes (Their subjects only) |
| Write Report Card Conduct Remarks | ❌ No | ❌ No | ❌ No | ✅ Yes (Their class only) | ❌ No |
| Write Principal's Report Card Remarks | ❌ No | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Final Endorsement of Report Cards | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| Verify 4-Digit Gate Pickup PIN | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No |
