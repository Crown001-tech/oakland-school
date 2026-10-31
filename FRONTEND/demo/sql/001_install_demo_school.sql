-- ==============================================================================
-- Eductive Demo School: install and nightly reset
--
-- Run ONLY on the separate Eductive demo database, after supabase/migrations.
-- This file is deliberately not a migration, so it never reaches Oakland's database
-- (AGENTS.md rule 1.11).
--
--   public.reset_demo_school()  wipes every operational row and rebuilds the sample school.
--   It is called once after install and then every night (see the cron block at the end).
--
-- Safety: the first install refuses to run if the database already holds any student,
-- guardian or staff record, which is true of Oakland's database. Once installed, a marker
-- table lets reset_demo_school() run, and only reset_demo_school() ever deletes data.
-- All sample records are labelled: surnames and the school name say "Sample" or "Demo".
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Install guard and marker
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.demo_database_marker') IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.students)
       OR EXISTS (SELECT 1 FROM public.guardians)
       OR EXISTS (SELECT 1 FROM public.staff_profiles) THEN
      RAISE EXCEPTION 'REFUSED: this database already holds student, guardian or staff records. The demo school installs only on a fresh database built from supabase/migrations.';
    END IF;

    CREATE TABLE public.demo_database_marker (
      id INT PRIMARY KEY CHECK (id = 1),
      installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO public.demo_database_marker (id) VALUES (1);
    ALTER TABLE public.demo_database_marker ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Reset function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_demo_school()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  c_school CONSTANT UUID := 'a0000000-0000-0000-0000-000000000001';
  -- Reference data the migrations seed for the school (permissions, grading scale, templates)
  c_keep CONSTANT TEXT[] := ARRAY[
    'schools', 'demo_database_marker', 'permissions', 'role_permissions', 'workflow_definitions',
    'notification_channels', 'notification_templates', 'assessment_categories', 'grading_scales',
    'timetable_constraints'
  ];
  c_demo_domain CONSTANT TEXT := 'example.com';

  v_table TEXT;
  v_today DATE := CURRENT_DATE;
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_start_year INT;
  v_session_name TEXT;
  v_session UUID;
  v_term UUID;

  v_class_names TEXT[] := ARRAY['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];
  v_class_name TEXT;
  v_class_ids JSONB := '{}'::jsonb;
  v_class_id UUID;

  v_subject_names TEXT[] := ARRAY['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Civic Education', 'Computer Studies'];
  v_subject_codes TEXT[] := ARRAY['ENG', 'MTH', 'BSC', 'SOS', 'CVE', 'CMP'];
  v_subject_ids UUID[] := ARRAY[]::UUID[];
  v_subject_id UUID;

  v_proprietor UUID;
  v_principal UUID;
  v_bursar UUID;
  v_teacher_class UUID;
  v_teacher_subject UUID;
  v_security UUID;

  v_first_names TEXT[] := ARRAY['Ife', 'Kemi', 'Musa', 'Bisi', 'Tobi', 'Hauwa', 'Obinna', 'Funmi', 'Sola', 'Ada', 'Tunde', 'Zainab'];
  v_student_classes TEXT[] := ARRAY['JSS 1', 'JSS 1', 'JSS 1', 'JSS 1', 'JSS 1', 'JSS 1', 'JSS 2', 'JSS 2', 'JSS 2', 'SS 1', 'SS 1', 'SS 1'];
  v_students UUID[] := ARRAY[]::UUID[];
  v_student_id UUID;
  v_enrollment_id UUID;
  v_adm TEXT;
  i INT;

  v_parent UUID;
  v_other_guardian UUID;
  v_bank_id UUID;

  v_day DATE;
  v_status TEXT;
  v_h INT;
  v_billed NUMERIC;
  v_pay NUMERIC;
  v_scores JSONB;
  v_entry JSONB;
  v_demo_accounts JSONB;
BEGIN
  IF to_regclass('public.demo_database_marker') IS NULL OR NOT EXISTS (SELECT 1 FROM public.demo_database_marker) THEN
    RAISE EXCEPTION 'REFUSED: this is not the Eductive demo database.';
  END IF;

  -- --------------------------------------------------------------------------
  -- Wipe every operational row; keep only the reference tables listed above
  -- --------------------------------------------------------------------------
  FOR v_table IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND NOT (tablename = ANY (c_keep))
  LOOP
    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', v_table);
  END LOOP;

  -- --------------------------------------------------------------------------
  -- School, academic year and settings
  -- --------------------------------------------------------------------------
  v_start_year := CASE WHEN EXTRACT(MONTH FROM v_today) >= 9 THEN v_year ELSE v_year - 1 END;
  v_session_name := v_start_year || '/' || (v_start_year + 1);

  v_demo_accounts := jsonb_build_object(
    'proprietor', 'demo.proprietor@' || c_demo_domain,
    'principal', 'demo.principal@' || c_demo_domain,
    'bursar', 'demo.bursar@' || c_demo_domain,
    'teacher', 'demo.teacher@' || c_demo_domain,
    'parent', 'demo.parent@' || c_demo_domain,
    'student', 'DEMO-0001',
    'security', 'demo.security@' || c_demo_domain
  );

  INSERT INTO public.schools (id, name, code, slug, motto, address, phone, email, settings)
  VALUES (
    c_school, 'Eductive Demo School', 'EDUCTIVE-DEMO', 'eductive-demo',
    'Sample school for demonstration', NULL, NULL, NULL, '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, code = EXCLUDED.code, slug = EXCLUDED.slug, motto = EXCLUDED.motto,
    address = NULL, phone = NULL, email = NULL, logo_url = NULL, updated_at = NOW();

  UPDATE public.schools SET settings = jsonb_build_object(
    'demoAccounts', v_demo_accounts,
    'schoolName', 'Eductive Demo School',
    'academicSession', v_session_name,
    'currentTerm', 'First Term',
    'classCapacity', 40,
    'tuitionJSS', 120000,
    'tuitionSS12', 150000,
    'tuitionSS3', 170000,
    'salaryPrincipal', 300000,
    'salaryBursar', 220000,
    'salaryClassTeacher', 150000,
    'salarySubjectTeacher', 120000,
    'salarySupportStaff', 70000,
    'allowanceClassTeacher', 20000,
    'ca1Weight', 20,
    'ca2Weight', 20,
    'examWeight', 60,
    'passMark', 50
  ) WHERE id = c_school;

  -- The migrations seed message templates and sender IDs that name Oakland and a phone number.
  -- The demo must never send, or even hold, another school's name.
  UPDATE public.notification_channels
  SET sender_id = CASE WHEN sender_id LIKE '%@%' THEN 'noreply@example.com' ELSE 'EDUCTIVE' END
  WHERE sender_id ~* 'oakland';

  UPDATE public.notification_templates
  SET subject = regexp_replace(regexp_replace(subject, '0803-000-1234', 'the school office', 'g'), 'oakland( international)?( schools?)?', 'Eductive Demo School', 'gi'),
      body_email = regexp_replace(regexp_replace(body_email, '0803-000-1234', 'the school office', 'g'), 'oakland( international)?( schools?)?', 'Eductive Demo School', 'gi'),
      body_sms = regexp_replace(regexp_replace(body_sms, '0803-000-1234', 'the school office', 'g'), 'oakland( international)?( schools?)?', 'Eductive Demo School', 'gi'),
      body_whatsapp = regexp_replace(regexp_replace(body_whatsapp, '0803-000-1234', 'the school office', 'g'), 'oakland( international)?( schools?)?', 'Eductive Demo School', 'gi');

  INSERT INTO public.academic_sessions (school_id, name, start_date, end_date, is_current)
  VALUES (c_school, v_session_name, make_date(v_start_year, 9, 1), make_date(v_start_year + 1, 7, 31), TRUE)
  RETURNING id INTO v_session;

  INSERT INTO public.academic_terms (session_id, school_id, name, term_number, start_date, end_date, is_current)
  VALUES (v_session, c_school, 'First Term', 1, v_today - 45, v_today + 45, TRUE)
  RETURNING id INTO v_term;

  FOREACH v_class_name IN ARRAY v_class_names LOOP
    INSERT INTO public.classes (school_id, name, grade_level, capacity)
    VALUES (c_school, v_class_name, 6 + array_position(v_class_names, v_class_name), 40)
    RETURNING id INTO v_class_id;
    v_class_ids := v_class_ids || jsonb_build_object(v_class_name, v_class_id);
  END LOOP;

  FOR i IN 1 .. array_length(v_subject_names, 1) LOOP
    INSERT INTO public.subjects (school_id, name, code, category, is_active)
    VALUES (c_school, v_subject_names[i], v_subject_codes[i], 'General', TRUE)
    RETURNING id INTO v_subject_id;
    v_subject_ids := v_subject_ids || v_subject_id;
  END LOOP;

  -- --------------------------------------------------------------------------
  -- Fee structures from the settings rates (never invented per class)
  -- --------------------------------------------------------------------------
  FOREACH v_class_name IN ARRAY v_class_names LOOP
    v_billed := CASE
      WHEN v_class_name LIKE 'JSS%' THEN 120000
      WHEN v_class_name = 'SS 3' THEN 170000
      ELSE 150000
    END;
    INSERT INTO public.fee_structures (school_id, class_name, term, academic_year, tuition_fee, development_levy, books_stationery, uniform_sports, ict_science_levy, pta_levy, total_amount)
    VALUES (c_school, v_class_name, 'First Term', v_session_name, v_billed, 0, 0, 0, 0, 0, v_billed);
  END LOOP;

  -- --------------------------------------------------------------------------
  -- Staff (one per role) and their class assignments
  -- --------------------------------------------------------------------------
  INSERT INTO public.staff_profiles (school_id, user_id, employee_id, first_name, last_name, email, phone, role, department, is_active, status, must_change_password)
  VALUES (c_school, (SELECT id FROM auth.users WHERE lower(email) = 'demo.proprietor@' || c_demo_domain LIMIT 1),
          'DEMO-STF-001', 'Ayo', 'Sample', 'demo.proprietor@' || c_demo_domain, NULL, 'proprietor', 'Management', TRUE, 'Active', FALSE)
  RETURNING id INTO v_proprietor;

  INSERT INTO public.staff_profiles (school_id, user_id, employee_id, first_name, last_name, email, phone, role, department, is_active, status, must_change_password)
  VALUES (c_school, (SELECT id FROM auth.users WHERE lower(email) = 'demo.principal@' || c_demo_domain LIMIT 1),
          'DEMO-STF-002', 'Bola', 'Sample', 'demo.principal@' || c_demo_domain, NULL, 'admin', 'Administration', TRUE, 'Active', FALSE)
  RETURNING id INTO v_principal;

  INSERT INTO public.staff_profiles (school_id, user_id, employee_id, first_name, last_name, email, phone, role, department, is_active, status, must_change_password)
  VALUES (c_school, (SELECT id FROM auth.users WHERE lower(email) = 'demo.bursar@' || c_demo_domain LIMIT 1),
          'DEMO-STF-003', 'Chidi', 'Sample', 'demo.bursar@' || c_demo_domain, NULL, 'bursar', 'Accounts', TRUE, 'Active', FALSE)
  RETURNING id INTO v_bursar;

  INSERT INTO public.staff_profiles (school_id, user_id, employee_id, first_name, last_name, email, phone, role, department, is_active, assigned_class, subjects, status, must_change_password)
  VALUES (c_school, (SELECT id FROM auth.users WHERE lower(email) = 'demo.teacher@' || c_demo_domain LIMIT 1),
          'DEMO-STF-004', 'Dayo', 'Sample', 'demo.teacher@' || c_demo_domain, NULL, 'teacher', 'Academics', TRUE, 'JSS 1',
          ARRAY['English Language', 'Mathematics', 'Basic Science'], 'Active', FALSE)
  RETURNING id INTO v_teacher_class;

  INSERT INTO public.staff_profiles (school_id, employee_id, first_name, last_name, email, phone, role, department, is_active, subjects, status, must_change_password)
  VALUES (c_school, 'DEMO-STF-005', 'Efe', 'Sample', 'demo.teacher.two@' || c_demo_domain, NULL, 'teacher', 'Academics', TRUE,
          ARRAY['Social Studies', 'Civic Education'], 'Active', FALSE)
  RETURNING id INTO v_teacher_subject;

  INSERT INTO public.staff_profiles (school_id, user_id, employee_id, first_name, last_name, email, phone, role, department, is_active, status, must_change_password)
  VALUES (c_school, (SELECT id FROM auth.users WHERE lower(email) = 'demo.security@' || c_demo_domain LIMIT 1),
          'DEMO-STF-006', 'Gbenga', 'Sample', 'demo.security@' || c_demo_domain, NULL, 'security', 'Operations and Safety', TRUE, 'Active', FALSE)
  RETURNING id INTO v_security;

  INSERT INTO public.teacher_assignments (school_id, staff_id, class_id, subject_id, session_id, is_class_teacher)
  VALUES (c_school, v_teacher_class, (v_class_ids ->> 'JSS 1')::UUID, v_subject_ids[1], v_session, TRUE),
         (c_school, v_teacher_class, (v_class_ids ->> 'JSS 1')::UUID, v_subject_ids[2], v_session, FALSE),
         (c_school, v_teacher_class, (v_class_ids ->> 'JSS 1')::UUID, v_subject_ids[3], v_session, FALSE),
         (c_school, v_teacher_subject, (v_class_ids ->> 'JSS 1')::UUID, v_subject_ids[4], v_session, FALSE),
         (c_school, v_teacher_subject, (v_class_ids ->> 'JSS 2')::UUID, v_subject_ids[5], v_session, FALSE);

  -- --------------------------------------------------------------------------
  -- Students, enrolments and guardians
  -- --------------------------------------------------------------------------
  FOR i IN 1 .. array_length(v_first_names, 1) LOOP
    v_adm := 'DEMO-' || lpad(i::TEXT, 4, '0');
    INSERT INTO public.students (school_id, user_id, admission_number, first_name, last_name, gender, status, is_activated)
    VALUES (c_school, (SELECT id FROM auth.users WHERE lower(email) = lower(v_adm) || '@student.oakland.ng' LIMIT 1),
            v_adm, v_first_names[i], 'Sample', CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END::gender_enum, 'active', TRUE)
    RETURNING id INTO v_student_id;
    v_students := v_students || v_student_id;

    INSERT INTO public.class_enrollments (student_id, class_id, session_id, roll_number, status)
    VALUES (v_student_id, (v_class_ids ->> v_student_classes[i])::UUID, v_session, lpad(i::TEXT, 2, '0'), 'active');
  END LOOP;

  INSERT INTO public.guardians (school_id, user_id, first_name, last_name, email, phone, relationship, is_activated)
  VALUES (c_school, (SELECT id FROM auth.users WHERE lower(email) = 'demo.parent@' || c_demo_domain LIMIT 1),
          'Chika', 'Sample', 'demo.parent@' || c_demo_domain, '—', 'Parent', TRUE)
  RETURNING id INTO v_parent;

  INSERT INTO public.guardians (school_id, first_name, last_name, email, phone, relationship, is_activated)
  VALUES (c_school, 'Hadiza', 'Sample', 'demo.guardian.two@' || c_demo_domain, '—', 'Parent', FALSE)
  RETURNING id INTO v_other_guardian;

  -- The demo parent has two children (siblings) in JSS 1; the gate pickup PIN is a labelled sample value
  INSERT INTO public.student_guardians (student_id, guardian_id, relationship, is_primary, can_receive_reports, authorized_pickup, pickup_pin)
  VALUES (v_students[1], v_parent, 'Parent', TRUE, TRUE, TRUE, '4827'),
         (v_students[2], v_parent, 'Parent', TRUE, TRUE, TRUE, '4827');
  FOR i IN 3 .. array_length(v_students, 1) LOOP
    INSERT INTO public.student_guardians (student_id, guardian_id, relationship, is_primary, can_receive_reports, authorized_pickup, pickup_pin)
    VALUES (v_students[i], v_other_guardian, 'Parent', TRUE, TRUE, TRUE, '6315');
  END LOOP;

  -- --------------------------------------------------------------------------
  -- Fees: recorded through the real payment function, so balances, receipts and audit entries are genuine
  -- --------------------------------------------------------------------------
  INSERT INTO public.bank_accounts (school_id, bank_name, account_number, account_name, is_active)
  VALUES (c_school, 'Sample Bank', '0000000000', 'Eductive Demo School Fees', TRUE)
  RETURNING id INTO v_bank_id;

  FOR i IN 1 .. array_length(v_students, 1) LOOP
    v_billed := public.resolve_student_billed_tuition(c_school, v_students[i]);
    v_pay := CASE i % 4 WHEN 0 THEN v_billed WHEN 1 THEN round(v_billed * 0.5) WHEN 2 THEN round(v_billed * 0.25) ELSE 0 END;
    IF v_pay > 0 THEN
      PERFORM public.record_fee_payment_tx(
        p_school_id => c_school,
        p_student_id => v_students[i],
        p_amount => v_pay,
        p_payment_method => 'Bank Transfer',
        p_idempotency_key => 'demo-seed-' || v_students[i]::TEXT,
        p_payer_name => 'Sample Guardian',
        p_receiving_account => 'Sample Bank (0000000000)',
        p_actor_id => NULL,
        p_actor_name => 'Chidi Sample',
        p_actor_role => 'Bursar'
      );
    END IF;
  END LOOP;
  -- Gives every student a ledger row, including those who have not paid yet
  PERFORM public.repair_student_financial_accounts(c_school);

  -- --------------------------------------------------------------------------
  -- Attendance for the last ten school days
  -- --------------------------------------------------------------------------
  FOR v_day IN
    SELECT d::DATE FROM generate_series(v_today - 20, v_today, INTERVAL '1 day') AS d
    WHERE EXTRACT(ISODOW FROM d) < 6
    ORDER BY d DESC
    LIMIT 10
  LOOP
    FOR i IN 1 .. array_length(v_students, 1) LOOP
      v_h := abs(hashtext(v_students[i]::TEXT || v_day::TEXT)) % 100;
      v_status := CASE WHEN v_h < 86 THEN 'present' WHEN v_h < 93 THEN 'late' ELSE 'absent' END;
      INSERT INTO public.attendance_records (school_id, class_id, student_id, session_id, term_id, date, status, marked_by)
      VALUES (c_school, (v_class_ids ->> v_student_classes[i])::UUID, v_students[i], v_session, v_term, v_day, v_status::attendance_status_enum, NULL);
    END LOOP;
  END LOOP;

  -- --------------------------------------------------------------------------
  -- Scores for JSS 1, stored the way the scores page stores them (schools.settings.subject_scores)
  -- --------------------------------------------------------------------------
  v_scores := '{}'::jsonb;
  FOR i IN 1 .. 3 LOOP
    v_entry := '[]'::jsonb;
    FOR v_h IN 1 .. 6 LOOP
      v_entry := v_entry || jsonb_build_object(
        'id', v_students[v_h],
        'admissionNo', 'DEMO-' || lpad(v_h::TEXT, 4, '0'),
        'name', v_first_names[v_h] || ' Sample',
        'ca1', 10 + abs(hashtext(v_students[v_h]::TEXT || 'ca1' || i)) % 11,
        'ca2', 10 + abs(hashtext(v_students[v_h]::TEXT || 'ca2' || i)) % 11,
        'exam', 30 + abs(hashtext(v_students[v_h]::TEXT || 'exam' || i)) % 31,
        'remark', ''
      );
    END LOOP;
    v_scores := v_scores || jsonb_build_object(
      'JSS 1_' || v_subject_names[i],
      jsonb_build_object(
        'scores', v_entry,
        'isLocked', i = 2,
        'submittedBy', CASE WHEN i = 2 THEN 'Dayo Sample' ELSE NULL END,
        'submittedAt', CASE WHEN i = 2 THEN to_jsonb(NOW()) ELSE NULL END
      )
    );
  END LOOP;
  UPDATE public.schools
  SET settings = settings || jsonb_build_object('subject_scores', v_scores)
  WHERE id = c_school;

  RETURN jsonb_build_object(
    'school', 'Eductive Demo School',
    'students', array_length(v_students, 1),
    'resetAt', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_school() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_demo_school() TO service_role;

-- ------------------------------------------------------------------------------
-- 3. Nightly reset (needs the pg_cron extension: Supabase Dashboard, Database, Extensions)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('eductive-demo-nightly-reset', '0 2 * * *', 'SELECT public.reset_demo_school()');
  END IF;
END $$;
