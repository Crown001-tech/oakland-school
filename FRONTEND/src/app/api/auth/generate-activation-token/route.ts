import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { getVerifiedRole } from '@/lib/caller';

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'OAK-';
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    token += chars[randomIndex];
  }
  return token;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify authorized caller (Admin, Principal, or Proprietor)
    const { data: { user } } = await supabase.auth.getUser();
    const userRole = (await getVerifiedRole(user));

    if (userRole !== 'admin' && userRole !== 'principal' && userRole !== 'proprietor') {
      return NextResponse.json(
        { success: false, message: 'Forbidden. Only school administrators may generate activation codes.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { studentId, expiryDays = 14 } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: 'Student ID is required.' },
        { status: 400 }
      );
    }

    // Verify student exists
    const { data: student, error: studentErr } = await adminClient
      .from('students')
      .select('id, first_name, last_name, admission_number, is_activated')
      .eq('id', studentId)
      .maybeSingle();

    if (studentErr || !student) {
      return NextResponse.json(
        { success: false, message: 'Student record not found.' },
        { status: 404 }
      );
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateErr } = await adminClient
      .from('students')
      .update({
        activation_token: token,
        activation_expires_at: expiresAt,
        is_activated: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, message: 'Failed to save activation code in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      token,
      expiresAt,
      studentId: student.id,
      admissionNumber: student.admission_number,
      studentName: `${student.first_name} ${student.last_name}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to generate activation code.' },
      { status: 500 }
    );
  }
}
