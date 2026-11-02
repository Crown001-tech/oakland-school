import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { DEMO_ENTRY_PATH, isDemoModeEnabled, shouldRedirectToDemoEntry } from '@/lib/demo-mode';
import { isModuleEnabled, moduleForPath } from '@/lib/modules';
import { getModuleSwitchesForHost } from '@/lib/school-edge';

export async function middleware(request: NextRequest) {
  // The demo deployment has one way in: the one-tap role page
  if (isDemoModeEnabled() && shouldRedirectToDemoEntry(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL(DEMO_ENTRY_PATH, request.url));
  }

  // A module the school has switched off: its pages send the visitor home and its API answers 404
  const moduleId = moduleForPath(request.nextUrl.pathname);
  if (moduleId && !isModuleEnabled(await getModuleSwitchesForHost(request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host), moduleId)) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, message: 'Not found.' }, { status: 404 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
