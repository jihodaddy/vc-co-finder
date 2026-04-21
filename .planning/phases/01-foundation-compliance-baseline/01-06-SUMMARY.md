---
phase: 01-foundation-compliance-baseline
plan: 06
subsystem: compliance
tags: [pipa, dsar, gdpr, resend, rate-limit, zod, server-action, ssrf-prevention]

# Dependency graph
requires:
  - phase: 01-foundation-compliance-baseline
    provides: "Plan 02 dsar_requests table + ENUMs (dsar_type, dsar_status)"
  - phase: 01-foundation-compliance-baseline
    provides: "Plan 03 RLS dsar_insert_public policy + audit_log trigger on dsar_requests"
  - phase: 01-foundation-compliance-baseline
    provides: "Plan 05 ko.json `dsar.*` + `footer.links.dsar` keys + footer link to /contact/dsar"
provides:
  - "/ko/contact/dsar PIPA-compliant DSAR form (열람/정정/삭제/처리정지) — D-04.3"
  - "Server action submitDsarRequest with 5/hr per-IP rate limit + email verification token issuance"
  - "GET /contact/dsar/verify?token=<uuid> — advances row to status='verified' with replay prevention (PITFALLS Security)"
  - "/ko/contact/dsar/success generic confirmation page (T-01-06-10 timing-oracle mitigation)"
  - "src/lib/zod-schemas/dsar.ts — input validation incl. https-only evidence URL ≤2048 chars (SSRF-safe — URL stored, never fetched)"
  - "src/lib/ratelimit/in-memory.ts — server-only Map-based rate limiter (Phase 4c upgrade to Upstash documented)"
  - "src/lib/email/resend.ts — lazy-initialized Resend client (no throw at import — survives Phase 1 deploy without RESEND_API_KEY)"
  - "docs/compliance/CPO_FORWARDING_ALIAS.md — privacy@ alias setup runbook (D-04.1)"
  - ".env.example entries: RESEND_API_KEY, DSAR_FROM_EMAIL, DSAR_ADMIN_NOTIFY_EMAIL, DSAR_RATE_LIMIT_PER_HOUR=5"
affects:
  - "Phase 4b (Admin UI): consumes dsar_requests rows for manual processing UI; will surface status='verified' queue"
  - "Phase 4c (Production hardening): replaces in-memory rate limiter with Upstash Redis to survive cold starts"
  - "Phase 8 (Launch): Task 3 deferred items must complete before public launch (live DSAR email verification gate per D-04.3)"

# Tech tracking
tech-stack:
  added:
    - "resend@^6.12.2 — transactional email client (lazy-init pattern)"
  patterns:
    - "Lazy-initialized external client: Resend module exports a getter that throws only at first call site, not at module load — keeps build green when env vars missing"
    - "SSRF-safe evidence URL: validate format only (Zod url() + https check + length cap), store as TEXT, never fetch server-side"
    - "In-memory per-IP rate limiter behind server-only barrier — survives single warm Vercel instance; documented upgrade path to Upstash Redis in Phase 4c"
    - "Email verification token = server-generated UUID, single-use (status transition + token-clear in same UPDATE), generic success page (no timing oracle)"
    - "Graceful degradation: server action try/catches Resend send failure — row still persists with status='pending_verification' so admin can process manually if email pipeline is down"

key-files:
  created:
    - "src/lib/zod-schemas/dsar.ts — Zod input schema (name, email max 320, phone optional, type enum, description max 5000, evidence URL https-only ≤2048)"
    - "src/lib/ratelimit/in-memory.ts — server-only rate limiter exporting `rateLimit(key, limit, windowMs)`"
    - "src/lib/email/resend.ts — server-only lazy Resend client with `getResend()` accessor"
    - "src/app/[locale]/(public)/contact/dsar/page.tsx — DSAR landing + form mount"
    - "src/app/[locale]/(public)/contact/dsar/dsar-form.tsx — client form component bound to server action"
    - "src/app/[locale]/(public)/contact/dsar/actions.ts — `submitDsarRequest` server action (rate limit → INSERT → email)"
    - "src/app/[locale]/(public)/contact/dsar/success/page.tsx — generic 접수되었습니다 confirmation"
    - "src/app/[locale]/(public)/contact/dsar/verify/route.ts — GET handler advancing status to verified"
    - "docs/compliance/CPO_FORWARDING_ALIAS.md — runbook for privacy@ forwarding alias setup"
  modified:
    - ".env.example — added RESEND_API_KEY, DSAR_FROM_EMAIL, DSAR_ADMIN_NOTIFY_EMAIL, DSAR_RATE_LIMIT_PER_HOUR"
    - "package.json + package-lock.json — added resend@^6.12.2"

