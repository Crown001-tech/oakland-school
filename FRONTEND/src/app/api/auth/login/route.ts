import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { hashInviteToken } from '@/lib/supabase/admin';
import { ROLE_COOKIE, roleCookieOptions, signRoleCookie } from '@/lib/auth-role';
import { checkAuthRateLimit, extractClientIp, recordAuthAttempt } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Official email or admission number and password are required.' },
        { status: 400 }
      );
    }

    const rawIdentifier = String(email).trim();
    const cleanPassword = String(password).trim();
    const clientIp = extractClientIp(request);
    const rateKey = `login:${rawIdentifier.toLowerCase()}`;

    // 0. Check 5-attempt brute-force lockout before touching Supabase Auth
    const preCheck = await checkAuthRateLimit(rateKey);
    if (preCheck.locked) {
      const waitMins = Math.max(1, Math.ceil(preCheck.remainingSeconds / 60));
      return NextResponse.json(
        {
          success: false,
          locked: true,
          remainingSeconds: preCheck.remainingSeconds,
          message: `Account temporarily locked after 5 failed sign-in attempts. Please wait ${waitMins} minute(s) or contact the school office.`,
        },
        { status: 429 }
      );
    }

    const cookieStore = await cookies();
    const supabase = await createClient();
    const adminClient = createAdminClient();

    let cleanEmail = rawIdentifier.toLowerCase();
    let studentMatch: any = null;

    // Check if identifier is a student admission number (no '@' or starts with 'oak-')
    if (!rawIdentifier.includes('@')) {
      const { data } = await adminClient
        .from('students')
        .select('*')
        .ilike('admission_number', rawIdentifier)
        .maybeSingle();
      if (data) {
        studentMatch = data;
        cleanEmail = `${data.admission_number.toLowerCase()}@student.oakland.ng`;
      }
    } else if (cleanEmail.includes('@student.oakland.ng')) {
      const admPart = cleanEmail.split('@')[0];
      const { data } = await adminClient
        .from('students')
        .select('*')
        .ilike('admission_number', admPart)
        .maybeSingle();
      if (data) {
        studentMatch = data;
      }
    }

    // 1. Authenticate credentials against Supabase Auth
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    // 2. Per-person one-time invite token verification (if Auth user not yet synced)
    if (authError || !authData?.user) {
      try {
        const candidateHash = hashInviteToken(cleanPassword);
        const { data: staffMatch } = await adminClient
          .from('staff_profiles')
          .select('*')
          .eq('email', cleanEmail)
          .eq('is_active', true)
          .maybeSingle();

        const inviteValid =
          staffMatch &&
          staffMatch.must_change_password === true &&
          staffMatch.invite_token_hash &&
          staffMatch.invite_token_hash === candidateHash &&
          (!staffMatch.invite_expires_at || new Date(staffMatch.invite_expires_at).getTime() > Date.now());

        if (inviteValid) {
          const staffRole =
            staffMatch.role === 'principal' || staffMatch.role === 'admin'
              ? 'admin'
              : staffMatch.role === 'bursar'
              ? 'bursar'
              : staffMatch.role === 'proprietor'
              ? 'proprietor'
              : staffMatch.role === 'security' ||
                staffMatch.role === 'reception' ||
                staffMatch.department?.toLowerCase()?.includes('safety')
              ? 'security'
              : 'teacher';

          const { data: usersData } = await adminClient.auth.admin.listUsers();
          const matchUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);

          if (matchUser) {
            await adminClient.auth.admin.updateUserById(matchUser.id, {
              password: cleanPassword,
              email_confirm: true,
              user_metadata: {
                ...(matchUser.user_metadata || {}),
                role: staffRole,
                full_name: `${staffMatch.first_name} ${staffMatch.last_name}`,
                password_changed: false,
              },
            });
            await adminClient.from('staff_profiles').update({ user_id: matchUser.id }).eq('id', staffMatch.id);
          } else {
            const { data: created } = await adminClient.auth.admin.createUser({
              email: cleanEmail,
              password: cleanPassword,
              email_confirm: true,
              user_metadata: {
                role: staffRole,
                full_name: `${staffMatch.first_name} ${staffMatch.last_name}`,
                password_changed: false,
              },
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
      } catch {
        // Fall through to standard failure handling
      }
    }

    if (authError || !authData?.user) {
      const attempt = await recordAuthAttempt({
        key: rateKey,
        scope: 'login',
        success: false,
        targetLabel: rawIdentifier,
        ipAddress: clientIp,
      });

      if (attempt.locked) {
        const waitMins = Math.max(1, Math.ceil(attempt.remainingSeconds / 60));
        return NextResponse.json(
          {
            success: false,
            locked: true,
            remainingSeconds: attempt.remainingSeconds,
            message: `Account locked after 5 failed sign-in attempts. Please wait ${waitMins} minute(s) or contact the school office.`,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          attemptsRemaining: Math.max(0, 5 - attempt.attempts),
          message: 'Invalid login credentials. Please verify your email or admission number and password.',
        },
        { status: 401 }
      );
    }

    // Clear rate-limit counter on successful authentication
    await recordAuthAttempt({
      key: rateKey,
      scope: 'login',
      success: true,
      targetLabel: rawIdentifier,
      ipAddress: clientIp,
    });

    const user = authData.user;
    const metadataRole = user.user_metadata?.role;

    // Fetch profile and determine role from authoritative database records
    let profileData: any = null;
    let effectiveRole = '';
    let redirectUrl = '/teacher';

    // 1. Staff check
    try {
      const { data: profile } = await adminClient
        .from('staff_profiles')
        .select('*')
        .or(`user_id.eq.${user.id},email.eq.${cleanEmail}`)
        .maybeSingle();

      if (profile) {
        const mustChangePassword =
          profile.must_change_password !== false && user.user_metadata?.password_changed !== true;
        profileData = {
          id: profile.id,
          employeeId: profile.employee_id,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          role: profile.role,
          department: profile.department,
          phone: profile.phone,
          mustChangePassword,
        };

        if (profile.role === 'principal' || profile.role === 'admin') {
          effectiveRole = 'admin';
          redirectUrl = '/admin';
        } else if (profile.role === 'bursar') {
          effectiveRole = 'bursar';
          redirectUrl = '/bursar';
        } else if (profile.role === 'proprietor') {
          effectiveRole = 'proprietor';
          redirectUrl = '/proprietor';
        } else if (
          profile.role === 'security' ||
          profile.role === 'reception' ||
          profile.department?.toLowerCase()?.includes('safety')
        ) {
          effectiveRole = 'security';
          redirectUrl = '/security';
        } else {
          effectiveRole = 'teacher';
          redirectUrl = '/teacher';
        }
      }
    } catch {}

    // 2. Guardian check (if not staff)
    if (!profileData) {
      try {
        const { data: guardian } = await adminClient
          .from('guardians')
          .select('*, student_guardians(id, student_id)')
          .or(`user_id.eq.${user.id},email.eq.${cleanEmail}`)
          .maybeSingle();

        if (guardian) {
          if (!guardian.student_guardians || guardian.student_guardians.length === 0) {
            return NextResponse.json(
              {
                success: false,
                message:
                  'No active student record is linked to this guardian account. Access to the Parent Portal is restricted to parents with currently enrolled students.',
              },
              { status: 403 }
            );
          }
          effectiveRole = 'parent';
          redirectUrl = '/parent';
          profileData = {
            id: guardian.id,
            name: `${guardian.first_name} ${guardian.last_name}`,
            email: guardian.email,
            phone: guardian.phone,
            relationship: guardian.relationship,
            role: 'parent',
          };
        }
      } catch {}
    }

    // 3. Student check (if not staff or guardian)
    if (!profileData) {
      try {
        const { data: student } = await adminClient
          .from('students')
          .select('*')
          .or(`user_id.eq.${user.id},admission_number.ilike.${rawIdentifier}`)
          .maybeSingle();

        if (student) {
          effectiveRole = 'student';
          redirectUrl = '/student';
          profileData = {
            id: student.id,
            name: `${student.first_name} ${student.last_name}`,
            admissionNumber: student.admission_number,
            gender: student.gender,
            role: 'student',
          };
        }
      } catch {}
    }

    // Canonical Proprietor check
    if (!effectiveRole && cleanEmail === 'proprietor@oaklandschool.com.ng') {
      effectiveRole = 'proprietor';
      redirectUrl = '/proprietor';
      profileData = {
        id: user.id,
        name: user.user_metadata?.full_name || 'Proprietor',
        email: user.email,
        role: 'proprietor',
      };
    }

    // Parent and student accounts without a profile row keep their limited portal access
    if (metadataRole === 'parent' && !profileData) {
      effectiveRole = 'parent';
      redirectUrl = '/parent';
    } else if (metadataRole === 'student' && !profileData) {
      effectiveRole = 'student';
      redirectUrl = '/student';
    }

    if (!effectiveRole) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          success: false,
          message: 'No staff, guardian, or student record is linked to this account. Please contact the school office.',
        },
        { status: 403 }
      );
    }

    // Clear any obsolete demo role cookies that could cause role mismatch / lockout
    try {
      cookieStore.delete('oakland_demo_role');
    } catch {}

    // Signed, user-bound role cookie (verified in middleware and route handlers)
    cookieStore.set({
      name: ROLE_COOKIE,
      value: await signRoleCookie(effectiveRole, user.id),
      ...roleCookieOptions(),
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
