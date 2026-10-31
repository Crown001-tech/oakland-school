-- ==============================================================================
-- Migration 014: M0.1 Money & Financial Ledger Integrity
-- Eductive / Oakland International School
--
-- Implements:
--   1. Atomic fee payment transaction RPC (`record_fee_payment_tx`)
--   2. Idempotency keys & unique constraints on `fee_transactions` (DEF-109)
--   3. Per-school, per-year document sequences for receipts & vouchers (DEF-119)
--   4. Real signed-in user attribution columns on money & audit tables (DEF-112, DEF-120)
--   5. Overpayment rejection or credit carried forward (`credit_balance`) (DEF-110)
--   6. Persistent payroll disbursement tables (`payroll_runs`, `payroll_run_items`) (DEF-111)
--   7. Automated repair of corrupted `student_financial_accounts` rows (DEF-107)
--   8. Petty cash category & expenditure bank account persistence (DEF-117, DEF-118, DEF-121)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA ENHANCEMENTS ON FINANCIAL & AUDIT TABLES
-- ------------------------------------------------------------------------------

-- 1.1 student_financial_accounts: add credit_balance for carried-forward overpayments
ALTER TABLE public.student_financial_accounts
  ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 1.2 fee_transactions: add idempotency_key, receiving_account, and actor columns
ALTER TABLE public.fee_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120),
  ADD COLUMN IF NOT EXISTS receiving_account VARCHAR(150),
  ADD COLUMN IF NOT EXISTS recorded_by_id UUID,
  ADD COLUMN IF NOT EXISTS recorded_by_role VARCHAR(50);

