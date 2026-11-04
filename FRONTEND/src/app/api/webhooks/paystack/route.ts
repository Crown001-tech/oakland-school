import { NextResponse, type NextRequest } from 'next/server';
import { handlePaystackWebhookRequest } from '@/lib/payments/complete';

/**
 * Paystack tells us a payment succeeded. It carries no sign-in: it is trusted only because its signature checks
 * out against the raw body, and even then the payment is confirmed with Paystack again before anything is
 * recorded. It answers quickly, and with an error only when Paystack trying again later would help.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const result = await handlePaystackWebhookRequest(rawBody, request.headers.get('x-paystack-signature'));
  if (!result) return NextResponse.json({ success: false, message: 'Online payment is not set up.' }, { status: 503 });
  return NextResponse.json(result.body, { status: result.status });
}
