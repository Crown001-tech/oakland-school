import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getServerPrincipalDelegations } from '@/lib/delegations';

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
    const { data, error } = await sb
      .from('staff_profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Fetch auth users to correlate default_password
    const authUserMap = new Map<string, any>();
    const authEmailMap = new Map<string, any>();
    try {
      const { data: usersData } = await sb.auth.admin.listUsers({ perPage: 1000 });
      if (usersData?.users) {
        usersData.users.forEach((u: any) => {
          if (u.id) authUserMap.set(u.id, u);
          if (u.email) authEmailMap.set(u.email.toLowerCase(), u);
        });
      }
    } catch {}

    const formatted = (data || []).map((s: any) => {
      const authUser = (s.user_id && authUserMap.get(s.user_id)) || (s.email && authEmailMap.get(s.email.toLowerCase()));
      const rawPassword = authUser?.user_metadata?.default_password;
      const rawAssignments = authUser?.user_metadata?.teaching_assignments || [];
      const teacherType = authUser?.user_metadata?.teacher_type || authUser?.user_metadata?.staff_role;

      let resolvedRole: 'Principal' | 'Bursar' | 'Proprietor' | 'Class Teacher' | 'Subject Teacher' | 'Non-Teaching Staff' = 'Subject Teacher';
      if (s.role === 'admin' || s.role === 'principal') {
        resolvedRole = 'Principal';
      } else if (s.role === 'bursar') {
        resolvedRole = 'Bursar';
      } else if (s.role === 'proprietor') {
        resolvedRole = 'Proprietor';
      } else if (teacherType === 'Class Teacher') {
        resolvedRole = 'Class Teacher';
      } else if (teacherType === 'Subject Teacher') {
        resolvedRole = 'Subject Teacher';
      } else if (teacherType === 'Non-Teaching Staff') {
        resolvedRole = 'Non-Teaching Staff';
      } else if (s.assigned_class) {
        resolvedRole = 'Class Teacher';
      } else {
        resolvedRole = 'Subject Teacher';
      }

      const assignedHomeroom = resolvedRole === 'Class Teacher' ? (s.assigned_class || undefined) : undefined;
      const distinctClasses = Array.from(new Set(
        rawAssignments.flatMap((a: any) => a.classes || []).concat(assignedHomeroom ? [assignedHomeroom] : [])
      ));

      return {
        id: s.id,
        employeeId: s.employee_id,
        name: `${s.first_name} ${s.last_name}`,
        email: s.email,
        phone: s.phone || '—',
        role: resolvedRole,
        department: s.department || 'Academics',
        status: s.is_active ? 'Active' : 'Inactive',
        subjects: s.subjects || [],
        assignedClass: assignedHomeroom,
        assignedClasses: distinctClasses,
        teachingAssignments: rawAssignments,
        password: rawPassword,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getAdminClient();

    // Verify delegation if called by Admin / Principal
    const cookieStore = await cookies();
    const roleCookie = cookieStore.get('oakland_auth_role')?.value || cookieStore.get('oakland_demo_role')?.value;
    if (roleCookie === 'admin' || roleCookie === 'principal') {
      const delegations = await getServerPrincipalDelegations(sb);
      if (!delegations.canOnboardStaff) {
        return NextResponse.json(
          { success: false, error: 'Staff onboarding authority has not been delegated by the Proprietor.' },
          { status: 403 }
        );
      }
    }

    const staffList = Array.isArray(body)
      ? body
      : body.action === 'set' && Array.isArray(body.staff)
      ? body.staff
      : body.action === 'add' && body.staff
      ? [body.staff]
      : [body];

    const results = [];
    const warnings: string[] = [];
    const batchHomeroomsAssigned = new Set<string>();

    // Pre-fetch auth users once if batch processing
    let cachedAuthUsers: any[] | null = null;
    if (staffList.length > 3) {
      try {
        const { data: usersData } = await sb.auth.admin.listUsers();
        cachedAuthUsers = usersData?.users || [];
      } catch {}
    }

    for (const item of staffList) {
      if (!item.name || !item.email) continue;
      const cleanEmail = item.email.trim().toLowerCase();
      const names = item.name.trim().split(' ');
      const firstName = names[0] || 'Staff';
      const lastName = names.slice(1).join(' ') || 'Member';

      let dbRole: 'proprietor' | 'admin' | 'bursar' | 'teacher' = 'teacher';
      if (item.role === 'Principal' || item.role === 'Admin' || item.role === 'admin') dbRole = 'admin';
      else if (item.role === 'Bursar' || item.role === 'bursar') dbRole = 'bursar';
      else if (item.role === 'Proprietor' || item.role === 'proprietor') dbRole = 'proprietor';

      let isClassTeacher = item.role === 'Class Teacher';
      let assignedHomeroom = isClassTeacher && item.assignedClass ? item.assignedClass.trim() : null;

      // Duplicate homeroom validation: A class can have only ONE Class Teacher
      if (isClassTeacher && assignedHomeroom) {
        let hasConflict = false;
        let conflictName = '';

        if (batchHomeroomsAssigned.has(assignedHomeroom.toUpperCase())) {
          hasConflict = true;
          conflictName = 'another teacher in this import batch';
        } else {
          const { data: existingClassTeacher } = await sb
            .from('staff_profiles')
            .select('id, first_name, last_name, email')
            .eq('assigned_class', assignedHomeroom)
            .eq('is_active', true)
            .neq('email', cleanEmail)
            .maybeSingle();

          if (existingClassTeacher) {
            hasConflict = true;
            conflictName = `${existingClassTeacher.first_name} ${existingClassTeacher.last_name}`;
          }
        }

        if (hasConflict) {
          if (staffList.length === 1) {
            return NextResponse.json(
              {
                success: false,
                message: `This class (${assignedHomeroom}) has already been assigned to ${conflictName}. A class can only have one Class Teacher.`,
              },
              { status: 400 }
            );
          } else {
            // For batch imports: avoid failing whole batch; onboard as Subject Teacher with unassigned homeroom
            warnings.push(
              `${item.name}: Homeroom ${assignedHomeroom} is already assigned to ${conflictName}. Onboarded without homeroom assignment.`
            );
            assignedHomeroom = null;
            isClassTeacher = false;
          }
        } else {
          batchHomeroomsAssigned.add(assignedHomeroom.toUpperCase());
        }
      }

      // 1. Create or update user in Supabase Auth
      let authUserId: string | null = null;
      const targetPassword = item.password || 'Oakland@2026';
      const teachingAssignments = Array.isArray(item.teachingAssignments) ? item.teachingAssignments : [];

      try {
        const { data: created, error: createErr } = await sb.auth.admin.createUser({
          email: cleanEmail,
          password: targetPassword,
          email_confirm: true,
          user_metadata: {
            role: dbRole,
            teacher_type: item.role || (isClassTeacher ? 'Class Teacher' : 'Subject Teacher'),
            staff_role: item.role || (isClassTeacher ? 'Class Teacher' : 'Subject Teacher'),
            full_name: item.name,
            default_password: targetPassword,
            teaching_assignments: teachingAssignments,
          },
        });

        if (!createErr && created?.user) {
          authUserId = created.user.id;
        } else {
          // User already exists, locate and update metadata
          let existingId: string | null = null;
          if (cachedAuthUsers) {
            const match = cachedAuthUsers.find((u: any) => u.email?.toLowerCase() === cleanEmail);
            if (match) existingId = match.id;
          }

          if (!existingId) {
            const { data: usersData } = await sb.auth.admin.listUsers();
            const match = usersData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
            if (match) existingId = match.id;
          }

          if (existingId) {
            authUserId = existingId;
            await sb.auth.admin.updateUserById(existingId, {
              password: targetPassword,
              email_confirm: true,
              user_metadata: {
                role: dbRole,
                teacher_type: item.role || (isClassTeacher ? 'Class Teacher' : 'Subject Teacher'),
                staff_role: item.role || (isClassTeacher ? 'Class Teacher' : 'Subject Teacher'),
                full_name: item.name,
                default_password: targetPassword,
                teaching_assignments: teachingAssignments,
              },
            });
          }
        }
      } catch (authError: any) {
        console.warn(`[StaffProvisioning] Auth warning for ${cleanEmail}:`, authError?.message);
      }

      // 2. Insert or update PostgreSQL staff_profiles
      try {
        const { data: existingProfile } = await sb
          .from('staff_profiles')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();

        let profileRecord: any = null;

        if (existingProfile) {
          const { data: updated, error: updateError } = await sb
            .from('staff_profiles')
            .update({
              user_id: authUserId,
              first_name: firstName,
              last_name: lastName,
              phone: item.phone || null,
              role: dbRole,
              department: item.department || 'Academics',
              qualification: item.qualification || null,
              assigned_class: assignedHomeroom,
              subjects: Array.isArray(item.subjects) ? item.subjects : [],
              status: item.status ? item.status.toLowerCase() : 'active',
              is_active: true,
            })
            .eq('id', existingProfile.id)
            .select();

          if (!updateError && updated?.[0]) profileRecord = updated[0];
        } else {
          const { data: inserted, error: insertError } = await sb
            .from('staff_profiles')
            .insert({
              school_id: 'a0000000-0000-0000-0000-000000000001',
              user_id: authUserId,
              employee_id: item.employeeId || `OAK/STF/${Math.floor(100 + Math.random() * 900)}`,
              first_name: firstName,
              last_name: lastName,
              email: cleanEmail,
              phone: item.phone || null,
              role: dbRole,
              department: item.department || 'Academics',
              qualification: item.qualification || null,
              assigned_class: assignedHomeroom,
              subjects: Array.isArray(item.subjects) ? item.subjects : [],
              status: item.status ? item.status.toLowerCase() : 'active',
              is_active: true,
            })
            .select();

          if (!insertError && inserted?.[0]) profileRecord = inserted[0];
        }

        if (profileRecord) {
          results.push({ ...profileRecord, teachingAssignments, password: targetPassword });

          // 3. Upsert school_memberships for role resolution
          if (authUserId) {
            await sb.from('school_memberships').upsert({
              school_id: 'a0000000-0000-0000-0000-000000000001',
              user_id: authUserId,
              role: dbRole,
              is_active: true,
            }, { onConflict: 'school_id,user_id' });
          }
        }
      } catch (dbErr: any) {
        console.error(`[StaffProvisioning] DB error for ${cleanEmail}:`, dbErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const email = searchParams.get('email');
    const employeeId = searchParams.get('employeeId');
    const all = searchParams.get('all') === 'true';

    const sb = getAdminClient();

    if (all) {
      const { data: allStaff } = await sb.from('staff_profiles').select('id, user_id, email, role');
      if (allStaff && allStaff.length > 0) {
        for (const st of allStaff) {
          if (st.role === 'proprietor') continue;

          let uid = st.user_id;
          if (!uid && st.email) {
            try {
              const { data: uData } = await sb.auth.admin.listUsers();
              const match = uData?.users?.find((u: any) => u.email?.toLowerCase() === st.email.toLowerCase());
              if (match) uid = match.id;
            } catch {}
          }

          if (uid) {
            try { await sb.from('audit_logs').update({ actor_id: null }).eq('actor_id', uid); } catch {}
            try { await sb.from('school_memberships').delete().eq('user_id', uid); } catch {}
            try { await sb.auth.admin.deleteUser(uid); } catch {}
          }
        }
        await sb.from('staff_profiles').delete().neq('role', 'proprietor');
      }
      return NextResponse.json({ success: true, message: 'All staff deleted from database and authentication' });
    }

    if (!id && !email && !employeeId) {
      return NextResponse.json({ success: false, message: 'Staff ID, email, or employeeId required' }, { status: 400 });
    }

    // Locate the profile across ID, email, or employee ID
    let targetProfile: { id: string; user_id: string | null; email: string } | null = null;
    if (id && id.length > 30) {
      const { data } = await sb.from('staff_profiles').select('id, user_id, email').eq('id', id).maybeSingle();
      targetProfile = data;
    }
    if (!targetProfile && email && email.includes('@')) {
      const { data } = await sb.from('staff_profiles').select('id, user_id, email').eq('email', email.toLowerCase()).maybeSingle();
      targetProfile = data;
    }
    if (!targetProfile && employeeId) {
      const { data } = await sb.from('staff_profiles').select('id, user_id, email').eq('employee_id', employeeId).maybeSingle();
      targetProfile = data;
    }

    const targetUserId = targetProfile?.user_id;
    const targetEmail = targetProfile?.email || (email && email.includes('@') ? email.toLowerCase() : null);

    // 1. Delete from staff_profiles
    if (targetProfile) {
      await sb.from('staff_profiles').delete().eq('id', targetProfile.id);
    } else {
      if (targetEmail) {
        await sb.from('staff_profiles').delete().eq('email', targetEmail);
      }
      if (employeeId) {
        await sb.from('staff_profiles').delete().eq('employee_id', employeeId);
      }
    }

    // 2. Unlink audit logs and purge auth & membership
    let authIdToDelete = targetUserId;
    if (!authIdToDelete && targetEmail) {
      try {
        const { data: uData } = await sb.auth.admin.listUsers();
        const match = uData?.users?.find((u: any) => u.email?.toLowerCase() === targetEmail);
        if (match) authIdToDelete = match.id;
      } catch {}
    }

    if (authIdToDelete) {
      try { await sb.from('audit_logs').update({ actor_id: null }).eq('actor_id', authIdToDelete); } catch {}
      try { await sb.from('school_memberships').delete().eq('user_id', authIdToDelete); } catch {}
      try { await sb.auth.admin.deleteUser(authIdToDelete); } catch {}
    }

    return NextResponse.json({ success: true, message: 'Staff deleted from database and auth' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
