import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';

// Open to visitors, for the school of the address they came in on (the public site and the sign-in page)
export async function GET() {
  try {
    const sb = await getSchoolDb({ allowVisitor: true });

    // 1. Fetch School Details
    const { data: school, error: schoolErr } = await sb
      .from('schools')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (schoolErr) throw schoolErr;

    // 2. Fetch Current Academic Session & Term
    const [sessionRes, termRes, execRes] = await Promise.all([
      sb.from('academic_sessions').select('*').eq('is_current', true).maybeSingle(),
      sb.from('academic_terms').select('*').eq('is_current', true).maybeSingle(),
      sb.from('staff_profiles').select('*').eq('role', 'admin').eq('is_active', true).maybeSingle(),
    ]);

    const principalName = execRes.data
      ? `${execRes.data.first_name} ${execRes.data.last_name}`.trim()
      : 'Unassigned';

    return NextResponse.json({
      success: true,
      data: {
        id: sb.schoolId,
        idPrefix: sb.idPrefix,
        name: school?.name || '',
        code: school?.code || '',
        motto: school?.motto || '',
        address: school?.address || '',
        phone: school?.phone || '',
        email: school?.email || '',
        rcNumber: school?.settings?.rc_number || '',
        foundedYear: school?.settings?.founded_year || '',
        accreditation: school?.settings?.accreditation || '',
        secondaryPhone: school?.settings?.secondary_phone || '',
        admissionsEmail: school?.settings?.admissions_email || '',
        websiteUrl: school?.settings?.website_url || '',
        currentSession: sessionRes.data?.name || '',
        currentTerm: termRes.data?.name || '',
        termStartDate: termRes.data?.start_date || '',
        termEndDate: termRes.data?.end_date || '',
        nextTermResumption: school?.settings?.next_term_resumption || '',
        principalName,
        proprietorName: school?.settings?.proprietor_name || 'Proprietor',
        proprietorTitle: school?.settings?.proprietor_title || 'Proprietor',
        proprietorPhone: school?.settings?.proprietor_phone || school?.phone || '',
        proprietorEmail: school?.settings?.proprietor_email || school?.email || '',
        proprietorOffice: school?.settings?.proprietor_office || '',
        proprietorBio: school?.settings?.proprietor_bio || '',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = await getSchoolDb();

    // 1. Retrieve current school row
    const { data: currentSchool } = await sb
      .from('schools')
      .select('id, settings')
      .limit(1)
      .maybeSingle();

    const schoolId = sb.schoolId;
    const mergedSettings = {
      ...(currentSchool?.settings || {}),
      rc_number: body.rcNumber || currentSchool?.settings?.rc_number,
      founded_year: body.foundedYear || currentSchool?.settings?.founded_year,
      accreditation: body.accreditation || currentSchool?.settings?.accreditation,
      secondary_phone: body.secondaryPhone || currentSchool?.settings?.secondary_phone,
      admissions_email: body.admissionsEmail || currentSchool?.settings?.admissions_email,
      website_url: body.websiteUrl || currentSchool?.settings?.website_url,
      next_term_resumption: body.nextTermResumption || currentSchool?.settings?.next_term_resumption,
      proprietor_name: body.proprietorName || currentSchool?.settings?.proprietor_name,
      proprietor_title: body.title || body.proprietorTitle || currentSchool?.settings?.proprietor_title,
      proprietor_phone: body.phone || body.proprietorPhone || currentSchool?.settings?.proprietor_phone,
      proprietor_email: body.email || body.proprietorEmail || currentSchool?.settings?.proprietor_email,
      proprietor_office: body.office || body.proprietorOffice || currentSchool?.settings?.proprietor_office,
      proprietor_bio: body.bio || body.proprietorBio || currentSchool?.settings?.proprietor_bio,
    };

    const updatePayload: Record<string, any> = {
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    };

    if (body.name) updatePayload.name = body.name;
    if (body.motto) updatePayload.motto = body.motto;
    if (body.code) updatePayload.code = body.code;
    if (body.address) updatePayload.address = body.address;
    if (body.phone) updatePayload.phone = body.phone;
    if (body.email) updatePayload.email = body.email;

    const { data, error } = await sb
      .from('schools')
      .update(updatePayload)
      .eq('id', schoolId)
      .select()
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'School profile updated successfully in PostgreSQL.',
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Update error' },
      { status: 500 }
    );
  }
}
