-- =============================================================================
-- Migration 015: Phase M0.2 — Security, Auth & RLS Hardening
-- Eductive Multi-Portal School Management System (Oakland International School)
-- =============================================================================
-- 1. Retire Shared Staff Password (`Oakland@2026`):
--    Add `must_change_password`, `invite_token_hash`, `invite_expires_at` to `staff_profiles`.
-- 2. Brute-Force Rate Limiting & 5-Attempt Lockout:
--    Create `auth_rate_limits` and atomic RPCs `check_rate_limit` / `record_rate_limit_attempt`.
-- 3. Purge Residual Migration Seed Rows (`AGENTS.md` Rule 1.8):
--    Remove the 3 dummy inventory seed rows from `public.inventory_items`.
-- 4. True Row-Level Security (RLS) Policies:
--    Drop all permissive `USING (true)` policies across all operational tables and
--    replace them with strict school-scoped and role/relationship-scoped policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. STAFF INVITE & PASSWORD ROTATION COLUMNS
-- -----------------------------------------------------------------------------
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS invite_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- 2. BRUTE-FORCE RATE LIMITING TABLE & ATOMIC RPCs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key VARCHAR(200) PRIMARY KEY,
  scope VARCHAR(50) NOT NULL DEFAULT 'login',
  attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_scope_locked
  ON public.auth_rate_limits(scope, locked_until);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages auth_rate_limits" ON public.auth_rate_limits;
CREATE POLICY "Service role manages auth_rate_limits" ON public.auth_rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Check whether a rate-limit key is currently locked out
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_window_minutes INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec public.auth_rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_remaining INT := 0;
BEGIN
  SELECT * INTO v_rec
  FROM public.auth_rate_limits
  WHERE key = lower(btrim(p_key));

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'locked', false,
      'attempts', 0,
      'locked_until', NULL,
      'remaining_seconds', 0
    );
  END IF;

  -- Active lockout check
  IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until > v_now THEN
    v_remaining := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_rec.locked_until - v_now)))::INT);
    RETURN jsonb_build_object(
      'locked', true,
      'attempts', v_rec.attempts,
      'locked_until', v_rec.locked_until,
      'remaining_seconds', v_remaining
    );
  END IF;

  -- If previous window or lockout expired, treat as unlocked
  IF (v_rec.locked_until IS NOT NULL AND v_rec.locked_until <= v_now)
     OR (v_rec.last_attempt_at < v_now - make_interval(mins => p_window_minutes)) THEN
    RETURN jsonb_build_object(
      'locked', false,
      'attempts', 0,
      'locked_until', NULL,
      'remaining_seconds', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'locked', false,
    'attempts', v_rec.attempts,
    'locked_until', NULL,
    'remaining_seconds', 0
  );
END;
$$;

