-- ==============================================================================
-- Migration 020: Fee receipt numbers unique per school
--
-- Receipt numbers come from a per-school, per-year sequence (migration 014), so two
-- schools both issue REC-2026-0001. The original UNIQUE constraint on
-- fee_transactions.receipt_number spans every school and would refuse the second
-- school's first payment. Uniqueness is now (school_id, receipt_number).
-- ==============================================================================

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  -- Drop every single-column UNIQUE constraint on receipt_number, whatever it was named
  FOR v_constraint IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY (con.conkey)
    WHERE con.conrelid = 'public.fee_transactions'::regclass
      AND con.contype = 'u'
      AND array_length(con.conkey, 1) = 1
      AND att.attname = 'receipt_number'
  LOOP
    EXECUTE format('ALTER TABLE public.fee_transactions DROP CONSTRAINT %I', v_constraint);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_tx_school_receipt
  ON public.fee_transactions (school_id, receipt_number);
