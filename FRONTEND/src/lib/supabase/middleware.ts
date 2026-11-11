import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { checkApiAccess } from '@/lib/api-guard';
import { ROLE_COOKIE, resolveVerifiedRole } from '@/lib/auth-role';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_SUPABASE_ANON_KEY || '';
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

  // A role counts only when it comes from a verified Supabase user: app_metadata, or the signed cookie bound to that user.
  const effectiveRole = await resolveVerifiedRole(user, request.cookies.get(ROLE_COOKIE)?.value);

  // API access policy: every endpoint needs a verified session, plus per-role rules
  const hasSession = Boolean(user);
  const apiDenial = checkApiAccess({
    pathname,
    method: request.method,
    role: effectiveRole,
    hasSession,
    searchParams: request.nextUrl.searchParams,
  });
  if (apiDenial) {
    return NextResponse.json({ success: false, message: apiDenial.message }, { status: apiDenial.status });
  }

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

  // Protect Parent routes (Strictly requires Parent role)
  if (pathname.startsWith('/parent')) {
    if (effectiveRole !== 'parent') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect Student routes (Strictly requires Student role)
  if (pathname.startsWith('/student')) {
    if (effectiveRole !== 'student') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect Security & Reception routes (Strictly requires Security role)
  if (pathname.startsWith('/security')) {
    if (effectiveRole !== 'security') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect Proprietor routes (Strictly requires Proprietor role)
  if (pathname.startsWith('/proprietor')) {
    if (effectiveRole !== 'proprietor') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}
