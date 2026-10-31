import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = createAdminClient();
    const { id } = await params;
    const body = await req.json();

    const {
      serviceName,
      category,
      contactPerson,
      primaryPhone,
      secondaryPhone,
      address,
      displayOrder,
    } = body;

    const updateFields: any = {};
    if (serviceName !== undefined) updateFields.service_name = serviceName.trim();
    if (category !== undefined) updateFields.category = category;
    if (contactPerson !== undefined) updateFields.contact_person = contactPerson?.trim() || null;
    if (primaryPhone !== undefined) updateFields.primary_phone = primaryPhone.trim();
    if (secondaryPhone !== undefined) updateFields.secondary_phone = secondaryPhone?.trim() || null;
    if (address !== undefined) updateFields.address = address?.trim() || null;
    if (displayOrder !== undefined) updateFields.display_order = Number(displayOrder);

    const { data, error } = await admin
      .from('emergency_contacts')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Emergency contact updated successfully.`,
      contact: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to update emergency contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = createAdminClient();
    const { id } = await params;

    const { error } = await admin
      .from('emergency_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Emergency contact removed.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to delete emergency contact' },
      { status: 500 }
    );
  }
}
