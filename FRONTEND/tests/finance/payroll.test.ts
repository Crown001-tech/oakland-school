import { describe, it, expect } from 'vitest';

export interface SchoolSalarySettings {
  salaryPrincipal: number;
  salaryBursar: number;
  salaryClassTeacher: number;
  salarySubjectTeacher: number;
  salarySupportStaff: number;
  allowanceClassTeacher: number;
}

export interface StaffSalaryInput {
  id: string;
  role: 'Principal' | 'Bursar' | 'Class Teacher' | 'Subject Teacher' | 'Support Staff';
  assignedClass?: string | null;
  taxDeduction?: number;
  cooperativeDeduction?: number;
  otherAllowances?: number;
}

export function computeStaffPayroll(
  staff: StaffSalaryInput,
  settings: SchoolSalarySettings
) {
  let baseSalary = 0;
  let classTeacherAllowance = 0;

  switch (staff.role) {
    case 'Principal':
      baseSalary = Number(settings.salaryPrincipal || 0);
      break;
    case 'Bursar':
      baseSalary = Number(settings.salaryBursar || 0);
      break;
    case 'Class Teacher':
      baseSalary = Number(settings.salaryClassTeacher || 0);
      classTeacherAllowance = Number(settings.allowanceClassTeacher || 0);
      break;
    case 'Subject Teacher':
      baseSalary = Number(settings.salarySubjectTeacher || 0);
      if (staff.assignedClass) {
        classTeacherAllowance = Number(settings.allowanceClassTeacher || 0);
      }
      break;
    case 'Support Staff':
      baseSalary = Number(settings.salarySupportStaff || 0);
      break;
  }

  const otherAllowances = staff.otherAllowances || 0;
  const grossSalary = baseSalary + classTeacherAllowance + otherAllowances;
  const tax = staff.taxDeduction || 0;
  const cooperative = staff.cooperativeDeduction || 0;
  const totalDeductions = tax + cooperative;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  return {
    baseSalary,
    classTeacherAllowance,
    otherAllowances,
    grossSalary,
    tax,
    cooperative,
    totalDeductions,
    netSalary,
    // Model Phase Invariant: Absolute zero pension
    pension: 0,
  };
}

describe('Payroll Calculation Engine (DEF-111 & AGENTS.md Rule 2.8)', () => {
  const masterSettings: SchoolSalarySettings = {
    salaryPrincipal: 450000,
    salaryBursar: 350000,
    salaryClassTeacher: 180000,
    salarySubjectTeacher: 150000,
    salarySupportStaff: 90000,
    allowanceClassTeacher: 25000,
  };

  it('resolves correct base salary for Principal and Bursar without class teacher allowance', () => {
    const principalPay = computeStaffPayroll({ id: 'stf-1', role: 'Principal' }, masterSettings);
    expect(principalPay.baseSalary).toBe(450000);
    expect(principalPay.classTeacherAllowance).toBe(0);
    expect(principalPay.grossSalary).toBe(450000);

    const bursarPay = computeStaffPayroll({ id: 'stf-2', role: 'Bursar' }, masterSettings);
    expect(bursarPay.baseSalary).toBe(350000);
    expect(bursarPay.classTeacherAllowance).toBe(0);
    expect(bursarPay.grossSalary).toBe(350000);
  });

  it('awards class teacher allowance strictly to Class Teachers', () => {
    const classTeacherPay = computeStaffPayroll(
      { id: 'stf-3', role: 'Class Teacher', assignedClass: 'JSS 1' },
      masterSettings
    );
    expect(classTeacherPay.baseSalary).toBe(180000);
    expect(classTeacherPay.classTeacherAllowance).toBe(25000);
    expect(classTeacherPay.grossSalary).toBe(205000);

    const subjectTeacherPay = computeStaffPayroll(
      { id: 'stf-4', role: 'Subject Teacher', assignedClass: null },
      masterSettings
    );
    expect(subjectTeacherPay.baseSalary).toBe(150000);
    expect(subjectTeacherPay.classTeacherAllowance).toBe(0);
    expect(subjectTeacherPay.grossSalary).toBe(150000);
  });

  it('correctly calculates net salary after tax and cooperative deductions', () => {
    const pay = computeStaffPayroll(
      {
        id: 'stf-3',
        role: 'Class Teacher',
        assignedClass: 'SS 2',
        taxDeduction: 15000,
        cooperativeDeduction: 10000,
      },
      masterSettings
    );

    // Gross: 180,000 + 25,000 = 205,000
    expect(pay.grossSalary).toBe(205000);
    expect(pay.totalDeductions).toBe(25000);
    // Net: 205,000 - 25,000 = 180,000
    expect(pay.netSalary).toBe(180000);
  });

  it('enforces AGENTS.md Rule 2.8: Pension metric is strictly zero across all roles', () => {
    const roles: Array<StaffSalaryInput['role']> = [
      'Principal',
      'Bursar',
      'Class Teacher',
      'Subject Teacher',
      'Support Staff',
    ];

    for (const role of roles) {
      const pay = computeStaffPayroll({ id: 'stf-x', role }, masterSettings);
      expect(pay.pension).toBe(0);
      expect((pay as any).pensionDeduction).toBeUndefined();
    }
  });

  it('dynamically adapts when master school settings are updated', () => {
    const updatedSettings: SchoolSalarySettings = {
      ...masterSettings,
      salaryClassTeacher: 220000,
      allowanceClassTeacher: 35000,
    };

    const pay = computeStaffPayroll(
      { id: 'stf-5', role: 'Class Teacher', assignedClass: 'JSS 3' },
      updatedSettings
    );
    expect(pay.baseSalary).toBe(220000);
    expect(pay.classTeacherAllowance).toBe(35000);
    expect(pay.grossSalary).toBe(255000);
  });
});

