/**
 * Money helpers. Amounts in the database and screens are naira with two decimals; payment providers take the
 * smallest unit (kobo, 100 to the naira) as a whole number. Conversion goes through whole numbers so a float
 * such as 0.1 + 0.2 can never put a kobo too many or too few on a payment.
 */

/** Naira (a number or a numeric string) to whole kobo. Throws for anything that is not a finite amount above 0. */
export function toKobo(naira: number | string): number {
  const n = typeof naira === 'string' ? Number(naira.trim()) : naira;
  if (!Number.isFinite(n) || n <= 0) throw new Error('The amount must be more than zero.');
  const kobo = Math.round((n + Number.EPSILON) * 100);
  if (kobo <= 0) throw new Error('The amount must be at least one kobo.');
  return kobo;
}

/** Whole kobo to naira with two decimals. */
export function fromKobo(kobo: number): number {
  if (!Number.isInteger(kobo)) throw new Error('Kobo must be a whole number.');
  return kobo / 100;
}

/** Rounds naira to two decimals. */
export const roundNaira = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
