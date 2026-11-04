import crypto from 'node:crypto';

/**
 * Paystack, over its HTTPS API. Every call takes the fetch function as a setting, so tests never reach the
 * network. Amounts to and from Paystack are in kobo (whole numbers); see lib/money.ts.
 *
 * The details below are the ones in Paystack's public API and webhook documentation. Anything marked
 * UNVERIFIED has not been confirmed against Paystack's live service from here and must be tried in Paystack's
 * test mode before it is relied on.
 */

export class PaystackError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'PaystackError';
    this.status = status;
  }
}

export interface PaystackConfig {
  secretKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/** The configuration from the environment, or null when Paystack is not set up. */
export function paystackFromEnv(): PaystackConfig | null {
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  return secretKey ? { secretKey } : null;
}

/** Test keys start sk_test_; they move no real money. */
export const isTestMode = (cfg: PaystackConfig) => cfg.secretKey.startsWith('sk_test_');

async function call<T>(cfg: PaystackConfig, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const doFetch = cfg.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 15000);
  let res: Response;
  try {
    res = await doFetch(`${cfg.baseUrl ?? PAYSTACK_BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${cfg.secretKey}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    // The message never includes the request, which carries the secret key
    throw new PaystackError('Could not reach Paystack. Try again in a moment.', 504);
  } finally {
    clearTimeout(timer);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    throw new PaystackError('Paystack sent an answer that could not be read.', 502);
  }
  if (!res.ok || json?.status !== true) {
    throw new PaystackError(typeof json?.message === 'string' && json.message ? json.message : `Paystack refused the request (${res.status}).`, res.status >= 400 && res.status < 500 ? 400 : 502);
  }
  return json.data as T;
}

// ---------------------------------------------------------------------------------------------
// Webhook signature
// ---------------------------------------------------------------------------------------------

/**
 * Paystack signs the raw request body with HMAC SHA512, keyed with the account's secret key, and sends the hex
 * digest in the x-paystack-signature header. It must be checked against the raw text, not a parsed copy. The
 * comparison takes the same time whatever the input.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null | undefined, secretKey: string): boolean {
  if (!signature || !secretKey) return false;
  const expected = crypto.createHmac('sha512', secretKey).update(rawBody, 'utf8').digest('hex');
  const given = signature.trim().toLowerCase();
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(given, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------------------------

export interface InitializeInput {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  /** The school's own sub-account: the money is settled to the school, never held by Eductive. */
  subaccount?: string;
  /** Who pays Paystack's fee. The school's sub-account by default. */
  bearer?: 'account' | 'subaccount';
  metadata?: Record<string, unknown>;
}

export async function initializeTransaction(cfg: PaystackConfig, input: InitializeInput) {
  if (!Number.isInteger(input.amountKobo) || input.amountKobo <= 0) throw new PaystackError('The amount is not valid.', 400);
  const data = await call<{ authorization_url: string; access_code: string; reference: string }>(cfg, 'POST', '/transaction/initialize', {
    email: input.email,
    amount: input.amountKobo,
    currency: 'NGN',
    reference: input.reference,
    callback_url: input.callbackUrl,
    ...(input.subaccount ? { subaccount: input.subaccount, bearer: input.bearer ?? 'subaccount' } : {}),
    metadata: input.metadata ?? {},
  });
  if (!data?.authorization_url) throw new PaystackError('Paystack did not return a payment page.', 502);
  return { authorizationUrl: data.authorization_url, accessCode: data.access_code, reference: data.reference };
}

export interface VerifiedTransaction {
  reference: string;
  /** success, failed, abandoned, pending and others, as Paystack reports them */
  status: string;
  amountKobo: number;
  currency: string;
  channel: string | null;
  paidAt: string | null;
  feesKobo: number | null;
  customerEmail: string | null;
  customerCode: string | null;
  metadata: Record<string, unknown>;
  /** The bank account a transfer was paid into, for payments to a student's own account number */
  receiverAccountNumber: string | null;
}

/** Asks Paystack what really happened to a payment. Never trust a browser or a webhook body alone. */
export async function verifyTransaction(cfg: PaystackConfig, reference: string): Promise<VerifiedTransaction> {
  if (!/^[A-Za-z0-9._=-]{6,100}$/.test(reference)) throw new PaystackError('That payment reference is not valid.', 400);
  const d = await call<any>(cfg, 'GET', `/transaction/verify/${encodeURIComponent(reference)}`);
  return {
    reference: String(d.reference ?? reference),
    status: String(d.status ?? ''),
    amountKobo: Number(d.amount),
    currency: String(d.currency ?? ''),
    channel: d.channel ? String(d.channel) : null,
    paidAt: d.paid_at ? String(d.paid_at) : null,
    feesKobo: d.fees != null ? Number(d.fees) : null,
    customerEmail: d.customer?.email ? String(d.customer.email) : null,
    customerCode: d.customer?.customer_code ? String(d.customer.customer_code) : null,
    metadata: d.metadata && typeof d.metadata === 'object' ? d.metadata : {},
    receiverAccountNumber: d.authorization?.receiver_bank_account_number ? String(d.authorization.receiver_bank_account_number) : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Sub-accounts: each school is paid into its own bank account
// ---------------------------------------------------------------------------------------------

export interface Bank {
  name: string;
  code: string;
}

export async function listNigerianBanks(cfg: PaystackConfig): Promise<Bank[]> {
  const data = await call<{ name: string; code: string }[]>(cfg, 'GET', '/bank?country=nigeria&currency=NGN&perPage=100');
  return (data || []).map((b) => ({ name: b.name, code: b.code }));
}

export interface SubaccountInput {
  businessName: string;
  settlementBankCode: string;
  accountNumber: string;
  /** The share of each payment kept by Eductive's main account. 0: the school keeps all of it, less Paystack's fee. */
  percentageCharge?: number;
}

export async function createSubaccount(cfg: PaystackConfig, input: SubaccountInput) {
  if (!/^\d{10}$/.test(input.accountNumber)) throw new PaystackError('A Nigerian bank account number has 10 digits.', 400);
  const data = await call<{ subaccount_code: string; business_name: string; settlement_bank: string; account_number: string }>(cfg, 'POST', '/subaccount', {
    business_name: input.businessName,
    settlement_bank: input.settlementBankCode,
    account_number: input.accountNumber,
    percentage_charge: input.percentageCharge ?? 0,
  });
  if (!data?.subaccount_code) throw new PaystackError('Paystack did not return a sub-account.', 502);
  return { subaccountCode: data.subaccount_code, businessName: data.business_name, accountNumberLast4: String(data.account_number ?? input.accountNumber).slice(-4) };
}

// ---------------------------------------------------------------------------------------------
// A bank account number for each student (UNVERIFIED)
//
// Paystack's "dedicated virtual accounts" give a customer an account number of their own. The request fields
// and which banks are offered to a business are not confirmed from here and depend on the account's approval:
// try these in test mode, and expect to adjust them, before showing account numbers to parents.
// ---------------------------------------------------------------------------------------------

export async function createCustomer(cfg: PaystackConfig, input: { email: string; firstName: string; lastName: string; phone?: string }) {
  const data = await call<{ customer_code: string }>(cfg, 'POST', '/customer', {
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    ...(input.phone ? { phone: input.phone } : {}),
  });
  return { customerCode: data.customer_code };
}

export async function assignDedicatedAccount(cfg: PaystackConfig, input: { customerCode: string; preferredBank?: string }) {
  const data = await call<any>(cfg, 'POST', '/dedicated_account', {
    customer: input.customerCode,
    ...(input.preferredBank ? { preferred_bank: input.preferredBank } : {}),
  });
  const accountNumber = data?.account_number;
  if (!accountNumber) throw new PaystackError('Paystack did not return an account number.', 502);
  return {
    accountNumber: String(accountNumber),
    bankName: data?.bank?.name ? String(data.bank.name) : null,
    accountName: data?.account_name ? String(data.account_name) : null,
    raw: data,
  };
}
