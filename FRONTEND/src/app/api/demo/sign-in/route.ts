import { NextResponse } from 'next/server';
import { POST as signIn } from '@/app/api/auth/login/route';
import { getDemoAccounts } from '@/lib/demo';
import { isDemoModeEnabled, isDemoRole } from '@/lib/demo-mode';
import { isLocalReviewAllowed } from '@/lib/local-review';
import { switchToLocalRole } from '@/lib/local-review-switch';

const notFound = () => NextResponse.json({ success: false, message: 'Not found.' }, { status: 404 });

/**
 * One-tap sign-in for the Eductive demo school. It signs in through the real login route with the
 * demo account's stored identifier and DEMO_ACCOUNT_PASSWORD, so rate limits, the signed role
 * cookie and the redirect behave exactly as for any other user. The password never reaches the browser.
 * Answers 404 anywhere that is not the separate demo deployment on the demo database.
 */
export async function POST(request: Request) {
  // Local review on the owner's own machine: switch between Oakland's real accounts (see lib/local-review.ts)
  const localReview = !isDemoModeEnabled() && isLocalReviewAllowed(request.headers.get('host'));
  if (!isDemoModeEnabled() && !localReview) return notFound();

  let role: unknown;
  try {
    role = (await request.json())?.role;
  } catch {
    return NextResponse.json({ success: false, message: 'Choose a role.' }, { status: 400 });
  }
  if (!isDemoRole(role)) {
    return NextResponse.json({ success: false, message: 'Choose a role.' }, { status: 400 });
  }

  if (localReview) return switchToLocalRole(role);

  const accounts = await getDemoAccounts();
  if (!accounts) return notFound();

  const identifier = accounts[role];
  if (!identifier) {
    return NextResponse.json({ success: false, message: 'This demo account has not been set up.' }, { status: 404 });
  }

  const password = process.env.DEMO_ACCOUNT_PASSWORD;
  if (!password) {
    throw new Error('Missing DEMO_ACCOUNT_PASSWORD in the demo deployment environment.');
  }

  // Keep the visitor's address so the login rate limit still sees the real client
  const headers = new Headers({ 'Content-Type': 'application/json' });
  for (const name of ['x-forwarded-for', 'x-real-ip']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  return signIn(
    new Request(new URL('/api/auth/login', request.url), {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: identifier, password }),
    })
  );
}
