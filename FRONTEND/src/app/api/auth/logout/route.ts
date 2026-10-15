import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    // Sign out of Supabase auth server-side
    try {
      await supabase.auth.signOut();
    } catch {}

    const isProd = process.env.NODE_ENV === 'production';

    // Clear the HTTP-only role cookie
    cookieStore.set({
      name: 'oakland_auth_role',
      value: '',
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    // Also clear legacy cookie if present
    cookieStore.set({
      name: 'oakland_demo_role',
      value: '',
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return NextResponse.json({
      success: true,
      message: 'Signed out successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Error signing out.' },
      { status: 500 }
    );
  }
}
