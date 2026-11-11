-- ==============================================================================
-- Migration 016: Master Settings Partial Merge & Defect Schema Fixes (M0.3)
-- Oakland International School Multi-Portal Management System
-- ==============================================================================

-- 1. Helper function for deep recursive JSONB merging
CREATE OR REPLACE FUNCTION public.jsonb_deep_merge(original JSONB, patch JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_object_agg(
        COALESCE(o.key, p.key),
        CASE
          WHEN o.value IS NULL THEN p.value
          WHEN p.value IS NULL THEN o.value
          WHEN jsonb_typeof(o.value) = 'object' AND jsonb_typeof(p.value) = 'object'
            THEN public.jsonb_deep_merge(o.value, p.value)
          ELSE p.value
        END
      )
      FROM jsonb_each(COALESCE(original, '{}'::jsonb)) o
      FULL OUTER JOIN jsonb_each(COALESCE(patch, '{}'::jsonb)) p ON o.key = p.key
    ),
    '{}'::jsonb
  );
$$;

-- 2. Master Settings Partial Merge RPC (DEF-113)
-- Prevents read-modify-write race conditions when updating school settings,
-- staff bank accounts, or staff deductions.
CREATE OR REPLACE FUNCTION public.merge_school_settings(
  p_school_id UUID,
  p_patch JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_updated_settings JSONB;
BEGIN
  UPDATE public.schools
  SET
    name = COALESCE(NULLIF(p_patch->>'name', ''), NULLIF(p_patch->>'schoolName', ''), name),
    motto = COALESCE(NULLIF(p_patch->>'motto', ''), motto),
    address = COALESCE(NULLIF(p_patch->>'address', ''), address),
    phone = COALESCE(NULLIF(p_patch->>'phone', ''), phone),
    email = COALESCE(NULLIF(p_patch->>'email', ''), email),
    settings = public.jsonb_deep_merge(COALESCE(settings, '{}'::jsonb), p_patch),
    updated_at = NOW()
  WHERE id = p_school_id
  RETURNING settings INTO v_updated_settings;

  RETURN v_updated_settings;
END;
$$;

-- Grant execution to authenticated & service_role
GRANT EXECUTE ON FUNCTION public.jsonb_deep_merge(JSONB, JSONB) TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.merge_school_settings(UUID, JSONB) TO postgres, authenticated, service_role;

-- 3. CBT Session Questions JSONB column (DEF-062)
-- Enables per-session shuffled question & option mapping with preserved answer integrity
ALTER TABLE public.cbt_sessions
  ADD COLUMN IF NOT EXISTS session_questions JSONB;

-- 4. Ensure staff_applications has all necessary columns and index (DEF-156)
ALTER TABLE public.staff_applications
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;


-- 5. Relax NOT NULL constraint on students.dob so students without DOB don't require dummy dates (DEF-152)
ALTER TABLE public.students ALTER COLUMN dob DROP NOT NULL;
