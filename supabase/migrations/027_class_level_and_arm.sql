-- ==============================================================================
-- Migration 027: A class is a level plus an arm
--
-- Schools split one level into several classes: JSS 1 A and JSS 1 B, or JSS 1 Diamond and JSS 1 Silver.
-- What differs between those classes is the timetable, the class teacher and the capacity. The tuition
-- belongs to the level, so every arm of a level is billed the same.
--
-- classes.level  the level the class belongs to (JSS 1, Primary 3, Nursery 2). It is the class's own name
--                when the school does not split the level.
-- classes.arm    the part that tells arms apart (A, B, Diamond), empty when the level is not split.
--
-- resolve_student_billed_tuition (migration 025) now works out the rate from the level, so "Diamond" or
-- "JSS 1 Diamond" bills as JSS 1. A class outside JSS and SS bills from its own fee structure, then from
-- its level's fee structure. The same rule is in FRONTEND/src/lib/tuition.ts.
-- ==============================================================================

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS level VARCHAR(50);
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS arm VARCHAR(50);

-- Some databases already have an arm column that is required and defaults to 'A'. An arm is optional, and
-- a class with no arm has none, so the requirement and the default go.
ALTER TABLE public.classes ALTER COLUMN arm DROP NOT NULL;
ALTER TABLE public.classes ALTER COLUMN arm DROP DEFAULT;

-- Existing JSS and SS classes: "JSS 1A" is level "JSS 1", arm "A". Every other class is its own level.
UPDATE public.classes
SET level = (regexp_match(upper(btrim(name)), '^(JSS|SS)\s*([1-3])'))[1] || ' ' || (regexp_match(upper(btrim(name)), '^(JSS|SS)\s*([1-3])'))[2],
    arm = NULLIF(btrim(regexp_replace(btrim(name), '^(JSS|SS)\s*[1-3]', '', 'i')), '')
WHERE level IS NULL
  AND btrim(name) ~* '^(JSS|SS)\s*[1-3]([^0-9]|$)';

UPDATE public.classes SET level = btrim(name) WHERE level IS NULL;

-- A class with no arm of its own carries no stand-in arm from the old default
UPDATE public.classes SET arm = NULL WHERE arm = 'A' AND btrim(name) = btrim(level);

-- A class name is never used twice in a school, whatever its arm
CREATE UNIQUE INDEX IF NOT EXISTS classes_school_lower_name_key ON public.classes (school_id, lower(btrim(name)));

CREATE OR REPLACE FUNCTION public.resolve_student_billed_tuition(
  p_school_id UUID,
  p_student_id UUID
)
RETURNS NUMERIC(12,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_name TEXT;
  v_level TEXT;
  v_name TEXT;
  v_settings JSONB;
  v_key TEXT;
  v_raw TEXT;
  v_amount NUMERIC(12,2);
BEGIN
  SELECT c.name, COALESCE(NULLIF(btrim(c.level), ''), c.name)
  INTO v_class_name, v_level
  FROM public.class_enrollments ce
  JOIN public.classes c ON c.id = ce.class_id
  WHERE ce.student_id = p_student_id
    AND c.school_id = p_school_id
  ORDER BY (CASE WHEN ce.status = 'active' THEN 0 ELSE 1 END), ce.created_at DESC
  LIMIT 1;

  IF v_class_name IS NULL OR btrim(v_class_name) = '' THEN
    RETURN 0.00;
  END IF;

  v_name := upper(btrim(v_level));

  IF v_name ~ '^JSS\s*[123]([^0-9]|$)' THEN
    v_key := 'tuitionJSS';
  ELSIF v_name ~ '^SS\s*3([^0-9]|$)' THEN
    v_key := 'tuitionSS3';
  ELSIF v_name ~ '^SS\s*[12]([^0-9]|$)' THEN
    v_key := 'tuitionSS12';
  ELSE
    -- Any other class is billed from its own fee structure, then from its level's
    SELECT fs.total_amount
    INTO v_amount
    FROM public.fee_structures fs
    WHERE fs.school_id = p_school_id
      AND fs.class_name IN (v_class_name, v_level)
    ORDER BY (CASE WHEN fs.class_name = v_class_name THEN 0 ELSE 1 END), fs.updated_at DESC NULLS LAST
    LIMIT 1;
    RETURN COALESCE(v_amount, 0.00);
  END IF;

  SELECT COALESCE(settings, '{}'::jsonb)
  INTO v_settings
  FROM public.schools
  WHERE id = p_school_id;

  v_raw := btrim(COALESCE(v_settings ->> v_key, ''));
  IF v_raw !~ '^[0-9]+(\.[0-9]+)?$' THEN
    RETURN 0.00;
  END IF;

  RETURN v_raw::NUMERIC(12,2);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_student_billed_tuition(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_student_billed_tuition(UUID, UUID) TO service_role;
