-- ==============================================================================
-- DEPRECATED & PURGED: Migration 008 (CBT Engine)
-- Computer-Based Testing (CBT) has been permanently removed from Oakland School.
-- This file ensures any remnant CBT tables in existing databases are dropped.
-- ==============================================================================

DROP TABLE IF EXISTS public.cbt_session_answers CASCADE;
DROP TABLE IF EXISTS public.cbt_assessment_sessions CASCADE;
DROP TABLE IF EXISTS public.cbt_assessment_questions CASCADE;
DROP TABLE IF EXISTS public.cbt_assessments CASCADE;
DROP TABLE IF EXISTS public.cbt_questions CASCADE;
DROP TABLE IF EXISTS public.cbt_question_banks CASCADE;
