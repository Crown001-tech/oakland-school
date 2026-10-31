import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { DEMO_ENTRY_PATH, isDemoModeEnabled, shouldRedirectToDemoEntry } from '@/lib/demo-mode';

export async function middleware(request: NextRequest) {
  // The demo deployment has one way in: the one-tap role page
  if (isDemoModeEnabled() && shouldRedirectToDemoEntry(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL(DEMO_ENTRY_PATH, request.url));
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
