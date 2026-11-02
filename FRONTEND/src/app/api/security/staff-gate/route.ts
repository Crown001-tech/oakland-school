import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';


export async function GET(req: NextRequest) {
  try {
    const admin = await getSchoolDb();
    const { searchParams } = new URL(req.url);
    const direction = searchParams.get('direction');
    const mode = searchParams.get('mode');
    const search = searchParams.get('search')?.trim().toLowerCase();
    const todayOnly = searchParams.get('todayOnly') !== 'false';

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayIso = startOfToday.toISOString();

    let query = admin
      .from('staff_gate_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (todayOnly) {
      query = query.gte('timestamp', todayIso);
    }

    if (direction && (direction === 'entry' || direction === 'exit')) {
      query = query.eq('direction', direction);
    }

    if (mode && (mode === 'pedestrian' || mode === 'vehicle')) {
      query = query.eq('transit_mode', mode);
    }

    const { data, error } = await query;
    if (error) throw error;

    let logs = data || [];

    if (search) {
      logs = logs.filter((l: any) =>
        l.staff_name?.toLowerCase().includes(search) ||
        l.employee_id?.toLowerCase().includes(search) ||
        l.department?.toLowerCase().includes(search) ||
        l.vehicle_registration?.toLowerCase().includes(search) ||
        l.security_officer_name?.toLowerCase().includes(search)
      );
    }

    // Format logs
    const formatted = logs.map((l: any) => ({
      id: l.id,
      staffId: l.staff_id,
      staffName: l.staff_name,
      employeeId: l.employee_id,
      department: l.department || '—',
      direction: l.direction,
      transitMode: l.transit_mode,
      vehicleRegistration: l.vehicle_registration || null,
      timestamp: l.timestamp,
      securityOfficerName: l.security_officer_name,
      notes: l.notes || '',
      createdAt: l.created_at,
    }));

    // Calculate Today's Overall Stats from all today's logs
    const { data: allTodayLogs } = await admin
      .from('staff_gate_logs')
      .select('staff_id, employee_id, direction, transit_mode, timestamp')
      .gte('timestamp', todayIso)
      .order('timestamp', { ascending: true });

    let entriesToday = 0;
    let exitsToday = 0;
    let vehiclesLogged = 0;
    const staffLatestDirection = new Map<string, string>();

    (allTodayLogs || []).forEach((item: any) => {
      const key = item.staff_id || item.employee_id;
      if (item.direction === 'entry') entriesToday++;
      if (item.direction === 'exit') exitsToday++;
      if (item.transit_mode === 'vehicle') vehiclesLogged++;
      if (key) {
        staffLatestDirection.set(key, item.direction);
      }
    });

    let currentlyOnSite = 0;
    staffLatestDirection.forEach((dir) => {
      if (dir === 'entry') currentlyOnSite++;
    });

    return NextResponse.json({
      success: true,
      logs: formatted,
      totalCount: formatted.length,
      stats: {
        entriesToday,
        exitsToday,
        currentlyOnSite,
        vehiclesLogged,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch staff gate logs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getSchoolDb();
    const body = await req.json();

    const {
      staffId = null,
      staffName,
      employeeId,
      department = null,
      direction,
      transitMode = 'pedestrian',
      vehicleRegistration = null,
      notes = '',
      securityOfficerName = 'Security Desk',
    } = body;

    if (!staffName?.trim() || !direction?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Staff name and transit direction are required.' },
        { status: 400 }
      );
    }

    // Normalize direction to ('entry', 'exit')
    const lowerDir = direction.toLowerCase().trim();
    const validDirection = lowerDir.includes('exit') || lowerDir.includes('out') ? 'exit' : 'entry';

    // Normalize transit_mode to ('pedestrian', 'vehicle')
    const lowerMode = (transitMode || '').toLowerCase().trim();
    const validMode = lowerMode.includes('vehic') || lowerMode.includes('car') || lowerMode.includes('drive')
      ? 'vehicle'
      : 'pedestrian';

    // Resolved Employee ID
    const resolvedEmployeeId = employeeId?.trim() || `EMP-${Date.now().toString().slice(-4)}`;

    const { data, error } = await admin
      .from('staff_gate_logs')
      .insert({
        staff_id: staffId || null,
        staff_name: staffName.trim(),
        employee_id: resolvedEmployeeId,
        department: department?.trim() || null,
        direction: validDirection,
        transit_mode: validMode,
        vehicle_registration: validMode === 'vehicle' ? (vehicleRegistration?.trim() || null) : null,
        timestamp: new Date().toISOString(),
        security_officer_name: securityOfficerName?.trim() || 'Security Desk',
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Staff ${data.direction === 'entry' ? 'entry' : 'exit'} logged for ${data.staff_name}`,
      log: {
        id: data.id,
        staffId: data.staff_id,
        staffName: data.staff_name,
        employeeId: data.employee_id,
        department: data.department || '—',
        direction: data.direction,
        transitMode: data.transit_mode,
        vehicleRegistration: data.vehicle_registration,
        timestamp: data.timestamp,
        securityOfficerName: data.security_officer_name,
        notes: data.notes || '',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to record staff gate transit' },
      { status: 500 }
    );
  }
}
