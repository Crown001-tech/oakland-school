-- ==============================================================================
-- Migration 026: Custom request log
--
-- Every request a school makes is recorded here. The rule is to build a request as a setting or a
-- module switch where possible, and never as a copy of the code for one school, so each request records
-- how it was handled. Custom work is capped per contract in writing; `estimated_days` tracks it.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.custom_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  requested_by VARCHAR(150),
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'accepted', 'in_progress', 'done', 'declined')),
  approach VARCHAR(20)
    CHECK (approach IN ('setting', 'module', 'product_feature', 'custom_work')),
  estimated_days NUMERIC(5,1) CHECK (estimated_days IS NULL OR estimated_days >= 0),
  notes TEXT,
  created_by_id UUID,
  created_by_name VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_requests_school_status ON public.custom_requests (school_id, status, created_at DESC);

ALTER TABLE public.custom_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Proprietor manages custom_requests" ON public.custom_requests;
CREATE POLICY "Proprietor manages custom_requests" ON public.custom_requests
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'admin'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'admin'], school_id));
