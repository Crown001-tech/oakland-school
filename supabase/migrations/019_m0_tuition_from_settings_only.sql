-- ==============================================================================
-- Migration 019: Tuition resolved from master settings only
--
-- Replaces resolve_student_billed_tuition from migrations 017 and 018, which fell
-- back to invented amounts (350,000 / 380,000 / 420,000 / 480,000) when a tuition
-- setting was missing, and treated a deliberate setting of 0 as missing.
--
-- Rules (AGENTS.md 1.3):
--   * The rate comes only from schools.settings: tuitionJSS, tuitionSS12, tuitionSS3.
--   * A missing or blank setting bills 0. A setting of 0 bills 0.
--   * A student with no class enrolment in this school, or a class outside
--     JSS 1 to SS 3, bills 0.
-- record_fee_payment_tx then rejects any payment above a 0 balance unless the
-- bursar confirms it as credit carried forward.
-- ==============================================================================

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
  v_settings JSONB;
  v_key TEXT;
  v_raw TEXT;
BEGIN
  -- Active enrolment first, then the most recent one
  SELECT c.name
  INTO v_class_name
  FROM public.class_enrollments ce
  JOIN public.classes c ON c.id = ce.class_id
  WHERE ce.student_id = p_student_id
    AND c.school_id = p_school_id
  ORDER BY (CASE WHEN ce.status = 'active' THEN 0 ELSE 1 END), ce.created_at DESC
  LIMIT 1;

  v_class_name := upper(btrim(COALESCE(v_class_name, '')));

  -- Class arms such as "JSS 1A" or "SS 2 Science" bill at their level's rate
  IF v_class_name ~ '^JSS\s*[123]([^0-9]|$)' THEN
    v_key := 'tuitionJSS';
  ELSIF v_class_name ~ '^SS\s*3([^0-9]|$)' THEN
    v_key := 'tuitionSS3';
  ELSIF v_class_name ~ '^SS\s*[12]([^0-9]|$)' THEN
    v_key := 'tuitionSS12';
  ELSE
    RETURN 0.00;
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
