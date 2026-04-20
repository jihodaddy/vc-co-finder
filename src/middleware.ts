import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

/**
 * Middleware chain (per phase context D-05.3):
 *   1. next-intl resolves locale → may 307-redirect `/` to `/ko/`.
 *   2. If no redirect, Supabase refreshes the session cookie so downstream
 *      Server Components see a valid JWT.
 *
 * Order matters: locale resolution must happen before session refresh so
 * the request URL reflects the final locale path.
 */
export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  if (intlResponse.status === 307 || intlResponse.status === 302) {
    return intlResponse;
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next.js internals, static assets, and API routes that don't need
    // i18n or auth refresh (heartbeat + revalidate endpoints authenticate
    // themselves via shared secrets — see threat T-01-04).
    '/((?!_next/static|_next/image|favicon.ico|api/health|api/revalidate|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
