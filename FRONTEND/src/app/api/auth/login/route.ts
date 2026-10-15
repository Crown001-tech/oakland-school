import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Official email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const cookieStore = await cookies();
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 1. Authenticate credentials against Supabase Auth
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    // Interim setup: If regular staff logs in with default password Oakland@2026, verify identity by email against staff_profiles
    if ((authError || !authData?.user) && cleanPassword === 'Oakland@2026') {
      try {
        const { data: staffMatch } = await adminClient
          .from('staff_profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (staffMatch && staffMatch.role !== 'admin' && staffMatch.role !== 'bursar') {
          const { data: usersData } = await adminClient.auth.admin.listUsers();
          const matchUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
          if (matchUser) {
            await adminClient.auth.admin.updateUserById(matchUser.id, {
              password: cleanPassword,
              email_confirm: true,
            });
          } else {
            const { data: created } = await adminClient.auth.admin.createUser({
              email: cleanEmail,
              password: cleanPassword,
              email_confirm: true,
              user_metadata: { role: 'teacher', full_name: `${staffMatch.first_name} ${staffMatch.last_name}` },
            });
            if (created?.user) {
              await adminClient.from('staff_profiles').update({ user_id: created.user.id }).eq('id', staffMatch.id);
            }
          }

          const retry = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });
          if (retry.data?.user) {
            authData = retry.data;
            authError = null;
          }
        }
      } catch {}
    }

    if (authError || !authData?.user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid login credentials. Please verify your official email address and password.',
        },
        { status: 401 }
      );
    }

    const user = authData.user;
    const metadataRole = user.user_metadata?.role;

    // Fetch official faculty / executive record from PostgreSQL database
    let profileData: any = null;
    let effectiveRole = metadataRole || 'teacher';

    try {
      const { data: profile } = await adminClient
        .from('staff_profiles')
        .select('*')
        .or(`user_id.eq.${user.id},email.eq.${cleanEmail}`)
        .maybeSingle();

      if (profile) {
        profileData = {
          id: profile.id,
          employeeId: profile.employee_id,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          role: profile.role,
          department: profile.department,
          phone: profile.phone,
        };

        if (profile.role === 'principal' || profile.role === 'admin') {
          effectiveRole = 'admin';
        } else if (profile.role === 'bursar') {
          effectiveRole = 'bursar';
        } else if (profile.role === 'proprietor') {
          effectiveRole = 'proprietor';
        } else {
          effectiveRole = 'teacher';
        }
      }
    } catch {
      // Fallback to metadata if DB lookup encounters network issue
    }

    // Determine redirect destination
    let redirectUrl = '/teacher';
    if (effectiveRole === 'admin') redirectUrl = '/admin';
    else if (effectiveRole === 'bursar') redirectUrl = '/bursar';
    else if (effectiveRole === 'proprietor') redirectUrl = '/proprietor';

    // Clear any obsolete demo role cookies that could cause role mismatch / lockout
    try {
      cookieStore.delete('oakland_demo_role');
    } catch {}

    // Set secure HTTP-only cookie for role authorization
    const isProd = process.env.NODE_ENV === 'production';
    cookieStore.set({
      name: 'oakland_auth_role',
      value: effectiveRole,
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      role: effectiveRole,
      redirectUrl,
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profileData,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || 'Internal authentication error.',
      },
      { status: 500 }
    );
  }
}
