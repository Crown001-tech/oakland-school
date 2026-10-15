-- ====================================================================
-- OAKLAND SCHOOLS MANAGEMENT SYSTEM
-- Migration 004: Multi-Channel Notification Engine & Communication Centre
-- 100% Idempotent Migration
-- ====================================================================

-- 1. NOTIFICATION CHANNELS & GATEWAY CONFIGURATION
CREATE TABLE IF NOT EXISTS public.notification_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp')),
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'smtp', 'resend', 'termii', 'africastalking', 'twilio', 'meta'
    is_active BOOLEAN DEFAULT TRUE,
    is_simulated BOOLEAN DEFAULT TRUE, -- Allows live simulation in staging/dev
    sender_id VARCHAR(50) DEFAULT 'OaklandIntl',
    credentials JSONB DEFAULT '{}'::jsonb,
    balance_units INT DEFAULT 2500,
    sent_today INT DEFAULT 0,
    daily_limit INT DEFAULT 5000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_school_channel_type UNIQUE (school_id, type)
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_school_type ON public.notification_channels(school_id, type);

-- 2. REUSABLE NOTIFICATION TEMPLATES
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('attendance', 'academics', 'finance', 'administrative', 'urgent')),
    channels TEXT[] NOT NULL DEFAULT ARRAY['email', 'sms'],
    subject VARCHAR(200),
    body_email TEXT,
    body_sms TEXT,
    body_whatsapp TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_school_cat ON public.notification_templates(school_id, category);

-- 3. PERSISTENT NOTIFICATION AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
    recipient VARCHAR(150) NOT NULL,
    recipient_name VARCHAR(100),
    recipient_type VARCHAR(30) DEFAULT 'parent' CHECK (recipient_type IN ('parent', 'staff', 'student', 'custom')),
    subject VARCHAR(200),
    body TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'sent', 'pending', 'failed')),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    event_type VARCHAR(50),
    template_code VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_school ON public.notification_logs(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON public.notification_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON public.notification_logs(channel, status);

-- 4. SEED DEFAULT CHANNELS (IDEMPOTENT)
INSERT INTO public.notification_channels (school_id, type, name, provider, is_active, is_simulated, sender_id, balance_units, daily_limit)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'email', 'Institutional SMTP Mail Gateway', 'smtp', true, false, 'admissions@oaklandschools.edu.ng', 10000, 10000),
    ('a0000000-0000-0000-0000-000000000001', 'sms', 'Termii SMS Gateway (Tier-1)', 'termii', true, true, 'OAKLAND', 2450, 5000),
    ('a0000000-0000-0000-0000-000000000001', 'whatsapp', 'Meta WhatsApp Business Gateway', 'meta', true, true, '+2348030001234', 5000, 5000)
ON CONFLICT (school_id, type) DO UPDATE 
SET is_active = EXCLUDED.is_active;

