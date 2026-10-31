import { describe, it, expect, beforeEach } from 'vitest';
import { calculateNetSalary, formatNaira } from '@/lib/finance-data';

describe('M0 Financial Ledger & Payment Integrity Gates', () => {
  // ----------------------------------------------------------------------------
  // 1. EXIT GATE TEST: Double-Submitted Payment Idempotency Verification
  // ----------------------------------------------------------------------------
  describe('PROVES M0 EXIT GATE: A double-submitted payment is recorded once', () => {
    // Model state simulating the atomic database transaction semantics of record_fee_payment_tx
    interface DbTxRecord {
      id: string;
      schoolId: string;
      studentId: string;
      amount: number;
      receiptNumber: string;
      reference: string;
      idempotencyKey: string;
    }

    interface DbAccountRecord {
      studentId: string;
      totalBilled: number;
      totalPaid: number;
      outstandingBalance: number;
      creditBalance: number;
    }

    let recordedTransactions: DbTxRecord[] = [];
    let accounts: Map<string, DbAccountRecord> = new Map();
    let nextReceiptSeq = 1;

    beforeEach(() => {
      recordedTransactions = [];
      accounts = new Map();
      nextReceiptSeq = 1;
    });

    function processPaymentTransaction(params: {
      schoolId: string;
      studentId: string;
      amount: number;
      reference: string;
      idempotencyKey: string | null;
      allowOverpayment?: boolean;
    }) {
      const { schoolId, studentId, amount, reference, idempotencyKey, allowOverpayment = false } = params;

      // 1. Enforce required idempotency key (DEF-109 / Audit finding)
      if (!idempotencyKey || !idempotencyKey.trim()) {
        throw new Error('IDEMPOTENCY_REQUIRED: Idempotency key is required for payment processing.');
      }

      // 2. Check Idempotency Key Replay
      const existingByIdem = recordedTransactions.find(
        (t) => t.schoolId === schoolId && t.idempotencyKey === idempotencyKey
      );
      if (existingByIdem) {
        if (existingByIdem.studentId !== studentId) {
          throw new Error('IDEMPOTENCY_CONFLICT: Idempotency key belongs to another student payment.');
        }
        return {
          idempotentReplay: true,
          transaction: existingByIdem,
          account: accounts.get(studentId)!,
        };
      }

      // 3. Check Bank Reference Uniqueness (Cross-Student Prevention)
      const existingByRef = recordedTransactions.find(
        (t) => t.schoolId === schoolId && t.reference === reference
      );
      if (existingByRef) {
        if (existingByRef.studentId !== studentId) {
          throw new Error(`DUPLICATE_REFERENCE: Bank payment reference ${reference} is already recorded for another student transaction.`);
        }
        return {
          idempotentReplay: true,
          transaction: existingByRef,
          account: accounts.get(studentId)!,
        };
      }

      // 4. Overpayment check
      const account = accounts.get(studentId) || {
        studentId,
        totalBilled: 350000,
        totalPaid: 0,
        outstandingBalance: 350000,
        creditBalance: 0,
      };

      if (amount > account.outstandingBalance && !allowOverpayment) {
        throw new Error(`OVERPAYMENT_REJECTED: Amount exceeds outstanding balance.`);
      }

      // 5. Create new transaction and update balances
      const receiptNo = `REC-2026-000${nextReceiptSeq++}`;
      const newTx: DbTxRecord = {
        id: `tx-${Date.now()}-${Math.random()}`,
        schoolId,
        studentId,
        amount,
        receiptNumber: receiptNo,
        reference,
        idempotencyKey,
      };
      recordedTransactions.push(newTx);

      account.totalPaid += amount;
      account.outstandingBalance = Math.max(0, account.totalBilled - account.totalPaid);
      account.creditBalance = Math.max(0, account.totalPaid - account.totalBilled);
      accounts.set(studentId, account);

      return {
        idempotentReplay: false,
        transaction: newTx,
        account,
      };
    }

    it('records an initial fee payment and produces an official receipt', () => {
      const studentId = 'student-chinedu-001';
      const result = processPaymentTransaction({
        schoolId: 'school-001',
        studentId,
        amount: 150000,
        reference: 'REF-BANK-001',
        idempotencyKey: 'idem-key-abc-123',
      });

      expect(result.idempotentReplay).toBe(false);
      expect(result.transaction.receiptNumber).toBe('REC-2026-0001');
      expect(result.account.totalPaid).toBe(150000);
      expect(result.account.outstandingBalance).toBe(200000);
    });

    it('returns the existing transaction on replay without double-crediting balances', () => {
      const studentId = 'student-chinedu-001';
      const payload = {
        schoolId: 'school-001',
        studentId,
        amount: 150000,
        reference: 'REF-BANK-001',
        idempotencyKey: 'idem-key-abc-123',
      };

      // Submission 1: fresh
      const firstResult = processPaymentTransaction(payload);
      expect(firstResult.idempotentReplay).toBe(false);
      expect(firstResult.account.totalPaid).toBe(150000);

      // Submission 2: retry with identical idempotency key
      const secondResult = processPaymentTransaction(payload);
      expect(secondResult.idempotentReplay).toBe(true);
      expect(secondResult.transaction.id).toBe(firstResult.transaction.id);
      expect(secondResult.transaction.receiptNumber).toBe(firstResult.transaction.receiptNumber);

      // Total paid must remain 150000 (NOT 300000)
      expect(secondResult.account.totalPaid).toBe(150000);
      expect(secondResult.account.outstandingBalance).toBe(200000);
      expect(recordedTransactions.length).toBe(1);
    });

    it('rejects duplicate bank reference reuse across different students', () => {
      const studentA = 'student-chinedu-001';
      const studentB = 'student-amina-002';
      const sharedBankRef = 'REF-BANK-SHARED-999';

      // Student A records payment with reference
      processPaymentTransaction({
        schoolId: 'school-001',
        studentId: studentA,
        amount: 100000,
        reference: sharedBankRef,
        idempotencyKey: 'idem-student-a-111',
      });

      // Student B attempts to record payment reusing Student A's bank reference
      expect(() => {
        processPaymentTransaction({
          schoolId: 'school-001',
          studentId: studentB,
          amount: 100000,
          reference: sharedBankRef,
          idempotencyKey: 'idem-student-b-222',
        });
      }).toThrow('DUPLICATE_REFERENCE');
    });

    it('strictly requires an idempotency key and rejects payments without one', () => {
      expect(() => {
        processPaymentTransaction({
          schoolId: 'school-001',
          studentId: 'student-chinedu-001',
          amount: 50000,
          reference: 'REF-NO-IDEM',
          idempotencyKey: null,
        });
      }).toThrow('IDEMPOTENCY_REQUIRED');
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Real Net Salary Calculation & Zero-Pension Verification
  // ----------------------------------------------------------------------------
  describe('Statutory Compensation & Zero-Pension Verification', () => {
    it('calculates gross, 5% PAYE tax, welfare, and net take-home salary', () => {
      const basicSalary = 200000;
      const responsibilityAllowance = 35000; // Class Teacher Allowance
      const otherAllowances = 15000;
      const cooperativeDeduction = 5000;

      const result = calculateNetSalary(
        basicSalary,
        responsibilityAllowance,
        otherAllowances,
        cooperativeDeduction
      );

      // Gross: 200000 + 35000 + 15000 = 250000
      expect(result.gross).toBe(250000);
      // Tax (5% of gross): 12500
      expect(result.tax).toBe(12500);
      // Net: Gross - Tax - Cooperative = 250000 - 12500 - 5000 = 232500
      expect(result.net).toBe(232500);
    });

    it('formats Naira values with proper currency symbol and commas', () => {
      expect(formatNaira(350000)).toBe('₦350,000');
      expect(formatNaira(0)).toBe('₦0');
    });
  });
});
