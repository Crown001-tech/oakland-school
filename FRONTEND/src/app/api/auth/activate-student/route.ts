import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ROLE_COOKIE, roleCookieOptions, signRoleCookie } from '@/lib/auth-role';
import { checkAuthRateLimit, extractClientIp, recordAuthAttempt } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, admissionNumber, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: 'Activation code and password are required.' },
        { status: 400 }
      );
    }

    const cleanToken = String(token).trim().toUpperCase();
    const cleanPassword = String(password).trim();
    const cleanAdm = admissionNumber ? String(admissionNumber).trim().toUpperCase() : null;
    const clientIp = extractClientIp(request);
    const rateKey = `activation:${(cleanAdm || clientIp).toLowerCase()}`;

    // 0. Check 5-attempt brute-force lockout on student activation codes
    const preCheck = await checkAuthRateLimit(rateKey);
    if (preCheck.locked) {
      const waitMins = Math.max(1, Math.ceil(preCheck.remainingSeconds / 60));
      return NextResponse.json(
        {
          success: false,
          locked: true,
          remainingSeconds: preCheck.remainingSeconds,
          message: `Activation locked after 5 failed attempts. Please wait ${waitMins} minute(s) or contact school administration.`,
        },
        { status: 429 }
      );
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Query student by activation token
    let query = adminClient
      .from('students')
      .select(
        'id, first_name, last_name, admission_number, is_activated, activation_token, activation_expires_at, user_id'
      )
      .eq('activation_token', cleanToken);

    if (cleanAdm) {
      query = query.ilike('admission_number', cleanAdm);
    }

    const { data: student, error: studentError } = await query.maybeSingle();

    if (studentError || !student) {
      const attempt = await recordAuthAttempt({
        key: rateKey,
        scope: 'activation',
        success: false,
        targetLabel: cleanAdm || cleanToken,
        ipAddress: clientIp,
      });

      if (attempt.locked) {
        const waitMins = Math.max(1, Math.ceil(attempt.remainingSeconds / 60));
        return NextResponse.json(
          {
            success: false,
            locked: true,
            remainingSeconds: attempt.remainingSeconds,
            message: `Activation locked after 5 failed attempts. Please wait ${waitMins} minute(s) or contact school administration.`,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          attemptsRemaining: Math.max(0, 5 - attempt.attempts),
          message: 'Invalid activation code or admission number. Please check your details.',
        },
        { status: 400 }
      );
    }

    // Check expiration
    if (student.activation_expires_at) {
      const expiresAt = new Date(student.activation_expires_at).getTime();
      if (expiresAt < Date.now()) {
        return NextResponse.json(
          { success: false, message: 'This activation code has expired. Please contact school administration.' },
          { status: 400 }
        );
      }
    }

    // Clear rate-limit counter on valid activation code
    await recordAuthAttempt({
      key: rateKey,
      scope: 'activation',
      success: true,
      targetLabel: student.admission_number,
      ipAddress: clientIp,
    });

    // Standard student email format
    const studentEmail = `${student.admission_number.toLowerCase()}@student.oakland.ng`;
    const fullName = `${student.first_name} ${student.last_name}`;

    // Manage Supabase Auth user
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === studentEmail || (student.user_id && u.id === student.user_id)
    );

    let authUserId: string;

    if (existingUser) {
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          role: 'student',
          full_name: fullName,
          admission_number: student.admission_number,
          student_id: student.id,
          password_changed: true,
        },
      });
      authUserId = existingUser.id;
    } else {
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: studentEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          role: 'student',
          full_name: fullName,
          admission_number: student.admission_number,
          student_id: student.id,
          password_changed: true,
        },
      });

      if (createError || !created?.user) {
        return NextResponse.json(
          { success: false, message: createError?.message || 'Could not create student authentication record.' },
          { status: 500 }
        );
      }
      authUserId = created.user.id;
    }

    // Update student in PostgreSQL: link auth user, mark activated, revoke token
    const { error: updateError } = await adminClient
      .from('students')
      .update({
        user_id: authUserId,
        is_activated: true,
        activation_token: null,
        activation_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', student.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, message: 'Failed to update student activation status in database.' },
        { status: 500 }
      );
    }

    // Automatically sign in the student
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password: cleanPassword,
    });

    if (!signInError && signInData?.user) {
      cookieStore.set({
        name: ROLE_COOKIE,
        value: await signRoleCookie('student', signInData.user.id),
        ...roleCookieOptions(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Student account activated successfully.',
      admissionNumber: student.admission_number,
      studentName: fullName,
      redirectUrl: '/student',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Internal activation error.' },
      { status: 500 }
    );
  }
}
