import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';



export async function GET() {
  try {
    const sb = await getSchoolDb();
    const { data: broadcasts, error } = await sb
      .from('staff_broadcasts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (broadcasts || []).map((b: any) => ({
      id: b.id,
      title: b.title,
      message: b.message,
      audience:
        b.target_audience === 'teaching'
          ? 'Teachers'
          : b.target_audience === 'management'
          ? 'Administration'
          : b.target_audience === 'non_teaching'
          ? 'Support Staff'
          : 'All Staff',
      priority: b.priority === 'urgent' ? 'Important Notice' : 'General Announcement',
      channels: ['Staff Portal Dashboard', 'Official Staff Email'],
      dispatchedAt: b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recent',
      senderName: b.sender_name || 'Office of the Proprietor',
    }));

    return NextResponse.json({ success: true, data: formatted });
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
    const sb = await getSchoolDb();

    const { title, message, audience, priority } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: 'Title and message body are required' },
        { status: 400 }
      );
    }

    const targetAudience =
      audience === 'Teachers'
        ? 'teaching'
        : audience === 'Administration'
        ? 'management'
        : audience === 'Support Staff'
        ? 'non_teaching'
        : 'all';

    const priorityVal = priority === 'Important Notice' ? 'urgent' : 'normal';

    const { data, error } = await sb
      .from('staff_broadcasts')
      .insert({
        school_id: sb.schoolId,
        sender_name: 'Office of the Proprietor',
        title: title.trim(),
        message: message.trim(),
        priority: priorityVal,
        target_audience: targetAudience,
      })
      .select()
      .single();

    if (error) throw error;

    // Simultaneous delivery to notifications table (DEF-002)
    try {
      await sb.from('notifications').insert({
        school_id: sb.schoolId,
        recipient_email: 'broadcast@school.invalid',
        recipient_name: audience === 'All Staff' ? 'All Staff' : audience,
        notification_type: 'broadcast',
        subject: title.trim(),
        content_html: message.trim(),
        status: 'sent',
        attempts_count: 0,
      });
    } catch (notifErr) {
      console.warn('Notification delivery sync warning:', notifErr);
    }

    // Institutional Audit Log (DEF-003)
    try {
      await sb.from('audit_logs').insert({
        school_id: sb.schoolId,
        actor_name: 'Office of the Proprietor',
        actor_role: 'Proprietor',
        action: 'BROADCAST.SENT',
        resource_type: 'staff_broadcast',
        resource_id: data.id,
        metadata: {
          title: title.trim(),
          audience: targetAudience,
          priority: priorityVal,
        },
      });
    } catch (auditErr) {
      console.warn('Audit logging warning:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Staff announcement dispatched successfully.',
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Dispatch failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Broadcast ID is required' }, { status: 400 });
    }
    const sb = await getSchoolDb();
    const { error } = await sb.from('staff_broadcasts').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Broadcast deleted successfully' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    );
  }
}

