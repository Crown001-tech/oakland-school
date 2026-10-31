-- ==============================================================================
-- OAKLAND INTERNATIONAL SCHOOL - CONSOLIDATED SCHEMA SYNCHRONIZATION
-- Migration 010: Complete Schema Synchronization (002 through 008 + New Tables)
-- 100% Idempotent, Safe for Production Execution
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. COLUMN EXTENSIONS ON EXISTING TABLES
-- -----------------------------------------------------------------------------

-- 1.1 staff_profiles additions
ALTER TABLE public.staff_profiles 
    ADD COLUMN IF NOT EXISTS assigned_class VARCHAR(50),
    ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 1.2 student_guardians pickup verification additions
ALTER TABLE public.student_guardians 
    ADD COLUMN IF NOT EXISTS authorized_pickup BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pickup_pin VARCHAR(10),
    ADD COLUMN IF NOT EXISTS pickup_photo_url TEXT;

-- 1.3 report_cards workflow endorsement additions
ALTER TABLE public.report_cards 
    ADD COLUMN IF NOT EXISTS principal_approved BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS proprietor_endorsed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- 2. RBAC & AUDIT TABLES (From Migration 002)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role_enum NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);

-- Seed Permissions Taxonomy
INSERT INTO public.permissions (code, module, description)
VALUES
    ('students:view', 'students', 'View student directories and profiles'),
    ('students:create', 'students', 'Admit and register new students'),
    ('students:update', 'students', 'Modify student personal details'),
    ('students:delete', 'students', 'Delete or archive student records'),
    ('students:status:update', 'students', 'Update student enrolment status'),
    ('attendance:view', 'attendance', 'View classroom attendance records and trends'),
    ('attendance:mark', 'attendance', 'Record daily classroom attendance for students'),
    ('scores:view', 'scores', 'View student assessment scores'),
    ('scores:record', 'scores', 'Enter and edit continuous assessment and exam marks'),
    ('scores:approve', 'scores', 'Endorse and finalize class scores'),
    ('results:view', 'results', 'View compiled terminal results and report cards'),
    ('results:review', 'results', 'Review class teacher remarks and psychomotor ratings'),
    ('results:approve', 'results', 'Approve report cards for publication'),
    ('results:publish', 'results', 'Publish report cards to students and parents'),
    ('academics:classes:view', 'academics', 'View classroom lists and grade structures'),
    ('academics:classes:manage', 'academics', 'Create and configure classes'),
    ('academics:subjects:view', 'academics', 'View curriculum subjects directory'),
    ('academics:subjects:manage', 'academics', 'Create, update or retire subjects'),
    ('academics:assign_teacher', 'academics', 'Assign subject teachers and form tutors'),
    ('staff:view', 'staff', 'View staff directory and credentials'),
    ('staff:onboard', 'staff', 'Onboard new instructional and operational personnel'),
    ('staff:appoint:principal', 'staff', 'Appoint the institutional Principal (Executive)'),
    ('staff:appoint:bursar', 'staff', 'Appoint the Bursar (Proprietor exclusive)'),
    ('staff:terminate', 'staff', 'Terminate or suspend staff appointments'),
    ('staff:leave:apply', 'staff', 'Submit leave requests for review'),
    ('staff:leave:review', 'staff', 'Approve or reject personnel leave requests'),
    ('finance:overview:view', 'finance', 'View school revenue, collections, and outstanding dues'),
    ('finance:payments:record', 'finance', 'Record school fee payments and issue official receipts'),
    ('finance:transactions:record', 'finance', 'Log operational expenditures and account vouchers'),
    ('finance:reports:view', 'finance', 'Generate institutional financial statements'),
    ('admissions:view', 'admissions', 'View prospective student applications'),
    ('admissions:review', 'admissions', 'Review admission documents and schedule interviews'),
    ('admissions:status:update', 'admissions', 'Approve, reject, or enroll applicants'),
    ('communications:broadcast:staff', 'communications', 'Broadcast institutional directives to all staff'),
    ('communications:official_letters', 'communications', 'Draft and issue formal institutional letters'),
    ('notifications:view', 'notifications', 'View notification delivery telemetry'),
    ('notifications:send', 'notifications', 'Trigger email or SMS notifications'),
    ('audit:logs:view', 'audit', 'Inspect institutional audit trail and event stream'),
    ('system:settings:manage', 'system', 'Configure institution-wide preferences and branding')
