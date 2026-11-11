-- ====================================================================
-- OAKLAND SCHOOLS MANAGEMENT SYSTEM
-- Migration 002: Granular RBAC, Persistent Audit Trail & Storage Setup
-- 100% Idempotent Migration
-- ====================================================================

-- 1. PERMISSIONS & ROLE-BASED ACCESS CONTROL TABLES
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role_enum NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- Index for fast permission lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);

-- 2. SEED PERMISSION TAXONOMY
INSERT INTO public.permissions (code, module, description)
VALUES
    -- Students
    ('students:view', 'students', 'View student directories and profiles'),
    ('students:create', 'students', 'Admit and register new students'),
    ('students:update', 'students', 'Modify student personal details'),
    ('students:delete', 'students', 'Delete or archive student records'),
    ('students:status:update', 'students', 'Update student enrolment status'),

    -- Attendance
    ('attendance:view', 'attendance', 'View classroom attendance records and trends'),
    ('attendance:mark', 'attendance', 'Record daily classroom attendance for students'),

    -- Scores & Academic Assessments
    ('scores:view', 'scores', 'View student assessment scores'),
    ('scores:record', 'scores', 'Enter and edit continuous assessment and exam marks'),
    ('scores:approve', 'scores', 'Endorse and finalize class scores'),

    -- Results & Report Cards
    ('results:view', 'results', 'View compiled terminal results and report cards'),
    ('results:review', 'results', 'Review class teacher remarks and psychomotor ratings'),
    ('results:approve', 'results', 'Approve report cards for publication'),
    ('results:publish', 'results', 'Publish report cards to students and parents'),

    -- Academics
    ('academics:classes:view', 'academics', 'View classroom lists and grade structures'),
    ('academics:classes:manage', 'academics', 'Create and configure classes'),
    ('academics:subjects:view', 'academics', 'View curriculum subjects directory'),
    ('academics:subjects:manage', 'academics', 'Create, update or retire subjects'),
    ('academics:assign_teacher', 'academics', 'Assign subject teachers and form tutors'),

    -- Staff Management
    ('staff:view', 'staff', 'View staff directory and credentials'),
    ('staff:onboard', 'staff', 'Onboard new instructional and operational personnel'),
    ('staff:appoint:principal', 'staff', 'Appoint the institutional Principal (Executive)'),
    ('staff:appoint:bursar', 'staff', 'Appoint the Bursar (Proprietor exclusive)'),
    ('staff:terminate', 'staff', 'Terminate or suspend staff appointments'),
    ('staff:leave:apply', 'staff', 'Submit leave requests for review'),
    ('staff:leave:review', 'staff', 'Approve or reject personnel leave requests'),

    -- Finance & Bursary (Executive & Bursar Exclusive)
    ('finance:overview:view', 'finance', 'View school revenue, collections, and outstanding dues'),
    ('finance:payments:record', 'finance', 'Record school fee payments and issue official receipts'),
    ('finance:transactions:record', 'finance', 'Log operational expenditures and account vouchers'),
    ('finance:reports:view', 'finance', 'Generate institutional financial statements'),

    -- Admissions
    ('admissions:view', 'admissions', 'View prospective student applications'),
    ('admissions:review', 'admissions', 'Review admission documents and schedule interviews'),
    ('admissions:status:update', 'admissions', 'Approve, reject, or enroll applicants'),

    -- Communications & Notifications
    ('communications:broadcast:staff', 'communications', 'Broadcast institutional directives to all staff'),
    ('communications:official_letters', 'communications', 'Draft and issue formal institutional letters'),
    ('notifications:view', 'notifications', 'View notification delivery telemetry'),
    ('notifications:send', 'notifications', 'Trigger email or SMS notifications'),

    -- System & Audit
    ('audit:logs:view', 'audit', 'Inspect institutional audit trail and event stream'),
    ('system:settings:manage', 'system', 'Configure institution-wide preferences and branding')
ON CONFLICT (code) DO UPDATE SET 
    module = EXCLUDED.module,
    description = EXCLUDED.description;

