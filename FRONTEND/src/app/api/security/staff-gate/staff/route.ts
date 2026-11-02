import { NextResponse } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';


export async function GET() {
  try {
    const admin = await getSchoolDb();

    // 1. Fetch active staff profiles
    const { data: staffProfiles, error: staffErr } = await admin
      .from('staff_profiles')
      .select('id, first_name, last_name, employee_id, department, role, phone, email')
      .eq('is_active', true)
      .order('first_name', { ascending: true });

    if (staffErr) throw staffErr;

    // 2. Fetch today's transit logs
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: todayLogs, error: logErr } = await admin
      .from('staff_gate_logs')
      .select('staff_id, direction, timestamp')
      .gte('timestamp', startOfToday.toISOString())
      .order('timestamp', { ascending: true });

    if (logErr) throw logErr;

    // Map each staff member to their latest direction today
    const latestTransitMap = new Map<string, { direction: string; timestamp: string }>();
    (todayLogs || []).forEach((l: any) => {
      if (l.staff_id) {
        latestTransitMap.set(l.staff_id, {
          direction: l.direction,
          timestamp: l.timestamp,
        });
      }
    });

    const staff = (staffProfiles || []).map((s: any) => {
      const latest = latestTransitMap.get(s.id);
      let status: 'on_site' | 'off_site' | 'unrecorded' = 'unrecorded';
      if (latest) {
        status = latest.direction === 'entry' ? 'on_site' : 'off_site';
      }

      return {
        id: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        employeeId: s.employee_id,
        department: s.department || 'General',
        role: s.role || 'Staff',
        phone: s.phone || '—',
        email: s.email || '—',
        status,
        lastTransitTime: latest?.timestamp || null,
      };
    });

    return NextResponse.json({
      success: true,
      staff,
      totalCount: staff.length,
      onSiteCount: staff.filter((s: any) => s.status === 'on_site').length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch staff roster' },
      { status: 500 }
    );
  }
}
