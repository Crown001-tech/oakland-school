import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor, isAdminRole } from '@/lib/caller';
import { REQUEST_APPROACHES, REQUEST_STATUSES } from '@/lib/custom-requests';
import { getSchoolDb } from '@/lib/school-db';


const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oneOf = <T extends readonly string[]>(list: T, v: unknown): T[number] | null =>
  typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T[number]) : null;

async function requireAdmin() {
  const actor = await getAuthenticatedActor();
  if (!actor.hasSession) return { error: fail('Authentication is required.', 401) };
  if (!isAdminRole(actor.role)) return { error: fail('Access denied for this role.', 403) };
  return { actor };
}

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard.error) return guard.error;
    const { data, error } = await (await getSchoolDb())
      .from('custom_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard.error) return guard.error;
    const body = await request.json().catch(() => ({}));

    const title = clean(body.title, 200);
    if (!title) return fail('Give the request a title.', 400);

    const approach = body.approach ? oneOf(REQUEST_APPROACHES, body.approach) : null;
    if (body.approach && !approach) return fail('Choose how the request will be handled.', 400);
    const days = body.estimatedDays === undefined || body.estimatedDays === '' ? null : Number(body.estimatedDays);
    if (days !== null && (!Number.isFinite(days) || days < 0)) return fail('Estimated days must be a number from 0.', 400);

    const sb = await getSchoolDb();
    const { data: school } = await sb.from('schools').select('id').limit(1).maybeSingle();
    if (!school) return fail('School record not found.', 404);

    const { data, error } = await sb
      .from('custom_requests')
      .insert({
        school_id: school.id,
        title,
        description: clean(body.description, 4000) || null,
        requested_by: clean(body.requestedBy, 150) || null,
        approach,
        estimated_days: days,
        created_by_id: guard.actor.userId,
        created_by_name: guard.actor.actorName,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard.error) return guard.error;
    const body = await request.json().catch(() => ({}));
    if (!body.id || typeof body.id !== 'string') return fail('Choose a request to update.', 400);

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) {
      const status = oneOf(REQUEST_STATUSES, body.status);
      if (!status) return fail('Unknown status.', 400);
      patch.status = status;
    }
    if (body.approach !== undefined) {
      const approach = body.approach === null || body.approach === '' ? null : oneOf(REQUEST_APPROACHES, body.approach);
      if (body.approach && !approach) return fail('Unknown approach.', 400);
      patch.approach = approach;
    }
    if (body.estimatedDays !== undefined) {
      const days = body.estimatedDays === null || body.estimatedDays === '' ? null : Number(body.estimatedDays);
      if (days !== null && (!Number.isFinite(days) || days < 0)) return fail('Estimated days must be a number from 0.', 400);
      patch.estimated_days = days;
    }
    if (body.notes !== undefined) patch.notes = clean(body.notes, 4000) || null;
    if (Object.keys(patch).length === 1) return fail('Nothing to update.', 400);

    const { data, error } = await (await getSchoolDb()).from('custom_requests').update(patch).eq('id', body.id).select().maybeSingle();
    if (error) throw error;
    if (!data) return fail('Request not found.', 404);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}
