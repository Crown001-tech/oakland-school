-- ==============================================================================
-- Migration 030: Qualitative report cards, and the public site setting
--
-- Report cards (nursery and primary especially) can carry a teacher's remark for each subject instead of marks,
-- and skill and behaviour ratings.
--
-- report_cards.style    'scored' (marks, grades and a position, as before) or 'descriptive' (remarks, no marks)
-- report_cards.traits   the ratings: [{ "name": "Punctuality", "group": "behaviour", "rating": 4 }]
--
-- A descriptive card has no marks, so its total, average and rank are empty, never zero.
--
-- schools.settings.publicSite says whether a school's public website carries the long pages (about, academics,
-- values) written for that school. Only Oakland's copy exists, so Oakland is set to 'full'; every other school
-- shows a short page of its own details until it has its own copy.
-- ==============================================================================

ALTER TABLE public.report_cards ADD COLUMN IF NOT EXISTS style VARCHAR(20) NOT NULL DEFAULT 'scored';
ALTER TABLE public.report_cards ADD COLUMN IF NOT EXISTS traits JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_cards_style_check') THEN
    ALTER TABLE public.report_cards ADD CONSTRAINT report_cards_style_check CHECK (style IN ('scored', 'descriptive'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_cards_traits_is_list') THEN
    ALTER TABLE public.report_cards ADD CONSTRAINT report_cards_traits_is_list CHECK (jsonb_typeof(traits) = 'array');
  END IF;
END $$;

ALTER TABLE public.report_cards ALTER COLUMN total_score DROP NOT NULL;
ALTER TABLE public.report_cards ALTER COLUMN average_score DROP NOT NULL;

UPDATE public.schools
SET settings = COALESCE(settings, '{}'::jsonb) || '{"publicSite": "full"}'::jsonb
WHERE code = 'OAK-001'
  AND COALESCE(settings ->> 'publicSite', '') = '';
