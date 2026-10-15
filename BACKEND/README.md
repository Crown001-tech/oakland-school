# Oakland School Backend (Modular Monolith MVC)

This directory contains the complete backend API server for Oakland School, designed as a **Modular Monolith** using the **Model-View-Controller (MVC)** architectural pattern with TypeScript and Express.

---

## Architectural Pattern: Modular Monolith (MVC)

Every domain feature is completely encapsulated within its own module in `src/modules/<domain>/` with strict separation of concerns:

```
src/modules/<feature>/
├── <feature>.model.ts        # MODEL: Database access, Supabase queries, entity logic
├── <feature>.view.ts         # VIEW: Response formatting, DTO serialization, view presenters
├── <feature>.controller.ts   # CONTROLLER: Request handling, validation & flow orchestration
└── <feature>.routes.ts       # ROUTE: Endpoint definitions and role middleware
```

---

## Directory Structure

```
BACKEND/
├── src/
│   ├── config/
│   │   ├── env.ts                   # Environment variables loader
│   │   └── supabase.ts              # Supabase admin and scoped client instances
│   ├── common/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   # JWT verification & role authorization (proprietor, admin, teacher, bursar)
│   │   │   ├── error.middleware.ts  # Global exception handling & 404 router
│   │   │   └── validation.middleware.ts # Zod schema request validation
│   │   ├── utils/
│   │   │   └── response.util.ts     # Standardized REST response serializer (JSend format)
│   │   └── types/
│   │       └── database.types.ts    # Centralized database models & TypeScript interfaces
│   ├── modules/
│   │   ├── auth/                    # Login, register, session inspection, logout
│   │   ├── students/                # Student CRUD, enrollment history, guardian links
│   │   ├── academics/               # Sessions, terms, classrooms, subjects, assignments
│   │   ├── attendance/              # Roll-call sheets, daily attendance tracking & metrics
│   │   ├── scores/                  # Continuous assessment scores, exams & report cards
│   │   ├── finance/                 # Bursar accounting, fee payments, ledger, receipts
│   │   ├── staff/                   # Employee directory, teacher workloads, leave requests
│   │   └── admissions/              # Public applications, status workflows, admission
│   ├── routes/
│   │   └── index.ts                 # Aggregated /api/v1 router
│   ├── app.ts                       # Express application bootstrap & CORS setup
│   └── server.ts                    # HTTP server listener & graceful shutdown
│
├── supabase/
│   ├── migrations/                  # SQL schema migrations & RLS policies
│   └── clean_test_reset.sql         # Test seed script
│
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## API Endpoints Overview (`/api/v1`)

| Module | Endpoint | Method | Role / Access | Description |
|---|---|---|---|---|
| **Health** | `/api/v1/health` | `GET` | Public | Backend health check |
| **Auth** | `/api/v1/auth/login` | `POST` | Public | User authentication |
| **Auth** | `/api/v1/auth/register` | `POST` | Public / Admin | Account creation |
| **Auth** | `/api/v1/auth/me` | `GET` | Authenticated | Get current logged-in profile |
| **Students** | `/api/v1/students` | `GET` | Authenticated | List students (filterable by status/search) |
| **Students** | `/api/v1/students/:id` | `GET` | Authenticated | Get student profile with guardians & classes |
| **Students** | `/api/v1/students` | `POST` | Admin / Proprietor | Register new student |
| **Students** | `/api/v1/students/:id` | `PUT` | Teacher / Admin | Update student profile |
| **Academics** | `/api/v1/academics/calendar` | `GET` | Authenticated | Current academic session and terms |
| **Academics** | `/api/v1/academics/classes` | `GET` | Authenticated | List classrooms and enrollment counts |
| **Academics** | `/api/v1/academics/subjects` | `GET` | Authenticated | Curriculum subjects |
| **Attendance**| `/api/v1/attendance/class/:classId` | `GET` | Authenticated | Daily class attendance sheet |
| **Attendance**| `/api/v1/attendance/mark` | `POST` | Teacher / Admin | Batch record attendance |
| **Scores** | `/api/v1/scores/assessments` | `GET` | Authenticated | List assessments |
| **Scores** | `/api/v1/scores/record` | `POST` | Teacher / Admin | Batch grade submission |
| **Finance** | `/api/v1/finance/overview` | `GET` | Bursar / Admin | Financial ledger & KPIs |
| **Finance** | `/api/v1/finance/pay-fees` | `POST` | Bursar / Admin | Record student tuition payment |
| **Staff** | `/api/v1/staff` | `GET` | Authenticated | Staff directory & assignments |
| **Staff** | `/api/v1/staff/leave` | `POST` | Authenticated | Submit leave request |
| **Admissions**| `/api/v1/admissions/apply` | `POST` | Public | Submit new admission application |
| **Admissions**| `/api/v1/admissions` | `GET` | Admin / Proprietor | Review admission applications |

---

## Running the Backend

### Development Mode (with hot-reloading)
```bash
cd BACKEND
npm run dev
```

### Production Build
```bash
cd BACKEND
npm run build
npm start
```
