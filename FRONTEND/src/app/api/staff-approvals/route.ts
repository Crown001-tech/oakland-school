import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getAdminClient();
    const { data: apps, error } = await sb
      .from('staff_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (apps || []).map((a: any) => ({
      id: a.id,
      name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Applicant',
      firstName: a.first_name,
      lastName: a.last_name,
      email: a.email,
      phone: a.phone || '—',
      desiredRole: a.role_applied || 'teacher',
      department: a.department || 'Academics',
      qualification: a.qualification || '—',
      experience: a.years_of_experience ? `${a.years_of_experience} years` : '—',
      appliedAt: a.created_at
        ? new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
      status: a.status === 'rejected' ? 'declined' : a.status === 'approved' ? 'approved' : 'pending',
      resumeUrl: a.resume_url,
      notes: a.notes,
    }));

    return NextResponse.json({ success: true, data: formatted });
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

    const {
      applicantId,
      assignedRole,
      assignedSubject,
      assignedClasses,
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      department,
      qualification,
    } = body;

    if (!applicantId && (!firstName || !email)) {
      return NextResponse.json(
        { success: false, message: 'Applicant data is required' },
        { status: 400 }
      );
    }

    // 1. Create or ensure Supabase Auth user with default password Oakland@2026
    let userId: string | null = null;
    try {
      const { data: userData } = await sb.auth.admin.createUser({
        email: email.toLowerCase(),
        password: 'Oakland@2026',
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: assignedRole || 'teacher',
          staff_role: assignedRole === 'admin' ? 'Principal' : assignedRole === 'bursar' ? 'Bursar' : 'Teacher',
          default_password: 'Oakland@2026',
          teaching_assignments: assignedSubject ? [{ subject: assignedSubject, classes: assignedClasses || [] }] : [],
        },
      });
      userId = userData?.user?.id || null;
    } catch (authErr: any) {
      // If user already exists in Auth, fetch their ID
      const { data: usersList } = await sb.auth.admin.listUsers();
      const existing = (usersList?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      userId = existing?.id || null;
    }

    // 2. Insert into staff_profiles in PostgreSQL
    const { data: newStaff, error: staffErr } = await sb
      .from('staff_profiles')
      .insert({
        school_id: DEFAULT_SCHOOL_ID,
        user_id: userId,
        employee_id: employeeId || `OAK-STF-${Math.floor(100 + Math.random() * 900)}`,
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        phone: phone || null,
        role: assignedRole === 'admin' ? 'admin' : assignedRole === 'bursar' ? 'bursar' : 'teacher',
        department: department || 'Academics',
        qualification: qualification || 'B.Ed',
        subjects: assignedSubject ? [assignedSubject] : [],
        assigned_class: assignedClasses?.[0] || null,
        is_active: true,
      })
      .select()
      .single();

    if (staffErr) throw staffErr;

    // 3. Mark application as approved if applicantId exists
    if (applicantId && applicantId.length === 36) {
      await sb
        .from('staff_applications')
        .update({ status: 'approved', notes: `Approved as ${employeeId}` })
        .eq('id', applicantId);
    }

    return NextResponse.json({
      success: true,
      message: `${firstName} ${lastName} successfully approved and provisioned as staff.`,
      data: newStaff,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Provisioning failed' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getAdminClient();

    const { applicantId, action } = body;
    if (!applicantId) {
      return NextResponse.json({ success: false, message: 'Applicant ID is required' }, { status: 400 });
    }

    const newStatus = action === 'decline' ? 'rejected' : 'pending';
    const { error } = await sb
      .from('staff_applications')
      .update({ status: newStatus })
      .eq('id', applicantId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: `Application status updated to ${newStatus}` });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    );
  }
}
