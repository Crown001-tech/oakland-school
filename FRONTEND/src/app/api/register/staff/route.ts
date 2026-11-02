import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';
import crypto from 'crypto';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      qualification,
      department,
      desiredRole,
      yearsExperience,
      password,
      photoPreview,
    } = body;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Please provide all required personal information.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // A staff application is for the school of the address it came in on
    const sb = await getSchoolDb({ allowVisitor: true });
    const normalizedEmail = email.trim().toLowerCase();

    // Check if an application is already pending with this email
    const { data: existingApp } = await sb
      .from('staff_applications')
      .select('id, status')
      .eq('email', normalizedEmail)
      .eq('school_id', sb.schoolId)
      .maybeSingle();

    if (existingApp && existingApp.status === 'pending') {
      return NextResponse.json(
        { success: false, message: 'An application with this email address is already awaiting review.' },
        { status: 409 }
      );
    }

    // Check if staff already exists in staff_profiles
    const { data: existingStaff } = await sb
      .from('staff_profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('school_id', sb.schoolId)
      .maybeSingle();

    if (existingStaff) {
      return NextResponse.json(
        { success: false, message: 'A staff member with this email is already registered.' },
        { status: 409 }
      );
    }

    // Hash password with cryptographically secure random salt using scrypt
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    const passwordHash = `scrypt:${salt}:${derivedKey}`;

    // Parse years of experience safely
    let parsedExp = 0;
    if (typeof yearsExperience === 'string') {
      const match = yearsExperience.match(/\d+/);
      parsedExp = match ? parseInt(match[0], 10) : 0;
    } else if (typeof yearsExperience === 'number') {
      parsedExp = yearsExperience;
    }

    const { data: newApp, error: insertError } = await sb
      .from('staff_applications')
      .insert({
        school_id: sb.schoolId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        role_applied: desiredRole || 'teacher',
        department: department || 'Academics',
        qualification: qualification || 'B.Ed',
        years_of_experience: parsedExp,
        photo_url: photoPreview || null,
        password_hash: passwordHash,
        status: 'pending',
        notes: `Registered via self-service portal on ${new Date().toISOString()}`,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting staff application:', insertError);
      return NextResponse.json(
        { success: false, message: insertError.message || 'Failed to submit application.' },
        { status: 500 }
      );
    }

    // Create audit log
    try {
      await sb.from('audit_logs').insert({
        school_id: sb.schoolId,
        actor_name: `${firstName.trim()} ${lastName.trim()}`,
        actor_role: 'Applicant',
        action: 'STAFF.APPLICATION_SUBMITTED',
        resource_type: 'staff_application',
        resource_id: newApp.id,
        metadata: {
          email: normalizedEmail,
          role_applied: desiredRole || 'teacher',
          department: department,
        },
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({
      success: true,
      message: 'Staff application submitted successfully.',
      data: { id: newApp.id },
    });
  } catch (err: any) {
    console.error('POST /api/register/staff error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

