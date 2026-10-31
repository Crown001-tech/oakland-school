-- ==============================================================================
-- Migration 017: Critical Security & RPC Lockdown
-- Description:
--   1. Drop permissive schools RLS policy ("Public read school information")
--   2. Revoke SELECT (settings) on public.schools from PUBLIC, anon, authenticated
--   3. Create secure public view public.school_public_profiles for anonymous site branding
--   4. Revoke EXECUTE on all sensitive functions from PUBLIC, anon, authenticated
--   5. Grant EXECUTE strictly to service_role
--   6. Fix resolve_student_billed_tuition to never bill classless students as JSS 1
-- ==============================================================================

-- 1. Lock down public.schools table
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Public read school information" ON public.schools;
DROP POLICY IF EXISTS "Public read access to school profiles" ON public.schools;
DROP POLICY IF EXISTS "Proprietor and admin manage school profile" ON public.schools;
DROP POLICY IF EXISTS "Authenticated users view own school" ON public.schools;
DROP POLICY IF EXISTS "Authenticated users view own school profile" ON public.schools;

-- Authenticated users (staff/parents/students) can only view their own school profile
CREATE POLICY "Authenticated users view own school profile" ON public.schools
    FOR SELECT TO authenticated
    USING (id IN (SELECT public.current_user_school_ids()));

-- Revoke column-level access to sensitive settings column from public, anon, and authenticated
REVOKE ALL ON public.schools FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, name, code, slug, motto, address, phone, email, logo_url, created_at, updated_at) 
ON public.schools TO authenticated;

-- Service role has full unrestricted access on schools (including settings)
GRANT ALL ON public.schools TO service_role;

-- Create secure sanitized view for anonymous public website consumption (zero settings exposure)
CREATE OR REPLACE VIEW public.school_public_profiles AS
SELECT 
    id,
    name,
    code,
    slug,
    motto,
    address,
    phone,
    email,
    logo_url
FROM public.schools;

GRANT SELECT ON public.school_public_profiles TO anon, authenticated, service_role;

-- 2. Revoke direct browser RPC execution on all sensitive functions
-- By default PostgreSQL grants EXECUTE to PUBLIC. Revoke from PUBLIC, anon, and authenticated.

DO $$
BEGIN
    -- check_rate_limit
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_rate_limit') THEN
        REVOKE ALL ON FUNCTION public.check_rate_limit FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
    END IF;

    -- record_rate_limit_attempt
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_rate_limit_attempt') THEN
        REVOKE ALL ON FUNCTION public.record_rate_limit_attempt FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.record_rate_limit_attempt TO service_role;
    END IF;

    -- record_fee_payment_tx
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'record_fee_payment_tx') THEN
        REVOKE ALL ON FUNCTION public.record_fee_payment_tx FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.record_fee_payment_tx TO service_role;
    END IF;

    -- merge_school_settings
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'merge_school_settings') THEN
        REVOKE ALL ON FUNCTION public.merge_school_settings FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.merge_school_settings TO service_role;
    END IF;

    -- jsonb_deep_merge
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'jsonb_deep_merge') THEN
        REVOKE ALL ON FUNCTION public.jsonb_deep_merge FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.jsonb_deep_merge TO service_role;
    END IF;

    -- repair_student_financial_accounts
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'repair_student_financial_accounts') THEN
        REVOKE ALL ON FUNCTION public.repair_student_financial_accounts FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.repair_student_financial_accounts TO service_role;
    END IF;

    -- resolve_student_billed_tuition
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'resolve_student_billed_tuition') THEN
        REVOKE ALL ON FUNCTION public.resolve_student_billed_tuition FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.resolve_student_billed_tuition TO service_role;
    END IF;

    -- next_school_document_number
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'next_school_document_number') THEN
        REVOKE ALL ON FUNCTION public.next_school_document_number FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.next_school_document_number TO service_role;
    END IF;

    -- seed_role_permissions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_role_permissions') THEN
        REVOKE ALL ON FUNCTION public.seed_role_permissions FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.seed_role_permissions TO service_role;
    END IF;
END $$;

-- 3. Fix resolve_student_billed_tuition so students with NO class are billed 0, NOT JSS 1 tuition!
CREATE OR REPLACE FUNCTION public.resolve_student_billed_tuition(
    p_school_id UUID,
    p_student_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
    v_class_name TEXT;
    v_settings JSONB;
    v_tuition_jss NUMERIC;
    v_tuition_ss12 NUMERIC;
    v_tuition_ss3 NUMERIC;
BEGIN
    -- 1. Fetch student's current class name strictly from classes table
    SELECT c.name INTO v_class_name
    FROM public.students s
    LEFT JOIN public.classes c ON c.id = s.class_id
    WHERE s.id = p_student_id AND s.school_id = p_school_id;

    -- If student has no assigned class, return 0 (pending class assignment). NEVER default to JSS 1.
    IF v_class_name IS NULL OR TRIM(v_class_name) = '' THEN
        RETURN 0.00;
    END IF;

    -- 2. Fetch master tuition rates from schools.settings
    SELECT settings INTO v_settings
    FROM public.schools
    WHERE id = p_school_id;

    v_tuition_jss  := COALESCE((v_settings->>'tuitionJSS')::NUMERIC, 350000);
    v_tuition_ss12 := COALESCE((v_settings->>'tuitionSS12')::NUMERIC, 420000);
    v_tuition_ss3  := COALESCE((v_settings->>'tuitionSS3')::NUMERIC, 480000);

    -- 3. Resolve tuition based on strictly isolated class pattern
    IF v_class_name ~* '^SS\s*3' THEN
        RETURN v_tuition_ss3;
    ELSIF v_class_name ~* '^SS\s*[12]' THEN
        RETURN v_tuition_ss12;
    ELSIF v_class_name ~* '^JSS' THEN
        RETURN v_tuition_jss;
    ELSE
        -- Primary / other classes default to JSS base rate if enrolled, or 0 if unclassified
        RETURN v_tuition_jss;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lock down the updated function strictly to service_role
REVOKE ALL ON FUNCTION public.resolve_student_billed_tuition FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_student_billed_tuition TO service_role;
