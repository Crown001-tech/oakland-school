import { NextResponse, NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getVerifiedRole } from '@/lib/caller';

export async function GET(request?: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user via HTTP cookies or Authorization header
    let { data: { user }, error } = await supabase.auth.getUser();

    if (!user) {
      const headerStore = await headers();
      const authHeader = headerStore.get('authorization') || request?.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: tokenData } = await supabase.auth.getUser(token);
        if (tokenData?.user) {
          user = tokenData.user;
          error = null;
        }
      }
    }

    if (error || !user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        profile: null,
        role: null,
      });
    }

    // Fetch official profile from PostgreSQL database
    let profileData: any = null;
    let effectiveRole: string | undefined = await getVerifiedRole(user);

    try {
      const adminClient = createAdminClient();
      const { data: profile } = await adminClient
        .from('staff_profiles')
        .select('*')
        .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
        .maybeSingle();

      if (profile) {
        profileData = {
          id: profile.id,
          employeeId: profile.employee_id,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          role: profile.role,
          department: profile.department,
          assignedClass: profile.assigned_class || user.user_metadata?.assigned_class || null,
          assignedClasses: (user.user_metadata?.teaching_assignments && Array.isArray(user.user_metadata.teaching_assignments))
            ? Array.from(new Set(
                user.user_metadata.teaching_assignments.flatMap((ta: any) => ta.classes || [])
                  .concat((profile.assigned_class || user.user_metadata?.assigned_class) ? [profile.assigned_class || user.user_metadata?.assigned_class] : [])
              ))
            : (profile.assigned_class || user.user_metadata?.assigned_class ? [profile.assigned_class || user.user_metadata?.assigned_class] : []),
          subjects: (profile.subjects && profile.subjects.length > 0)
            ? profile.subjects
            : (user.user_metadata?.teaching_assignments?.map((ta: any) => ta.subject) || []),
          teachingAssignments: user.user_metadata?.teaching_assignments || [],
          teacherType: user.user_metadata?.teacher_type || (profile.assigned_class ? 'Class Teacher' : 'Subject Teacher'),
          phone: profile.phone || user.user_metadata?.phone || '',
          qualification: profile.qualification || user.user_metadata?.qualification || '',
          avatarUrl: user.user_metadata?.avatar_url || '',
          passwordChanged:
            profile.must_change_password === false || Boolean(user.user_metadata?.password_changed),
          mustChangePassword:
            profile.must_change_password !== false && user.user_metadata?.password_changed !== true,
          emergencyContact: user.user_metadata?.emergency_contact || '',
          emergencyPhone: user.user_metadata?.emergency_phone || '',
          address: user.user_metadata?.address || '',
          bankName: user.user_metadata?.bank_name || '',
          accountNumber: user.user_metadata?.account_number || '',
        };

        if (profile.role === 'principal' || profile.role === 'admin') {
          effectiveRole = 'admin';
        } else if (profile.role === 'bursar') {
          effectiveRole = 'bursar';
        } else if (profile.role === 'proprietor') {
          effectiveRole = 'proprietor';
        } else if (profile.role === 'security' || profile.role === 'reception' || profile.department?.toLowerCase()?.includes('safety')) {
          effectiveRole = 'security';
        } else {
          effectiveRole = 'teacher';
        }
      } else {
        // Check guardian
        const { data: guardian } = await adminClient
          .from('guardians')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            alt_phone,
            relationship,
            occupation,
            address,
            student_guardians (
              is_primary,
              authorized_pickup,
              student:students (
                id,
                first_name,
                last_name,
                admission_number,
                gender,
                photo_url,
                department,
                class_enrollments (
                  id,
                  department,
                  status,
                  class:classes (
                    id,
                    name
                  )
                )
              )
            )
          `)
          .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
          .maybeSingle();

        if (guardian) {
          effectiveRole = 'parent';
          const linkedStudents = (guardian.student_guardians || []).map((sg: any) => {
            const currentEnrolment = (sg.student?.class_enrollments || []).find((ce: any) => ce.status === 'active') || sg.student?.class_enrollments?.[0];
            const cls = Array.isArray(currentEnrolment?.class) ? currentEnrolment.class[0] : currentEnrolment?.class;
            return {
              id: sg.student?.id,
              name: `${sg.student?.first_name} ${sg.student?.last_name}`,
              admissionNumber: sg.student?.admission_number,
              gender: sg.student?.gender,
              photoUrl: sg.student?.photo_url,
              department: sg.student?.department || currentEnrolment?.department || null,
              isPrimary: sg.is_primary,
              pickupAuthorized: sg.authorized_pickup,
              currentClass: cls?.name || '—',
              classId: cls?.id || null,
            };
          });

          profileData = {
            id: guardian.id,
            name: `${guardian.first_name} ${guardian.last_name}`,
            firstName: guardian.first_name,
            lastName: guardian.last_name,
            email: guardian.email,
            phone: guardian.phone,
            altPhone: guardian.alt_phone,
            relationship: guardian.relationship,
            occupation: guardian.occupation,
            address: guardian.address,
            role: 'parent',
            children: linkedStudents,
          };
        } else {
          // Check student
          const admMeta = user.user_metadata?.admission_number;
          const { data: student } = await adminClient
            .from('students')
            .select(`
              id,
              first_name,
              middle_name,
              last_name,
              admission_number,
              gender,
              dob,
              blood_group,
              address,
              photo_url,
              department,
              status,
              class_enrollments (
                id,
                department,
                status,
                class:classes (
                  id,
                  name
                )
              ),
              student_guardians (
                is_primary,
                authorized_pickup,
                guardian:guardians (
                  id,
                  first_name,
                  last_name,
                  phone,
                  email,
                  relationship
                )
              )
            `)
            .or(`user_id.eq.${user.id}${admMeta ? `,admission_number.ilike.${admMeta}` : ''}`)
            .maybeSingle();

          if (student) {
            effectiveRole = 'student';
            const studentAny = student as any;
            const currentEnrolment = (studentAny.class_enrollments || []).find((ce: any) => ce.status === 'active') || (studentAny.class_enrollments || [])[0];
            const cls = Array.isArray(currentEnrolment?.class) ? currentEnrolment.class[0] : currentEnrolment?.class;
            const linkedGuardians = (studentAny.student_guardians || []).map((sg: any) => {
              const g = Array.isArray(sg.guardian) ? sg.guardian[0] : sg.guardian;
              return {
                id: g?.id,
                name: g ? `${g.first_name} ${g.last_name}` : '—',
                firstName: g?.first_name,
                lastName: g?.last_name,
                phone: g?.phone || '—',
                email: g?.email || '—',
                relationship: g?.relationship || 'Guardian',
                isPrimary: Boolean(sg.is_primary),
              };
            });

            profileData = {
              id: student.id,
              name: `${student.first_name} ${student.last_name}`,
              firstName: student.first_name,
              middleName: student.middle_name,
              lastName: student.last_name,
              admissionNumber: student.admission_number,
              gender: student.gender,
              dob: student.dob,
              bloodGroup: student.blood_group,
              address: student.address,
              photoUrl: student.photo_url,
              status: student.status,
              role: 'student',
              department: student.department || currentEnrolment?.department || null,
              currentClass: cls?.name || '—',
              currentClassCode: cls?.code || '—',
              currentClassId: cls?.id || null,
              guardians: linkedGuardians,
            };
          }
        }
      }
    } catch {
      // Use user metadata fallback if DB lookup fails
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
      },
      profile: profileData || {
        name: user.user_metadata?.full_name || 'Staff Member',
        email: user.email,
        role: effectiveRole,
      },
      role: effectiveRole,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        profile: null,
        role: null,
        error: err?.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    let { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: tokenData } = await supabase.auth.getUser(token);
        if (tokenData?.user) {
          user = tokenData.user;
          authErr = null;
        }
      }
    }

    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const adminClient = createAdminClient();

    // 1. Update fields in staff_profiles table if present
    const staffUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.phone === 'string') staffUpdates.phone = body.phone.trim();
    if (typeof body.qualification === 'string') staffUpdates.qualification = body.qualification.trim();

    await adminClient
      .from('staff_profiles')
      .update(staffUpdates)
      .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`);

    // Resolve avatar URL cleanly to prevent cookie header overflow
    let resolvedAvatarUrl = user.user_metadata?.avatar_url;
    if (typeof body.avatarUrl === 'string') {
      if (body.avatarUrl.startsWith('data:image/')) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const matches = body.avatarUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
          if (matches) {
            const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
            await fs.mkdir(avatarsDir, { recursive: true });
            const filename = `${user.id}.${ext}`;
            const filePath = path.join(avatarsDir, filename);
            await fs.writeFile(filePath, buffer);
            resolvedAvatarUrl = `/avatars/${filename}?v=${Date.now()}`;
          }
        } catch (saveErr) {
          console.error('Failed to save avatar image file', saveErr);
        }
      } else {
        resolvedAvatarUrl = body.avatarUrl;
      }
    }

    // 2. Update user_metadata and password in Supabase Auth
    const updatedMetadata: Record<string, any> = {
      ...(user.user_metadata || {}),
      phone: body.phone ?? user.user_metadata?.phone,
      title: body.title ?? user.user_metadata?.title,
      office: body.office ?? user.user_metadata?.office,
      bio: body.bio ?? user.user_metadata?.bio,
      qualification: body.qualification ?? user.user_metadata?.qualification,
      emergency_contact: body.emergencyContact ?? user.user_metadata?.emergency_contact,
      emergency_phone: body.emergencyPhone ?? user.user_metadata?.emergency_phone,
      address: body.address ?? user.user_metadata?.address,
      bank_name: body.bankName ?? user.user_metadata?.bank_name,
      account_number: body.accountNumber ?? user.user_metadata?.account_number,
      avatar_url: resolvedAvatarUrl,
    };

    const authUpdates: { user_metadata: any; password?: string } = {
      user_metadata: updatedMetadata,
    };

    if (typeof body.newPassword === 'string' && body.newPassword.trim().length > 0) {
      if (body.newPassword.trim().length < 6) {
        return NextResponse.json({ success: false, message: 'New password must be at least 6 characters long' }, { status: 400 });
      }

      // A live session alone is not enough to change the password: the current one must be confirmed.
      // The only exception is first-time setup, for an account that has never changed its password and signed in minutes ago.
      const signedInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
      const isFirstTimeSetup = user.user_metadata?.password_changed !== true && Date.now() - signedInAt < 15 * 60 * 1000;
      if (!isFirstTimeSetup) {
        if (typeof body.currentPassword !== 'string' || !body.currentPassword || !user.email) {
          return NextResponse.json({ success: false, message: 'Current password is required to set a new password' }, { status: 400 });
        }
        const { error: verifyErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: body.currentPassword,
        });
        if (verifyErr) {
          return NextResponse.json({ success: false, message: 'Current password is incorrect' }, { status: 400 });
        }
      }

      authUpdates.password = body.newPassword.trim();
      updatedMetadata.password_changed = true;
      updatedMetadata.password_changed_at = new Date().toISOString();
      updatedMetadata.default_password = null;
    }

    await adminClient.auth.admin.updateUserById(user.id, authUpdates);

    if (authUpdates.password) {
      // Clear must_change_password and one-time invite token on staff_profiles
      await adminClient
        .from('staff_profiles')
        .update({
          must_change_password: false,
          invite_token_hash: null,
          invite_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`);

      // Re-issue fresh session cookies so the user stays signed in seamlessly (DEF-088, DEF-022, DEF-070)
      if (user.email) {
        try {
          await supabase.auth.signInWithPassword({
            email: user.email,
            password: authUpdates.password,
          });
        } catch {}
      }

      try {
        const schoolId = user.user_metadata?.school_id || 'a0000000-0000-0000-0000-000000000001';
        await adminClient.from('audit_logs').insert({
          school_id: schoolId,
          actor_id: user.id,
          actor_role: (await getVerifiedRole(user)) || 'unknown',
          action: 'security.password_changed',
          resource_type: 'users',
          resource_id: user.id,
          metadata: {
            summary: 'Account password updated successfully',
          },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      avatarUrl: resolvedAvatarUrl,
      passwordChanged: Boolean(authUpdates.password || updatedMetadata.password_changed),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Update failed' }, { status: 500 });
  }
}

