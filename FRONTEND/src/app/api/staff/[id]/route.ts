import { NextResponse, type NextRequest } from 'next/server';
import { getCaller, isAdminRole } from '@/lib/caller';
import {
  generateStaffTempPassword,
  getSupabaseAdmin,
  hashInviteToken,
} from '@/lib/supabase/admin';

function getAdminClient() {
  return getSupabaseAdmin();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const sb = getAdminClient();

    // 1. Fetch Staff Profile from PostgreSQL
    let query = sb.from('staff_profiles').select('*');
    if (id.includes('-') && id.length === 36) {
      query = query.or(`id.eq.${id},user_id.eq.${id}`);
    } else {
      query = query.or(`employee_id.eq.${id},email.eq.${id}`);
    }

    const { data: staff, error: staffErr } = await query.maybeSingle();

    if (staffErr) throw staffErr;
    if (!staff) {
      return NextResponse.json(
        { success: false, message: 'Staff record not found in database' },
        { status: 404 }
      );
    }

    // 2. Fetch Supabase Auth User Metadata for credentials & assignments
    let authUser: any = null;
    try {
      if (staff.user_id) {
        const { data: u } = await sb.auth.admin.getUserById(staff.user_id);
        authUser = u?.user;
      }
      if (!authUser && staff.email) {
        const { data: list } = await sb.auth.admin.listUsers();
        authUser = (list?.users || []).find(
          (u: any) => u.email?.toLowerCase() === staff.email.toLowerCase()
        );
      }
    } catch {}

    const canSeeCredentials = isAdminRole((await getCaller()).role);
    const passwordChanged =
      staff.must_change_password === false || Boolean(authUser?.user_metadata?.password_changed);
    const rawPassword =
      !canSeeCredentials
        ? '—'
        : passwordChanged
        ? 'Changed (Personal)'
        : authUser?.user_metadata?.default_password || '—';
    const rawAssignments = authUser?.user_metadata?.teaching_assignments || [];
    const teacherType = authUser?.user_metadata?.teacher_type || authUser?.user_metadata?.staff_role;

    // Resolve Role
    let resolvedRole: 'Principal' | 'Bursar' | 'Class Teacher' | 'Subject Teacher' | 'Non-Teaching Staff' = 'Subject Teacher';
    if (staff.role === 'admin' || staff.role === 'principal') {
      resolvedRole = 'Principal';
    } else if (staff.role === 'bursar') {
      resolvedRole = 'Bursar';
    } else if (teacherType === 'Class Teacher' || staff.assigned_class) {
      resolvedRole = 'Class Teacher';
    } else if (teacherType === 'Subject Teacher') {
      resolvedRole = 'Subject Teacher';
    } else if (teacherType === 'Non-Teaching Staff') {
      resolvedRole = 'Non-Teaching Staff';
    }

    const assignedHomeroom = staff.assigned_class || null;

    // 4. Fetch Master Institutional Salary Scales from schools.settings
    const { data: schoolData } = await sb
      .from('schools')
      .select('settings')
      .limit(1)
      .maybeSingle();

    const schoolSettings = schoolData?.settings || {};

    let scaleBaseSalary: number = 0;
    let scaleAllowance: number = 0;

    if (resolvedRole === 'Principal') {
      scaleBaseSalary = Number(schoolSettings.salaryPrincipal || 0);
      scaleAllowance = 0;
    } else if (resolvedRole === 'Bursar') {
      scaleBaseSalary = Number(schoolSettings.salaryBursar || 0);
      scaleAllowance = 0;
    } else if (resolvedRole === 'Class Teacher') {
      scaleBaseSalary = Number(schoolSettings.salaryClassTeacher || 0);
      scaleAllowance = Number(schoolSettings.allowanceClassTeacher || 0);
    } else if (resolvedRole === 'Subject Teacher') {
      scaleBaseSalary = Number(schoolSettings.salarySubjectTeacher || 0);
      scaleAllowance = 0;
    } else {
      scaleBaseSalary = Number(schoolSettings.salarySupportStaff || 0);
      scaleAllowance = 0;
    }

    const userMeta = authUser?.user_metadata || {};
    const bankName = staff.bank_name || userMeta.bank_name || null;
    const accountNumber = staff.account_number || userMeta.account_number || null;
    const accountName = staff.account_name || userMeta.account_name || (bankName ? `${staff.first_name} ${staff.last_name}`.trim() : null);

    // 5. Return clean, unbloated 360 staff data
    return NextResponse.json({
      success: true,
      data: {
        id: staff.id,
        userId: staff.user_id || authUser?.id,
        employeeId: staff.employee_id || 'OAK-STF-001',
        firstName: staff.first_name,
        lastName: staff.last_name,
        fullName: `${staff.first_name} ${staff.last_name}`.trim(),
        email: staff.email,
        phone: staff.phone || '—',
        role: resolvedRole,
        department: staff.department || 'Academics',
        status: staff.is_active ? 'Active' : 'Inactive',
        address: staff.address || '—',
        qualification: staff.qualification || '—',
        joinedAt: staff.created_at
          ? new Date(staff.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—',
        
        // Assignments (Only relevant if teaching role)
        assignedHomeroom: assignedHomeroom || null,
        subjects: staff.subjects || (rawAssignments.map((a: any) => a.subject) || []),
        teachingAssignments: rawAssignments,

        // Security Credentials
        defaultPassword: rawPassword,
        passwordChanged,

        // Remuneration derived directly from Institutional Settings
        baseSalary: scaleBaseSalary,
        allowances: scaleAllowance,
        netSalary: scaleBaseSalary + scaleAllowance,
        bankName,
        accountNumber,
        accountName,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const sb = getAdminClient();

    // 1. Fetch Staff Profile to get auth user_id & email
    let query = sb.from('staff_profiles').select('*');
    if (id.includes('-') && id.length === 36) {
      query = query.or(`id.eq.${id},user_id.eq.${id}`);
    } else {
      query = query.or(`employee_id.eq.${id},email.eq.${id}`);
    }

    const { data: staff, error: staffErr } = await query.maybeSingle();

    if (staffErr) throw staffErr;
    if (!staff) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 });
    }

    // 2. Action: Reset Password to a unique one-time password (`Oak-XXXXXX`)
    if (body.action === 'reset_password') {
      const caller = await getCaller();
      if (!isAdminRole(caller.role)) {
        return NextResponse.json(
          { success: false, message: 'Only administrative leadership may reset staff passwords.' },
          { status: 403 }
        );
      }

      const tempPassword = generateStaffTempPassword();
      const tokenHash = hashInviteToken(tempPassword);
      const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      let targetUserId = staff.user_id;
      if (!targetUserId && staff.email) {
        try {
          const { data: usersData } = await sb.auth.admin.listUsers();
          const match = (usersData?.users || []).find(
            (u: any) => u.email?.toLowerCase() === staff.email.toLowerCase()
          );
          if (match) targetUserId = match.id;
        } catch {}
      }

      if (targetUserId) {
        const { data: currentAuth } = await sb.auth.admin.getUserById(targetUserId);
        const existingMeta = currentAuth?.user?.user_metadata || {};
        await sb.auth.admin.updateUserById(targetUserId, {
          password: tempPassword,
          user_metadata: {
            ...existingMeta,
            default_password: tempPassword,
            password_changed: false,
          },
        });
      }

      await sb
        .from('staff_profiles')
        .update({
          user_id: targetUserId,
          must_change_password: true,
          invite_token_hash: tokenHash,
          invite_expires_at: inviteExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staff.id);

      return NextResponse.json({
        success: true,
        message: `Temporary password generated: ${tempPassword}`,
        defaultPassword: tempPassword,
        passwordChanged: false,
      });
    }

    // 3. Action: Update Bank Disbursement Account
    if (body.action === 'update_bank_account') {
      const targetUserId = staff.user_id;
      const { bankName, accountNumber, accountName } = body;
      if (targetUserId) {
        const { data: currentAuth } = await sb.auth.admin.getUserById(targetUserId);
        const existingMeta = currentAuth?.user?.user_metadata || {};
        await sb.auth.admin.updateUserById(targetUserId, {
          user_metadata: {
            ...existingMeta,
            ...(bankName !== undefined && { bank_name: bankName }),
            ...(accountNumber !== undefined && { account_number: accountNumber }),
            ...(accountName !== undefined && { account_name: accountName }),
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Bank disbursement details updated successfully',
      });
    }

    // 4. Action: Toggle Active Status
    if (body.status !== undefined) {
      const isActive = body.status === 'Active' || body.status === true;
      await sb
        .from('staff_profiles')
        .update({ is_active: isActive })
        .eq('id', staff.id);

      return NextResponse.json({
        success: true,
        message: `Staff status updated to ${isActive ? 'Active' : 'Inactive'}`,
      });
    }

    // 5. Action: Update Role, Homeroom & Teaching Assignment
    if (body.action === 'update_role_assignment' || body.action === 'update_staff') {
      const {
        role,
        assignedHomeroom,
        subjects,
        teachingAssignments,
        department,
        phone,
      } = body;

      const isClassTeacher = role === 'Class Teacher';
      const finalHomeroom = isClassTeacher && assignedHomeroom ? assignedHomeroom.trim() : null;

      // Duplicate homeroom validation: A class can have only ONE Class Teacher
      if (isClassTeacher && finalHomeroom) {
        const { data: existingClassTeacher } = await sb
          .from('staff_profiles')
          .select('id, first_name, last_name, email')
          .eq('assigned_class', finalHomeroom)
          .eq('is_active', true)
          .neq('id', staff.id)
          .maybeSingle();

        if (existingClassTeacher) {
          return NextResponse.json(
            {
              success: false,
              message: `Class ${finalHomeroom} is already assigned to ${existingClassTeacher.first_name} ${existingClassTeacher.last_name}. A class can only have one Class Teacher.`,
            },
            { status: 400 }
          );
        }
      }

      // Update PostgreSQL staff_profiles
      const updatePayload: Record<string, any> = {
        assigned_class: finalHomeroom,
      };
      if (subjects !== undefined) updatePayload.subjects = Array.isArray(subjects) ? subjects : [];
      if (department !== undefined) updatePayload.department = department;
      if (phone !== undefined) updatePayload.phone = phone;

      const { error: profileUpdateErr } = await sb
        .from('staff_profiles')
        .update(updatePayload)
        .eq('id', staff.id);

      if (profileUpdateErr) throw profileUpdateErr;

      // Update Supabase Auth user metadata
      let targetUserId = staff.user_id;
      if (!targetUserId && staff.email) {
        try {
          const { data: usersData } = await sb.auth.admin.listUsers({ perPage: 1000 });
          const found = (usersData?.users || []).find(
            (u: any) => u.email?.toLowerCase() === staff.email.toLowerCase()
          );
          if (found) {
            targetUserId = found.id;
            await sb.from('staff_profiles').update({ user_id: found.id }).eq('id', staff.id);
          }
        } catch {}
      }

      if (targetUserId) {
        const { data: currentAuth } = await sb.auth.admin.getUserById(targetUserId);
        const existingMeta = currentAuth?.user?.user_metadata || {};
        await sb.auth.admin.updateUserById(targetUserId, {
          user_metadata: {
            ...existingMeta,
            teacher_type: role,
            staff_role: role,
            assigned_class: finalHomeroom,
            ...(teachingAssignments !== undefined && { teaching_assignments: teachingAssignments }),
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Staff role and assignment updated successfully',
      });
    }

    return NextResponse.json({ success: false, message: 'No recognized action specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const sb = getAdminClient();

    // 1. Find the staff profile
    let query = sb.from('staff_profiles').select('*');
    if (id.includes('-') && id.length === 36) {
      query = query.or(`id.eq.${id},user_id.eq.${id}`);
    } else {
      query = query.or(`employee_id.eq.${id},email.eq.${id}`);
    }

    const { data: staff, error: findErr } = await query.maybeSingle();
    if (findErr) throw findErr;
    if (!staff) {
      return NextResponse.json(
        { success: false, message: 'Staff profile not found' },
        { status: 404 }
      );
    }

    // 2. Mark profile as inactive in PostgreSQL
    const { error: updateErr } = await sb
      .from('staff_profiles')
      .update({ is_active: false })
      .eq('id', staff.id);

    if (updateErr) throw updateErr;

    // 3. Deactivate Supabase Auth user if user_id exists
    if (staff.user_id) {
      try {
        await sb.auth.admin.deleteUser(staff.user_id);
      } catch (authErr) {
        console.warn('Failed to delete auth user, attempting ban:', authErr);
        try {
          await sb.auth.admin.updateUserById(staff.user_id, {
            ban_duration: '876000h',
          });
        } catch {}
      }
    }

    // 4. Institutional Audit Log
    try {
      await sb.from('audit_logs').insert({
        school_id: staff.school_id,
        actor_name: 'Office of the Proprietor',
        actor_role: 'Proprietor',
        action: 'STAFF.TERMINATED',
        resource_type: 'staff_profile',
        resource_id: staff.id,
        metadata: {
          employee_id: staff.employee_id,
          name: `${staff.first_name} ${staff.last_name}`,
          email: staff.email,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Staff member ${staff.first_name} ${staff.last_name} (${staff.employee_id}) has been removed.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Failed to remove staff' },
      { status: 500 }
    );
  }
}
