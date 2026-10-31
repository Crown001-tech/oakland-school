/**
 * Staff pay, resolved from the master salary scales in `schools.settings`.
 * Shared by the payroll view and payroll approval so both always compute the same amounts.
 * Salaries are never set per person (AGENTS.md 1.3), and there is no pension (AGENTS.md 2.8).
 */

export interface SalaryScales {
  salaryPrincipal: number;
  salaryBursar: number;
  salaryClassTeacher: number;
  salarySubjectTeacher: number;
  salarySupportStaff: number;
  allowanceClassTeacher: number;
}

export type PayrollDepartment = 'Academic' | 'Administration' | 'Accounts' | 'Support';

export interface PayrollStaff {
  role?: string | null;
  assigned_class?: string | null;
}

export interface StaffDeduction {
  taxDeduction?: number | string | null;
  cooperativeDeduction?: number | string | null;
}

export interface StaffPay {
  roleName: string;
  department: PayrollDepartment;
  basicSalary: number;
  responsibilityAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  taxDeduction: number;
  cooperativeDeduction: number;
  netSalary: number;
}

export function resolveSalaryScales(settings: Record<string, unknown> | null | undefined): SalaryScales {
  const s = settings || {};
  return {
    salaryPrincipal: Number(s.salaryPrincipal || 0),
    salaryBursar: Number(s.salaryBursar || 0),
    salaryClassTeacher: Number(s.salaryClassTeacher || 0),
    salarySubjectTeacher: Number(s.salarySubjectTeacher || 0),
    salarySupportStaff: Number(s.salarySupportStaff || 0),
    allowanceClassTeacher: Number(s.allowanceClassTeacher || 0),
  };
}

const roleOf = (staff: PayrollStaff) => (staff.role || '').toLowerCase();

/** The proprietor owns the school and has no salary scale, so is never on the payroll. */
export function isOnPayroll(staff: PayrollStaff): boolean {
  return roleOf(staff) !== 'proprietor';
}

export function computeStaffPay(
  staff: PayrollStaff,
  scales: SalaryScales,
  deduction?: StaffDeduction | null
): StaffPay {
  const role = roleOf(staff);
  const homeroom = staff.assigned_class ? String(staff.assigned_class) : '';

  let roleName: string;
  let department: PayrollDepartment;
  let basicSalary: number;
  let responsibilityAllowance = 0;

  if (role === 'admin' || role.includes('principal')) {
    roleName = 'Principal';
    department = 'Administration';
    basicSalary = scales.salaryPrincipal;
  } else if (role.includes('bursar')) {
    roleName = 'Bursar';
    department = 'Accounts';
    basicSalary = scales.salaryBursar;
  } else if (role === 'security' || role.includes('support')) {
    roleName = 'Support Staff';
    department = 'Support';
    basicSalary = scales.salarySupportStaff;
  } else if (homeroom) {
    roleName = `Class Teacher (${homeroom})`;
    department = 'Academic';
    basicSalary = scales.salaryClassTeacher;
    responsibilityAllowance = scales.allowanceClassTeacher;
  } else {
    roleName = 'Subject Teacher';
    department = 'Academic';
    basicSalary = scales.salarySubjectTeacher;
  }

  const otherAllowances = 0;
  const grossSalary = basicSalary + responsibilityAllowance + otherAllowances;
  const taxDeduction = Number(deduction?.taxDeduction || 0);
  const cooperativeDeduction = Number(deduction?.cooperativeDeduction || 0);
  const netSalary = Math.max(0, grossSalary - taxDeduction - cooperativeDeduction);

  return {
    roleName,
    department,
    basicSalary,
    responsibilityAllowance,
    otherAllowances,
    grossSalary,
    taxDeduction,
    cooperativeDeduction,
    netSalary,
  };
}
