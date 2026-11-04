-- ==============================================================================
-- Migration 031: Online payments, fee adjustments, and messaging
--
-- Online payments (Paystack)
--   online_payments          one row per attempt by a parent to pay online, kept until the provider confirms it.
--                            The ledger (fee_transactions) is written only when a payment is confirmed.
--   student_virtual_accounts a bank account number of the student's own, so a transfer is matched to the student
--
-- Fee adjustments
--   fee_adjustments          scholarships, discounts, sibling discounts and waivers, each with a reason. A school's
--                            fee for a student is the class tuition less these (resolve_student_net_billed).
--   fee_instalments          a student's payment schedule: due dates and amounts
--
-- Messaging (WhatsApp, SMS, email)
--   message_outbox           every message the school sends, with its status and cost. event_key is unique per
--                            school, so the same event can never send the same message twice.
--   message_opt_outs         what a parent has asked not to receive
--   parent_invites           a link, sent by message, that lets a parent set their own password
--
-- Every table carries its school, with the same row-level security as the rest.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.online_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'paystack',
  reference TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'success', 'failed', 'abandoned', 'mismatch')),
  channel TEXT,
  provider_fee NUMERIC(12,2),
  authorization_url TEXT,
  access_code TEXT,
  paid_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  fee_transaction_id UUID REFERENCES public.fee_transactions(id) ON DELETE SET NULL,
  failure_reason TEXT,
  raw JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, reference)
);
CREATE INDEX IF NOT EXISTS online_payments_school_student_idx ON public.online_payments (school_id, student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.student_virtual_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_customer_code TEXT,
  account_number TEXT NOT NULL,
  bank_name TEXT,
  account_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, student_id),
  UNIQUE (provider, account_number)
);

CREATE TABLE IF NOT EXISTS public.fee_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('scholarship', 'discount', 'sibling', 'waiver')),
  amount NUMERIC(12,2) CHECK (amount IS NULL OR amount > 0),
  percent NUMERIC(5,2) CHECK (percent IS NULL OR (percent > 0 AND percent <= 100)),
  reason TEXT NOT NULL CHECK (btrim(reason) <> ''),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((amount IS NULL) <> (percent IS NULL))
);
CREATE INDEX IF NOT EXISTS fee_adjustments_student_idx ON public.fee_adjustments (school_id, student_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.fee_instalments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  sequence INT NOT NULL CHECK (sequence > 0),
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, sequence)
);

