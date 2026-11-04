import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  PaystackError,
  assignDedicatedAccount,
  createSubaccount,
  initializeTransaction,
  isTestMode,
  listNigerianBanks,
  verifyTransaction,
  verifyWebhookSignature,
  type PaystackConfig,
} from '@/lib/payments/paystack';

const SECRET = 'sk_test_abc123';

const reply = (data: unknown, ok = true, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(ok ? { status: true, message: 'ok', data } : { status: false, message: String(data) }), { status }));
const cfg = (fetchImpl: ReturnType<typeof vi.fn>): PaystackConfig => ({ secretKey: SECRET, fetchImpl: fetchImpl as unknown as typeof fetch });
const sign = (body: string, key = SECRET) => crypto.createHmac('sha512', key).update(body).digest('hex');

describe('Webhook signature', () => {
  const body = JSON.stringify({ event: 'charge.success', data: { reference: 'r1', amount: 5000000 } });

  it('accepts the body signed with the secret key', () => {
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
    expect(verifyWebhookSignature(body, sign(body).toUpperCase(), SECRET)).toBe(true);
  });

  it('refuses a body that was changed by a single character', () => {
    expect(verifyWebhookSignature(body.replace('5000000', '5000001'), sign(body), SECRET)).toBe(false);
  });

  it('refuses a signature made with another key, a missing one, an empty one, or one of the wrong length', () => {
    expect(verifyWebhookSignature(body, sign(body, 'sk_test_other'), SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, '', SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, 'abc', SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), '')).toBe(false);
  });

  it('is checked against the raw text, so a re-formatted copy of the same data fails', () => {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyWebhookSignature(pretty, sign(body), SECRET)).toBe(false);
  });

  it('is not the SHA256 signature some libraries default to', () => {
    const sha256 = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
    expect(verifyWebhookSignature(body, sha256, SECRET)).toBe(false);
  });
});

describe('Starting a payment', () => {
  it('sends kobo, the school\'s sub-account, who bears the fee, and our own reference', async () => {
    const f = reply({ authorization_url: 'https://checkout.paystack.com/abc', access_code: 'ac', reference: 'OAK-1' });
    const r = await initializeTransaction(cfg(f), {
      email: 'parent@example.test',
      amountKobo: 5000000,
      reference: 'OAK-1',
      callbackUrl: 'https://oakland.example.com/parent/fees/verify',
      subaccount: 'ACCT_school',
      metadata: { student_id: 's1' },
    });
    expect(r).toEqual({ authorizationUrl: 'https://checkout.paystack.com/abc', accessCode: 'ac', reference: 'OAK-1' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.paystack.co/transaction/initialize');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`);
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'parent@example.test',
      amount: 5000000,
      currency: 'NGN',
      reference: 'OAK-1',
      callback_url: 'https://oakland.example.com/parent/fees/verify',
      subaccount: 'ACCT_school',
      bearer: 'subaccount',
      metadata: { student_id: 's1' },
    });
  });

  it('sends no sub-account fields when the school has none', async () => {
    const f = reply({ authorization_url: 'https://x', access_code: 'a', reference: 'r' });
    await initializeTransaction(cfg(f), { email: 'a@b.test', amountKobo: 1000, reference: 'r', callbackUrl: 'https://x' });
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.subaccount).toBeUndefined();
    expect(body.bearer).toBeUndefined();
  });

  it('refuses an amount that is not whole kobo, without calling Paystack', async () => {
    const f = reply({});
    await expect(initializeTransaction(cfg(f), { email: 'a@b.test', amountKobo: 10.5, reference: 'r', callbackUrl: 'x' })).rejects.toBeInstanceOf(PaystackError);
    await expect(initializeTransaction(cfg(f), { email: 'a@b.test', amountKobo: 0, reference: 'r', callbackUrl: 'x' })).rejects.toBeInstanceOf(PaystackError);
    expect(f).not.toHaveBeenCalled();
  });

  it('turns Paystack\'s refusal into an error with its message', async () => {
    await expect(initializeTransaction(cfg(reply('Invalid subaccount code', false, 400)), { email: 'a@b.test', amountKobo: 1000, reference: 'r', callbackUrl: 'x' })).rejects.toThrow('Invalid subaccount code');
  });

  it('never puts the secret key in an error', async () => {
    const f = vi.fn(async () => {
      throw new Error(`connect failed with Bearer ${SECRET}`);
    });
    try {
      await initializeTransaction(cfg(f), { email: 'a@b.test', amountKobo: 1000, reference: 'r', callbackUrl: 'x' });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).not.toContain(SECRET);
      expect((e as PaystackError).status).toBe(504);
    }
  });

  it('refuses an answer with no payment page', async () => {
    await expect(initializeTransaction(cfg(reply({ reference: 'r' })), { email: 'a@b.test', amountKobo: 1000, reference: 'r', callbackUrl: 'x' })).rejects.toThrow('payment page');
  });
});

