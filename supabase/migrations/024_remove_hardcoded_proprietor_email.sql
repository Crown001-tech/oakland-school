-- ==============================================================================
-- Migration 024: No hardcoded proprietor email
--
-- Migration 015 made current_user_has_role treat anyone signed in as
-- proprietor@oaklandschool.com.ng as a proprietor of every school. A role must come only from the
-- school's own records (school_memberships or staff_profiles), so that address, which belongs to
-- one school, cannot grant access anywhere. Everything else in the function is unchanged.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.current_user_has_role(
  p_roles TEXT[],
  p_school_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := lower(COALESCE(auth.jwt() ->> 'email', ''));
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.school_memberships sm
    WHERE sm.user_id = v_uid
      AND sm.is_active = TRUE
      AND sm.role::TEXT = ANY(p_roles)
      AND (p_school_id IS NULL OR sm.school_id = p_school_id)
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    WHERE (sp.user_id = v_uid OR (v_email <> '' AND lower(sp.email) = v_email))
      AND sp.is_active = TRUE
      AND sp.role::TEXT = ANY(p_roles)
      AND (p_school_id IS NULL OR sp.school_id = p_school_id)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
