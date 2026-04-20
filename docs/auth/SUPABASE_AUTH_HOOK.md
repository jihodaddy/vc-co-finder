# Enable custom_access_token_hook

Per D-03.3, `profiles.role` must be injected into the JWT as a `user_role`
claim for RLS policies and the admin-guard to work. Migration
`supabase/migrations/0011_helper_functions.sql` (Plan 02) **creates** the
function; Plan 08's `supabase db push` **installs** it in the database.
This document covers the final step — **enabling** the hook in the
Supabase Dashboard — which cannot be done via SQL.

## Why this is a manual dashboard step

Auth Hook registration is a Supabase Auth service configuration, not a
Postgres object. There is no SQL statement that activates it; the toggle
lives in `auth.config` behind the Dashboard. This step is one click but
must be performed per-project (and re-verified after any project restore).

## Steps

- [ ] Visit https://app.supabase.com/project/_/auth/hooks (replace `_`
      with your project ref).
- [ ] Find the **"Customize Access Token (JWT) Claims"** section.
- [ ] Click **Enable Hook**.
- [ ] **Schema:** `public`
- [ ] **Function:** `custom_access_token_hook`
- [ ] Save.

## Verify

After enabling, re-login (a fresh sign-in issues a new JWT that runs
through the hook). The JWT `access_token` should then include
`"user_role": "user"` (or `"editor"` / `"admin"`) as a top-level claim.

Decode the cookie JWT via Chrome DevTools → Application → Cookies →
`sb-<project>-auth-token` → copy → paste into https://jwt.io:

```jsonc
{
  "sub": "...",
  "email": "...",
  "user_role": "user",   // ← must be present
  "aud": "authenticated",
  ...
}
```

If the claim is missing after sign-in, check in order:

1. Is the hook enabled in Dashboard (this doc)?
2. Did migration `0011_helper_functions.sql` get applied to this project
   (`supabase db push` from Plan 08)?
3. Does the authenticated user have a `profiles` row? Should be created
   automatically by the `on_auth_user_created` trigger on first sign-in.
4. Is `public.custom_access_token_hook(JSONB)` `GRANT EXECUTE`-ed to
   `supabase_auth_admin`? The migration does this; re-run the `GRANT`
   block if you restored the project without re-running migrations.

## Related docs

- `supabase/migrations/0011_helper_functions.sql` — function definition.
- `src/lib/auth/session.ts` — client-side `user_role` claim decoder.
- `src/lib/auth/admin-guard.ts` — 404-gate consumer of the claim.
