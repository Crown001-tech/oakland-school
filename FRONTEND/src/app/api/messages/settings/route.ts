import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';
import { readMessagingSettings } from '@/lib/messaging/drain';
import { cleanMessagingSettings } from '@/lib/messaging/settings';
import { providersFromEnv } from '@/lib/messaging/providers';
import { readReminderSettings, cleanDays } from '@/lib/reminders';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/** How the school sends messages and fee reminders. No secret is ever returned. */
export async function GET() {
  try {
    const sb = await getSchoolDb();
    const { data: school } = await sb.from('schools').select('settings').maybeSingle();
    const providers = providersFromEnv();
    return NextResponse.json({
      success: true,
      data: {
        messaging: readMessagingSettings(school?.settings),
        reminders: readReminderSettings(school?.settings),
        providers: { whatsapp: Boolean(providers.termii), email: Boolean(providers.email) },
      },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not load the settings.', 500);
  }
}

/** The proprietor changes how the school sends messages, or when fee reminders go out. */
export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    const body = await request.json().catch(() => ({}));
    const sb = await getSchoolDb();
    const { data: school } = await sb.from('schools').select('settings').maybeSingle();
    const patch: Record<string, unknown> = {};

    if (body.messaging !== undefined) {
      const cleaned = cleanMessagingSettings(body.messaging);
      if (cleaned.error || !cleaned.settings) return fail(cleaned.error || 'Check the messaging settings.', 400);
      patch.messaging = { ...readMessagingSettings(school?.settings), ...cleaned.settings };
    }

    if (body.reminders !== undefined) {
      const r = (body.reminders && typeof body.reminders === 'object' ? body.reminders : {}) as Record<string, unknown>;
      const next = { ...readReminderSettings(school?.settings) } as Record<string, unknown>;
      if (r.enabled !== undefined) {
        if (typeof r.enabled !== 'boolean') return fail('Choose on or off for reminders.', 400);
        next.enabled = r.enabled;
      }
      if (r.daysBefore !== undefined) next.daysBefore = cleanDays(r.daysBefore);
      if (r.daysAfter !== undefined) next.daysAfter = cleanDays(r.daysAfter);
      if (r.dueDate !== undefined) {
        const d = typeof r.dueDate === 'string' ? r.dueDate.trim() : '';
        if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)))) return fail('Give the due date as a date.', 400);
        next.dueDate = d || undefined;
      }
      patch.feeReminders = next;
    }

    if (Object.keys(patch).length === 0) return fail('Nothing to change.', 400);
    const { error } = await sb.rpc('merge_school_settings', { p_school_id: sb.schoolId, p_patch: patch });
    if (error) throw new Error(error.message);
    await sb.from('audit_logs').insert({ actor_id: actor.userId, actor_name: actor.actorName, actor_role: 'Proprietor', action: 'messaging.settings_changed', resource_type: 'schools', resource_id: sb.schoolId, metadata: { summary: `Changed: ${Object.keys(patch).join(', ')}` } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not save the settings.', 500);
  }
}
