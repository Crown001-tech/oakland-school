import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getServerPrincipalDelegations } from '@/lib/delegations';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getAdminClient();
    const { data: events, error } = await sb
      .from('school_events')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) throw error;

    const formatted = (events || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description || '',
      eventType: e.event_type,
      startDate: e.start_date ? new Date(e.start_date).toISOString().split('T')[0] : '',
      endDate: e.end_date ? new Date(e.end_date).toISOString().split('T')[0] : '',
      allDay: e.all_day ?? true,
      audience: e.audience || 'all',
      location: e.location || 'Oakland Main Campus',
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getAdminClient();

    // Verify delegation if called by Admin / Principal
    const cookieStore = await cookies();
    const roleCookie = cookieStore.get('oakland_auth_role')?.value || cookieStore.get('oakland_demo_role')?.value;
    if (roleCookie === 'admin' || roleCookie === 'principal') {
      const delegations = await getServerPrincipalDelegations(sb);
      if (!delegations.canSetCalendarEvents) {
        return NextResponse.json(
          { success: false, message: 'Calendar event scheduling authority has not been delegated by the Proprietor.' },
          { status: 403 }
        );
      }
    }

    const { title, description, eventType, startDate, endDate, allDay, audience, location } = body;

    if (!title || !startDate) {
      return NextResponse.json(
        { success: false, message: 'Title and Start Date are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await sb
      .from('school_events')
      .insert({
        title,
        description: description || null,
        event_type: eventType || 'academic',
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate || startDate).toISOString(),
        all_day: allDay ?? true,
        audience: audience || 'all',
        location: location || 'Oakland Main Campus',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Event created successfully', data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Failed to create event' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Event ID is required' }, { status: 400 });
    }

    const sb = getAdminClient();

    // Verify delegation if called by Admin / Principal
    const cookieStore = await cookies();
    const roleCookie = cookieStore.get('oakland_auth_role')?.value || cookieStore.get('oakland_demo_role')?.value;
    if (roleCookie === 'admin' || roleCookie === 'principal') {
      const delegations = await getServerPrincipalDelegations(sb);
      if (!delegations.canSetCalendarEvents) {
        return NextResponse.json(
          { success: false, message: 'Calendar event deletion authority has not been delegated by the Proprietor.' },
          { status: 403 }
        );
      }
    }

    const { error } = await sb.from('school_events').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
