import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search')?.trim().toLowerCase();

    let query = admin
      .from('deliveries')
      .select('*')
      .order('received_time', { ascending: false });

    if (status && status !== 'all') {
      if (status === 'awaiting') {
        query = query.neq('status', 'collected');
      } else {
        query = query.eq('status', status);
      }
    }

    if (type && type !== 'all') {
      query = query.eq('package_type', type);
    }

    const { data, error } = await query;
    if (error) throw error;

    let deliveries = data || [];

    if (search) {
      deliveries = deliveries.filter((d: any) =>
        d.tracking_code?.toLowerCase().includes(search) ||
        d.courier_service?.toLowerCase().includes(search) ||
        d.sender_name?.toLowerCase().includes(search) ||
        d.recipient_name?.toLowerCase().includes(search) ||
        d.department?.toLowerCase().includes(search) ||
        d.package_description?.toLowerCase().includes(search)
      );
    }

    const formatted = deliveries.map((d: any) => ({
      id: d.id,
      trackingCode: d.tracking_code,
      courierService: d.courier_service,
      senderName: d.sender_name || '—',
      recipientType: d.recipient_type,
      recipientId: d.recipient_id,
      recipientName: d.recipient_name,
      department: d.department || '—',
      packageDescription: d.package_description,
      packageType: d.package_type,
      receivedTime: d.received_time,
      receivedByOfficer: d.received_by_officer,
      status: d.status,
      collectedTime: d.collected_time,
      collectedByName: d.collected_by_name || null,
      notes: d.notes || '',
      createdAt: d.created_at,
    }));

    // Stats
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: allDeliveries } = await admin
      .from('deliveries')
      .select('status, package_type, collected_time');

    let awaitingCount = 0;
    let collectedTodayCount = 0;
    let confidentialCount = 0;

    (allDeliveries || []).forEach((item: any) => {
      if (item.status !== 'collected') {
        awaitingCount++;
        if (item.package_type === 'confidential') {
          confidentialCount++;
        }
      }
      if (item.status === 'collected' && item.collected_time) {
        if (new Date(item.collected_time) >= startOfToday) {
          collectedTodayCount++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      deliveries: formatted,
      totalCount: formatted.length,
      stats: {
        awaitingCollection: awaitingCount,
        collectedToday: collectedTodayCount,
        totalLogged: allDeliveries?.length || 0,
        confidentialPackages: confidentialCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await req.json();

    const {
      courierService,
      senderName = '',
      recipientType = 'staff',
      recipientId = null,
      recipientName,
      department = '',
      packageDescription,
      packageType = 'parcel',
      securityOfficerName = 'Security Desk',
      notes = '',
      customTrackingCode = '',
    } = body;

    if (!courierService?.trim() || !recipientName?.trim() || !packageDescription?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Courier service, recipient name, and package description are required.' },
        { status: 400 }
      );
    }

    // Normalize recipient_type: ('staff', 'department', 'school')
    const lowerRecType = (recipientType || '').toLowerCase().trim();
    let validRecType: 'staff' | 'department' | 'school' = 'staff';
    if (lowerRecType.includes('dep')) validRecType = 'department';
    else if (lowerRecType.includes('sch') || lowerRecType.includes('admin')) validRecType = 'school';

    // Normalize package_type: ('document', 'parcel', 'box', 'equipment', 'confidential')
    const lowerPkgType = (packageType || '').toLowerCase().trim();
    const validPkgTypes = ['document', 'parcel', 'box', 'equipment', 'confidential'];
    const validPkgType = validPkgTypes.includes(lowerPkgType) ? lowerPkgType : 'parcel';

    // Tracking code: use provided or generate unique OAK-DEL-XXXX
    let trackingCode = customTrackingCode?.trim().toUpperCase();
    if (!trackingCode) {
      const randomPin = Math.floor(1000 + Math.random() * 9000);
      trackingCode = `OAK-DEL-${randomPin}`;
    }

    const { data, error } = await admin
      .from('deliveries')
      .insert({
        tracking_code: trackingCode,
        courier_service: courierService.trim(),
        sender_name: senderName?.trim() || null,
        recipient_type: validRecType,
        recipient_id: recipientId || null,
        recipient_name: recipientName.trim(),
        department: department?.trim() || null,
        package_description: packageDescription.trim(),
        package_type: validPkgType,
        received_time: new Date().toISOString(),
        received_by_officer: securityOfficerName?.trim() || 'Security Desk',
        status: 'received',
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Cross-portal dispatch: Notify Staff Recipient if email can be resolved
    try {
      let recipientEmail: string | null = null;
      let recipientStaffName: string = recipientName.trim();

      if (recipientId) {
        const { data: staff } = await admin
          .from('staff_profiles')
          .select('email, first_name, last_name')
          .eq('id', recipientId)
          .maybeSingle();

        if (staff?.email) {
          recipientEmail = staff.email;
          recipientStaffName = `${staff.first_name} ${staff.last_name}`.trim();
        }
      } else if (validRecType === 'staff') {
        const { data: matchedStaff } = await admin
          .from('staff_profiles')
          .select('email, first_name, last_name')
          .ilike('first_name', `%${recipientName.split(' ')[0]}%`)
          .maybeSingle();

        if (matchedStaff?.email) {
          recipientEmail = matchedStaff.email;
        }
      }

      if (recipientEmail) {
        await admin.from('notifications').insert({
          school_id: 'a0000000-0000-0000-0000-000000000001',
          recipient_email: recipientEmail.toLowerCase(),
          recipient_name: recipientStaffName,
          subject: `Package Arrived at Gate: ${validPkgType.toUpperCase()} (${trackingCode})`,
          content_html: `A ${validPkgType} has been received for you at the Security Desk from ${senderName || courierService}. Tracking Code: ${trackingCode}. Details: ${packageDescription}. Please visit Reception to collect your package.`,
          notification_type: 'broadcast',
          status: 'sent',
          attempts_count: 0,
          idempotency_key: `notif-del-${data.id}-${Date.now()}`,
        });

        // Update status to 'notified'
        await admin.from('deliveries').update({ status: 'notified' }).eq('id', data.id);
        data.status = 'notified';
      }
    } catch (notifErr) {
      console.warn('Delivery notification notice:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Delivery ${data.tracking_code} logged for ${data.recipient_name}`,
      delivery: {
        id: data.id,
        trackingCode: data.tracking_code,
        courierService: data.courier_service,
        senderName: data.sender_name,
        recipientName: data.recipient_name,
        department: data.department,
        packageType: data.package_type,
        status: data.status,
        receivedTime: data.received_time,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to record delivery' },
      { status: 500 }
    );
  }
}