CREATE TABLE IF NOT EXISTS public.message_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('payment', 'attendance', 'gate', 'results', 'broadcast', 'reminder', 'invite')),
  event_key TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
  recipient_phone TEXT,
  recipient_email TEXT,
  preferred_channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (preferred_channel IN ('whatsapp', 'sms', 'email')),
  subject TEXT,
  body TEXT NOT NULL,
  -- The facts the message is made from, so a WhatsApp template can be filled in
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'failed', 'skipped')),
  channel_used TEXT,
  provider_message_id TEXT,
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  cost NUMERIC(10,4),
  currency TEXT NOT NULL DEFAULT 'NGN',
  skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  UNIQUE (school_id, event_key)
);
CREATE INDEX IF NOT EXISTS message_outbox_due_idx ON public.message_outbox (next_attempt_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS message_outbox_school_created_idx ON public.message_outbox (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_outbox_provider_id_idx ON public.message_outbox (provider_message_id) WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.message_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'all' CHECK (category IN ('all', 'payment', 'attendance', 'gate', 'results', 'broadcast', 'reminder')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, phone, category)
);

CREATE TABLE IF NOT EXISTS public.parent_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-level security: the same rule as every other table (see migration 029)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['online_payments', 'student_virtual_accounts', 'fee_adjustments', 'fee_instalments', 'message_outbox', 'message_opt_outs', 'parent_invites'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS school_isolation ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY school_isolation ON public.%I AS RESTRICTIVE FOR ALL TO public USING (school_id = public.current_school_id()) WITH CHECK (school_id = public.current_school_id())',
      t
    );
    -- No policy lets the browser read or write these tables: only the app's server does
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- What a student is billed: the class tuition less active scholarships, discounts, sibling discounts and waivers.
-- A percentage is taken of the class tuition (never compounded); the total never goes below zero.
CREATE OR REPLACE FUNCTION public.resolve_student_net_billed(p_school_id UUID, p_student_id UUID)
RETURNS NUMERIC(12,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross NUMERIC(12,2);
  v_off NUMERIC(12,2);
BEGIN
  v_gross := public.resolve_student_billed_tuition(p_school_id, p_student_id);
  SELECT COALESCE(SUM(CASE WHEN percent IS NOT NULL THEN ROUND(v_gross * percent / 100, 2) ELSE amount END), 0)
  INTO v_off
  FROM public.fee_adjustments
  WHERE school_id = p_school_id AND student_id = p_student_id AND is_active;
  RETURN GREATEST(0, v_gross - v_off);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_student_net_billed(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_student_net_billed(UUID, UUID) TO service_role;

-- The ledger now bills the net amount, so a scholarship lowers what must be paid and what counts as an overpayment.
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
  v_ref_tx public.fee_transactions%ROWTYPE;
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

  -- 3. Strict Idempotency Key Validation
  IF v_clean_idem IS NOT NULL THEN
    SELECT *
    INTO v_existing_tx
    FROM public.fee_transactions
    WHERE school_id = p_school_id
      AND idempotency_key = v_clean_idem
    LIMIT 1;

    IF v_existing_tx.id IS NOT NULL THEN
      IF v_existing_tx.student_id <> p_student_id THEN
        RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: Idempotency key belongs to another student payment.';
      END IF;

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
  END IF;

  -- 4. Strict Bank Reference Uniqueness Check (cross-student prevention)
  IF v_clean_ref IS NOT NULL THEN
    SELECT *
    INTO v_ref_tx
    FROM public.fee_transactions
    WHERE school_id = p_school_id
      AND reference = v_clean_ref
    LIMIT 1;

    IF v_ref_tx.id IS NOT NULL THEN
      IF v_ref_tx.student_id <> p_student_id THEN
        RAISE EXCEPTION 'DUPLICATE_REFERENCE: Bank payment reference % is already recorded for another student transaction.', v_clean_ref;
      END IF;

      -- If same student and matching transaction, handle idempotent replay if matching idempotency key
      IF v_clean_idem IS NOT NULL AND v_ref_tx.idempotency_key IS NOT NULL AND v_clean_idem <> v_ref_tx.idempotency_key THEN
        RAISE EXCEPTION 'DUPLICATE_REFERENCE: Bank payment reference % was already submitted with a different idempotency key.', v_clean_ref;
      END IF;

      SELECT *
      INTO v_account
      FROM public.student_financial_accounts
      WHERE school_id = p_school_id
        AND student_id = v_ref_tx.student_id
      LIMIT 1;

      RETURN jsonb_build_object(
        'idempotent_replay', true,
        'transaction', row_to_json(v_ref_tx)::jsonb,
        'account', CASE WHEN v_account.id IS NOT NULL THEN row_to_json(v_account)::jsonb ELSE NULL END
      );
    END IF;
  END IF;

  -- 5. Verify student belongs to school
  SELECT id, first_name, last_name, admission_number
  INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND school_id = p_school_id
  LIMIT 1;

  IF v_student.id IS NULL THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND: Student record not found for this school.';
  END IF;

  -- 6. Resolve what the student is billed (the class tuition less any scholarship or discount) and prior confirmed payments
  v_billed := public.resolve_student_net_billed(p_school_id, p_student_id);

  SELECT COALESCE(SUM(amount), 0)
  INTO v_prior_paid
  FROM public.fee_transactions
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND status = 'successful';

  v_current_outstanding := GREATEST(0, v_billed - v_prior_paid);

  -- 7. Overpayment boundary check (DEF-110)
  IF p_amount > v_current_outstanding AND NOT COALESCE(p_allow_overpayment, FALSE) THEN
    RAISE EXCEPTION 'OVERPAYMENT_REJECTED: Payment amount (%) exceeds the student outstanding balance of %. Confirm overpayment to carry % forward as credit.',
      p_amount, v_current_outstanding, (p_amount - v_current_outstanding);
  END IF;

  -- 8. Generate sequential receipt number per school per year (DEF-119)
  v_receipt_no := public.next_school_document_number(
    p_school_id,
    'REC',
    EXTRACT(YEAR FROM CURRENT_DATE)::INT
  );

  -- 9. Insert fee transaction
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
    NULLIF(btrim(COALESCE(p_receiving_account, '')), ''),
    'successful',
    v_actor_name,
    p_actor_id,
    v_actor_role,
    NOW()
  )
  RETURNING * INTO v_inserted_tx;

  -- 10. Atomically upsert student_financial_accounts
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

  -- 11. Increment institutional bank account balance if matched (exact account_number or id, NO fuzzy bank_name)
  IF p_receiving_account IS NOT NULL AND btrim(p_receiving_account) <> '' THEN
    UPDATE public.bank_accounts
    SET balance = COALESCE(balance, 0) + p_amount,
        updated_at = NOW()
    WHERE id = (
      SELECT id FROM public.bank_accounts
      WHERE school_id = p_school_id
        AND is_active = TRUE
        AND (
          id::text = p_receiving_account
          OR p_receiving_account ~* ('(^|[^0-9])' || account_number || '([^0-9]|$)')
        )
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;

  -- 12. Write audit log with real actor attribution
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

-- Revoke execute from PUBLIC, anon, authenticated and grant strictly to service_role
REVOKE ALL ON FUNCTION public.record_fee_payment_tx(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_fee_payment_tx(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) TO service_role;
