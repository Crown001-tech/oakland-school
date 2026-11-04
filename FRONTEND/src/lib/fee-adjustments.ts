import { roundNaira } from '@/lib/money';

/**
 * Scholarships, discounts, sibling discounts and waivers, and instalment plans. Pure, so the same rules run in
 * the API and in tests. The database applies the same adjustment rule (resolve_student_net_billed), and a test
 * keeps the two in agreement.
 */

export const ADJUSTMENT_KINDS = ['scholarship', 'discount', 'sibling', 'waiver'] as const;
export type AdjustmentKind = (typeof ADJUSTMENT_KINDS)[number];

export interface Adjustment {
  kind: AdjustmentKind;
  /** A fixed amount in naira, or */
  amount?: number | null;
  /** a percentage of the class tuition (never compounded). Exactly one of the two is set. */
  percent?: number | null;
  is_active?: boolean;
}

/** What the active adjustments take off the class tuition. Never more than the tuition. */
export function adjustmentTotal(gross: number, adjustments: Adjustment[]): number {
  let off = 0;
  for (const a of adjustments) {
    if (a.is_active === false) continue;
    off += a.percent != null ? roundNaira((gross * Number(a.percent)) / 100) : Number(a.amount || 0);
  }
  return Math.min(gross, roundNaira(off));
}

/** What the student is billed: the class tuition less the adjustments, never below zero. */
export function netBilled(gross: number, adjustments: Adjustment[]): number {
  return Math.max(0, roundNaira(gross - adjustmentTotal(gross, adjustments)));
}

export interface AdjustmentInput {
  kind?: unknown;
  amount?: unknown;
  percent?: unknown;
  reason?: unknown;
}

/** Checks a new adjustment from a person. Returns the clean record, or why it was refused. */
export function cleanAdjustment(input: AdjustmentInput, gross: number): { adjustment?: { kind: AdjustmentKind; amount: number | null; percent: number | null; reason: string }; error?: string } {
  if (!ADJUSTMENT_KINDS.includes(input.kind as AdjustmentKind)) return { error: 'Choose scholarship, discount, sibling discount or waiver.' };
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (!reason) return { error: 'Give the reason. It is kept on the student’s record.' };
  if (reason.length > 300) return { error: 'The reason is too long (300 letters at most).' };

  const hasAmount = input.amount !== undefined && input.amount !== null && input.amount !== '';
  const hasPercent = input.percent !== undefined && input.percent !== null && input.percent !== '';
  if (hasAmount === hasPercent) return { error: 'Give either an amount or a percentage, not both.' };

  if (hasPercent) {
    const p = Number(input.percent);
    if (!Number.isFinite(p) || p <= 0 || p > 100) return { error: 'The percentage must be above 0 and at most 100.' };
    return { adjustment: { kind: input.kind as AdjustmentKind, amount: null, percent: roundNaira(p), reason } };
  }
  const a = Number(input.amount);
  if (!Number.isFinite(a) || a <= 0) return { error: 'The amount must be above zero.' };
  if (gross > 0 && a > gross) return { error: 'The amount is more than the class tuition.' };
  return { adjustment: { kind: input.kind as AdjustmentKind, amount: roundNaira(a), percent: null, reason } };
}

/**
 * Which children of a family get the sibling discount: the first child pays in full, every later one gets it.
 * Children are ordered by when they were admitted (oldest first); a child who already has a sibling discount
 * is not given a second one.
 */
export function childrenForSiblingDiscount(children: { id: string; admittedAt: string; hasSiblingDiscount: boolean }[]): string[] {
  const ordered = [...children].sort((a, b) => a.admittedAt.localeCompare(b.admittedAt) || a.id.localeCompare(b.id));
  return ordered.slice(1).filter((c) => !c.hasSiblingDiscount).map((c) => c.id);
}

// ---------------------------------------------------------------------------------------------
// Instalment plans
// ---------------------------------------------------------------------------------------------

export interface Instalment {
  sequence: number;
  due_date: string; // YYYY-MM-DD
  amount: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A plan must be dated, in order, positive, and add up to exactly what the student is billed. */
export function cleanInstalments(input: unknown, billed: number): { plan?: Instalment[]; error?: string } {
  if (!Array.isArray(input) || input.length < 2) return { error: 'An instalment plan needs at least two instalments.' };
  if (input.length > 12) return { error: 'An instalment plan can have at most 12 instalments.' };
  const plan: Instalment[] = [];
  let last = '';
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const row = (input[i] || {}) as { due_date?: unknown; amount?: unknown };
    const due = typeof row.due_date === 'string' ? row.due_date : '';
    if (!DATE.test(due) || Number.isNaN(Date.parse(due))) return { error: `Instalment ${i + 1} needs a date.` };
    if (last && due <= last) return { error: `Instalment ${i + 1} must be due after instalment ${i}.` };
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { error: `Instalment ${i + 1} needs an amount above zero.` };
    last = due;
    sum += amount;
    plan.push({ sequence: i + 1, due_date: due, amount: roundNaira(amount) });
  }
  if (roundNaira(sum) !== roundNaira(billed)) {
    return { error: `The instalments add up to ${roundNaira(sum)} but the student is billed ${roundNaira(billed)}.` };
  }
  return { plan };
}

export interface InstalmentStatus extends Instalment {
  /** How much of this instalment has been covered, counting payments against instalments in order. */
  paid: number;
  state: 'paid' | 'partial' | 'upcoming' | 'overdue';
}

/** Payments are counted against the instalments in order, earliest first. */
export function instalmentStatus(plan: Instalment[], totalPaid: number, today: string): InstalmentStatus[] {
  let remaining = Math.max(0, totalPaid);
  return [...plan]
    .sort((a, b) => a.sequence - b.sequence)
    .map((i) => {
      const paid = roundNaira(Math.min(i.amount, remaining));
      remaining = roundNaira(remaining - paid);
      const state: InstalmentStatus['state'] = paid >= i.amount ? 'paid' : i.due_date < today ? 'overdue' : paid > 0 ? 'partial' : 'upcoming';
      return { ...i, paid, state };
    });
}

/** The next amount a parent should pay: what is overdue, else the next instalment's remainder. */
export function suggestedPayment(plan: Instalment[], totalPaid: number, today: string): number | null {
  const status = instalmentStatus(plan, totalPaid, today);
  const overdue = status.filter((s) => s.state === 'overdue').reduce((sum, s) => sum + (s.amount - s.paid), 0);
  if (overdue > 0) return roundNaira(overdue);
  const next = status.find((s) => s.state !== 'paid');
  return next ? roundNaira(next.amount - next.paid) : null;
}