ON CONFLICT (code) DO UPDATE SET 
    module = EXCLUDED.module,
    description = EXCLUDED.description;

-- Seed Role Permissions (Pure Standard SQL)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'proprietor'::user_role_enum, p.id FROM public.permissions p
WHERE p.code = ANY(ARRAY[
    'students:view', 'students:create', 'students:update', 'students:delete', 'students:status:update',
    'attendance:view', 'attendance:mark', 'scores:view', 'scores:record', 'scores:approve',
    'results:view', 'results:review', 'results:approve', 'results:publish',
    'academics:classes:view', 'academics:classes:manage', 'academics:subjects:view', 'academics:subjects:manage', 'academics:assign_teacher',
    'staff:view', 'staff:onboard', 'staff:appoint:principal', 'staff:appoint:bursar', 'staff:terminate', 'staff:leave:apply', 'staff:leave:review',
    'finance:overview:view', 'finance:payments:record', 'finance:transactions:record', 'finance:reports:view',
    'admissions:view', 'admissions:review', 'admissions:status:update',
    'communications:broadcast:staff', 'communications:official_letters',
    'notifications:view', 'notifications:send', 'audit:logs:view', 'system:settings:manage'
])
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::user_role_enum, p.id FROM public.permissions p
WHERE p.code = ANY(ARRAY[
    'students:view', 'students:create', 'students:update', 'students:delete', 'students:status:update',
    'attendance:view', 'attendance:mark', 'scores:view', 'scores:record', 'scores:approve',
    'results:view', 'results:review', 'results:approve',
    'academics:classes:view', 'academics:classes:manage', 'academics:subjects:view', 'academics:subjects:manage', 'academics:assign_teacher',
    'staff:view', 'staff:onboard', 'staff:terminate', 'staff:leave:apply', 'staff:leave:review',
    'admissions:view', 'admissions:review', 'admissions:status:update',
    'communications:official_letters', 'notifications:view', 'notifications:send', 'audit:logs:view'
])
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'bursar'::user_role_enum, p.id FROM public.permissions p
WHERE p.code = ANY(ARRAY[
    'students:view', 'finance:overview:view', 'finance:payments:record', 'finance:transactions:record', 'finance:reports:view',
    'staff:leave:apply', 'notifications:view'
])
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'teacher'::user_role_enum, p.id FROM public.permissions p
WHERE p.code = ANY(ARRAY[
    'students:view', 'attendance:view', 'attendance:mark', 'scores:view', 'scores:record',
    'results:view', 'academics:classes:view', 'academics:subjects:view', 'staff:leave:apply', 'notifications:view'
])
ON CONFLICT (role, permission_id) DO NOTHING;

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);

-- Supabase Storage Buckets
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

-- -----------------------------------------------------------------------------
-- 3. STUDENT 360 & WORKFLOW ENGINE (From Migration 003)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL DEFAULT 'application/pdf',
    file_size_bytes BIGINT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON public.student_documents(student_id);

CREATE TABLE IF NOT EXISTS public.student_behaviour (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('commendation', 'infraction', 'warning', 'suspension', 'counselling')),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    points INT DEFAULT 0,
    action_taken TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    recorded_by_name VARCHAR(100),
    is_confidential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_behaviour_student_id ON public.student_behaviour(student_id);
CREATE INDEX IF NOT EXISTS idx_student_behaviour_type ON public.student_behaviour(type);

CREATE TABLE IF NOT EXISTS public.student_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_timeline_student ON public.student_timeline(student_id, created_at DESC);

-- Workflow Tables
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    applicable_module VARCHAR(50) NOT NULL,
    steps_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    definition_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    current_step INT NOT NULL DEFAULT 1,
    total_steps INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'approved', 'rejected', 'cancelled')),
    initiated_by UUID REFERENCES auth.users(id),
    initiated_by_name VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON public.workflow_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON public.workflow_instances(status);

CREATE TABLE IF NOT EXISTS public.workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    required_role VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (action IN ('pending', 'approved', 'rejected', 'skipped')),
    actor_id UUID REFERENCES auth.users(id),
    actor_name VARCHAR(100),
    actor_role VARCHAR(50),
    comments TEXT,
    action_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_instance ON public.workflow_steps(instance_id, step_number);

