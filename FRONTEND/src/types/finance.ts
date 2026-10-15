export interface PayrollRecord {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  department: 'Academic' | 'Administration' | 'Accounts' | 'Operations & Support' | 'Medical';
  basicSalary: number;
  responsibilityAllowance: number; // e.g. ₦35,000 for Class Teachers
  otherAllowances: number; // Transport, housing, hazard
  taxDeduction: number; // PAYE (LIRS ~10%)
  pensionDeduction: number; // PENCOM (8%)
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
  category:
    | 'Diesel & Power'
    | 'Science & Laboratories'
    | 'ICT & Fiber Internet'
    | 'Facility Maintenance & HVAC'
    | 'Stationery & Exam Booklets'
    | 'Clinic & Health Supplies'
    | 'Security & Sanitation';
  description: string;
  amount: number;
  beneficiary: string;
  invoiceNo?: string;
  approvedBy: string;
  paymentAccount: string;
  date: string;
  status: 'Approved & Paid' | 'Pending Approval' | 'Under Review';
}

export interface PettyCashTransaction {
  id: string;
  receiptNo: string;
  date: string;
  item: string;
  category: 'Office Stationery' | 'Emergency Repair' | 'Courier Dispatch' | 'Hospitality & PTA' | 'Consumables';
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
  status: 'Fully Paid' | 'Partial Payment' | 'Defaulter';
  parentName: string;
  parentPhone: string;
  lastPaymentDate?: string;
  lastReceiptNo?: string;
}

export interface PaymentTransaction {
  id: string;
  receiptNo: string;
  admissionNo: string;
  studentName: string;
  class: string;
  amount: number;
  method: 'Bank Transfer' | 'Bank Teller' | 'POS' | 'Cash';
  bankRef: string;
  receivingAccount: string;
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
