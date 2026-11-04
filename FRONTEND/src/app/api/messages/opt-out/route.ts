import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedActor } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';
import { normalizeNgPhone } from '@/lib/messaging/phone';
import { OPT_OUT_CATEGORIES, removeOptOut, setOptOut } from '@/lib/messaging/outbox';

const fail = (message: string, status: number) => NextResponse.json({ success: false, message }, { status });

/**
 * Which messages a parent has chosen not to receive. A parent manages their own number (from their record at the
 * school); staff can record a request a parent made in person, by giving the number.
 */
async function target(request: NextRequest, body: { phone?: unknown; category?: unknown }) {
  const actor = await getAuthenticatedActor();
  const sb = await getSchoolDb();
  if (actor.role === 'parent') {
    const { data: guardian } = await sb.from('guardians').select('id, phone').eq('email', actor.email).maybeSingle();
    const phone = normalizeNgPhone(guardian?.phone);
    return phone ? { sb, phone, guardianId: guardian!.id as string } : { sb, error: 'There is no mobile number on your record at the school. Ask the school office to add it.' };
  }
  const phone = normalizeNgPhone(body.phone ?? new URL(request.url).searchParams.get('phone'));
  return phone ? { sb, phone, guardianId: null } : { sb, error: 'Give a Nigerian mobile number.' };
}

export async function GET(request: NextRequest) {
  try {
    const t = await target(request, {});
    if ('error' in t && t.error) return fail(t.error, 400);
    const { data } = await t.sb.from('message_opt_outs').select('category').eq('phone', (t as { phone: string }).phone);
    return NextResponse.json({ success: true, data: { categories: (data || []).map((o: { category: string }) => o.category), available: OPT_OUT_CATEGORIES } });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not load the choices.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const t = await target(request, body);
    if ('error' in t && t.error) return fail(t.error, 400);
    const r = await setOptOut(t.sb, { phone: (t as { phone: string }).phone, category: String(body.category ?? ''), guardianId: (t as { guardianId: string | null }).guardianId });
    return r.ok ? NextResponse.json({ success: true }) : fail(r.error || 'Could not save the choice.', 400);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not save the choice.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const t = await target(request, {});
    if ('error' in t && t.error) return fail(t.error, 400);
    const category = new URL(request.url).searchParams.get('category') || '';
    const r = await removeOptOut(t.sb, { phone: (t as { phone: string }).phone, category });
    return r.ok ? NextResponse.json({ success: true }) : fail(r.error || 'Could not save the choice.', 400);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Could not save the choice.', 500);
  }
}
