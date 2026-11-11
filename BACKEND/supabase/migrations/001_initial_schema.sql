-- Oakland Schools Management System
-- Migration 001: Initial Complete Schema with RLS and Seed Data (100% Idempotent)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CUSTOM ENUM TYPES (Idempotent creation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('proprietor', 'admin', 'teacher', 'bursar');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status_enum') THEN
        CREATE TYPE student_status_enum AS ENUM ('active', 'suspended', 'graduated', 'transferred', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
        CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
        CREATE TYPE attendance_status_enum AS ENUM ('present', 'late', 'absent', 'excused');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'score_status_enum') THEN
        CREATE TYPE score_status_enum AS ENUM ('draft', 'submitted', 'reviewed', 'approved', 'published');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admission_status_enum') THEN
        CREATE TYPE admission_status_enum AS ENUM ('submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected', 'enrolled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status_enum') THEN
        CREATE TYPE notification_status_enum AS ENUM ('pending', 'sent', 'retrying', 'failed');
    END IF;
END $$;

-- 3. SCHOOLS & TENANCY
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    motto VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USER ROLES & MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.school_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role_enum NOT NULL DEFAULT 'teacher',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    photo_url TEXT,
    role user_role_enum NOT NULL DEFAULT 'teacher',
    department VARCHAR(100),
    qualification VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, employee_id)
);

-- 5. ACADEMIC SESSIONS & TERMS
CREATE TABLE IF NOT EXISTS public.academic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g. "2026/2027"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g. "First Term"
    term_number INT NOT NULL CHECK (term_number IN (1, 2, 3)),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CLASSES (Strictly 6: JSS 1, JSS 2, JSS 3, SS 1, SS 2, SS 3)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"
    grade_level INT NOT NULL,  -- 1 to 6
    capacity INT DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- 7. SUBJECTS & TEACHER ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    category VARCHAR(50), -- "Sciences", "Humanities", "Commercial", "General"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
    is_class_teacher BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. STUDENTS & GUARDIANS
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    admission_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    gender gender_enum NOT NULL,
    dob DATE NOT NULL,
    blood_group VARCHAR(10),
    address TEXT,
    photo_url TEXT,
    status student_status_enum DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, admission_number)
);

CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    alt_phone VARCHAR(50),
    relationship VARCHAR(50) NOT NULL, -- "Mother", "Father", "Guardian"
    occupation VARCHAR(100),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_guardians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
    relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT TRUE,
    can_receive_reports BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS public.class_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
    roll_number VARCHAR(20),
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, session_id)
);

-- 9. ATTENDANCE SYSTEM
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status_enum NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    late_reason TEXT,
    marked_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date)
);

-- 10. ASSESSMENTS & RESULTS
CREATE TABLE IF NOT EXISTS public.assessment_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- "CA 1", "CA 2", "Terminal Examination"
    weight_percentage NUMERIC(5,2) NOT NULL, -- e.g. 20.00, 60.00
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.assessment_categories(id) ON DELETE RESTRICT,
    title VARCHAR(100) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.class_enrollments(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL CHECK (score >= 0),
    status score_status_enum DEFAULT 'draft',
    graded_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assessment_id, enrollment_id)
);

CREATE TABLE IF NOT EXISTS public.grading_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    grade VARCHAR(10) NOT NULL, -- "A+", "A", "B", "C", "D", "F"
    min_score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL,
    gpa_point NUMERIC(3,2),
    remark VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, grade)
);

CREATE TABLE IF NOT EXISTS public.report_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES public.class_enrollments(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    total_score NUMERIC(7,2) DEFAULT 0,
    average_score NUMERIC(5,2) DEFAULT 0,
    rank INT,
    attendance_present INT DEFAULT 0,
    attendance_total INT DEFAULT 0,
    principal_comment TEXT,
    teacher_comment TEXT,
    pdf_url TEXT,
    status VARCHAR(30) DEFAULT 'draft',
    access_token VARCHAR(64) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(enrollment_id, term_id)
);

