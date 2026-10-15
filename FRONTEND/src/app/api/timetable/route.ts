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
    const { data: school, error } = await sb
      .from('schools')
      .select('id, settings')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const settings = school?.settings || {};
    const timetable = settings.master_timetable || {};
    const periods = settings.master_periods || null;

    return NextResponse.json({
      success: true,
      data: timetable,
      periods,
    });
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
    const { timetable, periods } = body;

    if (!timetable && !periods) {
      return NextResponse.json(
        { success: false, message: 'Valid timetable or periods object is required' },
        { status: 400 }
      );
    }

    const sb = getAdminClient();

    // Verify delegation if called by Admin / Principal
    const cookieStore = await cookies();
    const roleCookie = cookieStore.get('oakland_auth_role')?.value || cookieStore.get('oakland_demo_role')?.value;
    if (roleCookie === 'admin' || roleCookie === 'principal') {
      const delegations = await getServerPrincipalDelegations(sb);
      if (!delegations.canSetCalendarEvents) {
        return NextResponse.json(
          { success: false, message: 'Timetable scheduling authority has not been delegated by the Proprietor.' },
          { status: 403 }
        );
      }
    }
    const { data: school, error: fetchErr } = await sb
      .from('schools')
      .select('id, settings')
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    const currentSettings = school?.settings || {};
    const updatedSettings = {
      ...currentSettings,
      ...(timetable ? { master_timetable: timetable } : {}),
      ...(periods ? { master_periods: periods } : {}),
      updated_at: new Date().toISOString(),
    };

    if (school?.id) {
      const { error: updateErr } = await sb
        .from('schools')
        .update({ settings: updatedSettings })
        .eq('id', school.id);

      if (updateErr) throw updateErr;
    }

    return NextResponse.json({
      success: true,
      message: 'Master timetable and schedule saved successfully in PostgreSQL settings.',
      data: timetable || currentSettings.master_timetable,
      periods: periods || currentSettings.master_periods,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}