-- Record an authentication / activation / PIN verification attempt
CREATE OR REPLACE FUNCTION public.record_rate_limit_attempt(
  p_key TEXT,
  p_scope TEXT DEFAULT 'login',
  p_success BOOLEAN DEFAULT FALSE,
  p_max_attempts INT DEFAULT 5,
  p_lockout_minutes INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_key TEXT := lower(btrim(p_key));
  v_rec public.auth_rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_new_attempts INT;
  v_locked_until TIMESTAMPTZ := NULL;
  v_just_locked BOOLEAN := FALSE;
BEGIN
  IF p_success THEN
    DELETE FROM public.auth_rate_limits WHERE key = v_clean_key;
    RETURN jsonb_build_object(
      'locked', false,
      'just_locked', false,
      'attempts', 0,
      'locked_until', NULL,
      'remaining_seconds', 0
    );
  END IF;

  SELECT * INTO v_rec
  FROM public.auth_rate_limits
  WHERE key = v_clean_key
  FOR UPDATE;

  IF NOT FOUND THEN
    v_new_attempts := 1;
  ELSIF (v_rec.locked_until IS NOT NULL AND v_rec.locked_until <= v_now)
     OR (v_rec.last_attempt_at < v_now - make_interval(mins => p_lockout_minutes)) THEN
    v_new_attempts := 1;
  ELSE
    v_new_attempts := v_rec.attempts + 1;
  END IF;

  IF v_new_attempts >= p_max_attempts THEN
    v_locked_until := v_now + make_interval(mins => p_lockout_minutes);
    IF v_rec.locked_until IS NULL OR v_rec.locked_until <= v_now THEN
      v_just_locked := TRUE;
    END IF;
  END IF;

  INSERT INTO public.auth_rate_limits (key, scope, attempts, locked_until, last_attempt_at)
  VALUES (v_clean_key, COALESCE(NULLIF(btrim(p_scope), ''), 'login'), v_new_attempts, v_locked_until, v_now)
  ON CONFLICT (key) DO UPDATE
    SET scope = EXCLUDED.scope,
        attempts = EXCLUDED.attempts,
        locked_until = COALESCE(EXCLUDED.locked_until, public.auth_rate_limits.locked_until),
        last_attempt_at = EXCLUDED.last_attempt_at;

  RETURN jsonb_build_object(
    'locked', (v_locked_until IS NOT NULL AND v_locked_until > v_now),
    'just_locked', v_just_locked,
    'attempts', v_new_attempts,
    'locked_until', v_locked_until,
    'remaining_seconds', CASE
      WHEN v_locked_until IS NOT NULL AND v_locked_until > v_now
      THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_locked_until - v_now)))::INT)
      ELSE 0
    END
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. PURGE RESIDUAL MIGRATION SEED ITEMS FROM INVENTORY (`AGENTS.md` Rule 1.8)
-- -----------------------------------------------------------------------------
DELETE FROM public.inventory_items
WHERE (name = 'A4 White Printing Paper' AND location = 'Administration Store Room' AND unit_cost = 4800.00)
   OR (name = 'Dry Erase Whiteboard Markers' AND location = 'Staff Workroom' AND unit_cost = 6500.00)
   OR (name = 'First Aid Burn Gel & Bandage Kits' AND location = 'School Infirmary' AND unit_cost = 9200.00);

-- -----------------------------------------------------------------------------
-- 4. RLS HELPER FUNCTIONS (SCHOOL, ROLE & GUARDIAN/STUDENT SCOPING)
-- -----------------------------------------------------------------------------

