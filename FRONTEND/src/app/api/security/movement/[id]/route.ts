import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Movement record ID is required' },
        { status: 400 }
      );
    }

    const admin = await getSchoolDb();
    const body = await req.json().catch(() => ({}));
    const { notes } = body;

    const returnTime = new Date().toISOString();

    const updatePayload: any = {
      status: 'returned',
      actual_return_time: returnTime,
    };

    if (notes) {
      updatePayload.notes = notes.trim();
    }

    const { data, error } = await admin
      .from('student_movements')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Student ${data.student_name} return logged successfully.`,
      movement: {
        id: data.id,
        passNumber: data.pass_number,
        studentName: data.student_name,
        departureTime: data.departure_time,
        actualReturnTime: data.actual_return_time,
        status: data.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to record student return' },
      { status: 500 }
    );
  }
}
