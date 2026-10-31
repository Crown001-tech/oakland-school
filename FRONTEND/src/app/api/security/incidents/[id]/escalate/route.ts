import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = createAdminClient();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const {
      escalatedTo = 'Principal - Mr Seyi Bankole',
      notes = '',
    } = body;

    const { data: existing, error: findErr } = await admin
      .from('security_incidents')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr || !existing) {
      return NextResponse.json(
        { success: false, message: 'Incident record not found' },
        { status: 404 }
      );
    }

    const updatedResolutionNotes = notes?.trim()
      ? `${existing.resolution_notes ? existing.resolution_notes + ' | ' : ''}Escalated to ${escalatedTo}: ${notes.trim()}`
      : existing.resolution_notes;

    const { data: updated, error: updateErr } = await admin
      .from('security_incidents')
      .update({
        status: 'escalated',
        escalated_to: escalatedTo.trim(),
        resolution_notes: updatedResolutionNotes,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Cross-portal dispatch: Notify Principal of escalation
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
        subject: `⚠️ INCIDENT ESCALATION: ${updated.incident_number} (${updated.title})`,
        content_html: `Security incident <strong>${updated.incident_number}</strong> (${updated.title}) at ${updated.location} has been escalated for your executive review.<br/><br/><strong>Severity:</strong> ${updated.severity.toUpperCase()}<br/><strong>Details:</strong> ${updated.description}<br/><strong>Escalation Notes:</strong> ${notes?.trim() || 'Immediate executive decision required'}`,
        notification_type: 'emergency',
        status: 'sent',
        attempts_count: 0,
        idempotency_key: `notif-inc-esc-${updated.id}-${Date.now()}`,
      });
    } catch (notifErr) {
      console.warn('Escalation notification notice:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Incident ${updated.incident_number} escalated to ${updated.escalated_to}`,
      incident: {
        id: updated.id,
        incidentNumber: updated.incident_number,
        status: updated.status,
        escalatedTo: updated.escalated_to,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to escalate security incident' },
      { status: 500 }
    );
  }
}