-- Returns all school_ids the current authenticated user belongs to
CREATE OR REPLACE FUNCTION public.current_user_school_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT school_id FROM (
    SELECT sm.school_id
    FROM public.school_memberships sm
    WHERE sm.user_id = auth.uid() AND sm.is_active = TRUE
    UNION
    SELECT sp.school_id
    FROM public.staff_profiles sp
    WHERE (sp.user_id = auth.uid() OR lower(sp.email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
      AND sp.is_active = TRUE
    UNION
    SELECT s.school_id
    FROM public.students s
    WHERE s.user_id = auth.uid()
       OR lower(s.admission_number) = lower(COALESCE(auth.jwt() -> 'user_metadata' ->> 'admission_number', ''))
    UNION
    SELECT s.school_id
    FROM public.students s
    JOIN public.student_guardians sg ON sg.student_id = s.id
    JOIN public.guardians g ON g.id = sg.guardian_id
    WHERE g.user_id = auth.uid()
       OR lower(g.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  ) AS user_schools
  WHERE school_id IS NOT NULL;
$$;

-- Checks whether the current authenticated user holds any of `p_roles` in `p_school_id`
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

  -- Proprietor check via school_memberships or canonical proprietor account
  IF 'proprietor' = ANY(p_roles) AND v_email = 'proprietor@oaklandschool.com.ng' THEN
    RETURN TRUE;
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

-- Returns all student UUIDs linked to the current authenticated student or parent/guardian
CREATE OR REPLACE FUNCTION public.current_user_linked_student_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT s.id
  FROM public.students s
  WHERE s.user_id = auth.uid()
     OR (
       COALESCE(auth.jwt() -> 'user_metadata' ->> 'admission_number', '') <> ''
       AND lower(s.admission_number) = lower(auth.jwt() -> 'user_metadata' ->> 'admission_number')
     )
  UNION
  SELECT DISTINCT sg.student_id
  FROM public.student_guardians sg
  JOIN public.guardians g ON g.id = sg.guardian_id
  WHERE g.user_id = auth.uid()
     OR (
       COALESCE(auth.jwt() ->> 'email', '') <> ''
       AND lower(g.email) = lower(auth.jwt() ->> 'email')
     );
$$;

-- -----------------------------------------------------------------------------
-- 5. DROP ALL PERMISSIVE `USING (true)` POLICIES FROM MIGRATIONS 001, 009, 010, 011
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tables_010 TEXT[] := ARRAY[
    'permissions', 'role_permissions', 'audit_logs', 'student_documents',
    'student_behaviour', 'student_timeline', 'workflow_definitions',
    'workflow_instances', 'workflow_steps', 'notification_channels',
    'notification_templates', 'notification_logs', 'fee_structures',
    'student_financial_accounts', 'fee_invoices', 'fee_discounts',
    'fee_transactions', 'school_events', 'documents', 'timetable_constraints',
    'timetable_versions', 'timetable_slots', 'authorized_pickup_persons',
    'pickup_logs', 'inventory_items', 'procurement_requests',
    'expenditures', 'petty_cash', 'bank_accounts', 'staff_attendance',
    'staff_broadcasts', 'staff_leaves', 'staff_applications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_010 LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated on %I" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow read for anon on %I" ON public.%I', tbl, tbl);
  END LOOP;
END $$;

-- Drop permissive policies from 001, 009 & 010 on core tables
DROP POLICY IF EXISTS "Staff can view staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Staff can view students" ON public.students;
DROP POLICY IF EXISTS "Staff can view enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "Teachers and admin can access scores" ON public.scores;
DROP POLICY IF EXISTS "Teachers can insert/update attendance for their school" ON public.attendance_records;

-- Drop permissive policies from 011 on assignments, learning materials, and CBT tables
DROP POLICY IF EXISTS "Enrolled students can view published assignments" ON public.assignments;
DROP POLICY IF EXISTS "Staff can manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view and manage their submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Authenticated users can view learning materials" ON public.learning_materials;
DROP POLICY IF EXISTS "Staff can manage learning materials" ON public.learning_materials;
DROP POLICY IF EXISTS "Staff can manage question banks" ON public.cbt_question_banks;
DROP POLICY IF EXISTS "Staff can manage questions" ON public.cbt_questions;
DROP POLICY IF EXISTS "Authenticated users can view active assessments" ON public.cbt_assessments;
DROP POLICY IF EXISTS "Staff can manage assessments" ON public.cbt_assessments;
DROP POLICY IF EXISTS "Students and staff can manage sessions" ON public.cbt_sessions;
DROP POLICY IF EXISTS "Students and staff can manage session answers" ON public.cbt_session_answers;

-- Ensure RLS is enabled on Migration 012 & 014 tables as well
ALTER TABLE IF EXISTS public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_gate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 6. STRICT ROLE- AND SCHOOL-SCOPED RLS POLICIES
-- -----------------------------------------------------------------------------

-- 6.1 RBAC & Reference Tables (`permissions`, `role_permissions`)
DROP POLICY IF EXISTS "Authenticated read permissions" ON public.permissions;
CREATE POLICY "Authenticated read permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Executive manage permissions" ON public.permissions;
CREATE POLICY "Executive manage permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin']));

DROP POLICY IF EXISTS "Authenticated read role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated read role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Executive manage role_permissions" ON public.role_permissions;
CREATE POLICY "Executive manage role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin']));

-- 6.2 Staff & HR Tables (`staff_profiles`, `staff_attendance`, `staff_broadcasts`, `staff_leaves`, `staff_applications`)
DROP POLICY IF EXISTS "School staff view staff_profiles" ON public.staff_profiles;
CREATE POLICY "School staff view staff_profiles" ON public.staff_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar', 'security_officer'], school_id)
  );

DROP POLICY IF EXISTS "Executive manage staff_profiles" ON public.staff_profiles;
CREATE POLICY "Executive manage staff_profiles" ON public.staff_profiles
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id));

DROP POLICY IF EXISTS "Staff update own profile" ON public.staff_profiles;
CREATE POLICY "Staff update own profile" ON public.staff_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view staff_attendance" ON public.staff_attendance;
CREATE POLICY "Staff view staff_attendance" ON public.staff_attendance
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar', 'security_officer'], school_id)
  );

DROP POLICY IF EXISTS "Admin manage staff_attendance" ON public.staff_attendance;
CREATE POLICY "Admin manage staff_attendance" ON public.staff_attendance
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer'], school_id));