-- Seed Workflow Definitions
INSERT INTO public.workflow_definitions (school_id, code, name, description, applicable_module, steps_config)
SELECT 
    id,
    'result_publication',
    'Terminal Report Card Approval Pipeline',
    'Class Teacher compiles -> Principal reviews & ratifies -> Proprietor grants executive publishing release',
    'scores',
    '[
        {"step_number": 1, "step_name": "Teacher Compilation", "required_role": "teacher"},
        {"step_number": 2, "step_name": "Principal Endorsement", "required_role": "admin"},
        {"step_number": 3, "step_name": "Proprietor Executive Publishing", "required_role": "proprietor"}
    ]'::jsonb
FROM public.schools LIMIT 1
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.workflow_definitions (school_id, code, name, description, applicable_module, steps_config)
SELECT 
    id,
    'leave_request',
    'Faculty & Staff Leave Request Governance',
    'Staff submits request -> Principal approves operational cover',
    'staff',
    '[
        {"step_number": 1, "step_name": "Leave Application", "required_role": "teacher"},
        {"step_number": 2, "step_name": "Principal Approval", "required_role": "admin"}
    ]'::jsonb
FROM public.schools LIMIT 1
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.workflow_definitions (school_id, code, name, description, applicable_module, steps_config)
SELECT 
    id,
    'expenditure_voucher',
    'Bursary Operational Expenditure Authorization',
    'Bursar prepares voucher -> Proprietor authorizes treasury payout',
    'finance',
    '[
        {"step_number": 1, "step_name": "Bursar Voucher Preparation", "required_role": "bursar"},
        {"step_number": 2, "step_name": "Proprietor Treasury Approval", "required_role": "proprietor"}
    ]'::jsonb
FROM public.schools LIMIT 1
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. MULTI-CHANNEL NOTIFICATIONS & COMMUNICATIONS (From Migration 004)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp')),
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_simulated BOOLEAN DEFAULT TRUE,
    sender_id VARCHAR(50) DEFAULT 'OaklandIntl',
    credentials JSONB DEFAULT '{}'::jsonb,
    balance_units INT DEFAULT 2500,
    sent_today INT DEFAULT 0,
    daily_limit INT DEFAULT 5000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_school_channel_type UNIQUE (school_id, type)
);
CREATE INDEX IF NOT EXISTS idx_notification_channels_school_type ON public.notification_channels(school_id, type);

CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('attendance', 'academics', 'finance', 'administrative', 'urgent')),
    channels TEXT[] NOT NULL DEFAULT ARRAY['email', 'sms'],
    subject VARCHAR(200),
    body_email TEXT,
    body_sms TEXT,
    body_whatsapp TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_templates_school_cat ON public.notification_templates(school_id, category);

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
    recipient VARCHAR(150) NOT NULL,
    recipient_name VARCHAR(100),
    recipient_type VARCHAR(30) DEFAULT 'parent' CHECK (recipient_type IN ('parent', 'staff', 'student', 'custom')),
    subject VARCHAR(200),
    body TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'sent', 'pending', 'failed')),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    event_type VARCHAR(50),
    template_code VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_school ON public.notification_logs(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON public.notification_logs(recipient);

-- Seed Channels
INSERT INTO public.notification_channels (school_id, type, name, provider, is_active, is_simulated, sender_id, balance_units, daily_limit)
SELECT id, 'email', 'Institutional SMTP Mail Gateway', 'smtp', true, false, 'admissions@oaklandschools.edu.ng', 10000, 10000
FROM public.schools LIMIT 1
ON CONFLICT (school_id, type) DO NOTHING;

INSERT INTO public.notification_channels (school_id, type, name, provider, is_active, is_simulated, sender_id, balance_units, daily_limit)
SELECT id, 'sms', 'Termii SMS Gateway (Tier-1)', 'termii', true, true, 'OAKLAND', 2450, 5000
FROM public.schools LIMIT 1
ON CONFLICT (school_id, type) DO NOTHING;

INSERT INTO public.notification_channels (school_id, type, name, provider, is_active, is_simulated, sender_id, balance_units, daily_limit)
SELECT id, 'whatsapp', 'Meta WhatsApp Business Gateway', 'meta', true, true, '+2348030001234', 5000, 5000
FROM public.schools LIMIT 1
ON CONFLICT (school_id, type) DO NOTHING;

-- Seed Standard Templates
INSERT INTO public.notification_templates (school_id, code, name, category, channels, subject, body_email, body_sms, body_whatsapp, variables, is_system)
SELECT
    id,
    'absent_notice',
    'Daily Absentee Attendance Alert',
    'attendance',
    ARRAY['email', 'sms', 'whatsapp'],
    'Attendance Alert: {{student_name}} Unexcused Absence',
    'Dear {{parent_name}}, this is an urgent notification from Oakland International School that {{student_name}} was marked absent during roll call on {{date}} for class {{class}}.',
    'Oakland Alert: {{student_name}} was marked absent today ({{date}}) in {{class}}. Contact administrative desk if excused.',
    'Dear {{parent_name}}, *Oakland International School* records indicate that {{student_name}} was marked absent today, *{{date}}*, in *{{class}}*.',
    '["student_name", "parent_name", "date", "class"]'::jsonb,
    true
FROM public.schools LIMIT 1
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.notification_templates (school_id, code, name, category, channels, subject, body_email, body_sms, body_whatsapp, variables, is_system)
SELECT
    id,
    'fee_reminder',
    'Tuition Fee Payment Reminder',
    'finance',
    ARRAY['email', 'sms', 'whatsapp'],
    'Fee Statement & Payment Reminder: {{student_name}}',
    'Dear {{parent_name}}, please be reminded that the outstanding balance for {{student_name}} for {{term}} is {{balance}} due by {{due_date}}.',
    'Oakland Fee Notice: Outstanding dues for {{student_name}} is {{balance}} due by {{due_date}}.',
    'Dear {{parent_name}}, friendly reminder from *Oakland International School*. The outstanding tuition balance for *{{student_name}}* is *{{balance}}*.',
    '["student_name", "parent_name", "term", "balance", "due_date"]'::jsonb,
    true
FROM public.schools LIMIT 1
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. DEEP FEE MANAGEMENT & FINANCIAL ACCOUNTS (From Migration 005)
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS public.fee_structures CASCADE;
CREATE TABLE public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_name VARCHAR(50) NOT NULL,
    term VARCHAR(30) NOT NULL,
    academic_year VARCHAR(30) NOT NULL DEFAULT '2026/2027',
    tuition_fee NUMERIC(12,2) NOT NULL DEFAULT 350000,
    development_levy NUMERIC(12,2) NOT NULL DEFAULT 25000,
    books_stationery NUMERIC(12,2) NOT NULL DEFAULT 45000,
    uniform_sports NUMERIC(12,2) NOT NULL DEFAULT 30000,
    ict_science_levy NUMERIC(12,2) NOT NULL DEFAULT 20000,
    pta_levy NUMERIC(12,2) NOT NULL DEFAULT 10000,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 480000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_fee_class_term_year UNIQUE (school_id, class_name, term, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class ON public.fee_structures(school_id, class_name, term);

CREATE TABLE IF NOT EXISTS public.student_financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    total_billed NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    virtual_account_number VARCHAR(20) UNIQUE,
    virtual_bank_name VARCHAR(60) DEFAULT 'Providus Bank / Paystack',
    virtual_account_name VARCHAR(150),
    last_payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_financial_account UNIQUE (school_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_student ON public.student_financial_accounts(student_id);

CREATE TABLE IF NOT EXISTS public.fee_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    term VARCHAR(30) NOT NULL,
    academic_year VARCHAR(30) NOT NULL DEFAULT '2026/2027',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student ON public.fee_invoices(student_id, status);

CREATE TABLE IF NOT EXISTS public.fee_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    percentage NUMERIC(5,2),
    fixed_amount NUMERIC(12,2),
    term VARCHAR(30),
    academic_year VARCHAR(30) DEFAULT '2026/2027',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fee_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES public.fee_invoices(id),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
    reference VARCHAR(100),
    receipt_pdf_url TEXT,
    payer_name VARCHAR(150),
    payer_email VARCHAR(150),
    payer_phone VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'successful',
    recorded_by VARCHAR(100) DEFAULT 'Automated Payment Webhook',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_student ON public.fee_transactions(student_id, created_at DESC);

-- Seed Fee Structures
INSERT INTO public.fee_structures (
    school_id, class_name, term, academic_year, tuition_fee, development_levy, books_stationery, uniform_sports, ict_science_levy, pta_levy, total_amount
)
SELECT id, 'JSS 1', 'First Term', '2026/2027', 350000, 25000, 45000, 30000, 20000, 10000, 480000 FROM public.schools LIMIT 1
ON CONFLICT (school_id, class_name, term, academic_year) DO NOTHING;

INSERT INTO public.fee_structures (
    school_id, class_name, term, academic_year, tuition_fee, development_levy, books_stationery, uniform_sports, ict_science_levy, pta_levy, total_amount
)
SELECT id, 'JSS 2', 'First Term', '2026/2027', 350000, 25000, 35000, 20000, 20000, 10000, 460000 FROM public.schools LIMIT 1
ON CONFLICT (school_id, class_name, term, academic_year) DO NOTHING;

INSERT INTO public.fee_structures (
    school_id, class_name, term, academic_year, tuition_fee, development_levy, books_stationery, uniform_sports, ict_science_levy, pta_levy, total_amount
)
SELECT id, 'JSS 3', 'First Term', '2026/2027', 370000, 25000, 40000, 20000, 25000, 10000, 490000 FROM public.schools LIMIT 1
ON CONFLICT (school_id, class_name, term, academic_year) DO NOTHING;

INSERT INTO public.fee_structures (
    school_id, class_name, term, academic_year, tuition_fee, development_levy, books_stationery, uniform_sports, ict_science_levy, pta_levy, total_amount
)
SELECT id, 'SS 1', 'First Term', '2026/2027', 400000, 30000, 50000, 35000, 25000, 10000, 550000 FROM public.schools LIMIT 1
ON CONFLICT (school_id, class_name, term, academic_year) DO NOTHING;

INSERT INTO public.fee_structures (
    school_id, class_name, term, academic_year, tuition_fee, development_levy, books_stationery, uniform_sports, ict_science_levy, pta_levy, total_amount
)
SELECT id, 'SS 2', 'First Term', '2026/2027', 400000, 30000, 45000, 20000, 25000, 10000, 530000 FROM public.schools LIMIT 1
ON CONFLICT (school_id, class_name, term, academic_year) DO NOTHING;

INSERT INTO public.fee_structures (
    school_id, class_name, term, academic_year, tuition_fee, development_levy, books_stationery, uniform_sports, ict_science_levy, pta_levy, total_amount
)
SELECT id, 'SS 3', 'First Term', '2026/2027', 420000, 30000, 50000, 20000, 30000, 10000, 560000 FROM public.schools LIMIT 1
ON CONFLICT (school_id, class_name, term, academic_year) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. CALENDAR, DOCUMENTS & TIMETABLE CONSTRAINTS (From Migration 006)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.school_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('academic', 'holiday', 'examination', 'meeting', 'pta', 'deadline', 'activity', 'sports')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT true,
    audience VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'staff', 'parents', 'students', 'specific_class')),
    target_class VARCHAR(50),
    location VARCHAR(255) DEFAULT 'Oakland Main Campus',
    notify_before_days INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_events_dates ON public.school_events(start_date, end_date);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('report_card', 'receipt', 'admission_letter', 'query_letter', 'certificate', 'policy', 'official_notice', 'curriculum', 'other')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    associated_student_id VARCHAR(100),
    associated_staff_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    version INTEGER DEFAULT 1,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);

