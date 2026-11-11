-- ==============================================================================
-- Migration 013: Gate Concurrency and Integrity Guards
-- Oakland International School
-- Race conditions are rejected by the database itself, not only by API checks.
-- ==============================================================================

-- 1. A student may hold only one active movement pass at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_movement_per_student
    ON student_movements (student_id)
    WHERE status IN ('departed', 'overdue');

-- 2. A student can be cleared for gate dismissal only once per calendar day.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cleared_pickup_per_day
    ON pickup_logs (student_id, ((pickup_time AT TIME ZONE 'UTC')::date))
    WHERE status = 'cleared';

-- 3. A visitor badge number can be held by only one visitor still on campus.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_visitor_badge
    ON visitors (badge_number)
    WHERE status = 'checked_in' AND badge_number IS NOT NULL;