DROP POLICY IF EXISTS "Staff view staff_broadcasts" ON public.staff_broadcasts;
CREATE POLICY "Staff view staff_broadcasts" ON public.staff_broadcasts
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar', 'security_officer'], school_id)
  );

DROP POLICY IF EXISTS "Executive manage staff_broadcasts" ON public.staff_broadcasts;
CREATE POLICY "Executive manage staff_broadcasts" ON public.staff_broadcasts
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id));

DROP POLICY IF EXISTS "Staff view own or admin view all leaves" ON public.staff_leaves;
CREATE POLICY "Staff view own or admin view all leaves" ON public.staff_leaves
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id)
    OR staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Staff request own leave" ON public.staff_leaves;
CREATE POLICY "Staff request own leave" ON public.staff_leaves
  FOR INSERT TO authenticated
  WITH CHECK (
    staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
    OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id)
  );

DROP POLICY IF EXISTS "Admin manage staff_leaves" ON public.staff_leaves;
CREATE POLICY "Admin manage staff_leaves" ON public.staff_leaves
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id));

DROP POLICY IF EXISTS "Public submit staff_applications" ON public.staff_applications;
CREATE POLICY "Public submit staff_applications" ON public.staff_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "Executive manage staff_applications" ON public.staff_applications;
CREATE POLICY "Executive manage staff_applications" ON public.staff_applications
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id));

-- 6.3 Students, Guardians, Enrollments & Student 360 (`students`, `guardians`, `student_guardians`, `class_enrollments`, `student_documents`, `student_behaviour`, `student_timeline`)
DROP POLICY IF EXISTS "Scoped read students" ON public.students;
CREATE POLICY "Scoped read students" ON public.students
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar', 'security_officer'], school_id)
    OR id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Staff manage students" ON public.students;
CREATE POLICY "Staff manage students" ON public.students
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar'], school_id));

DROP POLICY IF EXISTS "Scoped read guardians" ON public.guardians;
CREATE POLICY "Scoped read guardians" ON public.guardians
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar', 'security_officer'], school_id)
    OR id IN (
      SELECT sg.guardian_id
      FROM public.student_guardians sg
      WHERE sg.student_id IN (SELECT public.current_user_linked_student_ids())
    )
  );

DROP POLICY IF EXISTS "Staff manage guardians" ON public.guardians;
CREATE POLICY "Staff manage guardians" ON public.guardians
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar'], school_id));

DROP POLICY IF EXISTS "Scoped read student_guardians" ON public.student_guardians;
CREATE POLICY "Scoped read student_guardians" ON public.student_guardians
  FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT public.current_user_linked_student_ids())
    OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar', 'security_officer'])
  );

DROP POLICY IF EXISTS "Staff manage student_guardians" ON public.student_guardians;
CREATE POLICY "Staff manage student_guardians" ON public.student_guardians
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar']));

DROP POLICY IF EXISTS "Scoped read class_enrollments" ON public.class_enrollments;
CREATE POLICY "Scoped read class_enrollments" ON public.class_enrollments
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar', 'security_officer'])
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Staff manage class_enrollments" ON public.class_enrollments;
CREATE POLICY "Staff manage class_enrollments" ON public.class_enrollments
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar', 'teacher', 'class_teacher']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Scoped read student_documents" ON public.student_documents;
CREATE POLICY "Scoped read student_documents" ON public.student_documents
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar', 'teacher', 'class_teacher'], school_id)
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Staff manage student_documents" ON public.student_documents;
CREATE POLICY "Staff manage student_documents" ON public.student_documents
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar', 'teacher', 'class_teacher'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'registrar', 'teacher', 'class_teacher'], school_id));

DROP POLICY IF EXISTS "Scoped read student_behaviour" ON public.student_behaviour;
CREATE POLICY "Scoped read student_behaviour" ON public.student_behaviour
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id)
    OR (student_id IN (SELECT public.current_user_linked_student_ids()) AND is_confidential = FALSE)
  );

DROP POLICY IF EXISTS "Staff manage student_behaviour" ON public.student_behaviour;
CREATE POLICY "Staff manage student_behaviour" ON public.student_behaviour
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id));

