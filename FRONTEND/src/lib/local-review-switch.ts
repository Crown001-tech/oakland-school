import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ROLE_COOKIE, roleCookieOptions, signRoleCookie } from '@/lib/auth-role';
import { cookies } from 'next/headers';
import type { DemoRole } from '@/lib/demo-mode';

// Role to the staff role stored in staff_profiles, and where that role lands after signing in
const STAFF_ROLE: Partial<Record<DemoRole, string>> = {
  proprietor: 'proprietor',
  principal: 'admin',
  bursar: 'bursar',
  teacher: 'teacher',
  security: 'security',
};
const AUTH_ROLE: Record<DemoRole, string> = {
  proprietor: 'proprietor',
  principal: 'admin',
  bursar: 'bursar',
  teacher: 'teacher',
  security: 'security',
  parent: 'parent',
  student: 'student',
};
const LANDING: Record<DemoRole, string> = {
  proprietor: '/proprietor',
  principal: '/admin',
  bursar: '/bursar',
  teacher: '/teacher',
  security: '/security',
  parent: '/parent',
  student: '/student',
};

const fail = (message: string, status = 404) => NextResponse.json({ success: false, message }, { status });

/** Finds an existing, signed-up account for the role: its auth user id and email. */
async function findAccount(role: DemoRole): Promise<{ userId: string; email: string } | null> {
  const admin = getSupabaseAdmin();

  let userId: string | null = null;
  const staffRole = STAFF_ROLE[role];
  if (staffRole) {
    const { data } = await admin
      .from('staff_profiles')
      .select('user_id')
      .eq('role', staffRole)
      .eq('is_active', true)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1);
    userId = data?.[0]?.user_id ?? null;
  } else if (role === 'parent') {
    const { data } = await admin
      .from('guardians')
      .select('user_id, student_guardians!inner(id)')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1);
    userId = data?.[0]?.user_id ?? null;
  } else {
    const { data } = await admin
      .from('students')
      .select('user_id')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1);
    userId = data?.[0]?.user_id ?? null;
  }
  if (!userId) return null;

  const { data: user } = await admin.auth.admin.getUserById(userId);
  return user?.user?.email ? { userId, email: user.user.email } : null;
}

/**
 * Signs the browser in as the first real account for `role`, with no password. Callers must have
 * already checked isLocalReviewAllowed(); this never runs on a deployed site.
 */
export async function switchToLocalRole(role: DemoRole): Promise<NextResponse> {
  const account = await findAccount(role);
  if (!account) return fail(`No signed-up ${role} account was found to switch to.`);

  const admin = getSupabaseAdmin();
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: account.email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return fail('Could not create a session for that account.', 500);

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (sessionError || !session?.user) return fail('Could not sign in as that account.', 500);

  const cookieStore = await cookies();
  cookieStore.set({
    name: ROLE_COOKIE,
    value: await signRoleCookie(AUTH_ROLE[role], session.user.id),
    ...roleCookieOptions(),
  });

  return NextResponse.json({ success: true, role: AUTH_ROLE[role], redirectUrl: LANDING[role] });
}
