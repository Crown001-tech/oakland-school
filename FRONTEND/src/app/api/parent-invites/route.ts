import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';
import { createInvite, realEmail } from '@/lib/parent-invites';
import { formatNgPhone, normalizeNgPhone } from '@/lib/messaging/phone';
import { enqueueMessage } from '@/lib/messaging/outbox';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/**
 * Every parent of the school, whether they have set up an account, and their children. This is how the school
 * sees how many parents are activated and who still needs an invite. Numbers are shown with the middle hidden.
 */
export async function GET() {
  try {
    const sb = await getSchoolDb();
    const [{ data: guardians, error }, { data: links }, { data: pending }] = await Promise.all([
      sb.from('guardians').select('id, first_name, last_name, phone, email, user_id').order('last_name', { ascending: true }).limit(5000),
      sb.from('student_guardians').select('guardian_id, students ( first_name, last_name )').limit(10000),
      sb.from('parent_invites').select('guardian_id, expires_at').is('used_at', null),
    ]);
    if (error) throw error;
    const kids = new Map<string, string[]>();
    for (const l of links || []) {
      const s = Array.isArray(l.students) ? l.students[0] : l.students;
      if (!s) continue;
      kids.set(l.guardian_id, [...(kids.get(l.guardian_id) ?? []), `${s.first_name} ${s.last_name}`.trim()]);
    }
    const now = Date.now();
    const invited = new Set((pending || []).filter((p: { expires_at: string }) => new Date(p.expires_at).getTime() > now).map((p: { guardian_id: string }) => p.guardian_id));
    // Only a guardian with a child at the school is a parent of the school: leftover guardian records with no
    // child would otherwise be counted as parents who never activated
    const parents = (guardians || []).filter((g: { id: string }) => (kids.get(g.id) ?? []).length > 0).map((g: any) => ({
      id: g.id,
      name: `${g.first_name} ${g.last_name}`.trim(),
      phone: g.phone ? formatNgPhone(normalizeNgPhone(g.phone) ?? g.phone, true) : null,
      hasEmail: Boolean(realEmail(g.email)),
      children: kids.get(g.id) ?? [],
      activated: Boolean(g.user_id),
      invited: invited.has(g.id),
    }));
    const activated = parents.filter((p: { activated: boolean }) => p.activated).length;
    return NextResponse.json({ success: true, data: { total: parents.length, activated, parents } });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not load the parents.', 500);
  }
}

/**
 * The school invites a parent to set up their account. The link goes to the parent's phone by WhatsApp or SMS
 * (their email if they have no phone). When there is nowhere to send it, the link is shown once to the person
 * inviting, to hand over themselves; it is never shown otherwise.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    const body = await request.json().catch(() => ({}));
    const guardianId = typeof body.guardianId === 'string' ? body.guardianId : '';
    if (!guardianId) return fail('Choose a parent.', 400);

    const sb = await getSchoolDb();
    const { data: guardian } = await sb.from('guardians').select('id, first_name, last_name, phone, email, user_id').eq('id', guardianId).maybeSingle();
    if (!guardian) return fail('Parent not found.', 404);
    if (guardian.user_id && body.resend !== true) return fail('This parent already has an account. Send a new link only if they need to set a new password.', 409);

    const made = await createInvite(sb, guardianId, actor.actorName || 'Staff');
    if ('error' in made) return fail(made.error, 500);

    const { data: school } = await sb.from('schools').select('name').maybeSingle();
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    const link = `${local ? 'http' : 'https'}://${host}/activate/parent?token=${made.token}`;

    const queued = await enqueueMessage(sb, {
      event: 'parent_invite',
      eventKey: `invite:${made.token.slice(0, 16)}`,
      guardianId,
      phone: guardian.phone,
      email: guardian.email,
      params: { school: String(school?.name ?? ''), link },
    });

    await sb.from('audit_logs').insert({ actor_id: actor.userId, actor_name: actor.actorName, actor_role: actor.actorRoleLabel, action: 'auth.parent_invite_sent', resource_type: 'guardians', resource_id: guardianId, metadata: { summary: `Invite for ${guardian.first_name} ${guardian.last_name}`.trim(), outcome: queued.status } });

    return NextResponse.json({
      success: true,
      data: {
        status: queued.status,
        reason: queued.reason ?? null,
        expiresAt: made.expiresAt,
        // Only when nothing could be sent
        link: queued.status === 'queued' ? null : link,
      },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not send the invite.', 500);
  }
}