DROP POLICY IF EXISTS "Scoped read student_timeline" ON public.student_timeline;
CREATE POLICY "Scoped read student_timeline" ON public.student_timeline
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar'], school_id)
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Staff manage student_timeline" ON public.student_timeline;
CREATE POLICY "Staff manage student_timeline" ON public.student_timeline
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar'], school_id));

-- 6.4 Academic Scores, Report Cards & Attendance (`scores`, `report_cards`, `attendance_records`)
DROP POLICY IF EXISTS "Scoped read scores" ON public.scores;
CREATE POLICY "Scoped read scores" ON public.scores
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'])
    OR enrollment_id IN (
      SELECT ce.id FROM public.class_enrollments ce
      WHERE ce.student_id IN (SELECT public.current_user_linked_student_ids())
    )
  );

DROP POLICY IF EXISTS "Academic staff manage scores" ON public.scores;
CREATE POLICY "Academic staff manage scores" ON public.scores
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Scoped read report_cards" ON public.report_cards;
CREATE POLICY "Scoped read report_cards" ON public.report_cards
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'])
    OR (
      enrollment_id IN (
        SELECT ce.id FROM public.class_enrollments ce
        WHERE ce.student_id IN (SELECT public.current_user_linked_student_ids())
      )
      AND status = 'published'
    )
  );

DROP POLICY IF EXISTS "Academic staff manage report_cards" ON public.report_cards;
CREATE POLICY "Academic staff manage report_cards" ON public.report_cards
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Scoped read attendance_records" ON public.attendance_records;
CREATE POLICY "Scoped read attendance_records" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher', 'registrar'])
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Academic staff manage attendance_records" ON public.attendance_records;
CREATE POLICY "Academic staff manage attendance_records" ON public.attendance_records
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']));

-- 6.5 Financial & Treasury Tables (`fee_structures`, `student_financial_accounts`, `fee_invoices`, `fee_discounts`, `fee_transactions`, `expenditures`, `petty_cash`, `bank_accounts`)
DROP POLICY IF EXISTS "School members read fee_structures" ON public.fee_structures;
CREATE POLICY "School members read fee_structures" ON public.fee_structures
  FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.current_user_school_ids()) OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Finance manage fee_structures" ON public.fee_structures;
CREATE POLICY "Finance manage fee_structures" ON public.fee_structures
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Scoped read student_financial_accounts" ON public.student_financial_accounts;
CREATE POLICY "Scoped read student_financial_accounts" ON public.student_financial_accounts
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id)
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Finance manage student_financial_accounts" ON public.student_financial_accounts;
CREATE POLICY "Finance manage student_financial_accounts" ON public.student_financial_accounts
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Scoped read fee_invoices" ON public.fee_invoices;
CREATE POLICY "Scoped read fee_invoices" ON public.fee_invoices
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id)
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Finance manage fee_invoices" ON public.fee_invoices;
CREATE POLICY "Finance manage fee_invoices" ON public.fee_invoices
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Scoped read fee_discounts" ON public.fee_discounts;
CREATE POLICY "Scoped read fee_discounts" ON public.fee_discounts
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id)
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Finance manage fee_discounts" ON public.fee_discounts;
CREATE POLICY "Finance manage fee_discounts" ON public.fee_discounts
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Scoped read fee_transactions" ON public.fee_transactions;
CREATE POLICY "Scoped read fee_transactions" ON public.fee_transactions
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id)
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Finance manage fee_transactions" ON public.fee_transactions;
CREATE POLICY "Finance manage fee_transactions" ON public.fee_transactions
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Finance read expenditures" ON public.expenditures;
CREATE POLICY "Finance read expenditures" ON public.expenditures
  FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Finance manage expenditures" ON public.expenditures;
CREATE POLICY "Finance manage expenditures" ON public.expenditures
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Finance read petty_cash" ON public.petty_cash;
CREATE POLICY "Finance read petty_cash" ON public.petty_cash
  FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Finance manage petty_cash" ON public.petty_cash;
CREATE POLICY "Finance manage petty_cash" ON public.petty_cash
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "School members read bank_accounts" ON public.bank_accounts;
CREATE POLICY "School members read bank_accounts" ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT public.current_user_school_ids())
    OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id)
  );

DROP POLICY IF EXISTS "Finance manage bank_accounts" ON public.bank_accounts;
CREATE POLICY "Finance manage bank_accounts" ON public.bank_accounts
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id));

