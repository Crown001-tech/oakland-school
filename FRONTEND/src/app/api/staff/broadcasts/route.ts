import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getAdminClient();
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
    const sb = getAdminClient();

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
        school_id: DEFAULT_SCHOOL_ID,
        sender_name: 'Office of the Proprietor',
        title: title.trim(),
        message: message.trim(),
        priority: priorityVal,
        target_audience: targetAudience,
      })
      .select()
      .single();

    if (error) throw error;

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
    const sb = getAdminClient();
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

