import { NextResponse } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';


export async function GET() {
  try {
    const admin = await getSchoolDb();

    const { data, error } = await admin
      .from('students')
      .select(`
        id,
        admission_number,
        first_name,
        last_name,
        class_enrollments (
          classes:class_id (
            name
          )
        )
      `)
      .order('first_name', { ascending: true });

    if (error) throw error;

    const students = (data || []).map((s: any) => ({
      id: s.id,
      admissionNo: s.admission_number,
      fullName: `${s.first_name} ${s.last_name}`.trim(),
      className: (s.class_enrollments as any)?.[0]?.classes?.name || 'Enrolled',
    }));

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch student directory' },
      { status: 500 }
    );
  }
}