-- Tighten Migration 014 payroll & sequence policies to finance roles
DROP POLICY IF EXISTS "Allow read payroll_runs for authenticated" ON public.payroll_runs;
DROP POLICY IF EXISTS "Finance read payroll_runs" ON public.payroll_runs;
CREATE POLICY "Finance read payroll_runs" ON public.payroll_runs
  FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Finance manage payroll_runs" ON public.payroll_runs;
CREATE POLICY "Finance manage payroll_runs" ON public.payroll_runs
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Allow read payroll_run_items for authenticated" ON public.payroll_run_items;
DROP POLICY IF EXISTS "Finance or own staff read payroll_run_items" ON public.payroll_run_items;
CREATE POLICY "Finance or own staff read payroll_run_items" ON public.payroll_run_items
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'])
    OR staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Finance manage payroll_run_items" ON public.payroll_run_items;
CREATE POLICY "Finance manage payroll_run_items" ON public.payroll_run_items
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'bursar']));

DROP POLICY IF EXISTS "Allow read sequences for authenticated" ON public.school_document_sequences;
DROP POLICY IF EXISTS "Finance read school_document_sequences" ON public.school_document_sequences;
CREATE POLICY "Finance read school_document_sequences" ON public.school_document_sequences
  FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id));

-- 6.6 Assignments, Learning Materials & CBT Engine
DROP POLICY IF EXISTS "Scoped read assignments" ON public.assignments;
CREATE POLICY "Scoped read assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id)
    OR (status = 'published' AND school_id IN (SELECT public.current_user_school_ids()))
  );

DROP POLICY IF EXISTS "Academic staff manage assignments" ON public.assignments;
CREATE POLICY "Academic staff manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id));

DROP POLICY IF EXISTS "Scoped read assignment_submissions" ON public.assignment_submissions;
CREATE POLICY "Scoped read assignment_submissions" ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'])
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Students submit own assignment_submissions" ON public.assignment_submissions;
CREATE POLICY "Students submit own assignment_submissions" ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (SELECT public.current_user_linked_student_ids())
    OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'])
  );

DROP POLICY IF EXISTS "Scoped update assignment_submissions" ON public.assignment_submissions;
CREATE POLICY "Scoped update assignment_submissions" ON public.assignment_submissions
  FOR UPDATE TO authenticated
  USING (
    student_id IN (SELECT public.current_user_linked_student_ids())
    OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'])
  )
  WITH CHECK (
    student_id IN (SELECT public.current_user_linked_student_ids())
    OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'])
  );

DROP POLICY IF EXISTS "Scoped read learning_materials" ON public.learning_materials;
CREATE POLICY "Scoped read learning_materials" ON public.learning_materials
  FOR SELECT TO authenticated
  USING (
    school_id IN (SELECT public.current_user_school_ids())
    OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id)
  );

DROP POLICY IF EXISTS "Academic staff manage learning_materials" ON public.learning_materials;
CREATE POLICY "Academic staff manage learning_materials" ON public.learning_materials
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id));

DROP POLICY IF EXISTS "Academic staff manage cbt_question_banks" ON public.cbt_question_banks;
CREATE POLICY "Academic staff manage cbt_question_banks" ON public.cbt_question_banks
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id));

DROP POLICY IF EXISTS "Academic staff manage cbt_questions" ON public.cbt_questions;
CREATE POLICY "Academic staff manage cbt_questions" ON public.cbt_questions
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id));

