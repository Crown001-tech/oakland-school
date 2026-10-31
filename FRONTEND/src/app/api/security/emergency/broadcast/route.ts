import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await req.json();

    const {
      broadcastType = 'lockdown',
      title,
      message,
      initiatorName = 'Security Desk',
    } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Broadcast title and emergency instructions are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch all active staff email addresses
    const { data: staffList } = await admin
      .from('staff_profiles')
      .select('id, email, first_name, last_name')
      .eq('is_active', true);

    const now = new Date();
    const alertId = `ALERT-${Date.now().toString().slice(-6)}`;

    // 2. Insert emergency broadcast notifications
    const notificationsToInsert = (staffList || [])
      .filter((s: any) => s.email)
      .map((s: any) => ({
        school_id: 'a0000000-0000-0000-0000-000000000001',
        recipient_email: s.email.toLowerCase(),
        recipient_name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Staff Member',
        subject: `🚨 [EMERGENCY BROADCAST]: ${title.trim().toUpperCase()}`,
        content_html: `<div style="background:#fee2e2;border:2px solid #ef4444;border-radius:8px;padding:16px;color:#991b1b;">
          <h2 style="margin:0 0 8px 0;color:#b91c1c;">⚠️ EMERGENCY CAMPUS ALERT: ${title.trim().toUpperCase()}</h2>
          <p style="font-size:14px;line-height:1.5;margin:0 0 12px 0;">${message.trim()}</p>
          <hr style="border:0;border-top:1px solid #fca5a5;margin:12px 0;" />
          <p style="font-size:12px;margin:0;color:#7f1d1d;">Broadcast Initiated by: <strong>${initiatorName.trim()}</strong> | Reference: ${alertId} | Time: ${now.toLocaleTimeString('en-GB')}</p>
        </div>`,
        notification_type: 'emergency',
        status: 'sent',
        attempts_count: 0,
        idempotency_key: `broadcast-${alertId}-${s.id}`,
      }));

    if (notificationsToInsert.length > 0) {
      await admin.from('notifications').insert(notificationsToInsert);
    }

    // 3. Automatically record a corresponding critical security incident
    const randomPin = Math.floor(1000 + Math.random() * 9000);
    const incidentNumber = `OAK-INC-${randomPin}`;

    await admin.from('security_incidents').insert({
      incident_number: incidentNumber,
      category: broadcastType === 'fire' ? 'medical_emergency' : 'perimeter_breach',
      title: `Emergency Broadcast: ${title.trim()}`,
      description: message.trim(),
      location: 'Campus-wide Alert System',
      severity: 'critical',
      reported_by_name: initiatorName.trim(),
      action_taken: `All-campus emergency broadcast dispatched to ${notificationsToInsert.length} active staff accounts.`,
      status: 'escalated',
      escalated_to: 'Principal - Mr Seyi Bankole',
      incident_time: now.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Emergency broadcast transmitted to ${notificationsToInsert.length} staff members.`,
      alertReference: alertId,
      incidentNumber,
      recipientsCount: notificationsToInsert.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to dispatch emergency broadcast' },
      { status: 500 }
    );
  }
}
