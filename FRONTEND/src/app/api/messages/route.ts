import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';
import { summariseUsage } from '@/lib/messaging/outbox';
import { readMessagingSettings } from '@/lib/messaging/drain';
import { providersFromEnv } from '@/lib/messaging/providers';
import { formatNgPhone } from '@/lib/messaging/phone';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });
const STATUSES = ['queued', 'sending', 'sent', 'delivered', 'failed', 'skipped'];

/**
 * The school's messages: what was sent, to whom, by which channel, what it cost, and what failed and why.
 * Parents' numbers are shown with the middle hidden. Cost is only what the provider reported or the school's own
 * rate gave; a message with no cost yet is counted separately, never as free.
 */
export async function GET(request: NextRequest) {
  try {
    const sb = await getSchoolDb();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    let list = sb.from('message_outbox').select('id, event, category, recipient_phone, recipient_email, preferred_channel, channel_used, status, subject, body, attempts, last_error, skipped_reason, cost, created_at, sent_at, delivered_at').order('created_at', { ascending: false }).limit(150);
    if (STATUSES.includes(status)) list = list.eq('status', status);
    const [{ data: messages, error }, { data: month }, { data: school }] = await Promise.all([
      list,
      sb.from('message_outbox').select('status, channel_used, cost').gte('created_at', monthStart.toISOString()).limit(20000),
      sb.from('schools').select('settings').maybeSingle(),
    ]);
    if (error) throw error;

    const providers = providersFromEnv();
    const settings = readMessagingSettings(school?.settings);
    return NextResponse.json({
      success: true,
      data: {
        usage: summariseUsage(month || []),
        connected: { email: Boolean(providers.email), whatsapp: Boolean(providers.termii) && Boolean(settings.whatsappDeviceId || providers.termii?.whatsappDeviceId) },
        messages: (messages || []).map((m: any) => ({
          id: m.id,
          event: m.event,
          category: m.category,
          to: m.recipient_phone ? formatNgPhone(m.recipient_phone, true) : m.recipient_email ?? '—',
          asked: m.preferred_channel,
          sentBy: m.channel_used,
          status: m.status,
          subject: m.subject,
          body: m.body,
          attempts: m.attempts,
          problem: m.last_error ?? (m.skipped_reason ? `Skipped: ${m.skipped_reason.replace(/_/g, ' ')}` : null),
          cost: m.cost != null ? Number(m.cost) : null,
          createdAt: m.created_at,
          sentAt: m.sent_at,
          deliveredAt: m.delivered_at,
        })),
      },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not load the messages.', 500);
  }
}

/** Puts a message that failed back in the queue to be tried again. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action !== 'retry' || typeof body.id !== 'string') return fail('Choose a message to try again.', 400);
    const sb = await getSchoolDb();
    const { data } = await sb.from('message_outbox').update({ status: 'queued', attempts: 0, next_attempt_at: new Date().toISOString(), last_error: null }).eq('id', body.id).eq('status', 'failed').select('id');
    if (!data || data.length === 0) return fail('Only a message that failed can be tried again.', 409);
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not queue the message again.', 500);
  }
}
