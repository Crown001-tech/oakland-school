import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getSchoolDb();
    const { id } = await params;

    const { data: delivery, error: findErr } = await admin
      .from('deliveries')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr || !delivery) {
      return NextResponse.json(
        { success: false, message: 'Delivery record not found' },
        { status: 404 }
      );
    }

    if (delivery.status === 'collected') {
      return NextResponse.json(
        { success: false, message: 'Package has already been collected.' },
        { status: 400 }
      );
    }

    // Resolve recipient email
    let recipientEmail: string | null = null;
    let recipientName = delivery.recipient_name;

    if (delivery.recipient_id) {
      const { data: staff } = await admin
        .from('staff_profiles')
        .select('email, first_name, last_name')
        .eq('id', delivery.recipient_id)
        .maybeSingle();

      if (staff?.email) {
        recipientEmail = staff.email;
        recipientName = `${staff.first_name} ${staff.last_name}`.trim();
      }
    } else {
      const { data: staff } = await admin
        .from('staff_profiles')
        .select('email, first_name, last_name')
        .ilike('first_name', `%${delivery.recipient_name.split(' ')[0]}%`)
        .maybeSingle();

      if (staff?.email) {
        recipientEmail = staff.email;
      }
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, message: 'Could not resolve email address for this recipient.' },
        { status: 400 }
      );
    }

    await admin.from('notifications').insert({
      school_id: admin.schoolId,
      recipient_email: recipientEmail.toLowerCase(),
      recipient_name: recipientName,
      subject: `Reminder: Package Awaiting Collection (${delivery.tracking_code})`,
      content_html: `Gentle reminder: Your ${delivery.package_type} (${delivery.package_description}) from ${delivery.courier_service} has been awaiting collection at the Reception Desk since ${new Date(delivery.received_time).toLocaleDateString('en-GB')}. Tracking Code: ${delivery.tracking_code}. Please pick it up at your earliest convenience.`,
      notification_type: 'broadcast',
      status: 'sent',
      attempts_count: 0,
      idempotency_key: `notif-del-remind-${delivery.id}-${Date.now()}`,
    });

    await admin
      .from('deliveries')
      .update({ status: 'notified' })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: `Collection reminder sent to ${recipientName} (${recipientEmail})`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to send reminder notification' },
      { status: 500 }
    );
  }
}
