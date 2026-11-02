import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSchoolDb();
    const { id } = await params;
    const body = await req.json();

    const {
      collectedByName,
      notes = '',
    } = body;

    if (!collectedByName?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Collector name is required for package handover.' },
        { status: 400 }
      );
    }

    const { data: existing, error: findErr } = await admin
      .from('deliveries')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr || !existing) {
      return NextResponse.json(
        { success: false, message: 'Delivery record not found' },
        { status: 404 }
      );
    }

    if (existing.status === 'collected') {
      return NextResponse.json(
        { success: false, message: 'Package has already been collected.' },
        { status: 400 }
      );
    }

    const updatedNotes = notes?.trim()
      ? `${existing.notes ? existing.notes + ' | ' : ''}Collected by: ${collectedByName.trim()}. Note: ${notes.trim()}`
      : existing.notes;

    const { data: updated, error: updateErr } = await admin
      .from('deliveries')
      .update({
        status: 'collected',
        collected_time: new Date().toISOString(),
        collected_by_name: collectedByName.trim(),
        notes: updatedNotes,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Cross-portal dispatch: Notify original recipient if different from collector
    try {
      if (existing.recipient_id) {
        const { data: staff } = await admin
          .from('staff_profiles')
          .select('email, first_name')
          .eq('id', existing.recipient_id)
          .maybeSingle();

        if (staff?.email) {
          await admin.from('notifications').insert({
            school_id: admin.schoolId,
            recipient_email: staff.email.toLowerCase(),
            recipient_name: staff.first_name || existing.recipient_name,
            subject: `Package Handover Confirmed: ${existing.tracking_code}`,
            content_html: `Your package (${existing.package_type}: ${existing.package_description}) from ${existing.courier_service} was collected at Reception by ${collectedByName.trim()} at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`,
            notification_type: 'broadcast',
            status: 'sent',
            attempts_count: 0,
            idempotency_key: `notif-del-col-${updated.id}-${Date.now()}`,
          });
        }
      }
    } catch (notifErr) {
      console.warn('Collection notification notice:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Package ${updated.tracking_code} marked as collected by ${updated.collected_by_name}`,
      delivery: {
        id: updated.id,
        trackingCode: updated.tracking_code,
        status: updated.status,
        collectedTime: updated.collected_time,
        collectedByName: updated.collected_by_name,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to confirm package collection' },
      { status: 500 }
    );
  }
}
