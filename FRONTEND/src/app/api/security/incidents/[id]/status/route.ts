import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = createAdminClient();
    const { id } = await params;
    const body = await req.json();

    const {
      status,
      resolutionNotes = '',
    } = body;

    const validStatuses = ['open', 'under_investigation', 'resolved', 'escalated'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Valid status required: open, under_investigation, resolved, escalated' },
        { status: 400 }
      );
    }

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

    const updatedNotes = resolutionNotes?.trim()
      ? `${existing.resolution_notes ? existing.resolution_notes + ' | ' : ''}${resolutionNotes.trim()}`
      : existing.resolution_notes;

    const { data: updated, error: updateErr } = await admin
      .from('security_incidents')
      .update({
        status,
        resolution_notes: updatedNotes,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: `Incident ${updated.incident_number} status updated to ${updated.status}`,
      incident: {
        id: updated.id,
        incidentNumber: updated.incident_number,
        status: updated.status,
        resolutionNotes: updated.resolution_notes,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to update incident status' },
      { status: 500 }
    );
  }
}
