import { describe, it, expect } from 'vitest';
import { computeStaffPay, isOnPayroll, resolveSalaryScales } from '@/lib/payroll';

// Distinct amounts so a staff member paid on the wrong scale is caught
const scales = resolveSalaryScales({
  salaryPrincipal: 450000,
  salaryBursar: 350000,
  salaryClassTeacher: 180000,
  salarySubjectTeacher: 150000,
  salarySupportStaff: 90000,
  allowanceClassTeacher: 25000,
});

describe('Payroll from master salary scales (DEF-111, AGENTS.md 1.3 and 2.8)', () => {
  it('pays the principal and bursar their own scales with no class teacher allowance', () => {
    const principal = computeStaffPay({ role: 'admin' }, scales);
    expect(principal).toMatchObject({ roleName: 'Principal', basicSalary: 450000, responsibilityAllowance: 0, grossSalary: 450000 });

    const bursar = computeStaffPay({ role: 'bursar' }, scales);
    expect(bursar).toMatchObject({ roleName: 'Bursar', basicSalary: 350000, responsibilityAllowance: 0, grossSalary: 350000 });
  });

  it('gives the class teacher allowance only to teachers with a homeroom', () => {
    const classTeacher = computeStaffPay({ role: 'teacher', assigned_class: 'JSS 2' }, scales);
    expect(classTeacher).toMatchObject({
      roleName: 'Class Teacher (JSS 2)',
      basicSalary: 180000,
      responsibilityAllowance: 25000,
      grossSalary: 205000,
    });

    const subjectTeacher = computeStaffPay({ role: 'teacher', assigned_class: null }, scales);
    expect(subjectTeacher).toMatchObject({ roleName: 'Subject Teacher', basicSalary: 150000, responsibilityAllowance: 0 });
  });

  it('pays security staff the support staff scale, not the subject teacher scale', () => {
    const guard = computeStaffPay({ role: 'security' }, scales);
    expect(guard).toMatchObject({ roleName: 'Support Staff', department: 'Support', basicSalary: 90000, grossSalary: 90000 });
  });

  it('keeps the proprietor off the payroll', () => {
    expect(isOnPayroll({ role: 'proprietor' })).toBe(false);
    expect(isOnPayroll({ role: 'teacher' })).toBe(true);
    expect(isOnPayroll({ role: 'security' })).toBe(true);
  });

  it('subtracts tax and cooperative deductions and never goes below zero', () => {
    const pay = computeStaffPay({ role: 'teacher', assigned_class: 'SS 1' }, scales, {
      taxDeduction: 15000,
      cooperativeDeduction: '10000',
    });
    expect(pay.grossSalary).toBe(205000);
    expect(pay.netSalary).toBe(180000);

    const overDeducted = computeStaffPay({ role: 'security' }, scales, { taxDeduction: 200000 });
    expect(overDeducted.netSalary).toBe(0);
  });

  it('has no pension field (AGENTS.md 2.8)', () => {
    for (const role of ['admin', 'bursar', 'teacher', 'security']) {
      expect(Object.keys(computeStaffPay({ role }, scales)).some((k) => k.toLowerCase().includes('pension'))).toBe(false);
    }
  });

  it('pays zero, never an invented amount, when a scale has not been set', () => {
    const unset = resolveSalaryScales({});
    expect(computeStaffPay({ role: 'admin' }, unset).grossSalary).toBe(0);
    expect(computeStaffPay({ role: 'teacher', assigned_class: 'JSS 1' }, unset).grossSalary).toBe(0);
  });
});
