import {
  PayrollRecord,
  ExpenditureRecord,
  PettyCashTransaction,
  ClassFinancial,
  StudentFeeLedgerItem,
  PaymentTransaction,
  BankAccount,
} from '@/types/finance';

// Helper: Convert number to Nigerian Naira words for official receipts and vouchers
export function numberToNairaWords(num: number): string {
  if (num === 0) return 'Zero Naira Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let group = '';
    if (n >= 100) {
      group += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      group += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + units[n % 10] : '') + ' ';
    } else if (n > 0) {
      group += units[n] + ' ';
    }
    return group;
  }

  let words = '';
  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = Math.floor(num % 1000);

  if (millions > 0) {
    words += convertGroup(millions) + 'Million ';
  }
  if (thousands > 0) {
    words += convertGroup(thousands) + 'Thousand ';
  }
  if (remainder > 0) {
    words += convertGroup(remainder);
  }

  return `${words.trim()} Naira Only`;
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

export function calculateNetSalary(
  basic: number,
  responsibility: number,
  otherAllowances: number,
  cooperative: number = 0
) {
  const gross = basic + responsibility + otherAllowances;
  const tax = Math.round(gross * 0.05); // PAYE statutory 5%
  const pension = 0; // Strictly zero per AGENTS.md invariant - no pension deductions
  const net = gross - tax - cooperative;
  return {
    gross,
    tax,
    pension,
    net,
  };
}

// -------------------------------------------------------------
// 1. ALL 24 ROSTERED STAFF MEMBERS & PAYROLL COMPONENT
// -------------------------------------------------------------
export const INITIAL_PAYROLL_RECORDS: PayrollRecord[] = [];

// -------------------------------------------------------------
// 2. SCHOOL OPERATING EXPENDITURES (OPEX)
// -------------------------------------------------------------
export const INITIAL_EXPENDITURES: ExpenditureRecord[] = [];

// -------------------------------------------------------------
// 3. PETTY CASH DESK
// -------------------------------------------------------------
export const INITIAL_PETTY_CASH: PettyCashTransaction[] = [];

// -------------------------------------------------------------
// 4. STRICTLY 6 CLASSES FINANCIAL BREAKDOWN
// -------------------------------------------------------------
export const INITIAL_CLASS_FINANCIALS: ClassFinancial[] = [
  {
    class: 'JSS 1',
    feePerStudent: 185000,
    tuitionFee: 120000,
    ictLevy: 20000,
    scienceLevy: 15000,
    devLevy: 20000,
    booksAndExam: 10000,
    students: 0,
    expected: 0,
    collected: 0,
    outstanding: 0,
    pct: 0,
  },
  {
    class: 'JSS 2',
    feePerStudent: 185000,
    tuitionFee: 120000,
    ictLevy: 20000,
    scienceLevy: 15000,
    devLevy: 20000,
    booksAndExam: 10000,
    students: 0,
    expected: 0,
    collected: 0,
    outstanding: 0,
    pct: 0,
  },
  {
    class: 'JSS 3',
    feePerStudent: 195000,
    tuitionFee: 120000,
    ictLevy: 20000,
    scienceLevy: 20000,
    devLevy: 20000,
    booksAndExam: 15000,
    students: 0,
    expected: 0,
    collected: 0,
    outstanding: 0,
    pct: 0,
  },
  {
    class: 'SS 1',
    feePerStudent: 220000,
    tuitionFee: 140000,
    ictLevy: 25000,
    scienceLevy: 25000,
    devLevy: 20000,
    booksAndExam: 10000,
    students: 0,
    expected: 0,
    collected: 0,
    outstanding: 0,
    pct: 0,
  },
  {
    class: 'SS 2',
    feePerStudent: 220000,
    tuitionFee: 140000,
    ictLevy: 25000,
    scienceLevy: 25000,
    devLevy: 20000,
    booksAndExam: 10000,
    students: 0,
    expected: 0,
    collected: 0,
    outstanding: 0,
    pct: 0,
  },
  {
    class: 'SS 3',
    feePerStudent: 240000,
    tuitionFee: 150000,
    ictLevy: 25000,
    scienceLevy: 30000,
    devLevy: 20000,
    booksAndExam: 15000,
    students: 0,
    expected: 0,
    collected: 0,
    outstanding: 0,
    pct: 0,
  },
];

// -------------------------------------------------------------
// 5. STUDENT FEE LEDGER
// -------------------------------------------------------------
export const INITIAL_STUDENT_FEE_LEDGER: StudentFeeLedgerItem[] = [];

// -------------------------------------------------------------
// 6. VERIFIED PAYMENT TRANSACTIONS & OFFICIAL RECEIPTS
// -------------------------------------------------------------
export const INITIAL_PAYMENTS: PaymentTransaction[] = [];

// -------------------------------------------------------------
// 7. INSTITUTIONAL BANK ACCOUNTS (DEPRECATED)
// -------------------------------------------------------------
export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [];

