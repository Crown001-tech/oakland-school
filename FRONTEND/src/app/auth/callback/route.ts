import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ROLE_COOKIE, resolveVerifiedRole, roleCookieOptions, signRoleCookie } from '@/lib/auth-role';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({
                name,
                value,
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              });
            } catch {}
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({
                name,
                value: '',
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 0,
              });
            } catch {}
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Only a role that is already trusted (service-set app_metadata) or tied to a staff record is honoured here.
      const trustedRole = await resolveVerifiedRole(data.user, cookieStore.get(ROLE_COOKIE)?.value);
      let role: string | undefined = trustedRole;
      if (!role) {
        const { data: profile } = await createAdminClient()
          .from('staff_profiles')
          .select('role')
          .or(`user_id.eq.${data.user.id},email.eq.${data.user.email?.toLowerCase()}`)
          .maybeSingle();
        if (profile?.role === 'principal' || profile?.role === 'admin') role = 'admin';
        else if (profile?.role === 'bursar') role = 'bursar';
        else if (profile?.role === 'proprietor') role = 'proprietor';
        else if (profile?.role === 'security' || profile?.role === 'reception') role = 'security';
        else if (profile) role = 'teacher';
      }

      if (!role) {
        return NextResponse.redirect(new URL('/login?error=NoLinkedRecord', request.url));
      }

      const destination =
        role === 'admin' || role === 'principal'
          ? '/admin'
          : role === 'proprietor'
          ? '/proprietor'
          : role === 'bursar'
          ? '/bursar'
          : role === 'security'
          ? '/security'
          : '/teacher';

      const response = NextResponse.redirect(new URL(destination, request.url));
      response.cookies.set(ROLE_COOKIE, await signRoleCookie(role, data.user.id), roleCookieOptions());
      return response;
    }
  }

  return NextResponse.redirect(new URL('/login?error=InvalidOrExpiredLink', request.url));
}
