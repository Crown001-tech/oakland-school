import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';


export async function GET(req: NextRequest) {
  try {
    const admin = await getSchoolDb();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'all';
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

    // Queries to collect unified logs
    const unifiedEvents: any[] = [];

    // 1. Visitors
    if (category === 'all' || category === 'visitor') {
      let query = admin
        .from('visitors')
        .select('id, pass_number, full_name, host_name, host_type, organization, purpose, check_in_time, check_out_time, status, security_officer_name, notes')
        .order('check_in_time', { ascending: false })
        .limit(limit);

      if (startDate) query = query.gte('check_in_time', startDate);
      if (endDate) query = query.lte('check_in_time', endDate);

      const { data: visitors } = await query;
      (visitors || []).forEach((v: any) => {
        unifiedEvents.push({
          id: `vis-${v.id}`,
          timestamp: v.check_in_time,
          category: 'visitor',
          categoryLabel: 'Visitor Pass',
          referenceCode: v.pass_number,
          primaryParty: v.full_name,
          details: `Host: ${v.host_name} (${v.host_type || 'General'})${v.organization ? ` | Org: ${v.organization}` : ''}. Purpose: ${v.purpose}`,
          officer: v.security_officer_name || 'Security Desk',
          status: v.status === 'checked_in' ? 'Checked In' : 'Checked Out',
          notes: v.check_out_time ? `Out at ${new Date(v.check_out_time).toLocaleTimeString('en-GB')}` : v.notes || '',
        });
      });
    }

    // 2. Pickups
    if (category === 'all' || category === 'pickup') {
      let query = admin
        .from('pickup_logs')
        .select('id, student_name, student_class, picked_up_by_name, relationship_to_student, escort_phone, pickup_time, status, verified_by_officer, notes')
        .order('pickup_time', { ascending: false })
        .limit(limit);

      if (startDate) query = query.gte('pickup_time', startDate);
      if (endDate) query = query.lte('pickup_time', endDate);

      const { data: pickups } = await query;
      (pickups || []).forEach((p: any) => {
        const isCleared = p.status === 'cleared';
        unifiedEvents.push({
          id: `pick-${p.id}`,
          timestamp: p.pickup_time,
          category: 'pickup',
          categoryLabel: 'Student Pickup',
          referenceCode: `PICK-${p.id.slice(-4).toUpperCase()}`,
          primaryParty: `${p.student_name} (${p.student_class})`,
          details: `Escort: ${p.picked_up_by_name} (${p.relationship_to_student || 'Guardian'})`,
          officer: p.verified_by_officer || 'Security Desk',
          status: isCleared ? 'Cleared' : 'Flagged Unauthorized',
          notes: p.notes || '',
        });
      });
    }

    // 3. Student Movements
    if (category === 'all' || category === 'movement') {
      let query = admin
        .from('student_movements')
        .select('id, pass_number, student_name, student_class, reason, authorized_by_name, escort_name, departure_time, actual_return_time, status, security_officer_name, notes')
        .order('departure_time', { ascending: false })
        .limit(limit);

      if (startDate) query = query.gte('departure_time', startDate);
      if (endDate) query = query.lte('departure_time', endDate);

      const { data: movements } = await query;
      (movements || []).forEach((m: any) => {
        unifiedEvents.push({
          id: `mov-${m.id}`,
          timestamp: m.departure_time,
          category: 'movement',
          categoryLabel: 'Movement Pass',
          referenceCode: m.pass_number,
          primaryParty: `${m.student_name} (${m.student_class})`,
          details: `Reason: ${m.reason}. Auth: ${m.authorized_by_name}. Escort: ${m.escort_name}`,
          officer: m.security_officer_name || 'Security Desk',
          status: m.status === 'returned' ? 'Returned' : m.status === 'overdue' ? 'Overdue' : 'Departed',
          notes: m.actual_return_time ? `Returned: ${new Date(m.actual_return_time).toLocaleTimeString('en-GB')}` : m.notes || '',
        });
      });
    }

    // 4. Staff Gate Logs
    if (category === 'all' || category === 'staff_gate') {
      let query = admin
        .from('staff_gate_logs')
        .select('id, staff_name, employee_id, department, direction, transit_mode, vehicle_registration, timestamp, security_officer_name, notes')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (startDate) query = query.gte('timestamp', startDate);
      if (endDate) query = query.lte('timestamp', endDate);

      const { data: staffLogs } = await query;
      (staffLogs || []).forEach((sg: any) => {
        unifiedEvents.push({
          id: `sg-${sg.id}`,
          timestamp: sg.timestamp,
          category: 'staff_gate',
          categoryLabel: `Staff ${sg.direction === 'entry' ? 'Entry' : 'Exit'}`,
          referenceCode: sg.employee_id,
          primaryParty: sg.staff_name,
          details: `Dept: ${sg.department || 'General'}. Mode: ${sg.transit_mode}${sg.vehicle_registration ? ` (${sg.vehicle_registration})` : ''}`,
          officer: sg.security_officer_name || 'Security Desk',
          status: sg.direction === 'entry' ? 'Entry' : 'Exit',
          notes: sg.notes || '',
        });
      });
    }

    // 5. Deliveries
    if (category === 'all' || category === 'delivery') {
      let query = admin
        .from('deliveries')
        .select('id, tracking_code, courier_service, sender_name, recipient_name, department, package_type, package_description, received_time, collected_time, collected_by_name, status, received_by_officer, notes')
        .order('received_time', { ascending: false })
        .limit(limit);

      if (startDate) query = query.gte('received_time', startDate);
      if (endDate) query = query.lte('received_time', endDate);

      const { data: deliveries } = await query;
      (deliveries || []).forEach((d: any) => {
        unifiedEvents.push({
          id: `del-${d.id}`,
          timestamp: d.received_time,
          category: 'delivery',
          categoryLabel: 'Parcel Intake',
          referenceCode: d.tracking_code,
          primaryParty: d.recipient_name,
          details: `Courier: ${d.courier_service}. Type: ${d.package_type}. Desc: ${d.package_description}`,
          officer: d.received_by_officer || 'Security Desk',
          status: d.status === 'collected' ? 'Collected' : d.status === 'notified' ? 'Notified' : 'Received',
          notes: d.collected_by_name ? `Collected by ${d.collected_by_name}` : d.notes || '',
        });
      });
    }

    // 6. Security Incidents
    if (category === 'all' || category === 'incident') {
      let query = admin
        .from('security_incidents')
        .select('id, incident_number, category, title, description, location, severity, reported_by_name, status, resolution_notes, incident_time')
        .order('incident_time', { ascending: false })
        .limit(limit);

      if (startDate) query = query.gte('incident_time', startDate);
      if (endDate) query = query.lte('incident_time', endDate);

      const { data: incidents } = await query;
      (incidents || []).forEach((inc: any) => {
        unifiedEvents.push({
          id: `inc-${inc.id}`,
          timestamp: inc.incident_time,
          category: 'incident',
          categoryLabel: 'Incident',
          referenceCode: inc.incident_number,
          primaryParty: inc.title,
          details: `Category: ${inc.category}. Location: ${inc.location}. Severity: ${inc.severity.toUpperCase()}`,
          officer: inc.reported_by_name || 'Security Desk',
          status: inc.status === 'resolved' ? 'Resolved' : inc.status === 'escalated' ? 'Escalated' : 'Open',
          notes: inc.resolution_notes || inc.description,
        });
      });
    }

    // Sort chronologically descending
    unifiedEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Filter by search query
    let filteredEvents = unifiedEvents;
    if (search) {
      filteredEvents = unifiedEvents.filter((ev) =>
        ev.referenceCode?.toLowerCase().includes(search) ||
        ev.primaryParty?.toLowerCase().includes(search) ||
        ev.details?.toLowerCase().includes(search) ||
        ev.officer?.toLowerCase().includes(search) ||
        ev.notes?.toLowerCase().includes(search) ||
        ev.categoryLabel?.toLowerCase().includes(search)
      );
    }

    // Aggregate category counts across all events
    const categoryCounts: Record<string, number> = {
      all: unifiedEvents.length,
      visitor: 0,
      pickup: 0,
      movement: 0,
      staff_gate: 0,
      delivery: 0,
      incident: 0,
    };

    unifiedEvents.forEach((ev) => {
      if (categoryCounts[ev.category] !== undefined) {
        categoryCounts[ev.category]++;
      }
    });

    // Check if CSV format is requested
    if (format === 'csv') {
      const csvHeader = 'Timestamp,Event Type,Reference Code,Primary Party,Details,Officer,Status,Notes\n';
      const csvRows = filteredEvents.map((ev) => {
        const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
        return [
          escapeCsv(new Date(ev.timestamp).toLocaleString('en-GB')),
          escapeCsv(ev.categoryLabel),
          escapeCsv(ev.referenceCode),
          escapeCsv(ev.primaryParty),
          escapeCsv(ev.details),
          escapeCsv(ev.officer),
          escapeCsv(ev.status),
          escapeCsv(ev.notes),
        ].join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      const filename = `security_logs_${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      logs: filteredEvents.slice(0, limit),
      totalCount: filteredEvents.length,
      categoryCounts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