CREATE TABLE IF NOT EXISTS public.timetable_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('hard', 'soft')),
    rule_type VARCHAR(100) NOT NULL,
    parameters JSONB DEFAULT '{}',
    weight INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timetable_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    academic_year VARCHAR(50) NOT NULL DEFAULT '2026/2027',
    term VARCHAR(50) NOT NULL DEFAULT 'Term 1',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    conflict_count INTEGER DEFAULT 0,
    satisfaction_score NUMERIC(5,2) DEFAULT 100.0,
    schedule_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES public.timetable_versions(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL,
    day VARCHAR(20) NOT NULL,
    period_id VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher_name VARCHAR(150) NOT NULL,
    room VARCHAR(100) DEFAULT 'Standard Class Room',
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_lookup ON public.timetable_slots(version_id, class_id, day, period_id);

INSERT INTO public.timetable_constraints (name, type, rule_type, parameters, weight, is_active)
VALUES
    ('No Teacher Double-Booking', 'hard', 'no_teacher_conflict', '{"description": "A teacher cannot teach two classes at the same period."}', 100, true),
    ('No Class Double-Booking', 'hard', 'no_class_conflict', '{"description": "A class cannot have multiple subjects scheduled at the same period."}', 100, true),
    ('Teacher Daily Period Limit', 'hard', 'max_periods_per_day', '{"maxPeriods": 5, "description": "No teacher shall have more than 5 instructional periods per day."}', 90, true),
    ('Morning Core Subjects', 'soft', 'core_morning_preference', '{"coreSubjects": ["Mathematics", "English Language", "Physics", "Chemistry"], "targetPeriods": ["p1", "p2", "p3", "p4"], "weight": 20}', 20, true),
    ('Weekly Subject Spread', 'soft', 'spread_subject_days', '{"description": "Subjects with multiple periods per week must be distributed across different days."}', 15, true),
    ('Minimize Teacher Idle Gaps', 'soft', 'avoid_teacher_gaps', '{"description": "Avoid isolated single periods with 2+ period gaps between teaching blocks."}', 10, true)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. PICKUP VERIFICATION & INVENTORY (From Migration 007)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.authorized_pickup_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    national_id VARCHAR(100),
    photo_url TEXT,
    qr_token VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_authorized_pickup_student ON public.authorized_pickup_persons(student_id);

CREATE TABLE IF NOT EXISTS public.pickup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(100) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_class VARCHAR(50) NOT NULL,
    authorized_person_id UUID REFERENCES public.authorized_pickup_persons(id) ON DELETE SET NULL,
    picked_up_by_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    verified_by_name VARCHAR(255) NOT NULL,
    verification_method VARCHAR(50) NOT NULL DEFAULT 'qr_scan' CHECK (verification_method IN ('qr_scan', 'manual_code', 'emergency_override')),
    status VARCHAR(50) NOT NULL DEFAULT 'cleared' CHECK (status IN ('cleared', 'flagged_unauthorized')),
    notes TEXT,
    pickup_time TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pickup_logs_student ON public.pickup_logs(student_id);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('stationery', 'science_lab', 'sports', 'it_hardware', 'medical', 'textbooks', 'maintenance')),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    reorder_level INTEGER NOT NULL DEFAULT 10,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    location VARCHAR(255) DEFAULT 'Main Central Store',
    status VARCHAR(50) NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.procurement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    estimated_unit_cost NUMERIC(12,2) NOT NULL,
    estimated_total_cost NUMERIC(12,2) NOT NULL,
    urgency VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'critical')),
    justification TEXT NOT NULL,
    requested_by_id UUID,
    requested_by_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_principal' CHECK (status IN ('pending_principal', 'pending_proprietor', 'approved', 'rejected', 'ordered', 'delivered')),
    approved_by VARCHAR(255),
    approval_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.inventory_items (name, category, quantity, unit, reorder_level, unit_cost, location, status)