DROP POLICY IF EXISTS "Scoped read cbt_assessments" ON public.cbt_assessments;
CREATE POLICY "Scoped read cbt_assessments" ON public.cbt_assessments
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id)
    OR (
      status IN ('published', 'active', 'closed')
      AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id IN (SELECT public.current_user_linked_student_ids())
          AND s.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Academic staff manage cbt_assessments" ON public.cbt_assessments;
CREATE POLICY "Academic staff manage cbt_assessments" ON public.cbt_assessments
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'], school_id));

DROP POLICY IF EXISTS "Academic staff manage cbt_assessment_questions" ON public.cbt_assessment_questions;
CREATE POLICY "Academic staff manage cbt_assessment_questions" ON public.cbt_assessment_questions
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Scoped access cbt_sessions" ON public.cbt_sessions;
CREATE POLICY "Scoped access cbt_sessions" ON public.cbt_sessions
  FOR ALL TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'])
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  )
  WITH CHECK (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'])
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Scoped access cbt_session_answers" ON public.cbt_session_answers;
CREATE POLICY "Scoped access cbt_session_answers" ON public.cbt_session_answers
  FOR ALL TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'])
    OR session_id IN (
      SELECT cs.id FROM public.cbt_sessions cs
      WHERE cs.student_id IN (SELECT public.current_user_linked_student_ids())
    )
  )
  WITH CHECK (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher'])
    OR session_id IN (
      SELECT cs.id FROM public.cbt_sessions cs
      WHERE cs.student_id IN (SELECT public.current_user_linked_student_ids())
    )
  );

-- 6.7 Gate Security, Pickup, Inventory, Calendar, Documents & Audit Tables
DROP POLICY IF EXISTS "Scoped read authorized_pickup_persons" ON public.authorized_pickup_persons;
CREATE POLICY "Scoped read authorized_pickup_persons" ON public.authorized_pickup_persons
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'teacher', 'class_teacher', 'registrar'])
    OR student_id IN (SELECT id::TEXT FROM public.students WHERE id IN (SELECT public.current_user_linked_student_ids()))
  );

DROP POLICY IF EXISTS "Scoped manage authorized_pickup_persons" ON public.authorized_pickup_persons;
CREATE POLICY "Scoped manage authorized_pickup_persons" ON public.authorized_pickup_persons
  FOR ALL TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'registrar'])
    OR student_id IN (SELECT id::TEXT FROM public.students WHERE id IN (SELECT public.current_user_linked_student_ids()))
  )
  WITH CHECK (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'registrar'])
    OR student_id IN (SELECT id::TEXT FROM public.students WHERE id IN (SELECT public.current_user_linked_student_ids()))
  );

DROP POLICY IF EXISTS "Scoped read pickup_logs" ON public.pickup_logs;
CREATE POLICY "Scoped read pickup_logs" ON public.pickup_logs
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'teacher', 'class_teacher', 'registrar'])
    OR student_id IN (SELECT id::TEXT FROM public.students WHERE id IN (SELECT public.current_user_linked_student_ids()))
  );

DROP POLICY IF EXISTS "Staff manage pickup_logs" ON public.pickup_logs;
CREATE POLICY "Staff manage pickup_logs" ON public.pickup_logs
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'teacher', 'class_teacher']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Staff manage inventory_items" ON public.inventory_items;
CREATE POLICY "Staff manage inventory_items" ON public.inventory_items
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Staff manage procurement_requests" ON public.procurement_requests;
CREATE POLICY "Staff manage procurement_requests" ON public.procurement_requests
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Public read published school_events" ON public.school_events;
CREATE POLICY "Public read published school_events" ON public.school_events
  FOR SELECT TO anon, authenticated
  USING (is_published = TRUE OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Admin manage school_events" ON public.school_events;
CREATE POLICY "Admin manage school_events" ON public.school_events
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin']));

DROP POLICY IF EXISTS "Scoped read documents" ON public.documents;
CREATE POLICY "Scoped read documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar'])
    OR associated_student_id IN (SELECT id::TEXT FROM public.students WHERE id IN (SELECT public.current_user_linked_student_ids()))
    OR (associated_student_id IS NULL AND associated_staff_id IS NULL AND status = 'published')
  );

DROP POLICY IF EXISTS "Staff manage documents" ON public.documents;
CREATE POLICY "Staff manage documents" ON public.documents
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar']));

DROP POLICY IF EXISTS "Staff read timetable_constraints" ON public.timetable_constraints;
CREATE POLICY "Staff read timetable_constraints" ON public.timetable_constraints
  FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Admin manage timetable_constraints" ON public.timetable_constraints;
CREATE POLICY "Admin manage timetable_constraints" ON public.timetable_constraints
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin']));

DROP POLICY IF EXISTS "Authenticated read timetable_versions" ON public.timetable_versions;
CREATE POLICY "Authenticated read timetable_versions" ON public.timetable_versions
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Admin manage timetable_versions" ON public.timetable_versions;
CREATE POLICY "Admin manage timetable_versions" ON public.timetable_versions
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin']));

