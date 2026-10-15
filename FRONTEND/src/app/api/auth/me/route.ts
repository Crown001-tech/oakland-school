import { NextResponse, NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request?: NextRequest) {
  try {
    const cookieStore = await cookies();
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

    const roleCookie = cookieStore.get('oakland_auth_role')?.value || cookieStore.get('oakland_demo_role')?.value;

    if (error || !user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        profile: null,
        role: roleCookie || null,
      });
    }

    // Fetch official profile from PostgreSQL database
    let profileData: any = null;
    let effectiveRole = user.user_metadata?.role || roleCookie || 'teacher';

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
          passwordChanged: user.user_metadata?.password_changed ?? false,
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
        } else {
          effectiveRole = 'teacher';
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

    if (typeof body.newPassword === 'string' && body.newPassword.trim().length >= 6) {
      authUpdates.password = body.newPassword.trim();
      updatedMetadata.password_changed = true;
      updatedMetadata.password_changed_at = new Date().toISOString();
    }

    await adminClient.auth.admin.updateUserById(user.id, authUpdates);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      avatarUrl: resolvedAvatarUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Update failed' }, { status: 500 });
  }
}

