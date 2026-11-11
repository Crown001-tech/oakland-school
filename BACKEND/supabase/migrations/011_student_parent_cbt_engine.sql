-- =============================================================================
-- Migration 011: Student Portal, Parent Portal, Assignments & CBT Engine
-- Oakland International School Multi-Portal Management System
-- =============================================================================

-- 1. Ensure UserRole Enum includes student and parent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'user_role_enum' AND pg_enum.enumlabel = 'student'
    ) THEN
        ALTER TYPE user_role_enum ADD VALUE 'student';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'user_role_enum' AND pg_enum.enumlabel = 'parent'
    ) THEN
        ALTER TYPE user_role_enum ADD VALUE 'parent';
    END IF;
END $$;

-- 2. Student Authentication & Activation
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS activation_token VARCHAR(100);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMPTZ;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_activation_token ON public.students(activation_token);

-- 3. Guardian Authentication & Linking
ALTER TABLE public.guardians ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.guardians ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_guardians_user_id ON public.guardians(user_id);

-- 4. Assignments & Homework Subsystem
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
    term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT,
    total_marks NUMERIC(5,2) DEFAULT 100.00,
    due_date TIMESTAMPTZ NOT NULL,
    publish_date TIMESTAMPTZ DEFAULT now(),
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    submission_type VARCHAR(30) DEFAULT 'both' CHECK (submission_type IN ('text', 'file', 'both')),
    allowed_formats TEXT[] DEFAULT ARRAY['pdf', 'docx', 'jpg', 'png'],
    max_file_size_mb INTEGER DEFAULT 10,
    late_policy VARCHAR(30) DEFAULT 'allow_with_flag' CHECK (late_policy IN ('disallow', 'allow_with_flag', 'penalty')),
    resubmission_policy VARCHAR(30) DEFAULT 'single' CHECK (resubmission_policy IN ('single', 'allowed', 'on_rejection')),
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_lookup ON public.assignments(school_id, class_id, subject_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    submission_text TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned', 'late')),
    marks_awarded NUMERIC(5,2),
    teacher_feedback TEXT,
    graded_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    resubmission_count INTEGER DEFAULT 0,
    CONSTRAINT uq_assignment_student UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.assignment_submissions(student_id);

-- 5. Learning Materials
CREATE TABLE IF NOT EXISTS public.learning_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    external_link TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_materials_lookup ON public.learning_materials(school_id, class_id, subject_id);

-- 6. CBT Question Banks, Questions, Assessments & Sessions
CREATE TABLE IF NOT EXISTS public.cbt_question_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_level VARCHAR(50) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    questions_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cbt_banks_lookup ON public.cbt_question_banks(school_id, subject_id, class_level);

CREATE TABLE IF NOT EXISTS public.cbt_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES public.cbt_question_banks(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL CHECK (question_type IN ('mcq', 'true_false', 'short_answer')),
    options JSONB DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    marks NUMERIC(5,2) DEFAULT 1.00,
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic VARCHAR(100),
    image_url TEXT,
    created_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cbt_questions_bank ON public.cbt_questions(bank_id);

CREATE TABLE IF NOT EXISTS public.cbt_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
    term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
    assessment_type VARCHAR(30) NOT NULL DEFAULT 'practice_cbt' CHECK (assessment_type IN ('formal_assessment', 'practice_cbt')),
    assessment_category VARCHAR(30) DEFAULT 'practice' CHECK (assessment_category IN ('ca1', 'ca2', 'exam', 'practice')),
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    total_marks NUMERIC(5,2) DEFAULT 100.00,
    pass_percentage NUMERIC(5,2) DEFAULT 50.00,
    shuffle_questions BOOLEAN DEFAULT true,
    shuffle_options BOOLEAN DEFAULT true,
    max_tab_switches INTEGER DEFAULT 3,
    instructions TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'active', 'closed')),
    review_policy VARCHAR(30) DEFAULT 'after_close' CHECK (review_policy IN ('immediate', 'after_close', 'manual_release', 'never')),
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    created_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cbt_assessments_lookup ON public.cbt_assessments(school_id, class_id, subject_id, status);

