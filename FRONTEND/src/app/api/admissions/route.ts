import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getAdminClient();
    const { data: rows, error } = await sb
      .from('admission_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error && error.code !== '42P01') throw error;

    const applications = (rows || []).map((app: any) => ({
      id: app.id,
      referenceNumber: app.reference_number,
      applicantName: `${app.applicant_first_name} ${app.applicant_last_name}`.trim(),
      firstName: app.applicant_first_name,
      lastName: app.applicant_last_name,
      gender: app.gender,
      appliedClass: app.applying_for_class,
      parentName: app.guardian_name,
      parentPhone: app.guardian_phone,
      parentEmail: app.guardian_email,
      status: app.status === 'accepted' || app.status === 'enrolled' ? 'Accepted' : app.status === 'rejected' || app.status === 'declined' ? 'Declined' : 'Pending Review',
      appliedDate: app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent',
      rawStatus: app.status,
    }));

    return NextResponse.json({
      success: true,
      data: applications,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body; // action: 'accept' | 'decline'

    if (!id || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ success: false, message: 'id and action (accept | decline) required' }, { status: 400 });
    }

    const sb = getAdminClient();

    // 1. Fetch the application
    const { data: app, error: appErr } = await sb
      .from('admission_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (appErr || !app) {
      return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });
    }

    if (action === 'decline') {
      await sb
        .from('admission_applications')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id);

      return NextResponse.json({ success: true, message: 'Application declined.' });
    }

    // 2. Action === 'accept': Enroll pupil into PostgreSQL
    const schoolId = app.school_id || 'a0000000-0000-0000-0000-000000000001';
    const fName = (app.applicant_first_name || '').trim();
    const lName = (app.applicant_last_name || '').trim();

    // Check if student already exists to prevent duplicate creation
    const { data: existingStudent } = await sb
      .from('students')
      .select('id, admission_number, status')
      .eq('school_id', schoolId)
      .ilike('first_name', fName)
      .ilike('last_name', lName)
      .maybeSingle();

    let studentRecord = existingStudent;

    if (!studentRecord) {
      const admissionNo = `OSC-ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: newStu, error: studentErr } = await sb
        .from('students')
        .insert({
          school_id: schoolId,
          admission_number: admissionNo,
          first_name: fName,
          last_name: lName,
          gender: (app.gender || 'male').toLowerCase(),
          dob: app.dob || '2012-05-15',
          status: 'active',
          address: 'Lagos, Nigeria',
        })
        .select()
        .maybeSingle();

      if (studentErr) throw studentErr;
      studentRecord = newStu;
    } else if (studentRecord.status !== 'active') {
      await sb.from('students').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', studentRecord.id);
    }

    // Find class_id
    const { data: classRow } = await sb
      .from('classes')
      .select('id')
      .eq('name', app.applying_for_class)
      .maybeSingle();

    if (classRow && studentRecord) {
      await sb.from('class_enrollments').upsert({
        student_id: studentRecord.id,
        class_id: classRow.id,
        status: 'active',
      }, { onConflict: 'student_id,session_id' });
    }

    // Create guardian & Pickup PIN
    const pickupPin = String(Math.floor(1000 + Math.random() * 9000));
    const guardianParts = (app.guardian_name || 'Guardian').trim().split(' ');
    const gFirst = guardianParts[0] || 'Guardian';
    const gLast = guardianParts.slice(1).join(' ') || 'Contact';

    const { data: newGuardian } = await sb
      .from('guardians')
      .insert({
        first_name: gFirst,
        last_name: gLast,
        phone: app.guardian_phone || '—',
        email: app.guardian_email || '—',
        relationship: 'Parent',
      })
      .select()
      .maybeSingle();

    if (newGuardian && studentRecord) {
      await sb.from('student_guardians').insert({
        student_id: studentRecord.id,
        guardian_id: newGuardian.id,
        relationship: 'Guardian',
        is_primary: true,
        authorized_pickup: true,
        pickup_pin: pickupPin,
      });
    }

    // Update application status to 'accepted'
    await sb
      .from('admission_applications')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id);

    const finalAdmissionNo = studentRecord?.admission_number || '—';

    return NextResponse.json({
      success: true,
      message: `Applicant admitted successfully with admission number ${finalAdmissionNo}.`,
      admissionNumber: finalAdmissionNo,
      pickupPin,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Processing error' },
      { status: 500 }
    );
  }
}