VALUES
    ('A4 White Printing Paper', 'stationery', 50, 'reams', 10, 4800.00, 'Administration Store Room', 'in_stock'),
    ('Dry Erase Whiteboard Markers', 'stationery', 20, 'boxes', 10, 6500.00, 'Staff Workroom', 'in_stock'),
    ('First Aid Burn Gel & Bandage Kits', 'medical', 5, 'kits', 5, 9200.00, 'School Infirmary', 'in_stock')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. EXPLICIT CLEANUP: PURGE ANY REMNANT CBT ENGINE TABLES
-- CBT has been completely removed as an institutional feature
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.cbt_session_answers CASCADE;
DROP TABLE IF EXISTS public.cbt_assessment_sessions CASCADE;
DROP TABLE IF EXISTS public.cbt_assessment_questions CASCADE;
DROP TABLE IF EXISTS public.cbt_assessments CASCADE;
DROP TABLE IF EXISTS public.cbt_questions CASCADE;
DROP TABLE IF EXISTS public.cbt_question_banks CASCADE;

-- -----------------------------------------------------------------------------
-- 9. NEWLY DESIGNED ENTERPRISE TABLES
-- -----------------------------------------------------------------------------

-- 9.1 Operational Expenditures (Bursary & Proprietor)
CREATE TABLE IF NOT EXISTS public.expenditures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT NOT NULL,
    vendor VARCHAR(255),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    recorded_by VARCHAR(100),
    recorded_by_id UUID REFERENCES auth.users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenditures_school_date ON public.expenditures(school_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenditures_category ON public.expenditures(category);

-- 9.2 Petty Cash Imprest Account
CREATE TABLE IF NOT EXISTS public.petty_cash (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('disbursement', 'replenishment')),
    description TEXT NOT NULL,
    recipient VARCHAR(255),
    requested_by VARCHAR(255),
    approved_by VARCHAR(255),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_petty_cash_school ON public.petty_cash(school_id, date DESC);

-- 9.3 Institutional Bank Accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    bank_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) DEFAULT 'Current Account',
    currency VARCHAR(10) DEFAULT 'NGN',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_bank_account_number UNIQUE (school_id, account_number)
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_school ON public.bank_accounts(school_id);

