import type { PayrollDepartment } from '@/lib/payroll';

// One list per ledger, shared by every form, filter and dashboard total so they never drift apart
export const EXPENDITURE_CATEGORIES = ['Power', 'Laboratories', 'Technology', 'Stationery', 'Maintenance', 'Health', 'Security'] as const;
export type ExpenditureCategory = (typeof EXPENDITURE_CATEGORIES)[number];

export const PETTY_CASH_CATEGORIES = ['Stationery', 'Repairs', 'Dispatch', 'Hospitality', 'Consumables'] as const;
export type PettyCashCategory = (typeof PETTY_CASH_CATEGORIES)[number];

export const isExpenditureCategory = (value: unknown): value is ExpenditureCategory =>
  (EXPENDITURE_CATEGORIES as readonly unknown[]).includes(value);

export const isPettyCashCategory = (value: unknown): value is PettyCashCategory =>
  (PETTY_CASH_CATEGORIES as readonly unknown[]).includes(value);

export interface PayrollRecord {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  department: PayrollDepartment;
  basicSalary: number;
  responsibilityAllowance: number; // e.g. ₦35,000 for Class Teachers
  otherAllowances: number; // Transport, housing, hazard
  taxDeduction: number; // PAYE statutory
  cooperativeDeduction: number; // Voluntary cooperative / loan
  netSalary: number;
  bankAccount: string;
  bankName: string;
  status: 'Approved & Disbursed' | 'Pending Approval' | 'Processing';
  payPeriod: string; // e.g. "September 2026"
}

export interface ExpenditureRecord {
  id: string;
  voucherNo: string;
  category: ExpenditureCategory;
  description: string;
  amount: number;
  beneficiary: string;
  invoiceNo?: string;
  approvedBy: string;
  paymentAccount: string;
  date: string;
  status: 'Approved & Paid' | 'Pending Approval';
}

export interface PettyCashTransaction {
  id: string;
  receiptNo: string;
  date: string;
  item: string;
  category: PettyCashCategory;
  amount: number;
  type: 'Inflow' | 'Outflow';
  balanceAfter: number;
  requestedBy: string;
  approvedBy: string;
}

export interface ClassFinancial {
  class: string;
  feePerStudent: number;
  tuitionFee: number;
  ictLevy: number;
  scienceLevy: number;
  devLevy: number;
  booksAndExam: number;
  students: number;
  expected: number;
  collected: number;
  outstanding: number;
  pct: number;
}

export interface StudentFeeLedgerItem {
  id: string;
  admissionNo: string;
  studentName: string;
  class: string;
  gender: 'Male' | 'Female';
  totalBilled: number;
  amountPaid: number;
  balance: number;
  creditBalance?: number;
  status: 'Fully Paid' | 'Partial Payment' | 'Defaulter';
  parentName: string;
  parentPhone: string;
  lastPaymentDate?: string;
  lastReceiptNo?: string;
}

export interface PaymentTransaction {
  id: string;
  studentId?: string;
  receiptNo: string;
  admissionNo: string;
  studentName: string;
  class: string;
  amount: number;
  method: 'Bank Transfer' | 'Bank Teller' | 'POS' | 'Cash';
  bankRef: string;
  receivingAccount: string;
  recordedBy?: string;
  timestamp: string;
  status: 'Confirmed' | 'Reconciled';
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: 'Tuition Inflow' | 'Operations & Payroll' | 'Capital Reserve & Building';
  balance: number;
  colorScheme: string;
}
