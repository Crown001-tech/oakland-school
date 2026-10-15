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
        id: school?.id || 'a0000000-0000-0000-0000-000000000001',
        name: school?.name || 'Oakland International College',
        code: school?.code || 'OAK-001',
        motto: school?.motto || 'Excellence, Integrity, Leadership',
        address: school?.address || '14 Academic Crescent, Victoria Island, Lagos',
        phone: school?.phone || '+234 800 625 5263',
        email: school?.email || 'admin@oaklandschools.edu',
        rcNumber: school?.settings?.rc_number || 'RC-1849204',
        foundedYear: school?.settings?.founded_year || '2014',
        accreditation: school?.settings?.accreditation || 'WAEC & NECO Approved Exam Centre #LAG-8891',
        secondaryPhone: school?.settings?.secondary_phone || '+234 802 123 4567',
        admissionsEmail: school?.settings?.admissions_email || 'admissions@oaklandschools.edu',
        websiteUrl: school?.settings?.website_url || 'https://oaklandschools.edu',
        currentSession: sessionRes.data?.name || '2026/2027',
        currentTerm: termRes.data?.name || 'First Term',
        termStartDate: termRes.data?.start_date || '2026-09-01',
        termEndDate: termRes.data?.end_date || '2026-12-18',
        nextTermResumption: school?.settings?.next_term_resumption || '2027-01-11',
        principalName,
        proprietorName: school?.settings?.proprietor_name || 'School Proprietor',
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
    const sb = getAdminClient();

    // 1. Retrieve current school row
    const { data: currentSchool } = await sb
      .from('schools')
      .select('id, settings')
      .limit(1)
      .maybeSingle();

    const schoolId = currentSchool?.id || 'a0000000-0000-0000-0000-000000000001';
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
