import { describe, expect, it } from 'vitest';
import {
  MIN_ONLINE_PAYMENT,
  callbackUrl,
  checkOnlineAmount,
  judgeConfirmation,
  newReference,
  onlinePaymentsReady,
  outstandingOf,
  payerEmail,
  readPaymentSettings,
} from '@/lib/payments/online-payments';

describe('What a parent may pay', () => {
  it('accepts a part payment or the whole balance', () => {
    expect(checkOnlineAmount(30000, 100000)).toEqual({ amount: 30000 });
    expect(checkOnlineAmount('100000', 100000)).toEqual({ amount: 100000 });
    expect(checkOnlineAmount(1234.567, 100000)).toEqual({ amount: 1234.57 });
  });

  it('refuses more than is owed, so money is never taken that would have to be returned', () => {
    expect(checkOnlineAmount(100000.01, 100000).error).toContain('more than');
  });

  it('refuses a payment below the minimum, unless the whole balance is less than that', () => {
    expect(checkOnlineAmount(MIN_ONLINE_PAYMENT - 1, 100000).error).toContain('smallest');
    expect(checkOnlineAmount(MIN_ONLINE_PAYMENT, 100000).amount).toBe(MIN_ONLINE_PAYMENT);
    expect(checkOnlineAmount(40, 40)).toEqual({ amount: 40 });
    expect(checkOnlineAmount(30, 40).error).toBeTruthy();
  });

  it.each([0, -5, NaN, Infinity, '', 'abc', null, undefined, {}])('refuses %s', (bad) => {
    expect(checkOnlineAmount(bad, 100000).error).toBeTruthy();
  });

  it('refuses any payment when nothing is owed', () => {
    expect(checkOnlineAmount(500, 0).error).toContain('Nothing is owed');
  });

  it('works out what is owed from the net bill and what has been paid', () => {
    expect(outstandingOf(100000, 40000)).toBe(60000);
    expect(outstandingOf(100000, 100000)).toBe(0);
    expect(outstandingOf(100000, 120000)).toBe(0);
    expect(outstandingOf(99999.99, 0.01)).toBe(99999.98);
  });
});

describe('References', () => {
  it('are unique, unguessable, and carry the school\'s prefix', () => {
    const a = newReference('OAK');
    const b = newReference('OAK');
    expect(a).toMatch(/^OAK-[0-9A-F]{20}$/);
    expect(a).not.toBe(b);
  });
});

describe('The payer\'s email and the page they come back to', () => {
  it('uses the guardian\'s own email, lower-cased', () => {
    expect(payerEmail(' Ada@Example.test ', 'g1', 'student.x.invalid')).toBe('ada@example.test');
  });

  it('makes one on the school\'s domain when the guardian has none, and never from junk', () => {
    expect(payerEmail('—', 'a1b2-c3d4', 'student.x.invalid')).toBe('parent-a1b2c3d4@student.x.invalid');
    expect(payerEmail(null, 'g1', 'student.x.invalid')).toBe('parent-g1@student.x.invalid');
    expect(payerEmail('not an email', 'g1', 'student.x.invalid')).toBe('parent-g1@student.x.invalid');
  });

  it('sends the parent back to the school\'s own address, over https except on localhost', () => {
    expect(callbackUrl('greenfield.example.com')).toBe('https://greenfield.example.com/parent/fees/verify');
    expect(callbackUrl('localhost:3000')).toBe('http://localhost:3000/parent/fees/verify');
    expect(callbackUrl('127.0.0.1:3000')).toBe('http://127.0.0.1:3000/parent/fees/verify');
    expect(callbackUrl(null)).toBe('http://localhost:3000/parent/fees/verify');
  });
});

describe('When a school can take online payments', () => {
  it('needs its own sub-account, and can be switched off', () => {
    expect(onlinePaymentsReady(readPaymentSettings({}))).toBe(false);
    expect(onlinePaymentsReady(readPaymentSettings(null))).toBe(false);
    expect(onlinePaymentsReady(readPaymentSettings({ payments: { subaccountCode: 'ACCT_1' } }))).toBe(true);
    expect(onlinePaymentsReady(readPaymentSettings({ payments: { subaccountCode: 'ACCT_1', enabled: false } }))).toBe(false);
  });
});

describe('Deciding what a confirmed payment means', () => {
  const attempt = { amount: '40000.00', status: 'initiated' };
  const ok = { status: 'success', amountKobo: 4000000, currency: 'NGN' };

  it('records a payment that succeeded for exactly the amount asked', () => {
    expect(judgeConfirmation(attempt, ok).outcome).toBe('record');
  });

  it('does nothing twice for a payment already recorded', () => {
    expect(judgeConfirmation({ ...attempt, status: 'success' }, ok).outcome).toBe('already');
  });

  it('does not record a payment that did not succeed', () => {
    for (const status of ['failed', 'abandoned', 'pending', 'ongoing', '']) {
      expect(judgeConfirmation(attempt, { ...ok, status }).outcome, status).toBe('not_successful');
    }
  });

  it('does not record a payment for a different amount, higher or lower, and says what differed', () => {
    for (const amountKobo of [3999999, 4000001, 100, 40000000]) {
      const r = judgeConfirmation(attempt, { ...ok, amountKobo });
      expect(r.outcome, String(amountKobo)).toBe('mismatch');
      expect(r.reason).toContain('asked for');
    }
  });

  it('does not record a payment in another currency, even for the same number', () => {
    expect(judgeConfirmation(attempt, { ...ok, currency: 'USD' }).outcome).toBe('mismatch');
  });

  it('compares in whole kobo, so a fraction can never slip through', () => {
    expect(judgeConfirmation({ amount: 19.99, status: 'initiated' }, { status: 'success', amountKobo: 1999, currency: 'NGN' }).outcome).toBe('record');
    expect(judgeConfirmation({ amount: 0.1 + 0.2, status: 'initiated' }, { status: 'success', amountKobo: 30, currency: 'NGN' }).outcome).toBe('record');
  });
});