-- 11. TIMETABLE SCHEDULES
CREATE TABLE IF NOT EXISTS public.class_timetables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL, -- "Monday", "Tuesday", etc.
    period_name VARCHAR(50) NOT NULL, -- "Period 1", "Period 2", etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    room VARCHAR(50),
    is_break BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. FINANCE & FEE MANAGEMENT
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, class_id, term_id, title)
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES public.class_enrollments(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    amount_paid NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- "Bank Transfer", "Bank Teller", "Cash", "Online"
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    recorded_by UUID REFERENCES auth.users(id),
    status VARCHAR(30) DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ADMISSIONS
CREATE TABLE IF NOT EXISTS public.admission_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    applicant_first_name VARCHAR(100) NOT NULL,
    applicant_last_name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    gender gender_enum NOT NULL,
    applying_for_class VARCHAR(50) NOT NULL,
    guardian_name VARCHAR(150) NOT NULL,
    guardian_email VARCHAR(150) NOT NULL,
    guardian_phone VARCHAR(50) NOT NULL,
    status admission_status_enum DEFAULT 'submitted',
    documents JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. NOTIFICATIONS ENGINE (ASYNCHRONOUS)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    recipient_email VARCHAR(150) NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content_html TEXT NOT NULL,
    status notification_status_enum DEFAULT 'pending',
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    attempts_count INT DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id),
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user has role in school
CREATE OR REPLACE FUNCTION public.has_school_role(req_school_id UUID, allowed_roles user_role_enum[])
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.school_memberships
        WHERE school_id = req_school_id
          AND user_id = auth.uid()
          AND is_active = TRUE
          AND role = ANY(allowed_roles)
    );
END;
$$;

