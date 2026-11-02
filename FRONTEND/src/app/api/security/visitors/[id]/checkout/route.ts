import { NextResponse, type NextRequest } from 'next/server';
import { getSchoolDb } from '@/lib/school-db';


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Visitor ID is required' },
        { status: 400 }
      );
    }

    const admin = await getSchoolDb();
    const body = await req.json().catch(() => ({}));
    const { notes } = body;

    const checkoutTime = new Date().toISOString();

    const updatePayload: any = {
      status: 'checked_out',
      check_out_time: checkoutTime,
    };

    if (notes) {
      updatePayload.notes = notes.trim();
    }

    const { data, error } = await admin
      .from('visitors')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Visitor ${data.full_name} checked out successfully.`,
      visitor: {
        id: data.id,
        passNumber: data.pass_number,
        fullName: data.full_name,
        checkInTime: data.check_in_time,
        checkOutTime: data.check_out_time,
        status: data.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to check out visitor' },
      { status: 500 }
    );
  }
}
