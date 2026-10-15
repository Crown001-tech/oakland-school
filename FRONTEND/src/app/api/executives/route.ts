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
    const { data: staff, error } = await sb
      .from('staff_profiles')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const prin = staff?.find((s: any) => s.role === 'admin');
    const bur = staff?.find((s: any) => s.role === 'bursar');

    return NextResponse.json({
      success: true,
      data: {
        principal: prin ? {
          id: prin.id,
          name: `${prin.first_name} ${prin.last_name}`,
          email: prin.email,
          phone: prin.phone || '—',
          role: 'Principal',
          employeeId: prin.employee_id,
          status: 'Active',
          appointedAt: prin.created_at
            ? new Date(prin.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—',
        } : null,
        bursar: bur ? {
          id: bur.id,
          name: `${bur.first_name} ${bur.last_name}`,
          email: bur.email,
          phone: bur.phone || '—',
          role: 'Bursar',
          employeeId: bur.employee_id,
          status: 'Active',
          appointedAt: bur.created_at
            ? new Date(bur.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—',
        } : null,
      },
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
    const { type, data } = body;

    if (!type || !['principal', 'bursar'].includes(type) || !data) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload: type (principal | bursar) and data required' },
        { status: 400 }
      );
    }

    const sb = getAdminClient();
    const targetRole = type === 'principal' ? 'admin' : 'bursar';
    const names = (data.name || '').trim().split(' ');
    const firstName = names[0] || (type === 'principal' ? 'Principal' : 'Bursar');
    const lastName = names.slice(1).join(' ') || 'Officer';
    const cleanEmail = (data.email || '').trim().toLowerCase();

    // 1. Ensure active Auth user exists in Supabase Auth
    let authUserId: string | null = null;
    const targetPassword = data.password || 'Oakland@2026';
    try {
      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email: cleanEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: { role: targetRole, full_name: data.name },
      });

      if (!createErr && created?.user) {
        authUserId = created.user.id;
      } else {
        const { data: usersData } = await sb.auth.admin.listUsers();
        const existing = usersData?.users?.find((u: any) => u.email.toLowerCase() === cleanEmail);
        if (existing) {
          authUserId = existing.id;
          await sb.auth.admin.updateUserById(existing.id, {
            password: targetPassword,
            email_confirm: true,
            user_metadata: { role: targetRole, full_name: data.name },
          });
        }
      }
    } catch (authErr: any) {
      console.warn(`[ExecutiveProvisioning] Auth warning for ${cleanEmail}:`, authErr?.message);
    }

    // Deactivate any previous active executive for this role
    await sb
      .from('staff_profiles')
      .update({ is_active: false })
      .eq('school_id', 'a0000000-0000-0000-0000-000000000001')
      .eq('role', targetRole)
      .neq('email', cleanEmail);

    // 2. Upsert staff profile in PostgreSQL database
    const { data: upserted, error } = await sb.from('staff_profiles').upsert({
      school_id: 'a0000000-0000-0000-0000-000000000001',
      user_id: authUserId,
      employee_id: data.employeeId || (type === 'principal' ? 'OAK-ADM-001' : 'OAK-BUR-001'),
      first_name: firstName,
      last_name: lastName,
      email: cleanEmail,
      phone: data.phone || null,
      role: targetRole,
      department: type === 'principal' ? 'School Administration & Academics' : 'Finance & Accounts',
      is_active: true,
    }, { onConflict: 'school_id,employee_id' }).select();

    if (error) throw error;

    // 3. Upsert school_memberships for role resolution on login
    if (authUserId) {
      await sb.from('school_memberships').upsert({
        school_id: 'a0000000-0000-0000-0000-000000000001',
        user_id: authUserId,
        role: targetRole,
        is_active: true,
      }, { onConflict: 'school_id,user_id' });
    }

    return NextResponse.json({
      success: true,
      data: upserted?.[0] || data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const roleParam = searchParams.get('role');

    if (!roleParam || !['principal', 'bursar'].includes(roleParam)) {
      return NextResponse.json(
        { success: false, message: 'Role parameter required: principal or bursar' },
        { status: 400 }
      );
    }

    const sb = getAdminClient();
    const dbRole = roleParam === 'principal' ? 'admin' : 'bursar';

    const { error } = await sb
      .from('staff_profiles')
      .update({ is_active: false })
      .eq('role', dbRole);

    if (error) throw error;

    await sb
      .from('school_memberships')
      .update({ is_active: false })
      .eq('role', dbRole);

    return NextResponse.json({
      success: true,
      message: `${roleParam} mandate revoked successfully from database`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}