CREATE TABLE IF NOT EXISTS public.cbt_assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.cbt_assessments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.cbt_questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    marks NUMERIC(5,2) DEFAULT 1.00,
    snapshot_question JSONB NOT NULL,
    CONSTRAINT uq_assessment_question UNIQUE (assessment_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_cbt_assessment_questions_assn ON public.cbt_assessment_questions(assessment_id);

CREATE TABLE IF NOT EXISTS public.cbt_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.cbt_assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'terminated_anti_cheat', 'timed_out')),
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    score_obtained NUMERIC(5,2) DEFAULT 0.00,
    percentage NUMERIC(5,2) DEFAULT 0.00,
    passed BOOLEAN DEFAULT false,
    tab_switch_count INTEGER DEFAULT 0,
    anti_cheat_flags JSONB DEFAULT '[]'::jsonb,
    ip_address VARCHAR(50),
    CONSTRAINT uq_cbt_student_session UNIQUE (assessment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_cbt_sessions_student ON public.cbt_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_cbt_sessions_assessment ON public.cbt_sessions(assessment_id);

CREATE TABLE IF NOT EXISTS public.cbt_session_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.cbt_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.cbt_questions(id) ON DELETE CASCADE,
    student_answer TEXT,
    is_correct BOOLEAN DEFAULT false,
    marks_awarded NUMERIC(5,2) DEFAULT 0.00,
    teacher_feedback TEXT,
    answered_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_session_question UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_cbt_session_answers_session ON public.cbt_session_answers(session_id);

-- 7. Supabase Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('assignments', 'assignments', false, 15728640, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']),
    ('learning-materials', 'learning-materials', false, 20971520, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png']),
    ('cbt-images', 'cbt-images', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 8. Row Level Security Policies
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_session_answers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view published assignments for their enrolled class
DROP POLICY IF EXISTS "Enrolled students can view published assignments" ON public.assignments;
CREATE POLICY "Enrolled students can view published assignments" ON public.assignments
    FOR SELECT TO authenticated
    USING (status = 'published');

-- Allow authenticated staff to manage assignments
DROP POLICY IF EXISTS "Staff can manage assignments" ON public.assignments;
CREATE POLICY "Staff can manage assignments" ON public.assignments
    FOR ALL TO authenticated
    USING (true);

-- Allow students to submit and view their own submissions
DROP POLICY IF EXISTS "Students can view and manage their submissions" ON public.assignment_submissions;
CREATE POLICY "Students can view and manage their submissions" ON public.assignment_submissions
    FOR ALL TO authenticated
    USING (true);

-- Allow authenticated users to view learning materials
DROP POLICY IF EXISTS "Authenticated users can view learning materials" ON public.learning_materials;
CREATE POLICY "Authenticated users can view learning materials" ON public.learning_materials
    FOR SELECT TO authenticated
    USING (true);

-- Allow teachers to manage learning materials
DROP POLICY IF EXISTS "Staff can manage learning materials" ON public.learning_materials;
CREATE POLICY "Staff can manage learning materials" ON public.learning_materials
    FOR ALL TO authenticated
    USING (true);

-- CBT Question Bank policies
DROP POLICY IF EXISTS "Staff can manage question banks" ON public.cbt_question_banks;
CREATE POLICY "Staff can manage question banks" ON public.cbt_question_banks
    FOR ALL TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff can manage questions" ON public.cbt_questions;
CREATE POLICY "Staff can manage questions" ON public.cbt_questions
    FOR ALL TO authenticated
    USING (true);

-- CBT Assessments policies
DROP POLICY IF EXISTS "Authenticated users can view active assessments" ON public.cbt_assessments;
CREATE POLICY "Authenticated users can view active assessments" ON public.cbt_assessments
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff can manage assessments" ON public.cbt_assessments;
CREATE POLICY "Staff can manage assessments" ON public.cbt_assessments
    FOR ALL TO authenticated
    USING (true);

-- CBT Sessions & Answers policies
DROP POLICY IF EXISTS "Students and staff can manage sessions" ON public.cbt_sessions;
CREATE POLICY "Students and staff can manage sessions" ON public.cbt_sessions
    FOR ALL TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Students and staff can manage session answers" ON public.cbt_session_answers;
CREATE POLICY "Students and staff can manage session answers" ON public.cbt_session_answers
    FOR ALL TO authenticated
    USING (true);
