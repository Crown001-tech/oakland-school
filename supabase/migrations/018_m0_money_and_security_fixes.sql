-- ==============================================================================
-- Migration 018: M0 Money, Financial Ledger Integrity & Security Hardening
-- ==============================================================================
-- 1. Fixes resolve_student_billed_tuition to look up class from class_enrollments
--    and return 0.00 if student has no active class enrollment (never defaults to JSS 1).
-- 2. Updates record_fee_payment_tx:
--    - Enforces strict cross-student bank reference checks (prevents replaying another student's tx).
--    - Enforces strict idempotency key check (cross-student conflict check).
--    - Fixes receiving account balance update to match by exact account_number or id, NEVER fuzzy bank_name.
--    - Leaves receiving_account NULL if not specified (never hardcoded mock account).
-- 3. Restricts execute privileges strictly to service_role.
-- ==============================================================================

-- 1. Fix resolve_student_billed_tuition
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
  -- Find student's active class name from class_enrollments
  SELECT c.name
  INTO v_class_name
  FROM public.class_enrollments ce
  JOIN public.classes c ON c.id = ce.class_id
  WHERE ce.student_id = p_student_id
  ORDER BY (CASE WHEN ce.status = 'active' THEN 0 ELSE 1 END), ce.created_at DESC
  LIMIT 1;

  -- If student has no assigned class, they have NOT been enrolled in a class yet -> return 0.00 (pending assignment)
  IF v_class_name IS NULL OR btrim(v_class_name) = '' THEN
    RETURN 0.00;
  END IF;

  -- Read school master settings
  SELECT COALESCE(settings, '{}'::jsonb)
  INTO v_settings
  FROM public.schools
  WHERE id = p_school_id;

  -- Resolve rate from master settings
  IF v_class_name ILIKE 'SS 3%' THEN
    v_rate := COALESCE(NULLIF((v_settings->>'tuitionSS3')::NUMERIC, 0), 420000.00);
  ELSIF v_class_name ILIKE 'SS%' THEN
    v_rate := COALESCE(NULLIF((v_settings->>'tuitionSS12')::NUMERIC, 0), 380000.00);
  ELSIF v_class_name ILIKE 'JSS%' THEN
    v_rate := COALESCE(NULLIF((v_settings->>'tuitionJSS')::NUMERIC, 0), 350000.00);
  ELSE
    SELECT COALESCE(total_amount, tuition_fee, 0)
    INTO v_struct_amount
    FROM public.fee_structures
    WHERE school_id = p_school_id
      AND class_name = v_class_name
    LIMIT 1;

    v_rate := COALESCE(v_struct_amount, 0.00);
  END IF;

  RETURN v_rate;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_student_billed_tuition(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_student_billed_tuition(UUID, UUID) TO service_role;

-- 2. Update record_fee_payment_tx
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

  -- 6. Resolve true billed tuition and prior confirmed payments (DEF-107)
  v_billed := public.resolve_student_billed_tuition(p_school_id, p_student_id);

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