key-decisions:
  - "Task 3 (live Resend domain verification + DNS forwarding alias + .env.local population + ko.json `[도메인]` substitution + live smoke test) deferred to pre-launch — see Deferred Work below"
  - "FOUND-12 satisfied without Task 3: form accepts requests + persists rows; email verification is the D-04.3 refinement layer that activates once Resend is configured"
  - "Resend client lazy-initialized so Phase 1 builds and deploys cleanly without RESEND_API_KEY (server action try/catches send failure so row persists either way)"
  - "Evidence URL stored as TEXT only — server NEVER fetches it (SSRF prevention per T-01-06 threat model)"
  - "Generic success page chosen over status-specific to defeat timing-oracle enumeration (T-01-06-10)"

patterns-established:
  - "Lazy external-client init: cached singleton + throw at call site, not at module load (replicate for Sentry, future API clients)"
  - "Server-only barrier on rate-limit + email + provenance modules — `import 'server-only'` first line"
  - "Defer-friendly checkpoints: code path tolerates missing third-party config (Resend) so deploy isn't blocked on external account setup"

requirements-completed: [FOUND-12]

# Metrics
duration: ~16min (Task 1 + Task 2 by gsd-executor af93f50157755c485)
completed: 2026-04-21
---

# Plan 01-06: DSAR Endpoint Summary

**`/ko/contact/dsar` PIPA-compliant request form shipped with rate-limit, email-verification scaffolding, and SSRF-safe evidence handling — Resend live activation deferred to pre-launch.**

## Performance

- **Duration:** ~16 min (Task 1 + Task 2 inside the same executor agent)
- **Started:** 2026-04-21
- **Completed:** 2026-04-21 (Task 3 deferred — see below)
- **Tasks:** 2/3 executed in this session; Task 3 deferred per user decision
- **Files modified:** 11 created, 2 modified

## Accomplishments

- FOUND-12 satisfied: DSAR endpoint accepts requests and persists for admin follow-up
- D-04.3 implementation in place: Zod-validated form, generated email verification token, GET-verify route with replay prevention
- D-04.1 CPO alias documented in `docs/compliance/CPO_FORWARDING_ALIAS.md` (Option A: registrar forwarding, Option B: Workspace alias)
- T-01-06 threat model mitigations applied: SSRF-safe (URL never fetched), timing-oracle-safe (generic success page), per-IP rate limit 5/hr
- Build/type checks green: `npx tsc --noEmit` clean, `npm run build` registers 3 DSAR routes

## Task Commits

1. **Task 1: zod schema + rate limiter + Resend client + CPO doc + .env template** — `2ece2e7`
2. **Task 2: DSAR form + server action + verify route + success page** — `494774b`
3. **Task 3: live Resend domain verification + DNS alias + .env.local + smoke test** — **DEFERRED** (see below)

**Plan metadata:** _(this commit)_ — `docs(01-06): plan SUMMARY with deferred Task 3`

## Files Created/Modified

