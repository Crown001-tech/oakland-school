import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

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
      const role = data.user.user_metadata?.role || 'admin';
      const destination =
        role === 'admin' || role === 'principal'
          ? '/admin'
          : role === 'proprietor'
          ? '/proprietor'
          : role === 'bursar'
          ? '/bursar'
          : '/teacher';

      const response = NextResponse.redirect(new URL(destination, request.url));
      const isProd = process.env.NODE_ENV === 'production';
      response.cookies.set('oakland_auth_role', role, {
        path: '/',
        maxAge: 604800,
        sameSite: 'lax',
        httpOnly: true,
        secure: isProd,
      });
      return response;
    }
  }

  return NextResponse.redirect(new URL('/login?error=InvalidOrExpiredLink', request.url));
}
