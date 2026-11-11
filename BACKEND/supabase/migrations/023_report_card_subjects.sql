-- ==============================================================================
-- Migration 023: Report card contents
--
-- The report card flow saves each student's subject results on the card itself, so a card
-- stays the same after scores change and parents read exactly what the proprietor endorsed.
--   subjects    the subject results shown on the card (name, CA 1, CA 2, exam, total, grade)
--   class_name  the class the student was in when the card was compiled
-- Position uses the existing `rank` column, and the remarks use `teacher_comment` and
-- `principal_comment`. Status moves: submitted (class teacher), approved (principal), published
-- (proprietor), using the existing principal_approved and proprietor_endorsed flags.
-- ==============================================================================

ALTER TABLE public.report_cards
  ADD COLUMN IF NOT EXISTS subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS class_name VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_report_cards_class_term ON public.report_cards (class_name, term_id);
