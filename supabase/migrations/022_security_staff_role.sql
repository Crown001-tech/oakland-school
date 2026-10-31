-- ==============================================================================
-- Migration 022: Security staff role
--
-- Oakland's live database already holds security staff, but no earlier migration adds
-- 'security' to user_role_enum, so a database built from these migrations (the Eductive
-- demo school, and every new school) could not store a security officer. This brings the
-- migrations in line with the live database. It changes nothing where the value exists.
-- ==============================================================================

ALTER TYPE public.user_role_enum ADD VALUE IF NOT EXISTS 'security';
