-- ==============================================================================
-- Migration 021: One set of expenditure and petty cash category names
--
-- The proprietor and bursar forms saved different names for the same categories,
-- so dashboard totals missed records. Both forms now share one list
-- (FRONTEND/src/types/finance.ts). This renames existing rows to that list and
-- removes the invented 'Office Stationery' default: the API now requires a category.
-- ==============================================================================

UPDATE public.expenditures
SET category = CASE category
  WHEN 'Diesel & Power' THEN 'Power'
  WHEN 'Science & Laboratories' THEN 'Laboratories'
  WHEN 'ICT & Fiber Internet' THEN 'Technology'
  WHEN 'Stationery & Exam Booklets' THEN 'Stationery'
  WHEN 'Facility Maintenance & HVAC' THEN 'Maintenance'
  WHEN 'Clinic & Health Supplies' THEN 'Health'
  WHEN 'Security & Sanitation' THEN 'Security'
  ELSE category
END
WHERE category IN (
  'Diesel & Power', 'Science & Laboratories', 'ICT & Fiber Internet', 'Stationery & Exam Booklets',
  'Facility Maintenance & HVAC', 'Clinic & Health Supplies', 'Security & Sanitation'
);

UPDATE public.petty_cash
SET category = CASE category
  WHEN 'Office Stationery' THEN 'Stationery'
  WHEN 'Emergency Repair' THEN 'Repairs'
  WHEN 'Courier Dispatch' THEN 'Dispatch'
  WHEN 'Hospitality & PTA' THEN 'Hospitality'
  ELSE category
END
WHERE category IN ('Office Stationery', 'Emergency Repair', 'Courier Dispatch', 'Hospitality & PTA');

ALTER TABLE public.petty_cash ALTER COLUMN category DROP DEFAULT;
