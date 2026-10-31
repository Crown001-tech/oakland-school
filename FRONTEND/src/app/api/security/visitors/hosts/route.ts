import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('staff_profiles')
      .select('id, employee_id, first_name, last_name, role, department')
      .order('first_name', { ascending: true });

    if (error) throw error;

    const hosts = (data || []).map((s: any) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
      employeeId: s.employee_id,
      role: s.role,
      department: s.department || 'Administration',
    }));

    return NextResponse.json({
      success: true,
      hosts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch host staff list' },
      { status: 500 }
    );
  }
}
