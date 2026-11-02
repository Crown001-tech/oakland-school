import { NextResponse } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';


export async function GET() {
  try {
    const admin = await getSchoolDb();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayIso = startOfToday.toISOString();

    // 1. Visitors currently on campus
    const { count: activeVisitorsCount, error: visErr } = await admin
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'checked_in');

    // 2. Pickups cleared today
    const { count: todayPickupsCount, error: pickErr } = await admin
      .from('pickup_logs')
      .select('*', { count: 'exact', head: true })
      .gte('pickup_time', todayIso)
      .eq('status', 'cleared');

    // 3. Students currently out on movement pass
    const { count: activeMovementsCount, error: movErr } = await admin
      .from('student_movements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'departed');

    // 4. Deliveries awaiting recipient collection
    const { count: pendingDeliveriesCount, error: delErr } = await admin
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'collected');

    // 5. Open security incidents
    const { count: openIncidentsCount, error: incErr } = await admin
      .from('security_incidents')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'resolved');

    // 6. Active security alerts (high/critical incidents + flagged pickups)
    const { data: alertsData } = await admin
      .from('security_incidents')
      .select('id, incident_number, title, severity, status, location, incident_time')
      .neq('status', 'resolved')
      .in('severity', ['high', 'critical'])
      .order('incident_time', { ascending: false })
      .limit(5);

    const { data: flaggedPickups } = await admin
      .from('pickup_logs')
      .select('id, student_name, student_class, picked_up_by_name, status, notes, pickup_time')
      .eq('status', 'flagged_unauthorized')
      .gte('pickup_time', todayIso)
      .order('pickup_time', { ascending: false })
      .limit(5);

    // 7. Recent activity stream across gate modules
    const { data: recentPickups } = await admin
      .from('pickup_logs')
      .select('id, student_name, picked_up_by_name, status, pickup_time')
      .order('pickup_time', { ascending: false })
      .limit(6);

    const { data: recentVisitors } = await admin
      .from('visitors')
      .select('id, pass_number, full_name, host_name, status, check_in_time, check_out_time')
      .order('check_in_time', { ascending: false })
      .limit(6);

    const { data: recentMovements } = await admin
      .from('student_movements')
      .select('id, pass_number, student_name, student_class, reason, status, departure_time')
      .order('departure_time', { ascending: false })
      .limit(6);

    const { data: recentDeliveries } = await admin
      .from('deliveries')
      .select('id, tracking_code, courier_service, recipient_name, status, received_time')
      .order('received_time', { ascending: false })
      .limit(6);

    const { data: recentStaffGate } = await admin
      .from('staff_gate_logs')
      .select('id, staff_name, direction, transit_mode, vehicle_registration, timestamp')
      .order('timestamp', { ascending: false })
      .limit(6);

    // Compile timeline events
    const timeline: any[] = [];

    (recentPickups || []).forEach((p: any) => {
      timeline.push({
        id: `pick-${p.id}`,
        type: 'pickup',
        title: `Student Dismissal: ${p.student_name}`,
        subtitle: `Escort: ${p.picked_up_by_name}`,
        timestamp: p.pickup_time,
        status: p.status,
        badgeColor: p.status === 'cleared' ? 'emerald' : 'rose',
      });
    });

    (recentVisitors || []).forEach((v: any) => {
      timeline.push({
        id: `vis-${v.id}`,
        type: 'visitor',
        title: `Visitor: ${v.full_name} (${v.pass_number})`,
        subtitle: `Host: ${v.host_name}`,
        timestamp: v.check_in_time,
        status: v.status,
        badgeColor: v.status === 'checked_in' ? 'blue' : 'slate',
      });
    });

    (recentMovements || []).forEach((m: any) => {
      timeline.push({
        id: `mov-${m.id}`,
        type: 'movement',
        title: `Gate Pass: ${m.student_name} (${m.student_class})`,
        subtitle: `Reason: ${m.reason}`,
        timestamp: m.departure_time,
        status: m.status,
        badgeColor: m.status === 'departed' ? 'amber' : 'emerald',
      });
    });

    (recentDeliveries || []).forEach((d: any) => {
      timeline.push({
        id: `del-${d.id}`,
        type: 'delivery',
        title: `Delivery: ${d.courier_service} (${d.tracking_code})`,
        subtitle: `Recipient: ${d.recipient_name}`,
        timestamp: d.received_time,
        status: d.status,
        badgeColor: d.status === 'collected' ? 'slate' : 'amber',
      });
    });

    (recentStaffGate || []).forEach((sg: any) => {
      timeline.push({
        id: `sg-${sg.id}`,
        type: 'staff_gate',
        title: `Staff ${sg.direction === 'entry' ? 'Entry' : 'Exit'}: ${sg.staff_name}`,
        subtitle: `Mode: ${sg.transit_mode}${sg.vehicle_registration ? ` (${sg.vehicle_registration})` : ''}`,
        timestamp: sg.timestamp,
        status: sg.direction,
        badgeColor: sg.direction === 'entry' ? 'emerald' : 'amber',
      });
    });

    // Sort combined timeline by timestamp descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      stats: {
        activeVisitors: activeVisitorsCount || 0,
        todayPickups: todayPickupsCount || 0,
        activeMovements: activeMovementsCount || 0,
        pendingDeliveries: pendingDeliveriesCount || 0,
        openIncidents: openIncidentsCount || 0,
      },
      alerts: {
        criticalIncidents: alertsData || [],
        flaggedPickups: flaggedPickups || [],
      },
      recentActivity: timeline.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch security overview stats' },
      { status: 500 }
    );
  }
}
