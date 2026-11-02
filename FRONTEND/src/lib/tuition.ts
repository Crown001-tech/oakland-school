/**
 * What a class is billed for tuition. The same rule runs in the database (resolve_student_billed_tuition,
 * migration 025), so a screen never shows one amount while a payment is checked against another.
 *
 *   JSS 1 to JSS 3   settings.tuitionJSS
 *   SS 1 and SS 2    settings.tuitionSS12
 *   SS 3             settings.tuitionSS3
 *   any other class  the class's own row in fee_structures, then its level's row (a school with Primary 1,
 *                     Year 7 and so on)
 *
 * A class is a level plus an arm (JSS 1 Diamond is level JSS 1, arm Diamond). Every arm of a level is billed
 * the same, so the rate is worked out from the level when it is known, and from the class name when not.
 *
 * A rate that is missing or not a number bills 0, never an invented amount.
 */

export type TuitionGroup = 'jss' | 'ss12' | 'ss3' | null;

export function tuitionGroup(className: string | null | undefined): TuitionGroup {
  const name = (className || '').trim().toUpperCase();
  if (/^JSS\s*[123]([^0-9]|$)/.test(name)) return 'jss';
  if (/^SS\s*3([^0-9]|$)/.test(name)) return 'ss3';
  if (/^SS\s*[12]([^0-9]|$)/.test(name)) return 'ss12';
  return null;
}

const amount = (value: unknown): number => {
  const n = typeof value === 'string' ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export interface FeeStructureRow {
  class_name?: string | null;
  total_amount?: number | string | null;
}

export function resolveTuition(
  className: string | null | undefined,
  settings: Record<string, unknown> | null | undefined,
  feeStructures: FeeStructureRow[] | null | undefined = [],
  level?: string | null
): number {
  const s = settings || {};
  const billedAs = (level || '').trim() || className;
  switch (tuitionGroup(billedAs)) {
    case 'jss':
      return amount(s.tuitionJSS);
    case 'ss12':
      return amount(s.tuitionSS12);
    case 'ss3':
      return amount(s.tuitionSS3);
    default: {
      const rows = feeStructures || [];
      const own = rows.find((f) => f.class_name === className) ?? rows.find((f) => f.class_name === billedAs);
      return own ? amount(own.total_amount) : 0;
    }
  }
}