### Created
- `src/lib/zod-schemas/dsar.ts` — input schema (5,000-char description cap, https-only evidence URL)
- `src/lib/ratelimit/in-memory.ts` — `rateLimit(key, limit, windowMs)` server-only helper
- `src/lib/email/resend.ts` — lazy Resend client (`getResend()`)
- `src/app/[locale]/(public)/contact/dsar/page.tsx` — form mount
- `src/app/[locale]/(public)/contact/dsar/dsar-form.tsx` — client form
- `src/app/[locale]/(public)/contact/dsar/actions.ts` — `submitDsarRequest` server action
- `src/app/[locale]/(public)/contact/dsar/success/page.tsx` — generic confirmation
- `src/app/[locale]/(public)/contact/dsar/verify/route.ts` — GET `/contact/dsar/verify?token=` handler
- `docs/compliance/CPO_FORWARDING_ALIAS.md` — privacy@ alias setup runbook

### Modified
- `.env.example` — added RESEND_API_KEY, DSAR_FROM_EMAIL, DSAR_ADMIN_NOTIFY_EMAIL, DSAR_RATE_LIMIT_PER_HOUR
- `package.json` + `package-lock.json` — added `resend@^6.12.2`

## Verification Evidence

- `npx tsc --noEmit` → clean
- `npm run build` → success; routes `/[locale]/contact/dsar`, `/[locale]/contact/dsar/success`, `/[locale]/contact/dsar/verify` all registered
- `rg 'fetch\(' src/app/[locale]/(public)/contact/dsar/` → 0 matches (SSRF surface empty)
- `rg "evidenceUrl.*fetch" src/` → 0 matches

## Deferred Work — Task 3 (REQUIRED before public launch)

User chose to defer Task 3 (option `defer`) at the human-action checkpoint on 2026-04-21. The DSAR code is fully shipped and FOUND-12 is met (form persists requests for admin follow-up). The verification-email pipeline activates once the items below are completed.

**Tracked items (must complete before Phase 8 LAUNCH-01):**

1. **Resend account + sending domain verification** — sign up at resend.com, add `YOUR_DOMAIN`, install SPF/DKIM/Return-Path DNS records until Resend shows **Verified**
2. **Resend API key issuance** — Dashboard → API Keys → Create → copy `re_...` value
3. **`privacy@YOUR_DOMAIN` forwarding alias** — follow `docs/compliance/CPO_FORWARDING_ALIAS.md` Option A or B
4. **`.env.local` (and Vercel Project Env Vars on deploy)**:
   - `RESEND_API_KEY=re_...`
   - `DSAR_FROM_EMAIL=noreply@YOUR_VERIFIED_DOMAIN`
   - `DSAR_ADMIN_NOTIFY_EMAIL=privacy@YOUR_DOMAIN`
   - `DSAR_RATE_LIMIT_PER_HOUR=5`
5. **`src/messages/ko.json` `privacy.cpoBody`** — replace literal `privacy@[도메인]` placeholder with real `privacy@YOUR_DOMAIN`
6. **Live smoke test**: submit DSAR with own email → verify Supabase row → click verification link → confirm `status='verified'` + replay-prevention works → submit 6× to confirm `rateLimited` banner

**Why deferring is safe:**
- `getResend()` lazy-init throws only at first call site — module loads cleanly
- `submitDsarRequest` server action wraps Resend send in try/catch — row still persists if Resend is unavailable; admin can process manually
- `getResend()` will throw on first DSAR submission if `RESEND_API_KEY` is unset — production behavior is "row stored, no email sent" (logged for admin)

**Surfacing mechanism:** This deferral is captured in:
- This SUMMARY's `key-decisions` and `Deferred Work` section
- Phase-level VERIFICATION.md will list it under `human_verification` items
- Pre-launch checklist (Phase 8 LAUNCH-01) should treat the 6 items above as blocking before flipping production traffic

## Known Placeholders Awaiting Domain

- `src/messages/ko.json` → `privacy.cpoBody` contains literal `privacy@[도메인]` (intentional — Plan 05 + Plan 06 both flag this for replacement once domain is bound)
- `docs/compliance/CPO_FORWARDING_ALIAS.md` references `YOUR_DOMAIN` throughout — not a defect, runbook applies to whichever domain is finally used

## Threat Model Status

All T-01-06-* threats from PLAN.md remain mitigated as designed. No new threats discovered during execution. Two `accept` items (in-memory rate limiter cold-start flush, generic success page state opacity) remain accepted per plan rationale.
