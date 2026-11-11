-- ====================================================================
-- OAKLAND SCHOOLS MANAGEMENT SYSTEM
-- Migration 003: Student 360 SIS & Institutional Workflow Engine
-- 100% Idempotent Migration
-- ====================================================================

-- 1. STUDENT 360 EXTENSIONS & ENHANCEMENTS

-- 1.1 Ensure student_guardians has authorized pickup attributes
ALTER TABLE public.student_guardians 
ADD COLUMN IF NOT EXISTS authorized_pickup BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pickup_pin VARCHAR(10),
ADD COLUMN IF NOT EXISTS pickup_photo_url TEXT;

-- 1.2 Student Documents (Birth certificates, medical records, transfer certs)
CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general', -- 'birth_certificate', 'medical', 'academic', 'passport', 'other'
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL DEFAULT 'application/pdf',
    file_size_bytes BIGINT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON public.student_documents(student_id);

-- 1.3 Student Behaviour & Pastoral Records (Commendations & Disciplinary)
CREATE TABLE IF NOT EXISTS public.student_behaviour (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('commendation', 'infraction', 'warning', 'suspension', 'counselling')),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    points INT DEFAULT 0, -- Positive for merits, negative for demerits
    action_taken TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    recorded_by_name VARCHAR(100),
    is_confidential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_behaviour_student_id ON public.student_behaviour(student_id);
CREATE INDEX IF NOT EXISTS idx_student_behaviour_type ON public.student_behaviour(type);

-- 1.4 Student Activity Timeline (Unified chronological event stream)
CREATE TABLE IF NOT EXISTS public.student_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- e.g. 'enrollment', 'attendance', 'score', 'fee_payment', 'behaviour', 'report_card'
    title VARCHAR(150) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_timeline_student ON public.student_timeline(student_id, created_at DESC);

-- 2. INSTITUTIONAL WORKFLOW ENGINE

-- 2.1 Workflow Definitions (Templates)
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL, -- 'result_approval', 'leave_request', 'expenditure_voucher', 'admission_review'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    applicable_module VARCHAR(50) NOT NULL,
    steps_config JSONB NOT NULL, -- Array of step definitions: [{ step_number: 1, step_name: '...', required_role: 'admin' }]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Workflow Instances (Active/Completed processes)
CREATE TABLE IF NOT EXISTS public.workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    definition_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'report_card_batch', 'leave_request', 'expenditure_voucher', 'admission_application'
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

-- 2.3 Workflow Step Audit Logs (Each transition & comment)
CREATE TABLE IF NOT EXISTS public.workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 3. SEED DEFAULT WORKFLOW TEMPLATES (IDEMPOTENT)
INSERT INTO public.workflow_definitions (school_id, code, name, description, applicable_module, steps_config)
SELECT 
    'a0000000-0000-0000-0000-000000000001',
    'result_publication',
    'Terminal Report Card Approval Pipeline',
    'Class Teacher compiles -> Principal reviews & ratifies -> Proprietor grants executive publishing release',
    'scores',
    '[
        {"step_number": 1, "step_name": "Teacher Compilation", "required_role": "teacher"},
        {"step_number": 2, "step_name": "Principal Endorsement", "required_role": "admin"},
        {"step_number": 3, "step_name": "Proprietor Executive Publishing", "required_role": "proprietor"}
    ]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.workflow_definitions WHERE code = 'result_publication'
);

INSERT INTO public.workflow_definitions (school_id, code, name, description, applicable_module, steps_config)
SELECT 
    'a0000000-0000-0000-0000-000000000001',
    'leave_request',
    'Faculty & Staff Leave Request Governance',
    'Staff submits request -> Principal approves operational cover',
    'staff',
    '[
        {"step_number": 1, "step_name": "Leave Application", "required_role": "teacher"},
        {"step_number": 2, "step_name": "Principal Approval", "required_role": "admin"}
    ]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.workflow_definitions WHERE code = 'leave_request'
);

INSERT INTO public.workflow_definitions (school_id, code, name, description, applicable_module, steps_config)
SELECT 
    'a0000000-0000-0000-0000-000000000001',
    'expenditure_voucher',
    'Bursary Operational Expenditure Authorization',
    'Bursar prepares voucher -> Proprietor authorizes treasury payout (Direct oversight)',
    'finance',
    '[
        {"step_number": 1, "step_name": "Bursar Voucher Preparation", "required_role": "bursar"},
        {"step_number": 2, "step_name": "Proprietor Treasury Approval", "required_role": "proprietor"}
    ]'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.workflow_definitions WHERE code = 'expenditure_voucher'
);

-- 4. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_behaviour ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

-- Read policies for staff
DROP POLICY IF EXISTS "Staff can view student documents" ON public.student_documents;
CREATE POLICY "Staff can view student documents" ON public.student_documents
    FOR SELECT TO authenticated
    USING (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can insert student documents" ON public.student_documents;
CREATE POLICY "Staff can insert student documents" ON public.student_documents
    FOR INSERT TO authenticated
    WITH CHECK (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can view student behaviour" ON public.student_behaviour;
CREATE POLICY "Staff can view student behaviour" ON public.student_behaviour
    FOR SELECT TO authenticated
    USING (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can view student timeline" ON public.student_timeline;
CREATE POLICY "Staff can view student timeline" ON public.student_timeline
    FOR SELECT TO authenticated
    USING (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow timeline inserts" ON public.student_timeline;
CREATE POLICY "Allow timeline inserts" ON public.student_timeline
    FOR INSERT TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can view workflows" ON public.workflow_definitions;
CREATE POLICY "Staff can view workflows" ON public.workflow_definitions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can view workflow instances" ON public.workflow_instances;
CREATE POLICY "Staff can view workflow instances" ON public.workflow_instances
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage workflow instances" ON public.workflow_instances;
CREATE POLICY "Staff can manage workflow instances" ON public.workflow_instances
    FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can view workflow steps" ON public.workflow_steps;
CREATE POLICY "Staff can view workflow steps" ON public.workflow_steps
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage workflow steps" ON public.workflow_steps;
CREATE POLICY "Staff can manage workflow steps" ON public.workflow_steps
    FOR ALL TO authenticated USING (true);

-- ====================================================================
-- End of Migration 003
-- ====================================================================