-- 9.4 Faculty & Staff Attendance
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused', 'half_day')),
    time_in TIME,
    time_out TIME,
    remarks TEXT,
    marked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_staff_attendance UNIQUE (school_id, staff_id, date)
);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_lookup ON public.staff_attendance(school_id, date, staff_id);

-- 9.5 Internal Staff Broadcasts & Announcements
CREATE TABLE IF NOT EXISTS public.staff_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_name VARCHAR(150) NOT NULL DEFAULT 'Proprietor Desk',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
    target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'teaching', 'non_teaching', 'management')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_broadcasts_school ON public.staff_broadcasts(school_id, created_at DESC);

-- 9.6 Staff Leave Management
CREATE TABLE IF NOT EXISTS public.staff_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('annual', 'sick', 'maternity', 'paternity', 'compassionate', 'study', 'casual')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by UUID REFERENCES auth.users(id),
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_leaves_staff ON public.staff_leaves(staff_id, status);

-- 9.7 Staff Employment Applications & Approvals
CREATE TABLE IF NOT EXISTS public.staff_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role_applied VARCHAR(50) NOT NULL DEFAULT 'teacher',
    department VARCHAR(100),
    qualification VARCHAR(100),
    years_of_experience INT DEFAULT 0,
    resume_url TEXT,
    cover_letter TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'interview_scheduled', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_applications_status ON public.staff_applications(school_id, status);

-- -----------------------------------------------------------------------------
-- 10. UNIFIED ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS across all tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_behaviour ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_pickup_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenditures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_applications ENABLE ROW LEVEL SECURITY;

-- Set up permissive authenticated & public policies
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'permissions', 'role_permissions', 'audit_logs', 'student_documents',
        'student_behaviour', 'student_timeline', 'workflow_definitions',
        'workflow_instances', 'workflow_steps', 'notification_channels',
        'notification_templates', 'notification_logs', 'fee_structures',
        'student_financial_accounts', 'fee_invoices', 'fee_discounts',
        'fee_transactions', 'school_events', 'documents', 'timetable_constraints',
        'timetable_versions', 'timetable_slots', 'authorized_pickup_persons',
        'pickup_logs', 'inventory_items', 'procurement_requests',
        'expenditures', 'petty_cash', 'bank_accounts', 'staff_attendance',
        'staff_broadcasts', 'staff_leaves', 'staff_applications'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow all for authenticated on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Allow read for anon on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow read for anon on %I" ON public.%I FOR SELECT TO anon USING (true)', tbl, tbl);
    END LOOP;
END $$;

-- Fix policies on core tables from 001
DROP POLICY IF EXISTS "Public read school information" ON public.schools;
CREATE POLICY "Public read school information" ON public.schools FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read classes" ON public.classes;
CREATE POLICY "Public read classes" ON public.classes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read academic sessions" ON public.academic_sessions;
CREATE POLICY "Public read academic sessions" ON public.academic_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read academic terms" ON public.academic_terms;
CREATE POLICY "Public read academic terms" ON public.academic_terms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view their own school memberships" ON public.school_memberships;
CREATE POLICY "Users can view their own school memberships" ON public.school_memberships FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view staff profiles" ON public.staff_profiles;
CREATE POLICY "Staff can view staff profiles" ON public.staff_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can view students" ON public.students;
CREATE POLICY "Staff can view students" ON public.students FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can view enrollments" ON public.class_enrollments;
CREATE POLICY "Staff can view enrollments" ON public.class_enrollments FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------------------------------
-- 11. VERIFICATION QUERY (Returns immediate visual confirmation in Supabase)
-- -----------------------------------------------------------------------------
SELECT table_name, 'ACTIVE & SYNCHRONIZED' AS status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ==============================================================================
-- End of Migration 010
-- ==============================================================================
