-- ==============================================================================
-- Migration 006: School Calendar, Document Centre & Constraint Timetable Solver
-- Oakland International School - Modular Monolith Database Schema
-- ==============================================================================

-- 1. School Events & Institutional Calendar
CREATE TABLE IF NOT EXISTS school_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('academic', 'holiday', 'examination', 'meeting', 'pta', 'deadline', 'activity', 'sports')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT true,
    audience VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'staff', 'parents', 'students', 'specific_class')),
    target_class VARCHAR(50),
    location VARCHAR(255) DEFAULT 'Oakland Main Campus',
    notify_before_days INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_events_dates ON school_events (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_school_events_type ON school_events (event_type);
CREATE INDEX IF NOT EXISTS idx_school_events_audience ON school_events (audience);

-- 2. Oakland Central Document Registry
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('report_card', 'receipt', 'admission_letter', 'query_letter', 'certificate', 'policy', 'official_notice', 'curriculum', 'other')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    associated_student_id VARCHAR(100),
    associated_staff_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    version INTEGER DEFAULT 1,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents (document_type);
CREATE INDEX IF NOT EXISTS idx_documents_student ON documents (associated_student_id);
CREATE INDEX IF NOT EXISTS idx_documents_staff ON documents (associated_staff_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents (status);

-- 3. Timetable Constraint Solver Schema
CREATE TABLE IF NOT EXISTS timetable_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('hard', 'soft')),
    rule_type VARCHAR(100) NOT NULL,
    parameters JSONB DEFAULT '{}',
    weight INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timetable_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    academic_year VARCHAR(50) NOT NULL DEFAULT '2026/2027',
    term VARCHAR(50) NOT NULL DEFAULT 'Term 1',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    conflict_count INTEGER DEFAULT 0,
    satisfaction_score NUMERIC(5,2) DEFAULT 100.0,
    schedule_data JSONB NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES timetable_versions(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL,
    day VARCHAR(20) NOT NULL,
    period_id VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher_name VARCHAR(150) NOT NULL,
    room VARCHAR(100) DEFAULT 'Standard Class Room',
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_lookup ON timetable_slots (version_id, class_id, day, period_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_teacher ON timetable_slots (teacher_name, day, period_id);

-- Default Constraints for Algorithmic CSP Solver
INSERT INTO timetable_constraints (name, type, rule_type, parameters, weight, is_active)
VALUES
    ('No Teacher Double-Booking', 'hard', 'no_teacher_conflict', '{"description": "A teacher cannot teach two classes at the same period."}', 100, true),
    ('No Class Double-Booking', 'hard', 'no_class_conflict', '{"description": "A class cannot have multiple subjects scheduled at the same period."}', 100, true),
    ('Teacher Daily Period Limit', 'hard', 'max_periods_per_day', '{"maxPeriods": 5, "description": "No teacher shall have more than 5 instructional periods per day."}', 90, true),
    ('Morning Core Subjects', 'soft', 'core_morning_preference', '{"coreSubjects": ["Mathematics", "English Language", "Physics", "Chemistry"], "targetPeriods": ["p1", "p2", "p3", "p4"], "weight": 20}', 20, true),
    ('Weekly Subject Spread', 'soft', 'spread_subject_days', '{"description": "Subjects with multiple periods per week must be distributed across different days."}', 15, true),
    ('Minimize Teacher Idle Gaps', 'soft', 'avoid_teacher_gaps', '{"description": "Avoid isolated single periods with 2+ period gaps between teaching blocks."}', 10, true)
ON CONFLICT DO NOTHING;
