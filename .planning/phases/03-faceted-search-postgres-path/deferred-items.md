# Phase 3 — Deferred Items

Out-of-scope discoveries logged during plan execution. Not fixed inline because
they belong to a different owner / phase.

## 03-03 (Pure libraries)

### DB-INFRA-01 — DATABASE_URL password contains URL-unsafe characters

**Found during:** 03-03 Task 2 verification of `tests/unit/search-postgres.test.ts`.

**Symptom:** `postgres` library (v3.4.5) calls `new URL(connectionString)` during
`Postgres(url, options)` construction. The current `DATABASE_URL` value contains
`#`, `&`, `^` in the password segment (unencoded). `new URL()` treats `#` as a
fragment separator and `&` has special meaning — parsing fails with
`TypeError: Invalid URL (ERR_INVALID_URL)` before any connection is attempted.

**Scope:** pre-existing environment-wide concern, not introduced by this plan.
The DB schema-sanity test (`tests/unit/search-schema.test.ts`) uses the `pg`
library which has its own parser and tolerates the current format — which is
why the issue surfaces now, with the first consumer of the `postgres` lib.

**Impact:**
- `tests/unit/search-postgres.test.ts` is auto-skipped when DATABASE_URL can't be
  parsed (explicit `console.warn` surfaces the skip reason in CI logs — not
  silently green).
- Production runtime is unaffected: Next.js / Vercel pass DATABASE_URL through
  to the same `postgres` lib, so deployment will hit the same error. Must be
  resolved before Plan 05 ships the `/search` route.

**Fix (out of scope for 03-03):**
1. Percent-encode the password portion of DATABASE_URL in `.env.local` and in
   Vercel project settings:
     - `#` → `%23`
     - `&` → `%26`
     - `^` → `%5E`
2. Alternatively, rotate the Supabase DB password to an alphanumeric-only value
   — Supabase Dashboard → Settings → Database → Reset database password.
3. Re-run `npx vitest run tests/unit/search-postgres.test.ts` — the 4 smoke
   tests should go from `skipped` to `passed` against the live seed.

**Suggested owner:** DevOps / environment setup (before Plan 05 route ships).

**Plan 06 confirmation:** DB-INFRA-01 is still open. Plan 06 smoke suite's
HTTP-dependent tests (SC #1 / SC #2 / SC #5 — 9 tests) fail with HTTP 500
because `/ko/search` rethrows `TypeError: Invalid URL` before rendering.
Filesystem-only assertions (SC #6 — 3 tests) pass regardless, as plan's
verify block anticipated. HTTP tests become green the moment DATABASE_URL
is percent-encoded or rotated.

## 03-06 (Wave 5 polish)

### COOKIE-NOTICE-01 — `MISSING_MESSAGE` for `cookieNotice.*` key tree on `/search`

**Found during:** 03-06 Task 2 smoke run against live dev server.

**Symptom:** `Error: MISSING_MESSAGE: No messages were configured on the
provider.` thrown from `src/components/site/cookie-notice.tsx:24` while
rendering `/ko/search`. The cookieNotice copy exists in `ko.json` (lines
69-73) — so the failure indicates the `(public)` layout is not surfacing
the cookieNotice namespace to the CookieNotice client component at
`/search`.

**Scope:** cookie notice wiring landed in Phase 1 (FOUND); Plan 06 did
not touch it. Not a regression from this plan.

**Impact:** rendering `/search` without a seeded DB triggers
error.tsx (sentry captured, retry CTA shown), so users never see the
MISSING_MESSAGE — but the CookieNotice failure still logs to the server
console and could surface if the DB-INFRA-01 crash is fixed first.

**Suggested owner:** next-intl provider configuration review in
`src/app/[locale]/(public)/layout.tsx` or the CookieNotice component
itself (move namespace declaration closer to use-site).

