import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';


export async function GET(req: NextRequest) {
  try {
    const admin = await getSchoolDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim().toLowerCase();

    let query = admin
      .from('visitors')
      .select('*')
      .order('check_in_time', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    let visitors = data || [];

    if (search) {
      visitors = visitors.filter((v: any) =>
        v.full_name?.toLowerCase().includes(search) ||
        v.pass_number?.toLowerCase().includes(search) ||
        v.phone?.toLowerCase().includes(search) ||
        v.host_name?.toLowerCase().includes(search) ||
        v.organization?.toLowerCase().includes(search) ||
        v.badge_number?.toLowerCase().includes(search) ||
        v.vehicle_registration?.toLowerCase().includes(search)
      );
    }

    const formatted = visitors.map((v: any) => ({
      id: v.id,
      passNumber: v.pass_number,
      fullName: v.full_name,
      phone: v.phone,
      organization: v.organization || '—',
      purpose: v.purpose,
      hostType: v.host_type,
      hostId: v.host_id,
      hostName: v.host_name,
      badgeNumber: v.badge_number || '—',
      vehicleRegistration: v.vehicle_registration || '—',
      checkInTime: v.check_in_time,
      checkOutTime: v.check_out_time,
      status: v.status,
      securityOfficerName: v.security_officer_name,
      notes: v.notes || '',
      createdAt: v.created_at,
    }));

    return NextResponse.json({
      success: true,
      visitors: formatted,
      totalCount: formatted.length,
      activeCount: formatted.filter((v: any) => v.status === 'checked_in').length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch visitors' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getSchoolDb();
    const body = await req.json();

    const {
      fullName,
      phone,
      organization = '',
      purpose,
      hostType = 'staff',
      hostId = null,
      hostName,
      badgeNumber = '',
      vehicleRegistration = '',
      notes = '',
      securityOfficerName = 'Security Desk',
    } = body;

    if (!fullName?.trim() || !phone?.trim() || !purpose?.trim() || !hostName?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Full name, phone, visit purpose, and host name are required.' },
        { status: 400 }
      );
    }

    // Generate unique Pass Number: OAK-VIS-XXXX
    const randomPin = Math.floor(1000 + Math.random() * 9000);
    const passNumber = `${admin.idPrefix}-VIS-${randomPin}`;

    const { data, error } = await admin
      .from('visitors')
      .insert({
        pass_number: passNumber,
        full_name: fullName.trim(),
        phone: phone.trim(),
        organization: organization?.trim() || null,
        purpose: purpose.trim(),
        host_type: hostType,
        host_id: hostId || null,
        host_name: hostName.trim(),
        badge_number: badgeNumber?.trim() || null,
        vehicle_registration: vehicleRegistration?.trim() || null,
        check_in_time: new Date().toISOString(),
        status: 'checked_in',
        security_officer_name: securityOfficerName,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Dispatch in-app notification to host if hostId exists
    if (hostId) {
      try {
        const { data: staff } = await admin
          .from('staff_profiles')
          .select('email, first_name')
          .eq('id', hostId)
          .maybeSingle();

        if (staff?.email) {
          await admin.from('notifications').insert({
            recipient_email: staff.email.toLowerCase(),
            recipient_name: hostName.trim(),
            title: 'Visitor Arrival Notice',
            message: `${fullName.trim()} has checked in at Reception to see you regarding: "${purpose.trim()}". (Pass: ${passNumber})`,
            notification_type: 'broadcast',
            read: false,
          });
        }
      } catch (notifErr) {
        console.warn('Failed to send visitor arrival notification:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Visitor ${fullName.trim()} checked in successfully. Pass: ${passNumber}`,
      visitor: {
        id: data.id,
        passNumber: data.pass_number,
        fullName: data.full_name,
        phone: data.phone,
        organization: data.organization || '—',
        purpose: data.purpose,
        hostType: data.host_type,
        hostId: data.host_id,
        hostName: data.host_name,
        badgeNumber: data.badge_number || '—',
        vehicleRegistration: data.vehicle_registration || '—',
        checkInTime: data.check_in_time,
        status: data.status,
        securityOfficerName: data.security_officer_name,
        notes: data.notes || '',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to check in visitor' },
      { status: 500 }
    );
  }
}