-- 5. SEED SYSTEM TEMPLATES (IDEMPOTENT)
INSERT INTO public.notification_templates (
    school_id, code, name, category, channels, subject, body_email, body_sms, body_whatsapp, variables, is_system
)
VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'absent_notice',
    'Daily Absentee Attendance Alert',
    'attendance',
    ARRAY['email', 'sms', 'whatsapp'],
    'Attendance Alert: {{student_name}} Unexcused Absence',
    'Dear {{parent_name}}, this is an urgent notification from Oakland International School that {{student_name}} was marked absent during roll call on {{date}} for class {{class}}. Please contact the administrative desk if this absence was excused.',
    'Oakland Alert: {{student_name}} was marked absent today ({{date}}) in {{class}}. Contact 0803-000-1234 if excused.',
    'Dear {{parent_name}}, *Oakland International School* records indicate that {{student_name}} was marked absent today, *{{date}}*, in *{{class}}*. Please reach out to student welfare desk if you need immediate clarification.',
    '["student_name", "parent_name", "date", "class"]'::jsonb,
    true
),
(
    'a0000000-0000-0000-0000-000000000001',
    'fee_reminder',
    'Terminal Tuition & Levy Reminder',
    'finance',
    ARRAY['email', 'sms', 'whatsapp'],
    'Tuition Statement Reminder: {{student_name}} ({{term}})',
    'Dear {{parent_name}}, this is a gentle reminder regarding the outstanding balance of ₦{{amount}} for {{student_name}} in {{class}} for {{term}}. Kindly ensure payment is completed on or before {{due_date}} to avoid disruptions.',
    'Oakland Bursary: Outstanding balance of N{{amount}} for {{student_name}} is due by {{due_date}}. Ref: {{student_id}}.',
    'Dear {{parent_name}}, regarding *{{student_name}}* ({{class}}), our records show an outstanding balance of *₦{{amount}}* for *{{term}}*. Payment deadline is *{{due_date}}*. Please visit Bursar portal or reply here for account details.',
    '["parent_name", "student_name", "class", "term", "amount", "due_date", "student_id"]'::jsonb,
    true
),
(
    'a0000000-0000-0000-0000-000000000001',
    'pta_meeting',
    'PTA General Assembly Convocation',
    'administrative',
    ARRAY['email', 'sms', 'whatsapp'],
    'Invitation: Oakland International School General PTA Assembly',
    'Dear Oakland Parents, you are cordially invited to our Term General Assembly meeting scheduled for {{date}} at {{time}} in the School Multipurpose Auditorium. Agenda items include academic review and term enrichment programs.',
    'Oakland PTA: General Assembly meets on {{date}} at {{time}} in the Main Hall. Your presence is highly valued.',
    'Dear {{parent_name}}, you are cordially invited to the *Oakland General PTA Assembly* on *{{date}}* at *{{time}}* in the Multipurpose Hall. We look forward to partnering with you for student success.',
    '["parent_name", "date", "time"]'::jsonb,
    true
),
(
    'a0000000-0000-0000-0000-000000000001',
    'resumption_notice',
    'Academic Term Resumption Notice',
    'administrative',
    ARRAY['email', 'sms', 'whatsapp'],
    'Academic Resumption: Welcome to {{term}} ({{academic_year}})',
    'Dear Parents & Guardians, Oakland International School resumes academic activities for {{term}} on {{resumption_date}}. Morning assembly begins promptly at 7:45 AM. Boarding students check-in opens on {{checkin_date}}.',
    'Oakland School resumes for {{term}} on {{resumption_date}}. Assembly at 7:45 AM. Ensure students arrive in full uniform.',
    'Welcome to *{{term}}*! Oakland International School resumes on *{{resumption_date}}*. Please ensure {{student_name}} is outfitted in full school uniform and brings all necessary materials.',
    '["parent_name", "term", "academic_year", "resumption_date", "checkin_date", "student_name"]'::jsonb,
    true
),
(
    'a0000000-0000-0000-0000-000000000001',
    'emergency_alert',
    'Urgent Unscheduled Closure / Advisory',
    'urgent',
    ARRAY['email', 'sms', 'whatsapp'],
    'URGENT ADVISORY: Oakland International School Closure Update',
    'ATTENTION ALL PARENTS & GUARDIANS: Due to {{reason}}, Oakland International School will be closed on {{date}}. Online instructional resources will be made available. Student safety remains our paramount priority.',
    'EMERGENCY: Oakland School closed on {{date}} due to {{reason}}. Classes resume once conditions normalize. Safety first.',
    '🚨 *URGENT ADVISORY - OAKLAND INTERNATIONAL SCHOOL* 🚨\nPlease note that school will be closed on *{{date}}* due to *{{reason}}*. Further updates will follow immediately. Stay safe.',
    '["date", "reason"]'::jsonb,
    true
),
(
    'a0000000-0000-0000-0000-000000000001',
    'report_card_ready',
    'Terminal Examination Report Cards Released',
    'academics',
    ARRAY['email', 'sms', 'whatsapp'],
    'Terminal Report Card Released: {{student_name}} ({{term}})',
    'Dear {{parent_name}}, academic results for {{student_name}} ({{class}}) for {{term}} have been endorsed by the Principal and released by Executive Authority. Log in to the Parent Portal to view continuous assessment grades, teacher remarks, and cumulative performance.',
    'Oakland Academics: {{term}} report card for {{student_name}} is now published online. Access your parent portal.',
    '🎉 *Report Card Released*: Academic terminal report card for *{{student_name}}* ({{class}}) is now accessible on the parent portal. Cumulative Score: {{percentage}}%. Thank you for your continued partnership.',
    '["parent_name", "student_name", "class", "term", "percentage"]'::jsonb,
    true
)
ON CONFLICT (code) DO NOTHING;

-- 6. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Channels policies
DROP POLICY IF EXISTS "Staff view channels" ON public.notification_channels;
CREATE POLICY "Staff view channels" ON public.notification_channels
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leadership update channels" ON public.notification_channels;
CREATE POLICY "Leadership update channels" ON public.notification_channels
    FOR ALL TO authenticated USING (true);

-- Templates policies
DROP POLICY IF EXISTS "Staff view templates" ON public.notification_templates;
CREATE POLICY "Staff view templates" ON public.notification_templates
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff manage templates" ON public.notification_templates;
CREATE POLICY "Staff manage templates" ON public.notification_templates
    FOR ALL TO authenticated USING (true);

-- Logs policies
DROP POLICY IF EXISTS "Staff view notification logs" ON public.notification_logs;
CREATE POLICY "Staff view notification logs" ON public.notification_logs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "System insert notification logs" ON public.notification_logs;
CREATE POLICY "System insert notification logs" ON public.notification_logs
    FOR INSERT TO public WITH CHECK (true);

-- ====================================================================
-- End of Migration 004
-- ====================================================================
