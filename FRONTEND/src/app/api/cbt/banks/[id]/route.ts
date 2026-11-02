import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSchoolDb } from '@/lib/school-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bankId } = await params;
    const supabase = await createClient();
    const adminClient = await getSchoolDb();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: bank, error: bankErr } = await adminClient
      .from('cbt_question_banks')
      .select(`
        id,
        title,
        class_level,
        questions_count,
        created_at,
        created_by,
        subject:subjects ( id, name, code )
      `)
      .eq('id', bankId)
      .single();

    if (bankErr || !bank) {
      return NextResponse.json({ success: false, message: 'Question bank not found' }, { status: 404 });
    }

    const { data: questions, error: qErr } = await adminClient
      .from('cbt_questions')
      .select('*')
      .eq('bank_id', bankId)
      .order('created_at', { ascending: true });

    if (qErr) throw qErr;

    return NextResponse.json({
      success: true,
      data: {
        ...bank,
        questions: questions || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to fetch question bank' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bankId } = await params;
    const supabase = await createClient();
    const adminClient = await getSchoolDb();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await adminClient
      .from('cbt_question_banks')
      .delete()
      .eq('id', bankId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Question bank deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to delete question bank' }, { status: 500 });
  }
}
