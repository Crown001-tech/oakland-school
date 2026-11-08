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

type Db = Awaited<ReturnType<typeof getSchoolDb>>;
type GuardianRow = { id: string; first_name: string; last_name: string; phone: string | null; email: string | null };

/** Makes one invite and queues the message that carries its link. */
async function inviteOne(sb: Db, guardian: GuardianRow, who: string, base: string, schoolName: string): Promise<{ error: string } | { made: { token: string; expiresAt: string }; link: string; queued: Awaited<ReturnType<typeof enqueueMessage>> }> {
  const made = await createInvite(sb, guardian.id, who);
  if ('error' in made) return { error: made.error };
  const link = `${base}/activate/parent?token=${made.token}`;
  const queued = await enqueueMessage(sb, {
    event: 'parent_invite',
    eventKey: `invite:${made.token.slice(0, 16)}`,
    guardianId: guardian.id,
    phone: guardian.phone,
    email: guardian.email,
    params: { school: schoolName, link },
  });
  return { made, link, queued };
}

/**
 * The school invites parents to set up their account. The link goes to the parent's phone by WhatsApp or SMS
 * (their email if they have no phone). Either one parent (guardianId), or every parent who has a child at the
 * school, has not set up an account, has no invite still open, and has a phone or email to send to (all: true).
 * With one parent, when there is nowhere to send the link it is shown once to the person inviting, to hand over.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await getAuthenticatedActor();
    const body = await request.json().catch(() => ({}));
    const sb = await getSchoolDb();
    const who = actor.actorName || 'Staff';

    const { data: school } = await sb.from('schools').select('name').maybeSingle();
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const local = /^(localhost|127.0.0.1)(:d+)?$/.test(host);
    const base = `${local ? 'http' : 'https'}://${host}`;
    const schoolName = String(school?.name ?? '');

    if (body.all === true) {
      const [{ data: guardians, error }, { data: links }, { data: open }] = await Promise.all([
        sb.from('guardians').select('id, first_name, last_name, phone, email, user_id').is('user_id', null).limit(5000),
        sb.from('student_guardians').select('guardian_id').limit(10000),
        sb.from('parent_invites').select('guardian_id, expires_at').is('used_at', null),
      ]);
      if (error) throw error;
      const hasChild = new Set((links || []).map((l: { guardian_id: string }) => l.guardian_id));
      const now = Date.now();
      const invited = new Set((open || []).filter((o: { expires_at: string }) => new Date(o.expires_at).getTime() > now).map((o: { guardian_id: string }) => o.guardian_id));
      const reachable = (g: GuardianRow) => Boolean(normalizeNgPhone(g.phone)) || Boolean(realEmail(g.email));
      const targets = (guardians || []).filter((g: GuardianRow) => hasChild.has(g.id) && !invited.has(g.id) && reachable(g));
      const counts = { queued: 0, skipped: 0, failed: 0, nobodyToSendTo: (guardians || []).filter((g: GuardianRow) => hasChild.has(g.id) && !invited.has(g.id) && !reachable(g)).length };
      for (const g of targets as GuardianRow[]) {
        const r = await inviteOne(sb, g, who, base, schoolName);
        if ('error' in r) counts.failed += 1;
        else if (r.queued.status === 'queued') counts.queued += 1;
        else counts.skipped += 1;
      }
      await sb.from('audit_logs').insert({ actor_id: actor.userId, actor_name: actor.actorName, actor_role: actor.actorRoleLabel, action: 'auth.parent_invites_sent_to_all', resource_type: 'guardians', metadata: { summary: `Invites sent to ${counts.queued} parents`, ...counts } });
      return NextResponse.json({ success: true, data: counts });
    }

    const guardianId = typeof body.guardianId === 'string' ? body.guardianId : '';
    if (!guardianId) return fail('Choose a parent.', 400);
    const { data: guardian } = await sb.from('guardians').select('id, first_name, last_name, phone, email, user_id').eq('id', guardianId).maybeSingle();
    if (!guardian) return fail('Parent not found.', 404);
    if (guardian.user_id && body.resend !== true) return fail('This parent already has an account. Send a new link only if they need to set a new password.', 409);

    const r = await inviteOne(sb, guardian, who, base, schoolName);
    if ('error' in r) return fail(r.error, 500);

    await sb.from('audit_logs').insert({ actor_id: actor.userId, actor_name: actor.actorName, actor_role: actor.actorRoleLabel, action: 'auth.parent_invite_sent', resource_type: 'guardians', resource_id: guardianId, metadata: { summary: `Invite for ${guardian.first_name} ${guardian.last_name}`.trim(), outcome: r.queued.status } });

    return NextResponse.json({
      success: true,
      data: {
        status: r.queued.status,
        reason: r.queued.reason ?? null,
        expiresAt: r.made.expiresAt,
        // Only when nothing could be sent
        link: r.queued.status === 'queued' ? null : r.link,
      },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not send the invite.', 500);
  }
}
