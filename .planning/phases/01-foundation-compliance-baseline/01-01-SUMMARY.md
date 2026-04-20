---
phase: 01-foundation-compliance-baseline
plan: 01
subsystem: infra
tags: [nextjs, typescript, tailwind, shadcn, supabase-ssr, drizzle, next-intl]

requires: []
provides:
  - Next.js 15.5 + TS + App Router scaffold with [locale] route groups
  - Tailwind v4 + shadcn/Radix UI primitives directory
  - @supabase/ssr client/server/admin/middleware helpers (service-role confined to admin.ts)
  - Drizzle pooler client (prepare:false for Supabase pgBouncer)
  - next-intl routing (ko default, en stub) + middleware chain (locale + Supabase session refresh)
  - .env.example + .env.local scaffolding with isSupabaseConfigured() dev guard
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08]

tech-stack:
  added:
    - next@15.5.15 (pinned for CVE-2025-66478)
    - react@19
    - typescript@5.6
    - tailwindcss@4
    - @supabase/ssr@0.10
    - drizzle-orm + drizzle-kit
    - next-intl@3.26
    - shadcn/ui Radix primitives
  patterns:
    - "Supabase client split: browser / server / admin / middleware"
    - "next-intl `[locale]` segment + middleware chain composition"
    - "Route groups (public)/(authed)/(admin) as scaffolding for later layouts"
    - "Parallel-executor commits use --no-verify; main-branch hooks validate after wave"

key-files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - tailwind.config.ts
    - drizzle.config.ts
    - components.json
    - .env.example
    - src/app/layout.tsx
    - src/app/[locale]/layout.tsx
    - src/app/[locale]/(public)/layout.tsx
    - src/app/[locale]/(authed)/layout.tsx
    - src/app/[locale]/(admin)/layout.tsx
    - src/middleware.ts
    - src/i18n/routing.ts
    - src/i18n/request.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/admin.ts
    - src/lib/supabase/middleware.ts
    - src/lib/db/drizzle.ts
    - src/messages/ko.json
    - src/messages/en.json
  modified:
    - .gitignore
    - README.md

key-decisions:
  - "Pinned Next 15.5.15 (CVE-2025-66478 mitigation) vs floating 15.5.x"
  - "Inlined isSupportedLocale helper — next-intl 3.26 does not export hasLocale"
  - "Added isSupabaseConfigured() dev guard so missing env vars are observable"
  - "Drizzle client uses prepare:false for Supabase pgBouncer compatibility"

patterns-established:
  - "Supabase client layering: client.ts (anon, browser), server.ts (anon, RSC cookies), admin.ts (service-role, server-only), middleware.ts (session refresh)"
  - "Locale routing: / → /ko; supported locales [ko, en]; ko is source of truth per D-05.4"
  - "Route-group layouts are passthroughs in Plan 01 — populated by Plans 03/04/05"

requirements-completed: [FOUND-01, FOUND-02, FOUND-10]

duration: 16min
completed: 2026-04-20
---

# Phase 01 / Plan 01: Bootstrap & Baseline Summary

**Next.js 15.5 + TS + Tailwind v4 + shadcn/Radix + @supabase/ssr + Drizzle + next-intl (ko/en) scaffold with [locale]/(public|authed|admin) route groups and Supabase session middleware.**

## Performance

- **Duration:** 16 min 1 s
- **Started:** 2026-04-20T06:10:36Z
- **Completed:** 2026-04-20T06:26:37Z
- **Tasks:** 3
- **Files modified:** ~30

## Accomplishments

- Next.js 15.5.15 app bootstrapped with v1 dependency set pinned per STACK.md
- @supabase/ssr client/server/admin/middleware split wired; service-role confined to `src/lib/supabase/admin.ts`
- Drizzle pooler client (`prepare:false`) configured for Supabase pgBouncer
- next-intl routing + `[locale]` segment + middleware chain (locale → Supabase session refresh)
- Public/authed/admin route-group layouts scaffolded (empty passthroughs, ready for Plans 03/04/05)
- `.env.example` enumerates every required env var; `.env.local` is runtime source and gitignored

## Task Commits

1. **Task 1: Bootstrap Next.js 15.5 + v1 dependencies** — `977737d` (chore)
2. **Task 2: Wire @supabase/ssr clients + Drizzle pooler client + middleware chain** — `be19256` (feat)
3. **Task 3: next-intl routing + [locale] route groups + i18n scaffolding** — `e319e2d` (feat)

## Files Created/Modified

See `key-files` in frontmatter.

## Decisions Made

- **Pin Next 15.5.15 (CVE-2025-66478):** Floating 15.5.x allowed a vulnerable range; pinned to patched release.
- **Inline `isSupportedLocale`:** `next-intl@3.26` does not export `hasLocale`; added local type guard instead of pulling an unstable alpha.
- **`isSupabaseConfigured()` dev guard:** Fresh-clone DX — missing `NEXT_PUBLIC_SUPABASE_URL`/keys surface as a visible redirect/message rather than a stack trace.
- **Drizzle `prepare:false`:** Required for Supabase pgBouncer (transaction mode).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Pinned Next to 15.5.15 for CVE-2025-66478**
- Plan specified Next 15.5 (floating). Floating range included a version with an open CVE.
- Fix: pinned `next@15.5.15` in `package.json`.

**2. [Rule 2 - Critical DX] Added `isSupabaseConfigured()` dev guard**
- Plan didn't specify what happens on a fresh clone before `.env.local` is filled in.
- Fix: helper in `src/lib/supabase/client.ts` that returns a visible unconfigured state in dev.

**3. [Rule 3 - Blocking] Inlined `isSupportedLocale` helper**
- Plan imported `hasLocale` from `next-intl`; API not exported in 3.26.
- Fix: inlined type guard in `src/i18n/routing.ts`.

**4–6. Minor fixes** bundled in the three task commits (import order, tsconfig `moduleResolution: bundler`, `.env.local` gitignore hardening).

**Total deviations:** 6 auto-fixed (1 Rule 1, 2 Rule 2 critical, 3 Rule 3 blocking)
**Impact:** All necessary for correctness/security. No scope creep.

## Verification

- `/` → 307 → `/ko` (dev server on port 3101)
- `/ko` → 200, renders "VC Co-Finder" + Korean tagline
- `/en` → 200 (empty-string structural stub)
- `npm run build` → exit 0
- `npx tsc --noEmit` → exit 0
- No deprecated `@supabase/auth-helpers-nextjs` imports
- `SUPABASE_SERVICE_ROLE_KEY` only referenced in `src/lib/supabase/admin.ts`

## Issues Encountered

- SUMMARY.md wasn't committed by the executor before it returned (recovered inline by orchestrator from executor's structured return).

## User Setup Required

None for Plan 01. External dashboard setup (Supabase project creation, OAuth providers, Sentry DSN, Vercel linkage) arrives in Plans 02/04/07/08.

## Next Phase Readiness

- Scaffold is ready for Plan 02 (SQL migrations) — Drizzle + Supabase clients in place.
- Route groups exist but are empty — Plans 03/04/05 will populate layouts with auth gating and public chrome.
- Dev server verified locally; remote Supabase project linkage deferred to Plan 08.

---
*Phase: 01-foundation-compliance-baseline*
*Completed: 2026-04-20*
