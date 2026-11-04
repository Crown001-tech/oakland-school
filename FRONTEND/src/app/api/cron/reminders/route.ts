import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { runFeeReminders } from '@/lib/messaging/run';

/** Queues today's fee reminders for every school that has them on. Called once a day by the scheduler; see vercel.json. */
async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'))) {
    return NextResponse.json({ success: false, message: 'Not allowed.' }, { status: 401 });
  }
  try {
    return NextResponse.json({ success: true, data: await runFeeReminders() });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'The reminder job failed.' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
