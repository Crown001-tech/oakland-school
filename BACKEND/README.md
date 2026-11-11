# Oakland School / Eductive — Backend & Database Layer

This directory houses the database schema, PostgreSQL migrations, multi-tenant row-level security (RLS) rules, provisioning automation, and backend database utilities.

---

## Directory Structure

```
BACKEND/
├── supabase/
│   ├── clean_test_reset.sql            # Idempotent database wipe & re-initialization
│   └── migrations/                     # Canonical PostgreSQL migrations (001 to 030)
│       ├── 001_initial_schema.sql      # Core tables: schools, users, classes, students
│       ├── ...
│       ├── 027_class_level_and_arm.sql # Academic levels & arms architecture
│       ├── 028_school_id_on_every_table.sql # Multi-tenant foreign keys across 24 operational tables
│       ├── 029_school_row_level_security.sql # RESTRICTIVE PostgreSQL RLS isolation policies
│       └── 030_report_card_traits_and_public_site.sql # Qualitative remarks, ratings & public site flags
├── scripts/
│   ├── apply-migrations.mjs            # Transactional migration runner against live PostgreSQL
│   ├── audit-school-scope.mjs          # Static analysis auditing tenant boundary isolation
│   └── new-school/                     # Multi-tenant onboarding automation
│       ├── 001_add_school.sql          # 1-step SQL school provisioning with starter packs
│       ├── 02-create-owner.mjs         # Automatic proprietor user provisioning
│       └── README.md                   # Onboarding walkthrough
└── package.json
```

---

## Architecture & Multi-Tenant Invariants

1. **Shared Database, Isolated Schemas**:
   - All client schools share one high-performance PostgreSQL cluster.
   - Every single operational table carries `school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE`.
2. **Double-Barreled Isolation Enforcement**:
   - **Engine Layer (PostgreSQL RLS)**: Migration 029 applies `AS RESTRICTIVE` policies across all school tables using `public.current_school_id()`. Even direct PostgREST or Supabase client queries with anonymous/authenticated JWTs cannot read or write across tenant boundaries.
   - **Application Layer (Node/Next.js)**: All API routes use `scopeClient` from `FRONTEND/src/lib/school-scope.ts` which automatically binds all `select`, `update`, `delete`, and `insert` operations to the caller's validated `school_id`.
3. **Configurable Academics & Starter Packs**:
   - Provisioning (`001_add_school.sql`) supports `nigerian_nursery`, `nigerian_primary`, and `nigerian_secondary` starter packs, generating the appropriate class levels, arms, subjects, and grading structures.

---

## Applying Migrations to Live Database

To apply migrations (e.g. Migration 029 and 030):

```bash
# From workspace root
node BACKEND/scripts/apply-migrations.mjs 029 030
```

Each migration runs in its own atomic transaction. If any statement encounters an error, the transaction automatically rolls back.

