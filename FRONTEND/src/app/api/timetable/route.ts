import { NextResponse, type NextRequest } from 'next/server';
import { getServerPrincipalDelegations } from '@/lib/delegations';
import { getCaller } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';


export async function GET() {
  try {
    const sb = await getSchoolDb();
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

    const sb = await getSchoolDb();

    // Verify delegation if called by Admin / Principal
    const roleCookie = (await getCaller()).role;
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