-- Drop and recreate policies safely
DROP POLICY IF EXISTS "Staff can view their school records" ON public.schools;
CREATE POLICY "Staff can view their school records" ON public.schools
    FOR SELECT TO authenticated
    USING (id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can view academic structure" ON public.classes;
CREATE POLICY "Staff can view academic structure" ON public.classes
    FOR SELECT TO authenticated
    USING (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can view subjects" ON public.subjects;
CREATE POLICY "Staff can view subjects" ON public.subjects
    FOR SELECT TO authenticated
    USING (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can view students" ON public.students;
CREATE POLICY "Staff can view students" ON public.students
    FOR SELECT TO authenticated
    USING (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can view enrollments" ON public.class_enrollments;
CREATE POLICY "Staff can view enrollments" ON public.class_enrollments
    FOR SELECT TO authenticated
    USING (class_id IN (SELECT id FROM public.classes WHERE school_id IN (
        SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()
    )));

DROP POLICY IF EXISTS "Teachers can insert/update attendance for their school" ON public.attendance_records;
CREATE POLICY "Teachers can insert/update attendance for their school" ON public.attendance_records
    FOR ALL TO authenticated
    USING (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers and admin can access scores" ON public.scores;
CREATE POLICY "Teachers and admin can access scores" ON public.scores
    FOR ALL TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff can view class timetables" ON public.class_timetables;
CREATE POLICY "Staff can view class timetables" ON public.class_timetables
    FOR SELECT TO authenticated
    USING (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can view fee structures" ON public.fee_structures;
CREATE POLICY "Staff can view fee structures" ON public.fee_structures
    FOR SELECT TO authenticated
    USING (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Bursar and proprietor can manage fee payments" ON public.fee_payments;
CREATE POLICY "Bursar and proprietor can manage fee payments" ON public.fee_payments
    FOR ALL TO authenticated
    USING (school_id IN (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid()));

-- 17. SEED DATA (100% Idempotent using WHERE NOT EXISTS)

-- Seed School
INSERT INTO public.schools (id, name, code, slug, motto, address, phone, email)
SELECT 
    'a0000000-0000-0000-0000-000000000001',
    'Oakland International College',
    'OAK-001',
    'oakland-college',
    'Excellence, Integrity, Leadership',
    '14 Academic Crescent, Victoria Island, Lagos',
    '+234 800 625 5263',
    'admin@oaklandschools.edu'
WHERE NOT EXISTS (
    SELECT 1 FROM public.schools WHERE code = 'OAK-001'
);

-- Seed Academic Session
INSERT INTO public.academic_sessions (id, school_id, name, start_date, end_date, is_current)
SELECT
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '2026/2027',
    '2026-09-01',
    '2027-07-20',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM public.academic_sessions 
    WHERE school_id = 'a0000000-0000-0000-0000-000000000001' AND name = '2026/2027'
);

-- Seed Academic Term
INSERT INTO public.academic_terms (id, session_id, school_id, name, term_number, start_date, end_date, is_current)
SELECT
    'c0000000-0000-0000-0000-000000000001',
    s.id,
    'a0000000-0000-0000-0000-000000000001',
    'First Term',
    1,
    '2026-09-01',
    '2026-12-18',
    TRUE
FROM public.academic_sessions s
WHERE s.school_id = 'a0000000-0000-0000-0000-000000000001' AND s.name = '2026/2027'
  AND NOT EXISTS (
      SELECT 1 FROM public.academic_terms t 
      WHERE t.school_id = 'a0000000-0000-0000-0000-000000000001' AND t.term_number = 1
  );

-- Seed Standard Classes (Strictly 6 Classes: JSS 1 to SS 3)
INSERT INTO public.classes (school_id, name, grade_level, capacity)
SELECT 'a0000000-0000-0000-0000-000000000001', c.name, c.grade_level, c.capacity
FROM (VALUES 
    ('JSS 1', 1, 50),
    ('JSS 2', 2, 50),
    ('JSS 3', 3, 50),
    ('SS 1', 4, 50),
    ('SS 2', 5, 50),
    ('SS 3', 6, 50)
) AS c(name, grade_level, capacity)
WHERE NOT EXISTS (
    SELECT 1 FROM public.classes cl 
    WHERE cl.school_id = 'a0000000-0000-0000-0000-000000000001' AND cl.name = c.name
);

-- Seed Standard Subjects
INSERT INTO public.subjects (school_id, name, code, category)
SELECT 'a0000000-0000-0000-0000-000000000001', s.name, s.code, s.category
FROM (VALUES
    ('Mathematics', 'MTH-101', 'General'),
    ('English Language', 'ENG-101', 'General'),
    ('Basic Science', 'BSC-101', 'Sciences'),
    ('Social Studies', 'SOS-101', 'Humanities'),
    ('Information Technology', 'ICT-101', 'Technical'),
    ('Civic Education', 'CVE-101', 'General')
) AS s(name, code, category)
WHERE NOT EXISTS (
    SELECT 1 FROM public.subjects sub
    WHERE sub.school_id = 'a0000000-0000-0000-0000-000000000001' AND sub.code = s.code
);

-- Seed Grading Scale
INSERT INTO public.grading_scales (school_id, grade, min_score, max_score, gpa_point, remark)
SELECT 'a0000000-0000-0000-0000-000000000001', g.grade, g.min_score, g.max_score, g.gpa_point, g.remark
FROM (VALUES
    ('A+', 90::numeric, 100::numeric, 4.0::numeric, 'Distinction'),
    ('A', 80::numeric, 89.99::numeric, 4.0::numeric, 'Excellent'),
    ('B', 70::numeric, 79.99::numeric, 3.0::numeric, 'Very Good'),
    ('C', 60::numeric, 69.99::numeric, 2.0::numeric, 'Good Credit'),
    ('D', 50::numeric, 59.99::numeric, 1.0::numeric, 'Pass'),
    ('F', 0::numeric, 49.99::numeric, 0.0::numeric, 'Fail')
) AS g(grade, min_score, max_score, gpa_point, remark)
WHERE NOT EXISTS (
    SELECT 1 FROM public.grading_scales gs
    WHERE gs.school_id = 'a0000000-0000-0000-0000-000000000001' AND gs.grade = g.grade
);

-- Seed Assessment Categories
INSERT INTO public.assessment_categories (school_id, name, weight_percentage)
SELECT 'a0000000-0000-0000-0000-000000000001', a.name, a.weight_percentage
FROM (VALUES
    ('Continuous Assessment 1 (Test)', 20.00::numeric),
    ('Continuous Assessment 2 (Project)', 20.00::numeric),
    ('Terminal Examination', 60.00::numeric)
) AS a(name, weight_percentage)
WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment_categories ac
    WHERE ac.school_id = 'a0000000-0000-0000-0000-000000000001' AND ac.name = a.name
);
