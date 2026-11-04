import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { acceptInvite, previewInvite } from '@/lib/parent-invites';
import { checkAuthRateLimit, extractClientIp, recordAuthAttempt } from '@/lib/rate-limit';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/** What the invite page shows before the parent chooses a password. */
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const result = await previewInvite(getSupabaseAdmin(), token);
  return result.valid ? NextResponse.json({ success: true, data: result }) : fail('This link has expired or was already used. Ask the school for a new one.', 410);
}

/** The parent chooses a password. The link's token is the proof; guesses are limited. */
export async function POST(request: NextRequest) {
  try {
    const ip = extractClientIp(request);
    const key = `invite:${ip}`;
    const status = await checkAuthRateLimit(key);
    if (status.locked) return fail('Too many tries. Please wait a few minutes.', 429);

    const body = await request.json().catch(() => ({}));
    const result = await acceptInvite(getSupabaseAdmin(), { token: String(body.token ?? ''), password: body.password, email: body.email });
    await recordAuthAttempt({ key, scope: 'activation', success: result.ok, targetLabel: 'parent invite', ipAddress: ip });
    if (!result.ok) return fail(result.message, result.status);
    return NextResponse.json({ success: true, data: { email: result.email } });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not set up your account.', 500);
  }
}
