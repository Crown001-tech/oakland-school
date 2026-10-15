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

    const { data: subjects, error } = await sb
      .from('subjects')
      .select(`
        id,
        name,
        code,
        category,
        is_active,
        created_at,
        teacher_assignments (
          id,
          class_id,
          classes:class_id ( id, name ),
          staff_profiles:staff_id ( id, first_name, last_name )
        )
      `)
      .order('name', { ascending: true });

    if (error) throw error;

    const formatted = (subjects || []).map((s: any) => {
      const assignments = (s.teacher_assignments || []).map((ta: any) => ({
        id: ta.id,
        className: ta.classes?.name,
        teacherName: ta.staff_profiles
          ? `${ta.staff_profiles.first_name} ${ta.staff_profiles.last_name}`.trim()
          : 'Unassigned',
      }));

      return {
        id: s.id,
        name: s.name,
        code: s.code,
        category: s.category || 'General',
        isActive: s.is_active,
        assignments: assignments,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getAdminClient();

    const { name, code, category, isActive = true } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Subject name is required' }, { status: 400 });
    }

    const generatedCode = code || name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

    const { data, error } = await sb
      .from('subjects')
      .upsert(
        {
          school_id: DEFAULT_SCHOOL_ID,
          name: name.trim(),
          code: generatedCode,
          category: category || 'General',
          is_active: isActive,
        },
        { onConflict: 'school_id,code' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Subject ID is required' }, { status: 400 });
    }

    const sb = getAdminClient();
    const { error } = await sb.from('subjects').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Subject deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
