import { getPrincipalName } from '@/lib/school-people';
import { NextResponse, type NextRequest } from 'next/server';
import { getCaller, isAdminRole } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';
import { notifyBroadcast } from '@/lib/messaging/events';



// GET /api/communications - Fetch dispatches history from PostgreSQL
export async function GET() {
  try {
    const sb = await getSchoolDb();

    // Administrators see all dispatches; guardians see only broadcasts addressed to them; nobody else reads this feed.
    const caller = await getCaller();
    const isAdmin = isAdminRole(caller.role);
    if (!isAdmin && caller.role !== 'parent') {
      return NextResponse.json({ success: false, message: 'Access denied for this role.' }, { status: 403 });
    }

    let feed = sb.from('notifications').select('*');
    if (!isAdmin) {
      // DEF-071: Strictly restrict parent notices to broadcast circulars meant for guardians
      feed = feed
        .eq('notification_type', 'broadcast')
        .not('recipient_name', 'in', '("All Staff","Academic Faculty","Principal","Proprietor","Security")');
    }
    const { data: rows, error } = await feed.order('created_at', { ascending: false }).limit(50);

    if (error && error.code !== '42P01') throw error;

    const history = (rows || []).map((n: any) => {
      const isUrgent = (n.subject || '').toLowerCase().includes('urgent') || (n.content_html || '').toLowerCase().includes('urgent');
      const isCritical = (n.subject || '').toLowerCase().includes('critical') || (n.subject || '').toLowerCase().includes('emergency');
      return {
        id: n.id,
        recipientsGroup: n.recipient_name || 'All Guardians',
        recipientCount: n.attempts_count || 1,
        subject: n.subject,
        priority: isUrgent ? 'urgent' : 'normal',
        severity: isCritical ? 'critical' : 'low',
        sentAt: n.created_at
          ? `${new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Recent',
        status: 'Posted',
        content: n.content_html,
      };
    });

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch communication history' },
      { status: 500 }
    );
  }
}

// POST /api/communications - Dispatch announcement to guardians or staff
export async function POST(req: NextRequest) {
  try {
    const sb = await getSchoolDb();
    const body = await req.json();

    const {
      recipientsGroup = 'All Guardians',
      recipientCount = 1,
      audience,
      className: audienceClass,
      subject,
      message,
      deliveryTiming = 'now',
    } = body;

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Subject and message body are required' },
        { status: 400 }
      );
    }

    const idempotencyKey = `comm-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Who the notice is for is worked out here, from the school's records, never from a number the page sends
    let studentIds: string[] | null = null;
    if (audience === 'all_parents') {
      const { data } = await sb.from('students').select('id').eq('status', 'active');
      studentIds = (data || []).map((r: { id: string }) => r.id);
    } else if (audience === 'class') {
      const { data: cls } = await sb.from('classes').select('id').eq('name', String(audienceClass || '')).maybeSingle();
      if (!cls) return NextResponse.json({ success: false, message: 'Choose a class that exists.' }, { status: 404 });
      const { data } = await sb.from('class_enrollments').select('student_id').eq('class_id', cls.id).eq('status', 'active');
      studentIds = (data || []).map((r: { student_id: string }) => r.student_id);
    }
    const counts = studentIds ? await notifyBroadcast(sb, { studentIds, subject: subject.trim(), text: message.trim(), broadcastKey: idempotencyKey }) : { queued: 0, skipped: 0 };
    const reached = studentIds ? counts.queued + counts.skipped : recipientCount;

    const { data: newNotification, error: notifErr } = await sb
      .from('notifications')
      .insert({
        school_id: sb.schoolId,
        recipient_email: 'broadcast@school.invalid',
        recipient_name: recipientsGroup,
        notification_type: 'broadcast',
        subject: subject.trim(),
        content_html: message.trim(),
        status: 'delivered',
        idempotency_key: idempotencyKey,
        attempts_count: reached,
      })
      .select()
      .maybeSingle();

    if (notifErr && notifErr.code !== '42P01') {
      // If table constraint issue, fallback gracefully
      console.warn('Notifications insert notice:', notifErr.message);
    }

    const principalName = await getPrincipalName(sb);

    // Mirror to staff_broadcasts if dispatched to All Staff
    if (recipientsGroup === 'All Staff') {
      try {
        await sb.from('staff_broadcasts').insert({
          school_id: sb.schoolId,
          sender_name: principalName,
          title: subject.trim(),
          message: message.trim(),
          priority: 'normal',
          target_audience: 'all',
        });
      } catch (sbErr) {
        console.warn('Mirroring to staff_broadcasts notice:', sbErr);
      }
    }

    // Record in audit_logs
    try {
      await sb.from('audit_logs').insert({
        school_id: sb.schoolId,
        actor_role: 'Principal',
        action: 'COMMUNICATION_DISPATCH',
        resource_type: 'notifications',
        metadata: {
          recipientsGroup,
          recipientCount: reached,
          queued: counts.queued,
          skipped: counts.skipped,
          subject: subject.trim(),
          timing: deliveryTiming,
          publishedBy: principalName,
        },
      });
    } catch {}

    const record = {
      id: newNotification?.id || `msg-${Date.now()}`,
      recipientsGroup,
      recipientCount: reached,
      subject: subject.trim(),
      sentAt: `${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      status: deliveryTiming === 'now' ? 'Posted' : 'Scheduled',
    };

    return NextResponse.json({
      success: true,
      message: `Notice posted to ${recipientsGroup}.`,
      record,
      messages: counts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Dispatch failed' },
      { status: 500 }
    );
  }
}
