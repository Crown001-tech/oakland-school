import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCaller, formatRoleLabel } from '@/lib/caller';

function getAdminClient() {
  return getSupabaseAdmin();
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
      department: app.department || null,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getAdminClient();

    // 1. Resolve school_id
    const { data: school } = await sb
      .from('schools')
      .select('id')
      .limit(1)
      .maybeSingle();

    const schoolId = school?.id || 'a0000000-0000-0000-0000-000000000001';

    // 2. Generate structured reference number
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const referenceNumber = `OSC-ADM-2026-${randSuffix}`;

    const firstName = (body.firstName || body.applicantFirstName || '').trim();
    const lastName = (body.surname || body.lastName || body.applicantLastName || '').trim();
    const gender = (body.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
    const dob = body.dateOfBirth || body.dob || null;
    if (!dob) {
      return NextResponse.json(
        { success: false, message: 'Applicant date of birth is required.' },
        { status: 400 }
      );
    }
    const applyingForClass = (body.appliedClass || body.applyingForClass || body.classApplyingFor || 'JSS 1').trim();
    const guardianName = (body.parentName || body.guardianName || 'Guardian').trim();
    const guardianPhone = (body.parentPhone || body.guardianPhone || '—').trim();
    const guardianEmail = (body.parentEmail || body.guardianEmail || '—').trim();

    // 2. Deduplication / Idempotency check (DEF-004)
    if (firstName && lastName) {
      const { data: existingApp } = await sb
        .from('admission_applications')
        .select('id, reference_number, created_at')
        .eq('applicant_first_name', firstName)
        .eq('applicant_last_name', lastName)
        .eq('applying_for_class', applyingForClass)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingApp && existingApp.created_at) {
        const diffMs = Date.now() - new Date(existingApp.created_at).getTime();
        // If submitted within last 5 minutes, return existing reference cleanly
        if (diffMs < 5 * 60 * 1000) {
          return NextResponse.json({
            success: true,
            message: 'Application already received and registered.',
            referenceNumber: existingApp.reference_number,
            data: existingApp,
          });
        }
      }
    }

    const notesMetadata = {
      middleName: body.middleName || '',
      fatherName: body.fatherName || '',
      fatherPhone: body.fatherPhone || '',
      fatherEmail: body.fatherEmail || '',
      motherName: body.motherName || '',
      motherPhone: body.motherPhone || '',
      motherEmail: body.motherEmail || '',
      residentialAddress: body.residentialAddress || '',
      stateOfOrigin: body.stateOfOrigin || '',
      lga: body.lga || '',
      religion: body.religion || '',
      previousSchool: body.previousSchool || '',
      lastClassPassed: body.lastClassPassed || '',
      bloodGroup: body.bloodGroup || '',
      genotype: body.genotype || '',
      medicalConditions: body.medicalConditions || '',
    };

    const { data, error } = await sb
      .from('admission_applications')
      .insert({
        school_id: schoolId,
        reference_number: referenceNumber,
        applicant_first_name: firstName,
        applicant_last_name: lastName,
        dob,
        gender,
        applying_for_class: applyingForClass,
        department: body.department || null,
        guardian_name: guardianName,
        guardian_email: guardianEmail,
        guardian_phone: guardianPhone,
        status: 'submitted',
        documents: body.documents || [],
        notes: JSON.stringify(notesMetadata),
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting admission application:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      referenceNumber,
      data,
      message: 'Application registered successfully.',
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

    // 2. Action === 'accept': Enroll student into PostgreSQL
    const schoolId = app.school_id || 'a0000000-0000-0000-0000-000000000001';
    const fName = (app.applicant_first_name || '').trim();
    const lName = (app.applicant_last_name || '').trim();

    // Check if student already exists to prevent duplicate creation
    const { data: existingStudent } = await sb
      .from('students')
      .select('id, admission_number, status, department')
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
          dob: app.dob || null,
          department: app.department || null,
          status: 'active',
          address: 'Lagos, Nigeria',
        })
        .select()
        .maybeSingle();

      if (studentErr) throw studentErr;
      studentRecord = newStu;
    } else {
      await sb
        .from('students')
        .update({
          status: 'active',
          department: app.department || studentRecord.department || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentRecord.id);
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
        session_id: 'b0000000-0000-0000-0000-000000000001',
        department: app.department || null,
        status: 'active',
      }, { onConflict: 'student_id,session_id' });
    }

    // Create guardian & Pickup PIN
    const pickupPin = String(Math.floor(1000 + Math.random() * 9000));
    const guardianParts = (app.guardian_name || 'Guardian').trim().split(' ');
    const gFirst = guardianParts[0] || 'Guardian';
    const gLast = guardianParts.slice(1).join(' ') || 'Contact';

    // Find or create guardian with school_id (resolves DEF-133)
    let guardianId: string | null = null;
    if (app.guardian_email && app.guardian_email !== '—') {
      const { data: existingG } = await sb
        .from('guardians')
        .select('id')
        .eq('school_id', schoolId)
        .eq('email', app.guardian_email.trim().toLowerCase())
        .maybeSingle();
      if (existingG) guardianId = existingG.id;
    }

    if (!guardianId) {
      const { data: newGuardian, error: guardianErr } = await sb
        .from('guardians')
        .insert({
          school_id: schoolId,
          first_name: gFirst,
          last_name: gLast,
          phone: app.guardian_phone || '—',
          email: app.guardian_email || '—',
          relationship: 'Parent',
        })
        .select('id')
        .maybeSingle();

      if (!guardianErr && newGuardian) {
        guardianId = newGuardian.id;
      }
    }

    if (guardianId && studentRecord) {
      await sb.from('student_guardians').upsert({
        student_id: studentRecord.id,
        guardian_id: guardianId,
        relationship: 'Guardian',
        is_primary: true,
        authorized_pickup: true,
        pickup_pin: pickupPin,
      }, { onConflict: 'student_id,guardian_id' });
    }

    // Update application status to 'accepted'
    await sb
      .from('admission_applications')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id);

    const finalAdmissionNo = studentRecord?.admission_number || '—';

    // Institutional Audit Log (DEF-003)
    try {
      const caller = await getCaller();
      const actorRole = formatRoleLabel(caller.role);
      const actorName = caller.email || actorRole;

      await sb.from('audit_logs').insert({
        school_id: schoolId,
        actor_id: caller.userId,
        actor_name: actorName,
        actor_role: actorRole,
        action: 'ADMISSION.ACCEPTED',
        resource_type: 'admission_application',
        resource_id: id,
        metadata: {
          applicantName: `${fName} ${lName}`,
          admissionNumber: finalAdmissionNo,
          admittedClass: app.applying_for_class,
        },
      });
    } catch (auditErr) {
      console.warn('Audit logging warning:', auditErr);
    }

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
