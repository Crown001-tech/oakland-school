import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const isProd = process.env.NODE_ENV === 'production';

  let user = null;

  // Attempt Supabase session extraction with HTTP-only cookies
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
              httpOnly: true,
              secure: isProd,
              sameSite: 'lax',
              path: '/',
            });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
              httpOnly: true,
              secure: isProd,
              sameSite: 'lax',
              path: '/',
              maxAge: 0,
            });
          },
        },
      });

      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch {
      // Ignore lookup failure in offline / initial load
    }
  }

  const pathname = request.nextUrl.pathname;
  const authRole = request.cookies.get('oakland_auth_role')?.value || request.cookies.get('oakland_demo_role')?.value;

  // Determine effective role
  const realRole = user?.user_metadata?.role || user?.app_metadata?.role;
  const effectiveRole = realRole || authRole;

  // Protect Bursar routes (Strictly requires Bursar role)
  if (pathname.startsWith('/bursar')) {
    if (effectiveRole !== 'bursar') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect Admin routes (Strictly requires Admin role)
  if (pathname.startsWith('/admin')) {
    if (effectiveRole !== 'admin' && effectiveRole !== 'principal') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect Teacher routes (Strictly requires Teacher role)
  if (pathname.startsWith('/teacher')) {
    if (effectiveRole !== 'teacher') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Proprietor portal remains open exclusively
  return response;
}
