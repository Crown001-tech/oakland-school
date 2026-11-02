import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedRole } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = await getSchoolDb();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user)) || 'student';
    const userEmail = (user.email || '').toLowerCase();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    let notifications: any[] = [];

    if (effectiveRole === 'student') {
      // 1. Resolve student profile and active class
      const admMeta = user.user_metadata?.admission_number;
      const { data: student } = await adminClient
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          admission_number,
          class_enrollments (
            id,
            status,
            class_id,
            classes:class_id ( id, name )
          )
        `)
        .or(`user_id.eq.${user.id}${admMeta ? `,admission_number.ilike.${admMeta}` : ''}`)
        .maybeSingle();

      const studentId = student?.id;
      const activeEnrollment = (student?.class_enrollments || []).find(
        (e: any) => e.status === 'active'
      ) || (student?.class_enrollments || [])[0];
      const className = (activeEnrollment as any)?.classes?.name || (Array.isArray((activeEnrollment as any)?.classes) ? (activeEnrollment as any).classes[0]?.name : undefined);

      // Build target identifiers
      const studentTargets = [
        userEmail,
        `student:${studentId}`,
        `class:${className}`,
        'All Students',
        'All Community',
        'broadcast@school.invalid',
      ].filter(Boolean);

      const { data: rows } = await adminClient
        .from('notifications')
        .select('*')
        .in('recipient_name', ['All Students', 'All Community', 'All Guardians', `Students of ${className}`])
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data: directRows } = await adminClient
        .from('notifications')
        .select('*')
        .or(
          `recipient_email.in.(${studentTargets.map((t) => `"${t}"`).join(',')}),recipient_name.ilike.%${student?.last_name || ''}%`
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      // Merge and deduplicate
      const merged = new Map<string, any>();
      (rows || []).forEach((n: any) => merged.set(n.id, n));
      (directRows || []).forEach((n: any) => merged.set(n.id, n));

      notifications = Array.from(merged.values())
        .filter((n: any) => {
          // Exclude internal staff notifications and parent fee receipts
          if (n.notification_type === 'assignment_submission') return false;
          if (n.notification_type === 'fee' && !n.recipient_name?.includes(student?.first_name || '')) return false;
          return true;
        })
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (effectiveRole === 'parent') {
      // 2. Resolve parent profile and linked children
      const { data: guardian } = await adminClient
        .from('guardians')
        .select(`
          id,
          first_name,
          last_name,
          email,
          student_guardians (
            student:students (
              id,
              first_name,
              last_name,
              admission_number
            )
          )
        `)
        .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
        .maybeSingle();

      const children = (guardian?.student_guardians || [])
        .map((sg: any) => sg.student)
        .filter(Boolean);

      const parentTargets = [
        userEmail,
        guardian?.email,
        'All Guardians',
        'All Parents',
        'All Community',
        'broadcast@school.invalid',
      ].filter(Boolean);

      // Children targets
      children.forEach((c: any) => {
        parentTargets.push(`parent:student:${c.id}`);
        parentTargets.push(`parent:student:${c.first_name} ${c.last_name}`);
      });

      const { data: rows } = await adminClient
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit * 2);

      notifications = (rows || []).filter((n: any) => {
        const sub = (n.subject || '').toLowerCase();
        const text = (n.content_html || '').toLowerCase();
        const recName = (n.recipient_name || '').toLowerCase();
        const recEmail = (n.recipient_email || '').toLowerCase();

        // STRICT PARENT ISOLATION INVARIANT: Zero assignment / homework alerts for parents
        if (
          n.notification_type?.startsWith('assignment') ||
          sub.includes('assignment') ||
          sub.includes('homework') ||
          text.includes('assignment')
        ) {
          return false;
        }

        // Match parent targets or linked children
        const isTargeted =
          parentTargets.includes(n.recipient_email) ||
          recName.includes('guardian') ||
          recName.includes('parent') ||
          recName.includes('community') ||
          children.some((c: any) =>
            recName.includes(c.first_name.toLowerCase()) ||
            recName.includes(c.last_name.toLowerCase()) ||
            text.includes(c.first_name.toLowerCase()) ||
            recEmail.includes(c.id)
          );

        return isTargeted;
      });
    } else {
      // 3. Faculty / Teacher / Admin perspective
      const { data: staff } = await adminClient
        .from('staff_profiles')
        .select('id, first_name, last_name, email')
        .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
        .maybeSingle();

      const staffTargets = [
        userEmail,
        staff?.id ? `teacher:${staff.id}` : null,
        'All Staff',
        'all',
        'broadcast@school.invalid',
      ].filter(Boolean);

      const { data: rows } = await adminClient
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      notifications = (rows || []).filter((n: any) => {
        const recEmail = (n.recipient_email || '').toLowerCase();
        const recName = (n.recipient_name || '').toLowerCase();

        if (staffTargets.some((t: any) => recEmail === t.toLowerCase())) return true;
        if (recName.includes('staff') || recName.includes('faculty') || recName.includes('principal')) return true;
        if (n.notification_type === 'assignment_submission') return true;
        if (n.notification_type === 'cbt_session') return true;
        return false;
      });
    }

    // Format response payload
    const formatted = notifications.slice(0, limit).map((n: any) => {
      let actionUrl = '#';
      if (effectiveRole === 'student') {
        if (n.notification_type?.includes('assignment')) actionUrl = '/student/assignments';
        else if (n.notification_type?.includes('cbt')) actionUrl = '/student/cbt';
        else if (n.notification_type?.includes('report_card')) actionUrl = '/student/results';
        else if (n.notification_type?.includes('timetable')) actionUrl = '/student/timetable';
      } else if (effectiveRole === 'parent') {
        if (n.notification_type?.includes('report_card')) actionUrl = '/parent/results';
        else if (n.notification_type?.includes('fee')) actionUrl = '/parent/fees';
        else if (n.notification_type?.includes('pickup')) actionUrl = '/parent/pickup';
        else if (n.notification_type?.includes('broadcast')) actionUrl = '/parent/communications';
        else actionUrl = '/parent/communications';
      } else {
        if (n.notification_type?.includes('assignment')) actionUrl = '/teacher/assignments';
        else if (n.notification_type?.includes('cbt')) actionUrl = '/teacher/cbt';
        else if (n.notification_type?.includes('report_card')) actionUrl = '/teacher/report-cards';
        else actionUrl = '/teacher';
      }

      const isRead = (n.attempts_count || 0) > 0;

      return {
        id: n.id,
        type: n.notification_type || 'system',
        subject: n.subject,
        content: n.content_html,
        status: isRead ? 'read' : 'unread',
        isRead,
        createdAt: n.created_at,
        actionUrl,
      };
    });

    const unreadCount = formatted.filter((n: any) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications: formatted,
      unreadCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = await getSchoolDb();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // Mark matching notifications as read
      const userEmail = user.email?.toLowerCase();
      if (userEmail) {
        await adminClient
          .from('notifications')
          .update({ attempts_count: 1, last_attempt_at: new Date().toISOString() })
          .ilike('recipient_email', `%${userEmail}%`);
      }
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationId) {
      const { error } = await adminClient
        .from('notifications')
        .update({ attempts_count: 1, last_attempt_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ success: false, message: 'No action specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = await getSchoolDb();
    const body = await request.json();

    const {
      recipientName,
      recipientEmail,
      notificationType = 'system',
      subject,
      content,
    } = body;

    if (!subject || !recipientEmail) {
      return NextResponse.json(
        { success: false, message: 'Subject and recipient email are required' },
        { status: 400 }
      );
    }

    const idempotencyKey = `notif-api-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await adminClient
      .from('notifications')
      .insert({
        school_id: adminClient.schoolId,
        recipient_name: recipientName || 'User',
        recipient_email: recipientEmail,
        notification_type: notificationType,
        subject: subject.trim(),
        content_html: content || subject,
        status: 'sent',
        attempts_count: 0,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, notification: data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}
