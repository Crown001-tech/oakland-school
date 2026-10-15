-- ==============================================================================
-- Migration 007: Student Pickup Verification & Procurement/Inventory Management
-- Oakland International School - Modular Monolith Database Schema
-- ==============================================================================

-- 1. Authorized Persons for Student Pickup
CREATE TABLE IF NOT EXISTS authorized_pickup_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    national_id VARCHAR(100),
    photo_url TEXT,
    qr_token VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authorized_pickup_student ON authorized_pickup_persons (student_id);
CREATE INDEX IF NOT EXISTS idx_authorized_pickup_qr ON authorized_pickup_persons (qr_token);

-- 2. Daily Student Pickup Logs
CREATE TABLE IF NOT EXISTS pickup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(100) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    student_class VARCHAR(50) NOT NULL,
    authorized_person_id UUID REFERENCES authorized_pickup_persons(id) ON DELETE SET NULL,
    picked_up_by_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    verified_by_name VARCHAR(255) NOT NULL,
    verification_method VARCHAR(50) NOT NULL DEFAULT 'qr_scan' CHECK (verification_method IN ('qr_scan', 'manual_code', 'emergency_override')),
    status VARCHAR(50) NOT NULL DEFAULT 'cleared' CHECK (status IN ('cleared', 'flagged_unauthorized')),
    notes TEXT,
    pickup_time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_logs_student ON pickup_logs (student_id);
CREATE INDEX IF NOT EXISTS idx_pickup_logs_time ON pickup_logs (pickup_time);
CREATE INDEX IF NOT EXISTS idx_pickup_logs_status ON pickup_logs (status);

-- 3. Institutional Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('stationery', 'science_lab', 'sports', 'it_hardware', 'medical', 'textbooks', 'maintenance')),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    reorder_level INTEGER NOT NULL DEFAULT 10,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    location VARCHAR(255) DEFAULT 'Main Central Store',
    status VARCHAR(50) NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items (category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items (status);

-- 4. Procurement & Requisition Requests
CREATE TABLE IF NOT EXISTS procurement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    estimated_unit_cost NUMERIC(12,2) NOT NULL,
    estimated_total_cost NUMERIC(12,2) NOT NULL,
    urgency VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'critical')),
    justification TEXT NOT NULL,
    requested_by_id UUID,
    requested_by_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_principal' CHECK (status IN ('pending_principal', 'pending_proprietor', 'approved', 'rejected', 'ordered', 'delivered')),
    approved_by VARCHAR(255),
    approval_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procurement_status ON procurement_requests (status);
CREATE INDEX IF NOT EXISTS idx_procurement_urgency ON procurement_requests (urgency);

-- Initial Seed Data
INSERT INTO inventory_items (name, category, quantity, unit, reorder_level, unit_cost, location, status)
VALUES
    ('A4 White Printing & Duplicating Paper', 'stationery', 85, 'reams', 20, 4800.00, 'Administration Store Room', 'in_stock'),
    ('Dry Erase Magnetic Whiteboard Markers (Assorted)', 'stationery', 12, 'boxes', 15, 6500.00, 'Staff Workroom', 'low_stock'),
    ('Hydrochloric Acid 37% (Analytical Grade 1L)', 'science_lab', 14, 'bottles', 5, 12500.00, 'Chemistry Reagent Store', 'in_stock'),
    ('Arduino STEM Robotics Starter Kits', 'it_hardware', 30, 'sets', 10, 38000.00, 'Computer Lab A', 'in_stock'),
    ('Official Match Soccer Balls (FIFA Inspected)', 'sports', 18, 'units', 8, 14500.00, 'Sports Pavilion', 'in_stock'),
    ('Emergency First Aid Burn Gel & Bandage Kits', 'medical', 6, 'kits', 8, 9200.00, 'School Infirmary', 'low_stock')
ON CONFLICT DO NOTHING;
