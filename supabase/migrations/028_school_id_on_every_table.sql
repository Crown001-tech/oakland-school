-- ==============================================================================
-- Migration 028: Every table belongs to a school
--
-- Eductive runs many schools on one database. Each school's rows carry that school's id, and the API
-- only ever reads or writes rows of the signed-in person's school.
--
-- Until now 24 tables (visitors, deliveries, incidents, documents, report cards, scores, enrolments and
-- others) had no school id, because there was only one school. This adds one to each, gives the existing
-- rows to the school that exists today, and makes it required.
--
-- It also gives each school a subdomain (oakland.example.com), which is how a visitor who is not signed in
-- (the admissions form, the login page) is matched to a school.
-- ==============================================================================

ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS subdomain VARCHAR(63);
CREATE UNIQUE INDEX IF NOT EXISTS schools_subdomain_key ON public.schools (lower(subdomain)) WHERE subdomain IS NOT NULL;

DO $$
DECLARE
  t TEXT;
  v_school UUID;
  v_school_ok BOOLEAN;
  v_tables TEXT[] := ARRAY[
    'assignment_submissions', 'authorized_pickup_persons', 'cbt_assessment_questions', 'cbt_session_answers',
    'cbt_sessions', 'class_enrollments', 'deliveries', 'documents', 'emergency_contacts', 'inventory_items',
    'pickup_logs', 'procurement_requests', 'report_cards', 'school_events', 'scores', 'security_incidents',
    'staff_gate_logs', 'student_guardians', 'student_movements', 'timetable_constraints', 'timetable_slots',
    'timetable_versions', 'visitors', 'workflow_steps'
  ];
BEGIN
  -- The school that exists today. When a database already holds several schools, rows are never guessed.
  SELECT id INTO v_school FROM public.schools ORDER BY created_at LIMIT 1;
  IF (SELECT count(*) FROM public.schools) > 1 THEN
    v_school := NULL;
  END IF;

  FOREACH t IN ARRAY v_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE', t);

    -- Rows that belong to a parent take the parent's school
    IF t = 'class_enrollments' AND to_regclass('public.classes') IS NOT NULL THEN
      UPDATE public.class_enrollments ce SET school_id = c.school_id FROM public.classes c WHERE ce.class_id = c.id AND ce.school_id IS NULL;
    ELSIF t = 'student_guardians' AND to_regclass('public.students') IS NOT NULL THEN
      UPDATE public.student_guardians sg SET school_id = s.school_id FROM public.students s WHERE sg.student_id = s.id AND sg.school_id IS NULL;
    END IF;

    IF v_school IS NOT NULL THEN
      EXECUTE format('UPDATE public.%I SET school_id = $1 WHERE school_id IS NULL', t) USING v_school;
    END IF;

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (school_id)', t || '_school_id_idx', t);

    -- Required from now on, once every existing row has a school
    EXECUTE format('SELECT NOT EXISTS (SELECT 1 FROM public.%I WHERE school_id IS NULL)', t) INTO v_school_ok;
    IF v_school_ok THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN school_id SET NOT NULL', t);
    END IF;
  END LOOP;
END $$;

-- An enrolment or a guardian link takes its school from the class or the student it points at, so a row
-- written by any path (the API, a database function, a script) can never end up in another school.
CREATE OR REPLACE FUNCTION public.set_school_from_class()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    SELECT school_id INTO NEW.school_id FROM public.classes WHERE id = NEW.class_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_school_from_student()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    SELECT school_id INTO NEW.school_id FROM public.students WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF to_regclass('public.class_enrollments') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS class_enrollments_set_school ON public.class_enrollments;
    CREATE TRIGGER class_enrollments_set_school BEFORE INSERT ON public.class_enrollments
      FOR EACH ROW EXECUTE FUNCTION public.set_school_from_class();
  END IF;
  IF to_regclass('public.student_guardians') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS student_guardians_set_school ON public.student_guardians;
    CREATE TRIGGER student_guardians_set_school BEFORE INSERT ON public.student_guardians
      FOR EACH ROW EXECUTE FUNCTION public.set_school_from_student();
  END IF;
END $$;

-- Oakland's students already sign in with generated addresses on student.oakland.ng. Every school now has its
-- own student sign-in domain, kept in its settings; Oakland keeps the one its students already use.
UPDATE public.schools
SET settings = COALESCE(settings, '{}'::jsonb) || '{"studentEmailDomain": "student.oakland.ng"}'::jsonb
WHERE code = 'OAK-001'
  AND COALESCE(settings ->> 'studentEmailDomain', '') = '';