-- Deduplicate any legacy non-unique reference strings before adding unique index
WITH ranked_refs AS (
  SELECT id,
         reference,
         ROW_NUMBER() OVER (PARTITION BY school_id, reference ORDER BY created_at ASC, id ASC) AS rn
  FROM public.fee_transactions
  WHERE reference IS NOT NULL AND btrim(reference) <> ''
)
UPDATE public.fee_transactions ft
SET reference = ft.reference || '-DUP-' || ranked_refs.rn
FROM ranked_refs
WHERE ft.id = ranked_refs.id
  AND ranked_refs.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_tx_school_idempotency
  ON public.fee_transactions (school_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_tx_school_reference
  ON public.fee_transactions (school_id, reference)
  WHERE reference IS NOT NULL;

-- 1.3 expenditures: add immutable voucher_number, bank_account_id, payment_account, actor columns
ALTER TABLE public.expenditures
  ADD COLUMN IF NOT EXISTS voucher_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_account VARCHAR(150),
  ADD COLUMN IF NOT EXISTS recorded_by_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(150);

-- 1.4 petty_cash: add immutable receipt_number, category, and actor columns
ALTER TABLE public.petty_cash
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'Office Stationery',
  ADD COLUMN IF NOT EXISTS recorded_by_id UUID,
  ADD COLUMN IF NOT EXISTS recorded_by_role VARCHAR(50);

-- 1.5 bank_accounts: add balance column
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS balance NUMERIC(14,2) NOT NULL DEFAULT 0;

-- 1.6 audit_logs: add actor_name column for direct attribution
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_name VARCHAR(150);

-- ------------------------------------------------------------------------------
-- 2. PER-SCHOOL PER-YEAR DOCUMENT SEQUENCES (RECEIPTS & VOUCHERS)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.school_document_sequences (
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  doc_type VARCHAR(30) NOT NULL, -- 'REC', 'VCH', 'PC', 'PAY'
  doc_year INT NOT NULL,
  current_val INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (school_id, doc_type, doc_year)
);

CREATE OR REPLACE FUNCTION public.next_school_document_number(
  p_school_id UUID,
  p_doc_type TEXT,
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_type TEXT := UPPER(btrim(p_doc_type));
  v_year INT := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT);
  v_seq INT;
BEGIN
  INSERT INTO public.school_document_sequences (school_id, doc_type, doc_year, current_val, updated_at)
  VALUES (p_school_id, v_type, v_year, 1, NOW())
  ON CONFLICT (school_id, doc_type, doc_year)
  DO UPDATE SET
    current_val = public.school_document_sequences.current_val + 1,
    updated_at = NOW()
  RETURNING current_val INTO v_seq;

  RETURN FORMAT('%s-%s-%s', v_type, v_year, LPAD(v_seq::TEXT, 4, '0'));
END;
$$;

-- Seed REC sequence to at least the count of existing fee_transactions per school/year
INSERT INTO public.school_document_sequences (school_id, doc_type, doc_year, current_val, updated_at)
SELECT
  school_id,
  'REC',
  EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::INT AS doc_year,
  COUNT(*)::INT AS cnt,
  NOW()
FROM public.fee_transactions
GROUP BY school_id, EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::INT
ON CONFLICT (school_id, doc_type, doc_year)
DO UPDATE SET
  current_val = GREATEST(public.school_document_sequences.current_val, EXCLUDED.current_val),
  updated_at = NOW();

-- Backfill immutable voucher_number on existing expenditures in chronological order
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, school_id, EXTRACT(YEAR FROM COALESCE(date::TIMESTAMPTZ, created_at, NOW()))::INT AS yr
    FROM public.expenditures
    WHERE voucher_number IS NULL OR btrim(voucher_number) = ''
    ORDER BY date ASC, created_at ASC, id ASC
  LOOP
    UPDATE public.expenditures
    SET voucher_number = public.next_school_document_number(r.school_id, 'VCH', r.yr)
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Backfill immutable receipt_number on existing petty_cash rows in chronological order
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, school_id, EXTRACT(YEAR FROM COALESCE(date::TIMESTAMPTZ, created_at, NOW()))::INT AS yr
    FROM public.petty_cash
    WHERE receipt_number IS NULL OR btrim(receipt_number) = ''
    ORDER BY date ASC, created_at ASC, id ASC
  LOOP
    UPDATE public.petty_cash
    SET receipt_number = public.next_school_document_number(r.school_id, 'PC', r.yr)
    WHERE id = r.id;
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_expenditures_school_voucher
  ON public.expenditures (school_id, voucher_number)
  WHERE voucher_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_petty_cash_school_receipt
  ON public.petty_cash (school_id, receipt_number)
  WHERE receipt_number IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. PAYROLL RUNS PERSISTENCE TABLES (DEF-111)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  pay_period VARCHAR(100) NOT NULL,
  month INT NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INT,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  total_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(14,2) NOT NULL DEFAULT 0,
  staff_count INT NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'Approved & Disbursed',
  authorized_by_id UUID,
  authorized_by_name VARCHAR(150) NOT NULL,
  authorized_by_role VARCHAR(50) NOT NULL,
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payroll_run_period UNIQUE (school_id, pay_period, month, year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_school_period
  ON public.payroll_runs (school_id, year DESC, month DESC);

CREATE TABLE IF NOT EXISTS public.payroll_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  employee_id VARCHAR(60),
  staff_name VARCHAR(150) NOT NULL,
  role VARCHAR(100) NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  responsibility_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  cooperative_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  bank_name VARCHAR(150),
  bank_account VARCHAR(50),
  status VARCHAR(40) NOT NULL DEFAULT 'Approved & Disbursed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payroll_run_staff UNIQUE (payroll_run_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_run_items_run
  ON public.payroll_run_items (payroll_run_id);

-- ------------------------------------------------------------------------------
-- 4. RESOLVE DYNAMIC BILLED TUITION & REPAIR STUDENT FINANCIAL ACCOUNTS (DEF-107)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_student_billed_tuition(
  p_school_id UUID,
  p_student_id UUID
)
RETURNS NUMERIC(12,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_name TEXT;
  v_settings JSONB;
  v_rate NUMERIC(12,2) := 0;
  v_struct_amount NUMERIC(12,2);
BEGIN
  -- 1. Find student's active class name
  SELECT c.name
  INTO v_class_name
  FROM public.class_enrollments ce
  JOIN public.classes c ON c.id = ce.class_id
  WHERE ce.student_id = p_student_id
  ORDER BY (CASE WHEN ce.status = 'active' THEN 0 ELSE 1 END), ce.created_at DESC
  LIMIT 1;

  v_class_name := COALESCE(v_class_name, 'JSS 1');

  -- 2. Read school master settings
  SELECT COALESCE(settings, '{}'::jsonb)
  INTO v_settings
  FROM public.schools
  WHERE id = p_school_id;

  IF v_class_name LIKE 'JSS%' THEN
    v_rate := COALESCE(NULLIF(v_settings->>'tuitionJSS', '')::NUMERIC, 0);
  ELSIF v_class_name = 'SS 3' THEN
    v_rate := COALESCE(NULLIF(v_settings->>'tuitionSS3', '')::NUMERIC, 0);
  ELSE
    v_rate := COALESCE(NULLIF(v_settings->>'tuitionSS12', '')::NUMERIC, 0);
  END IF;

  -- 3. Check fee_structures table if rate is not set or overridden
  SELECT total_amount
  INTO v_struct_amount
  FROM public.fee_structures
  WHERE school_id = p_school_id
    AND class_name = v_class_name
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_struct_amount IS NOT NULL AND v_struct_amount > 0 THEN
    v_rate := v_struct_amount;
  END IF;

  RETURN COALESCE(v_rate, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.repair_student_financial_accounts(
  p_school_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_billed NUMERIC(12,2);
  v_tx_paid NUMERIC(12,2);
  v_last_paid TIMESTAMPTZ;
  v_outstanding NUMERIC(12,2);
  v_credit NUMERIC(12,2);
  v_count INT := 0;
BEGIN
  FOR r IN
    SELECT s.id AS student_id, s.school_id
    FROM public.students s
    WHERE p_school_id IS NULL OR s.school_id = p_school_id
  LOOP
    v_billed := public.resolve_student_billed_tuition(r.school_id, r.student_id);

    SELECT
      COALESCE(SUM(ft.amount), 0),
      MAX(ft.created_at)
    INTO v_tx_paid, v_last_paid
    FROM public.fee_transactions ft
    WHERE ft.school_id = r.school_id
      AND ft.student_id = r.student_id
      AND ft.status = 'successful';

    v_outstanding := GREATEST(0, v_billed - v_tx_paid);
    v_credit := GREATEST(0, v_tx_paid - v_billed);

    INSERT INTO public.student_financial_accounts (
      school_id,
      student_id,
      total_billed,
      total_paid,
      outstanding_balance,
      credit_balance,
      last_payment_date,
      updated_at
    )
    VALUES (
      r.school_id,
      r.student_id,
      v_billed,
      v_tx_paid,
      v_outstanding,
      v_credit,
      v_last_paid,
      NOW()
    )
    ON CONFLICT (school_id, student_id)
    DO UPDATE SET
      total_billed = EXCLUDED.total_billed,
      total_paid = EXCLUDED.total_paid,
      outstanding_balance = EXCLUDED.outstanding_balance,
      credit_balance = EXCLUDED.credit_balance,
      last_payment_date = COALESCE(EXCLUDED.last_payment_date, public.student_financial_accounts.last_payment_date),
      updated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Run the repair immediately across all students
SELECT public.repair_student_financial_accounts();

-- ------------------------------------------------------------------------------
-- 5. ATOMIC FEE PAYMENT TRANSACTION RPC (`record_fee_payment_tx`)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_fee_payment_tx(
  p_school_id UUID,
  p_student_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT DEFAULT 'Bank Transfer',
  p_reference TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_payer_name TEXT DEFAULT 'Guardian',
  p_receiving_account TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_name TEXT DEFAULT NULL,
  p_actor_role TEXT DEFAULT NULL,
  p_allow_overpayment BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_idem TEXT := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_clean_ref TEXT := NULLIF(btrim(COALESCE(p_reference, '')), '');
  v_actor_name TEXT := COALESCE(NULLIF(btrim(COALESCE(p_actor_name, '')), ''), 'Authenticated Staff');
  v_actor_role TEXT := COALESCE(NULLIF(btrim(COALESCE(p_actor_role, '')), ''), 'Bursar');
  v_student RECORD;
  v_existing_tx public.fee_transactions%ROWTYPE;
  v_inserted_tx public.fee_transactions%ROWTYPE;
  v_account public.student_financial_accounts%ROWTYPE;
  v_billed NUMERIC(12,2);
  v_prior_paid NUMERIC(12,2);
  v_current_outstanding NUMERIC(12,2);
  v_new_paid NUMERIC(12,2);
  v_new_outstanding NUMERIC(12,2);
  v_new_credit NUMERIC(12,2);
  v_receipt_no TEXT;
BEGIN
  -- 1. Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Payment amount must be greater than zero.';
  END IF;

  -- 2. Acquire transaction-scoped advisory locks to serialize concurrent requests
  PERFORM pg_advisory_xact_lock(hashtext(p_school_id::text || ':fee_student:' || p_student_id::text));
  IF v_clean_idem IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_school_id::text || ':fee_idem:' || v_clean_idem));
  END IF;
  IF v_clean_ref IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_school_id::text || ':fee_ref:' || v_clean_ref));
  END IF;

  -- 3. Check idempotency key or duplicate reference (DEF-109)
  IF v_clean_idem IS NOT NULL THEN
    SELECT *
    INTO v_existing_tx
    FROM public.fee_transactions
    WHERE school_id = p_school_id
      AND idempotency_key = v_clean_idem
    LIMIT 1;
  END IF;

  IF v_existing_tx.id IS NULL AND v_clean_ref IS NOT NULL THEN
    SELECT *
    INTO v_existing_tx
    FROM public.fee_transactions
    WHERE school_id = p_school_id
      AND reference = v_clean_ref
    LIMIT 1;
  END IF;

  IF v_existing_tx.id IS NOT NULL THEN
    SELECT *
    INTO v_account
    FROM public.student_financial_accounts
    WHERE school_id = p_school_id
      AND student_id = v_existing_tx.student_id
    LIMIT 1;

    RETURN jsonb_build_object(
      'idempotent_replay', true,
      'transaction', row_to_json(v_existing_tx)::jsonb,
      'account', CASE WHEN v_account.id IS NOT NULL THEN row_to_json(v_account)::jsonb ELSE NULL END
    );
  END IF;

  -- 4. Verify student belongs to school
  SELECT id, first_name, last_name, admission_number
  INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND school_id = p_school_id
  LIMIT 1;

  IF v_student.id IS NULL THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND: Student record not found for this school.';
  END IF;

  -- 5. Resolve true billed tuition and prior confirmed payments (DEF-107)
  v_billed := public.resolve_student_billed_tuition(p_school_id, p_student_id);

  SELECT COALESCE(SUM(amount), 0)
  INTO v_prior_paid
  FROM public.fee_transactions
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND status = 'successful';

  v_current_outstanding := GREATEST(0, v_billed - v_prior_paid);

  -- 6. Overpayment boundary check (DEF-110)
  IF p_amount > v_current_outstanding AND NOT COALESCE(p_allow_overpayment, FALSE) THEN
    RAISE EXCEPTION 'OVERPAYMENT_REJECTED: Payment amount (%) exceeds the student outstanding balance of %. Confirm overpayment to carry % forward as credit.',
      p_amount, v_current_outstanding, (p_amount - v_current_outstanding);
  END IF;

  -- 7. Generate sequential receipt number per school per year (DEF-119)
  v_receipt_no := public.next_school_document_number(
    p_school_id,
    'REC',
    EXTRACT(YEAR FROM CURRENT_DATE)::INT
  );

  -- 8. Insert fee transaction
  INSERT INTO public.fee_transactions (
    school_id,
    student_id,
    amount,
    receipt_number,
    payment_method,
    reference,
    idempotency_key,
    payer_name,
    receiving_account,
    status,
    recorded_by,
    recorded_by_id,
    recorded_by_role,
    created_at
  )
  VALUES (
    p_school_id,
    p_student_id,
    p_amount,
    v_receipt_no,
    COALESCE(NULLIF(btrim(p_payment_method), ''), 'Bank Transfer'),
    COALESCE(v_clean_ref, v_receipt_no),
    v_clean_idem,
    COALESCE(NULLIF(btrim(p_payer_name), ''), 'Guardian'),
    p_receiving_account,
    'successful',
    v_actor_name,
    p_actor_id,
    v_actor_role,
    NOW()
  )
  RETURNING * INTO v_inserted_tx;

  -- 9. Atomically upsert student_financial_accounts
  v_new_paid := v_prior_paid + p_amount;
  v_new_outstanding := GREATEST(0, v_billed - v_new_paid);
  v_new_credit := GREATEST(0, v_new_paid - v_billed);

  INSERT INTO public.student_financial_accounts (
    school_id,
    student_id,
    total_billed,
    total_paid,
    outstanding_balance,
    credit_balance,
    last_payment_date,
    updated_at
  )
  VALUES (
    p_school_id,
    p_student_id,
    v_billed,
    v_new_paid,
    v_new_outstanding,
    v_new_credit,
    NOW(),
    NOW()
  )
  ON CONFLICT (school_id, student_id)
  DO UPDATE SET
    total_billed = EXCLUDED.total_billed,
    total_paid = EXCLUDED.total_paid,
    outstanding_balance = EXCLUDED.outstanding_balance,
    credit_balance = EXCLUDED.credit_balance,
    last_payment_date = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_account;

  -- 10. Increment institutional bank account balance if matched
  IF p_receiving_account IS NOT NULL AND btrim(p_receiving_account) <> '' THEN
    UPDATE public.bank_accounts
    SET balance = COALESCE(balance, 0) + p_amount,
        updated_at = NOW()
    WHERE school_id = p_school_id
      AND is_active = TRUE
      AND (
        p_receiving_account ILIKE '%' || account_number || '%'
        OR p_receiving_account ILIKE '%' || bank_name || '%'
      );
  END IF;

  -- 11. Write audit log with real signed-in user attribution (DEF-112)
  INSERT INTO public.audit_logs (
    school_id,
    actor_id,
    actor_name,
    actor_role,
    action,
    resource_type,
    resource_id,
    metadata,
    created_at
  )
  VALUES (
    p_school_id,
    p_actor_id,
    v_actor_name,
    v_actor_role,
    'finance.fee_payment_recorded',
    'fee_transactions',
    v_inserted_tx.id,
    jsonb_build_object(
      'actorName', v_actor_name,
      'actorRole', v_actor_role,
      'studentId', p_student_id,
      'studentName', trim(COALESCE(v_student.first_name, '') || ' ' || COALESCE(v_student.last_name, '')),
      'admissionNumber', v_student.admission_number,
      'amount', p_amount,
      'receiptNumber', v_receipt_no,
      'method', v_inserted_tx.payment_method,
      'bankRef', v_inserted_tx.reference,
      'receivingAccount', p_receiving_account,
      'totalBilled', v_billed,
      'totalPaid', v_new_paid,
      'outstandingBalance', v_new_outstanding,
      'creditBalance', v_new_credit,
      'summary', FORMAT(
        'Fee payment of NGN %s recorded for %s (%s) — Receipt %s',
        to_char(p_amount, 'FM999,999,999,990.00'),
        trim(COALESCE(v_student.first_name, '') || ' ' || COALESCE(v_student.last_name, '')),
        COALESCE(v_student.admission_number, '—'),
        v_receipt_no
      )
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'idempotent_replay', false,
    'transaction', row_to_json(v_inserted_tx)::jsonb,
    'account', row_to_json(v_account)::jsonb
  );
END;
$$;

