import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { runOutbox } from '@/lib/messaging/run';

/** Sends the messages that are waiting. Called every few minutes by the scheduler; see vercel.json. */
async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'))) {
    return NextResponse.json({ success: false, message: 'Not allowed.' }, { status: 401 });
  }
  try {
    return NextResponse.json({ success: true, data: await runOutbox() });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'The message job failed.' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
