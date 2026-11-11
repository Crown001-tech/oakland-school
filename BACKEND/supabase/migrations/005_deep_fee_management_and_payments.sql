-- ====================================================================
-- OAKLAND SCHOOLS MANAGEMENT SYSTEM
-- Migration 005: Deep Fee Management, Automated Payments & Parent Ledger
-- 100% Idempotent Migration
-- ====================================================================

-- 1. FEE STRUCTURES (Per Class & Term Tuition Breakdown)
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_name VARCHAR(50) NOT NULL, -- e.g. 'JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'
    term VARCHAR(30) NOT NULL, -- 'First Term', 'Second Term', 'Third Term'
    academic_year VARCHAR(30) NOT NULL DEFAULT '2026/2027',
    tuition_fee NUMERIC(12,2) NOT NULL DEFAULT 350000,
    development_levy NUMERIC(12,2) NOT NULL DEFAULT 25000,
    books_stationery NUMERIC(12,2) NOT NULL DEFAULT 45000,
    uniform_sports NUMERIC(12,2) NOT NULL DEFAULT 30000,
    ict_science_levy NUMERIC(12,2) NOT NULL DEFAULT 20000,
    pta_levy NUMERIC(12,2) NOT NULL DEFAULT 10000,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 480000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_fee_class_term_year UNIQUE (school_id, class_name, term, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_class ON public.fee_structures(school_id, class_name, term);

-- 2. STUDENT FINANCIAL ACCOUNTS (Running Ledger & Virtual NUBANs)
CREATE TABLE IF NOT EXISTS public.student_financial_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    total_billed NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    virtual_account_number VARCHAR(20) UNIQUE,
    virtual_bank_name VARCHAR(60) DEFAULT 'Providus Bank / Paystack',
    virtual_account_name VARCHAR(150),
    last_payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_financial_account UNIQUE (school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_student ON public.student_financial_accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_virtual_acc ON public.student_financial_accounts(virtual_account_number);

-- 3. FEE INVOICES (Term-specific Billed Invoices)
CREATE TABLE IF NOT EXISTS public.fee_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    term VARCHAR(30) NOT NULL,
    academic_year VARCHAR(30) NOT NULL DEFAULT '2026/2027',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_invoices_student ON public.fee_invoices(student_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_number ON public.fee_invoices(invoice_number);

-- 4. FEE DISCOUNTS & SCHOLARSHIPS
CREATE TABLE IF NOT EXISTS public.fee_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL, -- e.g. 'Sibling 10% Concession', 'Merit Scholarship'
    percentage NUMERIC(5,2),
    fixed_amount NUMERIC(12,2),
    term VARCHAR(30),
    academic_year VARCHAR(30) DEFAULT '2026/2027',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FEE PAYMENT TRANSACTIONS (Reconciled Receipts)
CREATE TABLE IF NOT EXISTS public.fee_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_id UUID REFERENCES public.fee_invoices(id),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer', -- 'paystack', 'virtual_account', 'bank_transfer', 'cash', 'pos'
    reference VARCHAR(100),
    receipt_pdf_url TEXT,
    payer_name VARCHAR(150),
    payer_email VARCHAR(150),
    payer_phone VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'successful',
    recorded_by VARCHAR(100) DEFAULT 'Automated Payment Webhook',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_transactions_student ON public.fee_transactions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_receipt ON public.fee_transactions(receipt_number);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_ref ON public.fee_transactions(reference);

-- 6. SEED DEFAULT FEE STRUCTURES (IDEMPOTENT)
INSERT INTO public.fee_structures (
    school_id, class_name, term, academic_year, tuition_fee, development_levy, books_stationery, uniform_sports, ict_science_levy, pta_levy, total_amount
)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'JSS 1', 'First Term', '2026/2027', 350000, 25000, 45000, 30000, 20000, 10000, 480000),
    ('a0000000-0000-0000-0000-000000000001', 'JSS 2', 'First Term', '2026/2027', 350000, 25000, 35000, 20000, 20000, 10000, 460000),
    ('a0000000-0000-0000-0000-000000000001', 'JSS 3', 'First Term', '2026/2027', 370000, 25000, 40000, 20000, 25000, 10000, 490000),
    ('a0000000-0000-0000-0000-000000000001', 'SS 1', 'First Term', '2026/2027', 400000, 30000, 50000, 35000, 25000, 10000, 550000),
    ('a0000000-0000-0000-0000-000000000001', 'SS 2', 'First Term', '2026/2027', 400000, 30000, 45000, 20000, 25000, 10000, 530000),
    ('a0000000-0000-0000-0000-000000000001', 'SS 3', 'First Term', '2026/2027', 420000, 30000, 50000, 20000, 30000, 10000, 560000)
ON CONFLICT (school_id, class_name, term, academic_year) DO NOTHING;

-- 7. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_transactions ENABLE ROW LEVEL SECURITY;

-- Allow reading
DROP POLICY IF EXISTS "Public read fee structures" ON public.fee_structures;
CREATE POLICY "Public read fee structures" ON public.fee_structures FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage fee structures" ON public.fee_structures;
CREATE POLICY "Staff manage fee structures" ON public.fee_structures FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff and parent read accounts" ON public.student_financial_accounts;
CREATE POLICY "Staff and parent read accounts" ON public.student_financial_accounts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage accounts" ON public.student_financial_accounts;
CREATE POLICY "Staff manage accounts" ON public.student_financial_accounts FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Read fee invoices" ON public.fee_invoices;
CREATE POLICY "Read fee invoices" ON public.fee_invoices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage fee invoices" ON public.fee_invoices;
CREATE POLICY "Staff manage fee invoices" ON public.fee_invoices FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Read fee transactions" ON public.fee_transactions;
CREATE POLICY "Read fee transactions" ON public.fee_transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "System insert fee transactions" ON public.fee_transactions;
CREATE POLICY "System insert fee transactions" ON public.fee_transactions FOR INSERT TO public WITH CHECK (true);

-- ====================================================================
-- End of Migration 005
-- ====================================================================
