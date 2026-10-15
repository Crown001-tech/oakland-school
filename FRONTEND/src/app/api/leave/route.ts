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
    const { data: rows, error } = await sb
      .from('workflow_instances')
      .select('*')
      .eq('entity_type', 'leave_request')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (rows || []).map((row: any) => ({
      id: row.id,
      staffName: row.metadata?.staffName || row.initiated_by_name || 'Staff Member',
      employeeId: row.metadata?.employeeId || '—',
      role: row.metadata?.role || 'Staff',
      leaveType: row.metadata?.leaveType || 'Casual',
      startDate: row.metadata?.startDate || '—',
      endDate: row.metadata?.endDate || '—',
      days: Number(row.metadata?.days) || 1,
      reason: row.metadata?.reason || '—',
      reliefTeacher: row.metadata?.reliefTeacher || '—',
      submittedAt: row.created_at
        ? new Date(row.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
      status: row.status === 'approved' ? 'Approved' : row.status === 'rejected' ? 'Declined' : 'Pending',
      notes: row.metadata?.notes || '',
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

    const {
      staffName,
      employeeId,
      role,
      leaveType,
      startDate,
      endDate,
      days,
      reason,
      reliefTeacher,
      notes,
    } = body;

    if (!staffName) {
      return NextResponse.json(
        { success: false, message: 'Staff name is required for leave request' },
        { status: 400 }
      );
    }

    // Find leave_request workflow definition
    const { data: def } = await sb
      .from('workflow_definitions')
      .select('id')
      .eq('code', 'leave_request')
      .maybeSingle();

    const definitionId = def?.id || '7c5c33c9-5280-4f0f-97d2-dfc3489259f5';

    const { data, error } = await sb
      .from('workflow_instances')
      .insert({
        school_id: DEFAULT_SCHOOL_ID,
        definition_id: definitionId,
        entity_type: 'leave_request',
        entity_id: employeeId || 'leave-' + Date.now(),
        current_step: 1,
        total_steps: 2,
        status: 'in_progress',
        initiated_by_name: staffName,
        metadata: {
          staffName,
          employeeId: employeeId || '—',
          role: role || 'Teacher',
          leaveType: leaveType || 'Casual',
          startDate: startDate || '—',
          endDate: endDate || '—',
          days: Number(days) || 1,
          reason: reason || '—',
          reliefTeacher: reliefTeacher || '—',
          notes: notes || '',
        },
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Leave request submitted successfully', data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getAdminClient();
    const { id, action, notes } = body;

    if (!id || !action) {
      return NextResponse.json(
        { success: false, message: 'ID and action are required' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const currentStep = action === 'approve' ? 2 : 1;

    // Fetch existing instance to merge metadata
    const { data: existing, error: fetchErr } = await sb
      .from('workflow_instances')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Leave request not found' }, { status: 404 });
    }

    const updatedMetadata = {
      ...(existing.metadata || {}),
      notes: notes || (action === 'approve' ? 'Approved by Principal' : 'Declined by Principal'),
    };

    const { error: updateErr } = await sb
      .from('workflow_instances')
      .update({
        status: newStatus,
        current_step: currentStep,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // Record step in workflow_steps
    await sb.from('workflow_steps').insert({
      instance_id: id,
      step_number: 2,
      step_name: 'Principal Approval',
      required_role: 'admin',
      action: action === 'approve' ? 'approved' : 'rejected',
      actor_name: 'Mr Seyi Bankole',
      actor_role: 'Principal',
      comments: notes || '',
      action_timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Leave request ${action === 'approve' ? 'approved' : 'declined'} successfully`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}
