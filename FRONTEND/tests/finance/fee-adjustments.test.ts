import { describe, expect, it } from 'vitest';
import { fromKobo, roundNaira, toKobo } from '@/lib/money';
import {
  adjustmentTotal,
  childrenForSiblingDiscount,
  cleanAdjustment,
  cleanInstalments,
  instalmentStatus,
  netBilled,
  suggestedPayment,
} from '@/lib/fee-adjustments';

describe('Naira and kobo', () => {
  it('converts through whole numbers, so floats never add a kobo', () => {
    expect(toKobo(100)).toBe(10000);
    expect(toKobo('350000.50')).toBe(35000050);
    expect(toKobo(0.1 + 0.2)).toBe(30);
    expect(toKobo(19.99)).toBe(1999);
    expect(toKobo(1.005)).toBe(101);
  });

  it('refuses anything that is not an amount above zero', () => {
    for (const bad of [0, -5, NaN, Infinity, '', 'abc', 0.001]) expect(() => toKobo(bad as number)).toThrow();
  });

  it('converts kobo back, and refuses a fraction of a kobo', () => {
    expect(fromKobo(1999)).toBe(19.99);
    expect(() => fromKobo(10.5)).toThrow();
    expect(roundNaira(0.1 + 0.2)).toBe(0.3);
  });
});

describe('Net billing', () => {
  it('takes fixed amounts and percentages of the class tuition off, and never goes below zero', () => {
    expect(netBilled(100000, [])).toBe(100000);
    expect(netBilled(100000, [{ kind: 'scholarship', amount: 25000 }])).toBe(75000);
    expect(netBilled(100000, [{ kind: 'sibling', percent: 10 }])).toBe(90000);
    expect(netBilled(100000, [{ kind: 'scholarship', percent: 50 }, { kind: 'discount', amount: 5000 }])).toBe(45000);
    expect(netBilled(100000, [{ kind: 'waiver', percent: 100 }])).toBe(0);
    expect(netBilled(100000, [{ kind: 'scholarship', percent: 80 }, { kind: 'discount', percent: 80 }])).toBe(0);
  });

  it('takes every percentage of the class tuition, never compounding', () => {
    expect(adjustmentTotal(200000, [{ kind: 'discount', percent: 10 }, { kind: 'sibling', percent: 10 }])).toBe(40000);
  });

  it('ignores an adjustment that has been switched off', () => {
    expect(netBilled(100000, [{ kind: 'scholarship', amount: 25000, is_active: false }])).toBe(100000);
  });

  it('rounds a percentage to the kobo', () => {
    expect(adjustmentTotal(33333, [{ kind: 'discount', percent: 7.5 }])).toBe(2499.98);
  });
});

describe('A new adjustment', () => {
  it('accepts an amount or a percentage with a reason', () => {
    expect(cleanAdjustment({ kind: 'scholarship', amount: '20000', reason: ' Academic award ' }, 100000).adjustment).toEqual({ kind: 'scholarship', amount: 20000, percent: null, reason: 'Academic award' });
    expect(cleanAdjustment({ kind: 'sibling', percent: 10, reason: 'Second child' }, 100000).adjustment).toMatchObject({ percent: 10, amount: null });
  });

  it.each([
    ['no reason', { kind: 'discount', amount: 100, reason: ' ' }],
    ['an unknown kind', { kind: 'gift', amount: 100, reason: 'x' }],
    ['both an amount and a percentage', { kind: 'discount', amount: 100, percent: 5, reason: 'x' }],
    ['neither', { kind: 'discount', reason: 'x' }],
    ['a percentage above 100', { kind: 'discount', percent: 101, reason: 'x' }],
    ['a zero percentage', { kind: 'discount', percent: 0, reason: 'x' }],
    ['a negative amount', { kind: 'discount', amount: -5, reason: 'x' }],
    ['an amount above the tuition', { kind: 'discount', amount: 100001, reason: 'x' }],
    ['a reason that is far too long', { kind: 'discount', amount: 10, reason: 'x'.repeat(301) }],
  ])('refuses %s', (_label, input) => {
    expect(cleanAdjustment(input, 100000).error).toBeTruthy();
  });
});

describe('Sibling discount', () => {
  it('gives it to every child after the first admitted, and not twice', () => {
    const children = [
      { id: 'c', admittedAt: '2026-09-03', hasSiblingDiscount: false },
      { id: 'a', admittedAt: '2024-09-01', hasSiblingDiscount: false },
      { id: 'b', admittedAt: '2025-09-01', hasSiblingDiscount: true },
    ];
    expect(childrenForSiblingDiscount(children)).toEqual(['c']);
    expect(childrenForSiblingDiscount([children[1]])).toEqual([]);
    expect(childrenForSiblingDiscount([])).toEqual([]);
  });
});

describe('Instalment plans', () => {
  const plan = [
    { due_date: '2026-09-15', amount: 60000 },
    { due_date: '2026-11-15', amount: 40000 },
  ];

  it('accepts a dated plan that adds up to the bill', () => {
    const r = cleanInstalments(plan, 100000);
    expect(r.error).toBeUndefined();
    expect(r.plan?.map((p) => p.sequence)).toEqual([1, 2]);
  });

  it.each([
    ['one instalment', [plan[0]], 60000],
    ['a total that does not match', plan, 90000],
    ['dates out of order', [plan[1], plan[0]], 100000],
    ['a missing date', [{ amount: 50000 }, { due_date: '2026-11-15', amount: 50000 }], 100000],
    ['a zero amount', [{ due_date: '2026-09-15', amount: 0 }, { due_date: '2026-11-15', amount: 100000 }], 100000],
    ['more than twelve', Array.from({ length: 13 }, (_, i) => ({ due_date: `2026-${String((i % 9) + 1).padStart(2, '0')}-01`, amount: 10 })), 130],
  ])('refuses %s', (_label, input, billed) => {
    expect(cleanInstalments(input, billed as number).error).toBeTruthy();
  });

  it('counts payments against instalments in order and says which are overdue', () => {
    const p = cleanInstalments(plan, 100000).plan!;
    expect(instalmentStatus(p, 0, '2026-09-01').map((s) => s.state)).toEqual(['upcoming', 'upcoming']);
    expect(instalmentStatus(p, 0, '2026-09-20').map((s) => s.state)).toEqual(['overdue', 'upcoming']);
    expect(instalmentStatus(p, 70000, '2026-11-20').map((s) => [s.state, s.paid])).toEqual([['paid', 60000], ['overdue', 10000]]);
    expect(instalmentStatus(p, 30000, '2026-09-01').map((s) => s.state)).toEqual(['partial', 'upcoming']);
    expect(instalmentStatus(p, 100000, '2027-01-01').every((s) => s.state === 'paid')).toBe(true);
  });

  it('suggests what is overdue, else the next instalment, else nothing', () => {
    const p = cleanInstalments(plan, 100000).plan!;
    expect(suggestedPayment(p, 0, '2026-09-20')).toBe(60000);
    expect(suggestedPayment(p, 0, '2026-09-01')).toBe(60000);
    expect(suggestedPayment(p, 60000, '2026-10-01')).toBe(40000);
    expect(suggestedPayment(p, 100000, '2026-10-01')).toBeNull();
  });
});
