import 'server-only';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type SessionUser = {
  id: string;
  email: string | null;
  role: 'user' | 'editor' | 'admin';
};

type JwtPayload = {
  user_role?: string;
  [key: string]: unknown;
};

/**
 * Decode the payload section of a JWT without verifying the signature.
 * Safe here because we trust @supabase/ssr to have already verified the
 * token via `auth.getUser()` before we peek at the claims.
 */
function decodeJwtPayload(jwt: string): JwtPayload | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    // JWT uses base64url; normalize to standard base64 before decoding.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Reads the authenticated user from the session cookie (server-only).
 * Returns `null` when no session exists.
 *
 * `role` is read from the JWT `user_role` claim injected by
 * `public.custom_access_token_hook` (migration 0011). A missing claim
 * defaults to `'user'` so a legacy session issued before the hook was
 * registered does not crash the admin-guard check — it just denies.
 *
 * Cached per request via `React.cache` — safe to call multiple times from
 * different RSCs in a single render.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data: userResult, error } = await supabase.auth.getUser();
  if (error || !userResult.user) return null;

  const { data: sessionResult } = await supabase.auth.getSession();
  const accessToken = sessionResult.session?.access_token ?? null;

  let role: SessionUser['role'] = 'user';
  if (accessToken) {
    const payload = decodeJwtPayload(accessToken);
    if (payload?.user_role === 'admin' || payload?.user_role === 'editor') {
      role = payload.user_role;
    }
  }

  return {
    id: userResult.user.id,
    email: userResult.user.email ?? null,
    role,
  };
});
