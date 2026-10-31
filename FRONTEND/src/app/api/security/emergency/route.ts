import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Official Institutional Safety Protocols
const INSTITUTIONAL_PROTOCOLS = [
  {
    id: 'fire_evacuation',
    title: 'Fire Evacuation Protocol',
    category: 'fire',
    priority: 'Critical',
    assemblyPoint: 'Main Sports Field (Zone A & B)',
    immediateActions: [
      'Trigger nearest fire alarm break-glass station immediately.',
      'Notify Central Fire Control via 01-2222222 or 112.',
      'Direct all staff and students via designated fire escape staircases.',
      'Ensure nobody uses elevators or attempts to collect personal items.',
      'Gate security must open all vehicular and pedestrian perimeter gates for fire engine ingress.',
      'Conduct roll-call muster verification at the Main Sports Field.',
    ],
  },
  {
    id: 'campus_lockdown',
    title: 'Campus Perimeter Lockdown',
    category: 'police',
    priority: 'Critical',
    assemblyPoint: 'Secure Classrooms & Reinforced Safe Rooms',
    immediateActions: [
      'Secure and bolt all main gate barriers and pedestrian turnstiles immediately.',
      'Sound continuous short-blast perimeter alert siren.',
      'Instruct all teachers to lock classroom doors, close window blinds, and keep students silent on the floor.',
      'Contact State Police Command Dispatch (112 / 08031234567) reporting Code Red Perimeter Alert.',
      'Dispatch roving patrol guards to monitor CCTV blind spots if safe to do so.',
      'No person may enter or leave the premises until the Principal or Police issue the All-Clear.',
    ],
  },
  {
    id: 'medical_emergency',
    title: 'Medical Trauma Protocol',
    category: 'ambulance',
    priority: 'High',
    assemblyPoint: 'Oakland Health Infirmary (Admin Ground Floor)',
    immediateActions: [
      'Contact School Infirmary Nurse / Medical Officer via 08055554321.',
      'For severe trauma or unconsciousness, dispatch LASAMBUS (112).',
      'Keep patient stable, warm, and do not move if spinal injury is suspected.',
      'Clear perimeter gate pathway and station a guard at Main Gate to guide arriving ambulance.',
      'Notify Principal and student primary guardian immediately.',
    ],
  },
  {
    id: 'utility_failure',
    title: 'Power & Utility Failure Protocol',
    category: 'utility',
    priority: 'Medium',
    assemblyPoint: 'Security Station & Facilities Office',
    immediateActions: [
      'Confirm if power outage is localized or grid-wide.',
      'Switch to primary auxiliary diesel generator bank within 90 seconds.',
      'Verify CCTV surveillance backup UPS batteries are active.',
      'Contact EKEDC Faults Unit (07080655555) for grid updates.',
      'Ensure perimeter floodlights remain operational via inverter systems.',
    ],
  },
];

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.trim().toLowerCase();

    let query = admin
      .from('emergency_contacts')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    let contacts = data || [];

    if (search) {
      contacts = contacts.filter((c: any) =>
        c.service_name?.toLowerCase().includes(search) ||
        c.contact_person?.toLowerCase().includes(search) ||
        c.primary_phone?.toLowerCase().includes(search) ||
        c.secondary_phone?.toLowerCase().includes(search) ||
        c.address?.toLowerCase().includes(search)
      );
    }

    const formatted = contacts.map((c: any) => ({
      id: c.id,
      serviceName: c.service_name,
      category: c.category,
      contactPerson: c.contact_person || '—',
      primaryPhone: c.primary_phone,
      secondaryPhone: c.secondary_phone || null,
      address: c.address || '—',
      displayOrder: c.display_order,
      createdAt: c.created_at,
    }));

    // Categorized counts
    const counts: Record<string, number> = {
      police: 0,
      fire: 0,
      ambulance: 0,
      clinic: 0,
      management: 0,
      utility: 0,
    };

    (data || []).forEach((c: any) => {
      if (counts[c.category] !== undefined) {
        counts[c.category]++;
      }
    });

    return NextResponse.json({
      success: true,
      contacts: formatted,
      totalCount: formatted.length,
      categoryCounts: counts,
      protocols: INSTITUTIONAL_PROTOCOLS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch emergency directory' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await req.json();

    const {
      serviceName,
      category = 'police',
      contactPerson = '',
      primaryPhone,
      secondaryPhone = '',
      address = '',
      displayOrder = 10,
    } = body;

    if (!serviceName?.trim() || !primaryPhone?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Service name and primary phone number are required.' },
        { status: 400 }
      );
    }

    const validCategories = ['police', 'fire', 'ambulance', 'clinic', 'management', 'utility'];
    const validCategory = validCategories.includes(category) ? category : 'police';

    const { data, error } = await admin
      .from('emergency_contacts')
      .insert({
        service_name: serviceName.trim(),
        category: validCategory,
        contact_person: contactPerson?.trim() || null,
        primary_phone: primaryPhone.trim(),
        secondary_phone: secondaryPhone?.trim() || null,
        address: address?.trim() || null,
        display_order: Number(displayOrder) || 10,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Emergency contact ${data.service_name} added successfully.`,
      contact: {
        id: data.id,
        serviceName: data.service_name,
        category: data.category,
        primaryPhone: data.primary_phone,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to add emergency contact' },
      { status: 500 }
    );
  }
}
