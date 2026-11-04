import { NextResponse, type NextRequest } from 'next/server';
import { handleTermiiWebhook } from '@/lib/messaging/run';

/** Termii tells us whether a message was delivered, and what it cost. Trusted only when its signature checks out. */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const result = await handleTermiiWebhook(rawBody, request.headers.get('x-termii-signature'));
  return NextResponse.json(result.body, { status: result.status });
}