DROP POLICY IF EXISTS "Authenticated read timetable_slots" ON public.timetable_slots;
CREATE POLICY "Authenticated read timetable_slots" ON public.timetable_slots
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin manage timetable_slots" ON public.timetable_slots;
CREATE POLICY "Admin manage timetable_slots" ON public.timetable_slots
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin']));

DROP POLICY IF EXISTS "Executive read audit_logs" ON public.audit_logs;
CREATE POLICY "Executive read audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar'], school_id));

DROP POLICY IF EXISTS "Staff insert audit_logs" ON public.audit_logs;
CREATE POLICY "Staff insert audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'registrar', 'security_officer'], school_id)
  );

DROP POLICY IF EXISTS "Staff access workflow_definitions" ON public.workflow_definitions;
CREATE POLICY "Staff access workflow_definitions" ON public.workflow_definitions
  FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher'], school_id));

DROP POLICY IF EXISTS "Executive manage workflow_definitions" ON public.workflow_definitions;
CREATE POLICY "Executive manage workflow_definitions" ON public.workflow_definitions
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id));

DROP POLICY IF EXISTS "Staff access workflow_instances" ON public.workflow_instances;
CREATE POLICY "Staff access workflow_instances" ON public.workflow_instances
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher'], school_id));

DROP POLICY IF EXISTS "Staff access workflow_steps" ON public.workflow_steps;
CREATE POLICY "Staff access workflow_steps" ON public.workflow_steps
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Executive manage notification_channels" ON public.notification_channels;
CREATE POLICY "Executive manage notification_channels" ON public.notification_channels
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id));

DROP POLICY IF EXISTS "Staff read notification_templates" ON public.notification_templates;
CREATE POLICY "Staff read notification_templates" ON public.notification_templates
  FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher'], school_id));

DROP POLICY IF EXISTS "Executive manage notification_templates" ON public.notification_templates;
CREATE POLICY "Executive manage notification_templates" ON public.notification_templates
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin'], school_id));

DROP POLICY IF EXISTS "Scoped read notification_logs" ON public.notification_logs;
CREATE POLICY "Scoped read notification_logs" ON public.notification_logs
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'security_officer'], school_id)
    OR lower(recipient) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Staff insert notification_logs" ON public.notification_logs;
CREATE POLICY "Staff insert notification_logs" ON public.notification_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'bursar', 'teacher', 'class_teacher', 'security_officer'], school_id)
  );

-- 6.8 Security & Reception Portal Tables (`visitors`, `student_movements`, `staff_gate_logs`, `deliveries`, `security_incidents`, `emergency_contacts`)
DROP POLICY IF EXISTS "Staff manage visitors" ON public.visitors;
CREATE POLICY "Staff manage visitors" ON public.visitors
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'registrar']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'registrar']));

DROP POLICY IF EXISTS "Scoped read student_movements" ON public.student_movements;
CREATE POLICY "Scoped read student_movements" ON public.student_movements
  FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'teacher', 'class_teacher'])
    OR student_id IN (SELECT public.current_user_linked_student_ids())
  );

DROP POLICY IF EXISTS "Staff manage student_movements" ON public.student_movements;
CREATE POLICY "Staff manage student_movements" ON public.student_movements
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'teacher', 'class_teacher']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'teacher', 'class_teacher']));

DROP POLICY IF EXISTS "Staff manage staff_gate_logs" ON public.staff_gate_logs;
CREATE POLICY "Staff manage staff_gate_logs" ON public.staff_gate_logs
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer']));

DROP POLICY IF EXISTS "Staff manage deliveries" ON public.deliveries;
CREATE POLICY "Staff manage deliveries" ON public.deliveries
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'registrar']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer', 'registrar']));

DROP POLICY IF EXISTS "Staff manage security_incidents" ON public.security_incidents;
CREATE POLICY "Staff manage security_incidents" ON public.security_incidents
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer']));

DROP POLICY IF EXISTS "Authenticated read emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "Authenticated read emergency_contacts" ON public.emergency_contacts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Executive manage emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "Executive manage emergency_contacts" ON public.emergency_contacts
  FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer']))
  WITH CHECK (public.current_user_has_role(ARRAY['proprietor', 'super_admin', 'admin', 'security_officer']));

