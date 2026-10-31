import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search')?.trim().toLowerCase();

    let query = admin
      .from('security_incidents')
      .select('*')
      .order('incident_time', { ascending: false });

    if (status && status !== 'all') {
      if (status === 'open_all') {
        query = query.neq('status', 'resolved');
      } else {
        query = query.eq('status', status);
      }
    }

    if (severity && severity !== 'all') {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query;
    if (error) throw error;

    let incidents = data || [];

    if (search) {
      incidents = incidents.filter((inc: any) =>
        inc.incident_number?.toLowerCase().includes(search) ||
        inc.title?.toLowerCase().includes(search) ||
        inc.description?.toLowerCase().includes(search) ||
        inc.location?.toLowerCase().includes(search) ||
        inc.reported_by_name?.toLowerCase().includes(search) ||
        inc.involved_parties?.toLowerCase().includes(search) ||
        inc.category?.toLowerCase().includes(search)
      );
    }

    const formatted = incidents.map((inc: any) => ({
      id: inc.id,
      incidentNumber: inc.incident_number,
      category: inc.category,
      title: inc.title,
      description: inc.description,
      location: inc.location,
      severity: inc.severity,
      reportedByName: inc.reported_by_name,
      involvedParties: inc.involved_parties || '—',
      actionTaken: inc.action_taken || '—',
      status: inc.status,
      escalatedTo: inc.escalated_to || null,
      resolutionNotes: inc.resolution_notes || '',
      incidentTime: inc.incident_time,
      createdAt: inc.created_at,
    }));

    // Stats calculation across all incidents
    const { data: allInc } = await admin
      .from('security_incidents')
      .select('status, severity');

    let openCount = 0;
    let criticalCount = 0;
    let escalatedCount = 0;
    let resolvedCount = 0;

    (allInc || []).forEach((item: any) => {
      if (item.status !== 'resolved') {
        openCount++;
        if (item.severity === 'high' || item.severity === 'critical') {
          criticalCount++;
        }
      }
      if (item.status === 'escalated') escalatedCount++;
      if (item.status === 'resolved') resolvedCount++;
    });

    return NextResponse.json({
      success: true,
      incidents: formatted,
      totalCount: formatted.length,
      stats: {
        openIncidents: openCount,
        criticalIncidents: criticalCount,
        escalatedIncidents: escalatedCount,
        resolvedIncidents: resolvedCount,
        totalLogged: allInc?.length || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch security incidents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await req.json();

    const {
      category = 'other',
      title,
      description,
      location,
      severity = 'medium',
      reportedByName = 'Security Desk',
      involvedParties = '',
      actionTaken = '',
      escalateImmediately = false,
      escalatedTo = 'Principal - Mr Seyi Bankole',
    } = body;

    if (!title?.trim() || !description?.trim() || !location?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Title, description, and location are required.' },
        { status: 400 }
      );
    }

    // Normalize category: ('unauthorized_access', 'suspicious_activity', 'student_misconduct', 'property_damage', 'medical_emergency', 'perimeter_breach', 'vehicle_incident', 'other')
    const validCategories = [
      'unauthorized_access',
      'suspicious_activity',
      'student_misconduct',
      'property_damage',
      'medical_emergency',
      'perimeter_breach',
      'vehicle_incident',
      'other',
    ];
    const lowerCategory = (category || '').toLowerCase().trim();
    const validCategory = validCategories.includes(lowerCategory) ? lowerCategory : 'other';

    // Normalize severity: ('low', 'medium', 'high', 'critical')
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const lowerSeverity = (severity || '').toLowerCase().trim();
    const validSeverity = validSeverities.includes(lowerSeverity) ? lowerSeverity : 'medium';

    // Initial status
    const initialStatus = escalateImmediately ? 'escalated' : 'open';

    // Generate Incident Number: OAK-INC-XXXX
    const randomPin = Math.floor(1000 + Math.random() * 9000);
    const incidentNumber = `OAK-INC-${randomPin}`;

    const { data, error } = await admin
      .from('security_incidents')
      .insert({
        incident_number: incidentNumber,
        category: validCategory,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        severity: validSeverity,
        reported_by_name: reportedByName.trim(),
        involved_parties: involvedParties?.trim() || null,
        action_taken: actionTaken?.trim() || null,
        status: initialStatus,
        escalated_to: escalateImmediately ? (escalatedTo?.trim() || 'Principal - Mr Seyi Bankole') : null,
        incident_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Cross-portal dispatch: Notify Principal if critical/high or explicitly escalated
    const shouldNotifyPrincipal = escalateImmediately || validSeverity === 'high' || validSeverity === 'critical';
    if (shouldNotifyPrincipal) {
      try {
        const { data: principal } = await admin
          .from('staff_profiles')
          .select('email, first_name, last_name')
          .eq('role', 'admin')
          .maybeSingle();

        const principalEmail = principal?.email || 'seyibankole@gmail.com';
        const principalName = principal ? `${principal.first_name} ${principal.last_name}` : 'Mr Seyi Bankole';

        await admin.from('notifications').insert({
          school_id: 'a0000000-0000-0000-0000-000000000001',
          recipient_email: principalEmail.toLowerCase(),
          recipient_name: principalName,
          subject: `🚨 Security Incident: [${validSeverity.toUpperCase()}] ${title.trim()} (${incidentNumber})`,
          content_html: `A ${validSeverity.toUpperCase()} priority incident has been logged by ${reportedByName.trim()} at ${location.trim()}.<br/><br/><strong>Incident:</strong> ${incidentNumber}<br/><strong>Category:</strong> ${validCategory}<br/><strong>Details:</strong> ${description.trim()}<br/><strong>Action Taken:</strong> ${actionTaken?.trim() || 'Perimeter team alerted'}<br/><strong>Status:</strong> ${initialStatus.toUpperCase()}`,
          notification_type: 'emergency',
          status: 'sent',
          attempts_count: 0,
          idempotency_key: `notif-inc-${data.id}-${Date.now()}`,
        });
      } catch (notifErr) {
        console.warn('Incident alert dispatch notice:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Incident ${data.incident_number} logged successfully`,
      incident: {
        id: data.id,
        incidentNumber: data.incident_number,
        title: data.title,
        category: data.category,
        location: data.location,
        severity: data.severity,
        status: data.status,
        incidentTime: data.incident_time,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to log security incident' },
      { status: 500 }
    );
  }
}
