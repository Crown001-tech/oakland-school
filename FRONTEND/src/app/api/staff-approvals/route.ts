import { NextResponse, type NextRequest } from 'next/server';
import { generateStaffTempPassword, hashInviteToken } from '@/lib/supabase/admin';
import { getSchoolDb } from '@/lib/school-db';



export async function GET() {
  try {
    const sb = await getSchoolDb();
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
      photoUrl: a.photo_url,
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
    const sb = await getSchoolDb();

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

    // 1. Create or ensure Supabase Auth user with a unique per-person temporary password
    let userId: string | null = null;
    const tempPassword = generateStaffTempPassword();
    const tokenHash = hashInviteToken(tempPassword);
    const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    try {
      const { data: userData } = await sb.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: assignedRole || 'teacher',
          staff_role: assignedRole === 'admin' ? 'Principal' : assignedRole === 'bursar' ? 'Bursar' : 'Teacher',
          default_password: tempPassword,
          password_changed: false,
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

    let photoUrl = body.photoUrl || null;
    if (applicantId && applicantId.length === 36) {
      const { data: appData } = await sb
        .from('staff_applications')
        .select('photo_url')
        .eq('id', applicantId)
        .maybeSingle();
      if (appData?.photo_url && !photoUrl) {
        photoUrl = appData.photo_url;
      }
    }

    // 2. Insert into staff_profiles in PostgreSQL
    const { data: newStaff, error: staffErr } = await sb
      .from('staff_profiles')
      .insert({
        school_id: sb.schoolId,
        user_id: userId,
        employee_id: employeeId || `${sb.idPrefix}-STF-${Math.floor(100 + Math.random() * 900)}`,
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        phone: phone || null,
        photo_url: photoUrl,
        role: assignedRole === 'admin' ? 'admin' : assignedRole === 'bursar' ? 'bursar' : 'teacher',
        department: department || 'Academics',
        qualification: qualification || 'B.Ed',
        subjects: assignedSubject ? [assignedSubject] : [],
        assigned_class: assignedClasses?.[0] || null,
        is_active: true,
        must_change_password: true,
        invite_token_hash: tokenHash,
        invite_expires_at: inviteExpiresAt,
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

    // 4. Institutional Audit Log (DEF-003)
    try {
      await sb.from('audit_logs').insert({
        school_id: sb.schoolId,
        actor_name: 'Office of the Proprietor',
        actor_role: 'Proprietor',
        action: 'STAFF.APPOINTED',
        resource_type: 'staff_profile',
        resource_id: newStaff.id,
        metadata: {
          summary: `${firstName} ${lastName} appointed as ${newStaff.employee_id || employeeId}`,
          role: assignedRole,
          department,
          employeeId: newStaff.employee_id || employeeId,
        },
      });
    } catch (auditErr) {
      console.warn('Audit logging error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `${firstName} ${lastName} successfully approved and provisioned as staff.`,
      data: {
        ...newStaff,
        temporaryPassword: tempPassword,
      },
      temporaryPassword: tempPassword,
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
    const sb = await getSchoolDb();

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

    // Institutional Audit Log (DEF-003)
    try {
      await sb.from('audit_logs').insert({
        school_id: sb.schoolId,
        actor_name: 'Office of the Proprietor',
        actor_role: 'Proprietor',
        action: action === 'decline' ? 'STAFF.APPLICATION_DECLINED' : 'STAFF.APPLICATION_STATUS_UPDATED',
        resource_type: 'staff_application',
        resource_id: applicantId,
        metadata: {
          status: newStatus,
          action,
        },
      });
    } catch (auditErr) {
      console.warn('Audit logging error:', auditErr);
    }

    return NextResponse.json({ success: true, message: `Application status updated to ${newStatus}` });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    );
  }
}
