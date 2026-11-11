-- ==============================================================================
-- Migration 025: Tuition for any class
--
-- resolve_student_billed_tuition (migration 019) billed 0 for any class that is not JSS 1 to SS 3,
-- so a school with other class names (Primary 1, Year 7) could not take a payment. Those classes are now
-- billed from their own row in fee_structures. JSS and SS classes still bill from schools.settings.
-- The same rule is in FRONTEND/src/lib/tuition.ts, so screens and payments always agree.
-- A missing rate bills 0, never an invented amount.
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
  v_name TEXT;
  v_settings JSONB;
  v_key TEXT;
  v_raw TEXT;
  v_amount NUMERIC(12,2);
BEGIN
  SELECT c.name
  INTO v_class_name
  FROM public.class_enrollments ce
  JOIN public.classes c ON c.id = ce.class_id
  WHERE ce.student_id = p_student_id
    AND c.school_id = p_school_id
  ORDER BY (CASE WHEN ce.status = 'active' THEN 0 ELSE 1 END), ce.created_at DESC
  LIMIT 1;

  IF v_class_name IS NULL OR btrim(v_class_name) = '' THEN
    RETURN 0.00;
  END IF;

  v_name := upper(btrim(v_class_name));

  IF v_name ~ '^JSS\s*[123]([^0-9]|$)' THEN
    v_key := 'tuitionJSS';
  ELSIF v_name ~ '^SS\s*3([^0-9]|$)' THEN
    v_key := 'tuitionSS3';
  ELSIF v_name ~ '^SS\s*[12]([^0-9]|$)' THEN
    v_key := 'tuitionSS12';
  ELSE
    -- Any other class is billed from its own fee structure
    SELECT fs.total_amount
    INTO v_amount
    FROM public.fee_structures fs
    WHERE fs.school_id = p_school_id
      AND fs.class_name = v_class_name
    ORDER BY fs.updated_at DESC NULLS LAST
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
