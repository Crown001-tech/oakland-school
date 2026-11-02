-- ==============================================================================
-- Add a school, step 1 of 2: the school's record, calendar, classes and subjects.
--
-- All schools share one database. This ADDS a school next to the ones already there. It never changes or
-- deletes another school's rows, and it refuses a code, slug or subdomain that is already taken.
--
-- Run it once per new school in the Supabase SQL editor of the shared project, after the migrations are
-- up to date. Edit the values in the config block below. Step 2 creates the owner's sign-in: see
-- scripts/new-school/README.md.
--
-- What it does
--   * creates the school (name, code, address, phone, email) with its own subdomain
--   * adds its calendar, classes and subjects from the starter packs it asks for: nigerian_nursery (Nursery 1 to 3),
--     nigerian_primary (Primary 1 to 6) and nigerian_secondary (JSS 1 to SS 3), in any combination, or none
--   * writes the settings the app reads: tuition, class capacity, grading rules, module switches
-- Contact details stay empty unless given. Nothing is invented.
-- ==============================================================================

DO $$
DECLARE
  -- ---------------------------------------------------------------------------
  -- EDIT THIS BLOCK
  -- ---------------------------------------------------------------------------
  v_config CONSTANT JSONB := '{
    "name": "",
    "code": "",
    "slug": "",
    "subdomain": "",
    "motto": "",
    "address": "",
    "phone": "",
    "email": "",
    "brandPrimary": "",
    "brandAccent": "",
    "academicSession": "",
    "firstTermName": "First Term",
    "termStart": "",
    "termEnd": "",
    "classCapacity": 0,
    "tuitionJSS": 0,
    "tuitionSS12": 0,
    "tuitionSS3": 0,
    "starterPacks": ["nigerian_secondary"],
    "modules": { "cbt": true, "security": true, "inventory": true, "letters": true }
  }'::jsonb;
  -- ---------------------------------------------------------------------------

  v_school UUID;
  v_name TEXT := btrim(COALESCE(v_config ->> 'name', ''));
  v_code TEXT := upper(btrim(COALESCE(v_config ->> 'code', '')));
  v_slug TEXT := lower(btrim(COALESCE(v_config ->> 'slug', '')));
  v_subdomain TEXT := lower(btrim(COALESCE(v_config ->> 'subdomain', '')));
  v_session_name TEXT := btrim(COALESCE(v_config ->> 'academicSession', ''));
  v_term_start DATE;
  v_term_end DATE;
  v_session UUID;
  v_i INT;

  v_packs TEXT[];
  v_pack TEXT;
  v_level_n INT := 0;
  v_class_name TEXT;
  v_nursery_classes TEXT[] := ARRAY['Nursery 1', 'Nursery 2', 'Nursery 3'];
  v_primary_classes TEXT[] := ARRAY['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];
  v_secondary_classes TEXT[] := ARRAY['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];
  v_nursery TEXT[] := ARRAY[
    'Number Work', 'Letter Work', 'Phonics', 'Language Development', 'Rhymes and Songs', 'Social Habits',
    'Health Habits', 'Creative Activities', 'Religious Studies', 'Physical Education'
  ];
  v_primary TEXT[] := ARRAY[
    'English Language', 'Mathematics', 'Basic Science and Technology', 'Social Studies', 'Civic Education',
    'Christian Religious Studies', 'Islamic Religious Studies', 'Agricultural Science', 'Home Economics',
    'Physical and Health Education', 'Computer Studies', 'Cultural and Creative Arts', 'French',
    'Verbal Reasoning', 'Quantitative Reasoning', 'Handwriting'
  ];
  v_junior TEXT[] := ARRAY[
    'Mathematics', 'English Language', 'Basic Science', 'Basic Technology', 'Computer Studies',
    'Social Studies', 'Civic Education', 'Agricultural Science', 'French', 'Cultural and Creative Arts'
  ];
  v_senior TEXT[] := ARRAY[
    'Mathematics', 'English Language', 'Civic Education', 'Computer Studies', 'Physics', 'Chemistry', 'Biology',
    'Further Mathematics', 'Technical Drawing', 'Agricultural Science', 'Financial Accounting', 'Economics',
    'Commerce', 'Business Management', 'Literature in English', 'Government', 'Christian Religious Studies',
    'Islamic Religious Studies', 'Geography', 'History', 'French'
  ];
  v_subject TEXT;
  v_category TEXT;
  v_code_n INT := 0;
BEGIN
  -- Required values
  IF v_name = '' OR v_code = '' OR v_slug = '' OR v_subdomain = '' OR v_session_name = '' THEN
    RAISE EXCEPTION 'MISSING: fill in name, code, slug, subdomain and academicSession in the config block.';
  END IF;
  IF v_code !~ '^[A-Z0-9-]{2,30}$' OR v_slug !~ '^[a-z0-9-]{2,60}$' OR v_subdomain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' THEN
    RAISE EXCEPTION 'INVALID: code may use letters, digits and hyphens; slug and subdomain may use lower-case letters, digits and hyphens.';
  END IF;
  IF v_code = 'EDUCTIVE-DEMO' THEN
    RAISE EXCEPTION 'INVALID: that code is reserved for the Eductive demo school.';
  END IF;
  IF v_subdomain IN ('www', 'app', 'api', 'admin', 'demo', 'mail', 'static') THEN
    RAISE EXCEPTION 'INVALID: that subdomain is reserved.';
  END IF;
  IF NULLIF(v_config ->> 'termStart', '') IS NULL OR NULLIF(v_config ->> 'termEnd', '') IS NULL THEN
    RAISE EXCEPTION 'MISSING: fill in termStart and termEnd (YYYY-MM-DD).';
  END IF;
  v_term_start := (v_config ->> 'termStart')::DATE;
  v_term_end := (v_config ->> 'termEnd')::DATE;
  IF v_term_end <= v_term_start THEN
    RAISE EXCEPTION 'INVALID: termEnd must be after termStart.';
  END IF;
  IF (NULLIF(v_config ->> 'brandPrimary', '') IS NOT NULL AND (v_config ->> 'brandPrimary') !~* '^#[0-9a-f]{6}$')
     OR (NULLIF(v_config ->> 'brandAccent', '') IS NOT NULL AND (v_config ->> 'brandAccent') !~* '^#[0-9a-f]{6}$') THEN
    RAISE EXCEPTION 'INVALID: brandPrimary and brandAccent must be six-digit hex colours such as #0b5d3b.';
  END IF;
  -- Starter packs: starterPacks is a list; the older single starterPack value still works
  v_packs := CASE
    WHEN jsonb_typeof(v_config -> 'starterPacks') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(v_config -> 'starterPacks'))
    WHEN COALESCE(v_config ->> 'starterPack', 'none') = 'none' THEN ARRAY[]::TEXT[]
    ELSE ARRAY[v_config ->> 'starterPack']
  END;
  FOREACH v_pack IN ARRAY v_packs LOOP
    IF v_pack NOT IN ('nigerian_nursery', 'nigerian_primary', 'nigerian_secondary') THEN
      RAISE EXCEPTION 'INVALID: starter pack % is not known. Use nigerian_nursery, nigerian_primary, nigerian_secondary, or none.', v_pack;
    END IF;
  END LOOP;

  -- Nothing already in the database is reused
  IF EXISTS (SELECT 1 FROM public.schools WHERE upper(code) = v_code) THEN
    RAISE EXCEPTION 'TAKEN: a school with the code % already exists.', v_code;
  END IF;
  IF EXISTS (SELECT 1 FROM public.schools WHERE lower(slug) = v_slug) THEN
    RAISE EXCEPTION 'TAKEN: a school with the slug % already exists.', v_slug;
  END IF;
  IF EXISTS (SELECT 1 FROM public.schools WHERE lower(subdomain) = v_subdomain) THEN
    RAISE EXCEPTION 'TAKEN: a school with the subdomain % already exists.', v_subdomain;
  END IF;

  -- The school itself
  INSERT INTO public.schools (name, code, slug, subdomain, motto, address, phone, email, settings)
  VALUES (v_name, v_code, v_slug, v_subdomain, NULLIF(v_config ->> 'motto', ''), NULLIF(v_config ->> 'address', ''),
          NULLIF(v_config ->> 'phone', ''), NULLIF(v_config ->> 'email', ''), '{}'::jsonb)
  RETURNING id INTO v_school;

  UPDATE public.schools SET settings = jsonb_strip_nulls(jsonb_build_object(
    'schoolName', v_name,
    'academicSession', v_session_name,
    'currentTerm', COALESCE(NULLIF(v_config ->> 'firstTermName', ''), 'First Term'),
    'classCapacity', COALESCE((v_config ->> 'classCapacity')::INT, 0),
    'tuitionJSS', COALESCE((v_config ->> 'tuitionJSS')::NUMERIC, 0),
    'tuitionSS12', COALESCE((v_config ->> 'tuitionSS12')::NUMERIC, 0),
    'tuitionSS3', COALESCE((v_config ->> 'tuitionSS3')::NUMERIC, 0),
    'ca1Weight', 20,
    'ca2Weight', 20,
    'examWeight', 60,
    'passMark', 50,
    'brandPrimary', NULLIF(v_config ->> 'brandPrimary', ''),
    'brandAccent', NULLIF(v_config ->> 'brandAccent', ''),
    'modules', COALESCE(v_config -> 'modules', '{}'::jsonb)
  )) WHERE id = v_school;

  -- Calendar
  INSERT INTO public.academic_sessions (school_id, name, start_date, end_date, is_current)
  VALUES (v_school, v_session_name, v_term_start, v_term_end + 200, TRUE)
  RETURNING id INTO v_session;

  INSERT INTO public.academic_terms (session_id, school_id, name, term_number, start_date, end_date, is_current)
  VALUES (v_session, v_school, COALESCE(NULLIF(v_config ->> 'firstTermName', ''), 'First Term'), 1, v_term_start, v_term_end, TRUE);

  -- Starter packs: classes go in teaching order (nursery, primary, secondary), whatever order they were asked for
  FOREACH v_pack IN ARRAY ARRAY['nigerian_nursery', 'nigerian_primary', 'nigerian_secondary'] LOOP
    CONTINUE WHEN NOT (v_pack = ANY (v_packs));
    FOREACH v_class_name IN ARRAY (CASE v_pack WHEN 'nigerian_nursery' THEN v_nursery_classes WHEN 'nigerian_primary' THEN v_primary_classes ELSE v_secondary_classes END) LOOP
      v_level_n := v_level_n + 1;
      INSERT INTO public.classes (school_id, name, level, grade_level, capacity)
      VALUES (v_school, v_class_name, v_class_name, v_level_n, NULLIF((v_config ->> 'classCapacity')::INT, 0));
    END LOOP;
  END LOOP;

  -- Subjects: a subject that belongs to one stage takes that stage as its category (Nursery, Primary, Junior,
  -- Senior); one shared by several takes All
  IF cardinality(v_packs) > 0 THEN
    CREATE TEMP TABLE pack_subjects (name TEXT, category TEXT) ON COMMIT DROP;
    IF 'nigerian_nursery' = ANY (v_packs) THEN
      INSERT INTO pack_subjects SELECT s, 'Nursery' FROM unnest(v_nursery) s;
    END IF;
    IF 'nigerian_primary' = ANY (v_packs) THEN
      INSERT INTO pack_subjects SELECT s, 'Primary' FROM unnest(v_primary) s;
    END IF;
    IF 'nigerian_secondary' = ANY (v_packs) THEN
      INSERT INTO pack_subjects SELECT s, 'Junior' FROM unnest(v_junior) s;
      INSERT INTO pack_subjects SELECT s, 'Senior' FROM unnest(v_senior) s;
    END IF;

    FOR v_subject, v_category IN
      SELECT name, CASE WHEN count(DISTINCT category) > 1 THEN 'All' ELSE min(category) END
      FROM pack_subjects GROUP BY name ORDER BY name
    LOOP
      v_code_n := v_code_n + 1;
      INSERT INTO public.subjects (school_id, name, code, category, is_active)
      VALUES (v_school, v_subject, upper(left(regexp_replace(v_subject, '[^A-Za-z]', '', 'g'), 3)) || lpad(v_code_n::TEXT, 2, '0'), v_category, TRUE);
    END LOOP;
  END IF;

  RAISE NOTICE 'School created: % (code %, subdomain %). School id: %', v_name, v_code, v_subdomain, v_school;
END $$;
