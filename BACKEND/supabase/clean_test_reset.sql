-- ====================================================================
-- OAKLAND SCHOOLS: CLEAN DATABASE RESET SCRIPT
-- ====================================================================
-- Run in Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Paste -> Run
-- ====================================================================

-- Step 1: Clear all transactional and student data
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'audit_logs',
        'notifications',
        'attendance_records',
        'scores',
        'report_cards',
        'fee_payments',
        'admission_applications',
        'class_enrollments',
        'student_guardians',
        'guardians',
        'students',
        'teacher_assignments',
        'staff_profiles',
        'school_memberships',
        'leave_requests'
    ];
BEGIN
    SET session_replication_role = 'replica';
    
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE 'TRUNCATE TABLE public.' || quote_ident(t) || ' CASCADE';
        END IF;
    END LOOP;
    
    SET session_replication_role = 'origin';
END $$;

-- Step 2: Ensure Core School Tenant exists
INSERT INTO public.schools (id, name, code, slug, motto, address, phone, email)
SELECT 
    'a0000000-0000-0000-0000-000000000001',
    'Oakland Schools, Lagos',
    'OAK-001',
    'oakland-schools',
    'Excellence, Integrity, Leadership',
    '14 Academic Crescent, Victoria Island, Lagos',
    '+234 800 625 5263',
    'admin@oaklandschools.edu'
WHERE NOT EXISTS (
    SELECT 1 FROM public.schools WHERE code = 'OAK-001'
);

-- Step 3: Ensure 2026/2027 Academic Session exists
INSERT INTO public.academic_sessions (id, school_id, name, start_date, end_date, is_current)
SELECT
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '2026/2027',
    '2026-09-01',
    '2027-07-20',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM public.academic_sessions WHERE name = '2026/2027'
);

-- Step 4: Ensure First Term exists
INSERT INTO public.academic_terms (id, session_id, school_id, name, term_number, start_date, end_date, is_current)
SELECT
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'First Term',
    1,
    '2026-09-01',
    '2026-12-18',
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM public.academic_terms WHERE name = 'First Term'
);

-- Step 5: Ensure 6 Classes exist (JSS 1 through SS 3)
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
    SELECT 1 FROM public.classes WHERE name = c.name
);

-- Step 6: Ensure Assessment Categories exist (CA1 20%, CA2 20%, Exam 60%)
INSERT INTO public.assessment_categories (school_id, name, weight_percentage)
SELECT 'a0000000-0000-0000-0000-000000000001', a.name, a.weight
FROM (VALUES 
    ('CA 1', 20.00),
    ('CA 2 (Mid-Term)', 20.00),
    ('Terminal Examination', 60.00)
) AS a(name, weight)
WHERE NOT EXISTS (
    SELECT 1 FROM public.assessment_categories WHERE name = a.name
);

-- ====================================================================
-- CONFIRMATION: Verify database state
-- ====================================================================
SELECT 
    'Database cleared to fresh state.' AS status,
    (SELECT COUNT(*) FROM public.students) AS students,
    (SELECT COUNT(*) FROM public.staff_profiles) AS staff,
    (SELECT COUNT(*) FROM public.classes) AS classes,
    (SELECT COUNT(*) FROM public.scores) AS scores,
    (SELECT COUNT(*) FROM public.fee_payments) AS fee_payments;