-- 3. SEED ROLE PERMISSION MAPPINGS (IDEMPOTENT)
-- Helper function to map role permissions
CREATE OR REPLACE FUNCTION public.seed_role_permissions(
    p_role user_role_enum,
    p_permission_codes text[]
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.role_permissions (role, permission_id)
    SELECT p_role, p.id
    FROM public.permissions p
    WHERE p.code = ANY(p_permission_codes)
    ON CONFLICT (role, permission_id) DO NOTHING;
END;
$$;

-- Seed Proprietor Permissions (Executive: All Permissions)
SELECT public.seed_role_permissions('proprietor', ARRAY[
    'students:view', 'students:create', 'students:update', 'students:delete', 'students:status:update',
    'attendance:view', 'attendance:mark',
    'scores:view', 'scores:record', 'scores:approve',
    'results:view', 'results:review', 'results:approve', 'results:publish',
    'academics:classes:view', 'academics:classes:manage', 'academics:subjects:view', 'academics:subjects:manage', 'academics:assign_teacher',
    'staff:view', 'staff:onboard', 'staff:appoint:principal', 'staff:appoint:bursar', 'staff:terminate', 'staff:leave:apply', 'staff:leave:review',
    'finance:overview:view', 'finance:payments:record', 'finance:transactions:record', 'finance:reports:view',
    'admissions:view', 'admissions:review', 'admissions:status:update',
    'communications:broadcast:staff', 'communications:official_letters',
    'notifications:view', 'notifications:send',
    'audit:logs:view', 'system:settings:manage'
]);

-- Seed Admin (Principal) Permissions
-- Principal oversees academics, students, admissions, results, letters.
-- Strict Oakland rule: Bursar reports directly to Proprietor. Principal cannot appoint bursar or tamper with bursar vouchers.
SELECT public.seed_role_permissions('admin', ARRAY[
    'students:view', 'students:create', 'students:update', 'students:delete', 'students:status:update',
    'attendance:view', 'attendance:mark',
    'scores:view', 'scores:record', 'scores:approve',
    'results:view', 'results:review', 'results:approve',
    'academics:classes:view', 'academics:classes:manage', 'academics:subjects:view', 'academics:subjects:manage', 'academics:assign_teacher',
    'staff:view', 'staff:onboard', 'staff:terminate', 'staff:leave:apply', 'staff:leave:review',
    'admissions:view', 'admissions:review', 'admissions:status:update',
    'communications:official_letters',
    'notifications:view', 'notifications:send',
    'audit:logs:view'
]);

-- Seed Bursar Permissions (Exclusive Financial Operations)
SELECT public.seed_role_permissions('bursar', ARRAY[
    'students:view',
    'finance:overview:view', 'finance:payments:record', 'finance:transactions:record', 'finance:reports:view',
    'staff:leave:apply',
    'notifications:view'
]);

-- Seed Teacher Permissions (Instructional & Class Administration)
SELECT public.seed_role_permissions('teacher', ARRAY[
    'students:view',
    'attendance:view', 'attendance:mark',
    'scores:view', 'scores:record',
    'results:view',
    'academics:classes:view', 'academics:subjects:view',
    'staff:leave:apply',
    'notifications:view'
]);

DROP FUNCTION public.seed_role_permissions(user_role_enum, text[]);

-- 4. HARDEN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id),
    actor_role VARCHAR(50) NOT NULL DEFAULT 'system',
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- 5. ROW LEVEL SECURITY (RLS) HARDENING
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissions and Role Permissions: Authenticated users can read permissions taxonomy
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.permissions;
CREATE POLICY "Authenticated users can read permissions" ON public.permissions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can read role_permissions" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

-- Audit logs: Read allowed for users with audit permission (Proprietor & Admin), Insert allowed for authenticated/service
DROP POLICY IF EXISTS "Proprietor and Admin can view audit logs" ON public.audit_logs;
CREATE POLICY "Proprietor and Admin can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.school_memberships sm
            WHERE sm.user_id = auth.uid()
              AND sm.role IN ('proprietor', 'admin')
              AND sm.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS "Allow system and authenticated actors to insert audit logs" ON public.audit_logs;
CREATE POLICY "Allow system and authenticated actors to insert audit logs" ON public.audit_logs
    FOR INSERT TO public
    WITH CHECK (true);

-- 6. SUPABASE STORAGE BUCKETS SETUP (Idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
    ('report-cards', 'report-cards', false, 10485760, ARRAY['application/pdf']),
    ('receipts', 'receipts', false, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('letters', 'letters', false, 10485760, ARRAY['application/pdf']),
    ('staff-documents', 'staff-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Authenticated staff can read documents" ON storage.objects;
CREATE POLICY "Authenticated staff can read documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id IN ('documents', 'report-cards', 'receipts', 'letters', 'staff-documents'));

DROP POLICY IF EXISTS "Staff can upload to school buckets" ON storage.objects;
CREATE POLICY "Staff can upload to school buckets" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN ('documents', 'report-cards', 'receipts', 'letters', 'staff-documents'));

-- ====================================================================
-- End of Migration 002
-- ====================================================================
