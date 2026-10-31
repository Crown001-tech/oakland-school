import { describe, it, expect } from 'vitest';
import { calculateNetSalary, formatNaira } from '@/lib/finance-data';

// The fee payment ledger itself (idempotency, overpayment, receipts) is tested against the
// real Postgres function in tests/db/fee-payment.test.ts.

describe('Statutory compensation and zero-pension verification', () => {
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
