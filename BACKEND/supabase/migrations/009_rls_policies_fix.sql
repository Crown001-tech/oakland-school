-- ====================================================================
-- OAKLAND SCHOOLS MANAGEMENT SYSTEM
-- Migration 009: RLS Access Policies for Authenticated Portals
-- ====================================================================

-- 1. Fix School Memberships RLS so users can see their own membership
DROP POLICY IF EXISTS "Users can view their own school memberships" ON public.school_memberships;
CREATE POLICY "Users can view their own school memberships" ON public.school_memberships
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 2. Allow authenticated users to view staff profiles
DROP POLICY IF EXISTS "Staff can view staff profiles" ON public.staff_profiles;
CREATE POLICY "Staff can view staff profiles" ON public.staff_profiles
    FOR SELECT TO authenticated
    USING (true);

-- 3. Allow read on core academic structure (Schools, Classes, Sessions, Terms, Subjects)
DROP POLICY IF EXISTS "Public read school information" ON public.schools;
CREATE POLICY "Public read school information" ON public.schools
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read classes" ON public.classes;
CREATE POLICY "Public read classes" ON public.classes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read academic sessions" ON public.academic_sessions;
CREATE POLICY "Public read academic sessions" ON public.academic_sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read academic terms" ON public.academic_terms;
CREATE POLICY "Public read academic terms" ON public.academic_terms
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;
CREATE POLICY "Public read subjects" ON public.subjects
    FOR SELECT USING (true);

-- 4. Allow authenticated staff to view all students and class enrollments
DROP POLICY IF EXISTS "Staff can view students" ON public.students;
CREATE POLICY "Staff can view students" ON public.students
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff can view enrollments" ON public.class_enrollments;
CREATE POLICY "Staff can view enrollments" ON public.class_enrollments
    FOR SELECT TO authenticated
    USING (true);
