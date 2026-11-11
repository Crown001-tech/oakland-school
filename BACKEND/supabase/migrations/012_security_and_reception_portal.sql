-- ==============================================================================
-- Migration 012: Security & Reception Portal Schema
-- Oakland International School - Modular Monolith Database Schema
-- ==============================================================================

-- 1. Visitors Registry
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pass_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    organization VARCHAR(255),
    purpose VARCHAR(255) NOT NULL,
    host_type VARCHAR(50) NOT NULL CHECK (host_type IN ('staff', 'student', 'administration', 'general')),
    host_id UUID,
    host_name VARCHAR(255) NOT NULL,
    badge_number VARCHAR(50),
    vehicle_registration VARCHAR(50),
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'checked_out', 'overdue', 'flagged')),
    security_officer_name VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_pass ON visitors (pass_number);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors (status);
CREATE INDEX IF NOT EXISTS idx_visitors_check_in ON visitors (check_in_time);
CREATE INDEX IF NOT EXISTS idx_visitors_host ON visitors (host_name);

-- 2. School-Hour Student Movement Passes
CREATE TABLE IF NOT EXISTS student_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pass_number VARCHAR(50) NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_class VARCHAR(50) NOT NULL,
    reason VARCHAR(255) NOT NULL CHECK (reason IN ('medical', 'official_errand', 'sports', 'competition', 'early_dismissal', 'other')),
    authorized_by_id UUID,
    authorized_by_name VARCHAR(255) NOT NULL,
    escort_type VARCHAR(50) NOT NULL CHECK (escort_type IN ('guardian', 'staff', 'unaccompanied', 'driver')),
    escort_name VARCHAR(255) NOT NULL,
    escort_phone VARCHAR(50),
    departure_time TIMESTAMPTZ DEFAULT NOW(),
    expected_return_time TIMESTAMPTZ,
    actual_return_time TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'departed' CHECK (status IN ('departed', 'returned', 'overdue')),
    security_officer_name VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_movements_student ON student_movements (student_id);
CREATE INDEX IF NOT EXISTS idx_student_movements_status ON student_movements (status);
CREATE INDEX IF NOT EXISTS idx_student_movements_time ON student_movements (departure_time);

-- 3. Staff Gate Entry/Exit Logs (Physical perimeter transit, separated from HR payroll/leave)
CREATE TABLE IF NOT EXISTS staff_gate_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    staff_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('entry', 'exit')),
    transit_mode VARCHAR(50) NOT NULL DEFAULT 'pedestrian' CHECK (transit_mode IN ('pedestrian', 'vehicle')),
    vehicle_registration VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    security_officer_name VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_gate_staff ON staff_gate_logs (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_gate_emp ON staff_gate_logs (employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_gate_time ON staff_gate_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_staff_gate_dir ON staff_gate_logs (direction);

-- 4. Deliveries & Parcels Log
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(50) NOT NULL UNIQUE,
    courier_service VARCHAR(100) NOT NULL,
    sender_name VARCHAR(255),
    recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('staff', 'department', 'school')),
    recipient_id UUID,
    recipient_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    package_description TEXT NOT NULL,
    package_type VARCHAR(50) DEFAULT 'parcel' CHECK (package_type IN ('document', 'parcel', 'box', 'equipment', 'confidential')),
    received_time TIMESTAMPTZ DEFAULT NOW(),
    received_by_officer VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'notified', 'collected')),
    collected_time TIMESTAMPTZ,
    collected_by_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_tracking ON deliveries (tracking_code);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries (status);
CREATE INDEX IF NOT EXISTS idx_deliveries_time ON deliveries (received_time);
CREATE INDEX IF NOT EXISTS idx_deliveries_recipient ON deliveries (recipient_name);

-- 5. Security Incidents & Escalations
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL CHECK (category IN ('unauthorized_access', 'suspicious_activity', 'student_misconduct', 'property_damage', 'medical_emergency', 'perimeter_breach', 'vehicle_incident', 'other')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    reported_by_name VARCHAR(255) NOT NULL,
    involved_parties TEXT,
    action_taken TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_investigation', 'resolved', 'escalated')),
    escalated_to VARCHAR(255),
    resolution_notes TEXT,
    incident_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_number ON security_incidents (incident_number);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON security_incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON security_incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_time ON security_incidents (incident_time);

-- 6. Emergency Contacts Directory
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('police', 'fire', 'ambulance', 'clinic', 'management', 'utility')),
    contact_person VARCHAR(255),
    primary_phone VARCHAR(50) NOT NULL,
    secondary_phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_category ON emergency_contacts (category);
CREATE INDEX IF NOT EXISTS idx_emergency_order ON emergency_contacts (display_order);

-- Initial Emergency Contacts (Standard Civic & Institutional Safety Lines)
INSERT INTO emergency_contacts (service_name, category, contact_person, primary_phone, secondary_phone, address, display_order)
VALUES
    ('National Emergency Response Service', 'police', 'Central Dispatch Control', '112', '767', 'Lagos State Command', 1),
    ('State Police Command (Area Division)', 'police', 'Divisional Police Officer', '08031234567', '08029876543', 'Victoria Island Division, Lagos', 2),
    ('State Fire & Rescue Service', 'fire', 'Emergency Control Room', '01-2222222', '08033221100', 'Onikan Fire Station, Lagos', 3),
    ('Oakland School Health Infirmary', 'clinic', 'Lead Medical Officer', '08055554321', NULL, 'Administrative Wing, Ground Floor', 4),
    ('Lagbus / State Ambulance Service (LASAMBUS)', 'ambulance', 'Emergency Dispatcher', '112', '08023114455', 'State Trauma Centre, Lagos', 5),
    ('Head of School Emergency Hotline', 'management', 'Mr Seyi Bankole (Principal)', '08012345678', NULL, 'Executive Office', 6),
    ('Eko Electricity Distribution (EKEDC) Faults', 'utility', 'Customer Faults Unit', '07080655555', NULL, 'Victoria Island District Office', 7)
ON CONFLICT DO NOTHING;
