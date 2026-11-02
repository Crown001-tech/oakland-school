-- ==============================================================================
-- Migration 029: The database itself keeps schools apart
--
-- Many schools share one database. The app already limits every request to one school (see
-- FRONTEND/src/lib/school-db.ts), but that is the app's rule. This makes it the database's rule too, so a
-- mistake in the app, or a direct request made with the public browser key, still cannot reach another
-- school's rows.
--
--   current_school_id()  the school of the signed-in person: their staff, guardian, student or membership record
--   school_isolation     a RESTRICTIVE policy on every table that holds a school's rows. A restrictive policy is
--                        combined with the policies already there, so it only narrows access: a row is visible
--                        only when it belongs to the caller's school, whatever else allows it.
--
-- The service role (the app's server) bypasses row-level security, as before. Visitors with no sign-in
-- (the anon role) and signed-in people with no school see no school rows. Several earlier policies were
-- written USING (true) (fee structures, fee transactions, classes); they no longer let anyone read
-- another school's data.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT school_id FROM public.staff_profiles WHERE user_id = auth.uid() LIMIT 1),
    (SELECT school_id FROM public.guardians WHERE user_id = auth.uid() LIMIT 1),
    (SELECT school_id FROM public.students WHERE user_id = auth.uid() LIMIT 1),
    (SELECT school_id FROM public.school_memberships WHERE user_id = auth.uid() LIMIT 1)
  )
$$;

REVOKE ALL ON FUNCTION public.current_school_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_school_id() TO anon, authenticated, service_role;

DO $$
DECLARE
  t TEXT;
BEGIN
  -- Every table that holds a school's rows
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'school_id'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS school_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY school_isolation ON public.%I AS RESTRICTIVE FOR ALL TO public USING (school_id = public.current_school_id()) WITH CHECK (school_id = public.current_school_id())',
      t
    );
  END LOOP;

  -- The schools table: a person sees only their own school
  ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS school_isolation ON public.schools;
  CREATE POLICY school_isolation ON public.schools AS RESTRICTIVE FOR ALL TO public
    USING (id = public.current_school_id()) WITH CHECK (id = public.current_school_id());
END $$;