describe('Checking a payment', () => {
  it('reads what Paystack says happened', async () => {
    const f = reply({
      reference: 'OAK-PAY-0001',
      status: 'success',
      amount: 5000000,
      currency: 'NGN',
      channel: 'card',
      paid_at: '2026-11-04T10:00:00.000Z',
      fees: 75000,
      customer: { email: 'parent@example.test', customer_code: 'CUS_1' },
      metadata: { student_id: 's1' },
    });
    const v = await verifyTransaction(cfg(f), 'OAK-PAY-0001');
    expect(v).toMatchObject({ reference: 'OAK-PAY-0001', status: 'success', amountKobo: 5000000, currency: 'NGN', channel: 'card', feesKobo: 75000, customerCode: 'CUS_1', metadata: { student_id: 's1' } });
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('https://api.paystack.co/transaction/verify/OAK-PAY-0001');
  });

  it('refuses a reference that could change the address being called', async () => {
    const f = reply({});
    for (const bad of ['../customer', 'a/b', 'abc?x=1', 'ab', '']) await expect(verifyTransaction(cfg(f), bad)).rejects.toBeInstanceOf(PaystackError);
    expect(f).not.toHaveBeenCalled();
  });

  it('knows a test key from a live one', () => {
    expect(isTestMode({ secretKey: 'sk_test_x' })).toBe(true);
    expect(isTestMode({ secretKey: 'sk_live_x' })).toBe(false);
  });
});

describe('Sub-accounts', () => {
  it('creates one for the school with no share kept by Eductive', async () => {
    const f = reply({ subaccount_code: 'ACCT_1', business_name: 'Greenfield', settlement_bank: '058', account_number: '0123456789' });
    const r = await createSubaccount(cfg(f), { businessName: 'Greenfield', settlementBankCode: '058', accountNumber: '0123456789' });
    expect(r).toEqual({ subaccountCode: 'ACCT_1', businessName: 'Greenfield', accountNumberLast4: '6789' });
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({
      business_name: 'Greenfield',
      settlement_bank: '058',
      account_number: '0123456789',
      percentage_charge: 0,
    });
  });

  it('refuses an account number that is not 10 digits, without calling Paystack', async () => {
    const f = reply({});
    await expect(createSubaccount(cfg(f), { businessName: 'x', settlementBankCode: '058', accountNumber: '12345' })).rejects.toThrow('10 digits');
    expect(f).not.toHaveBeenCalled();
  });

  it('lists Nigerian banks', async () => {
    const r = await listNigerianBanks(cfg(reply([{ name: 'Access Bank', code: '044', slug: 'x' }])));
    expect(r).toEqual([{ name: 'Access Bank', code: '044' }]);
  });
});

describe('A bank account number for each student', () => {
  it('reads the account number Paystack returns, and refuses an answer with none', async () => {
    const good = reply({ account_number: '9876543210', account_name: 'Greenfield / Ada', bank: { name: 'Wema Bank' } });
    expect(await assignDedicatedAccount(cfg(good), { customerCode: 'CUS_1' })).toMatchObject({ accountNumber: '9876543210', bankName: 'Wema Bank', accountName: 'Greenfield / Ada' });
    await expect(assignDedicatedAccount(cfg(reply({ bank: {} })), { customerCode: 'CUS_1' })).rejects.toThrow('account number');
  });
});
