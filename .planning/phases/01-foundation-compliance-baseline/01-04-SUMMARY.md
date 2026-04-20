---
phase: 01-foundation-compliance-baseline
plan: 04
subsystem: auth
tags: [oauth, google, kakao, supabase-ssr, pipa, feature-flag, next-intl, csrf, open-redirect, jwt]

requires:
  - phase: 01-01
    provides: "Next.js 15.5 + @supabase/ssr browser/server client + middleware session refresh + [locale] route groups + next-intl routing"
  - phase: 01-02
    provides: "profiles table + fn_handle_new_user trigger on auth.users + custom_access_token_hook function"
  - phase: 01-03
    provides: "RLS on profiles + getSessionUser (JWT user_role decode) + admin-guard (notFound on non-admin) + (authed)/(public) route-group layouts"
provides:
  - "/auth/callback GET route handler exchanging PKCE code for a Supabase session (exchangeCodeForSession) with open-redirect guard on next param"
  - "/auth/signout POST-only route handler clearing the Supabase session cookie with 303 redirect (CSRF defense)"
  - "Google OAuth button (browser Supabase client, signInWithOAuth({ provider: 'google' })) — the unblocked OAuth path per D-01.1"
  - "Kakao OAuth button feature-flagged via NEXT_PUBLIC_KAKAO_ENABLED=false (default) with scopes 'account_email profile_nickname' ready; disabled-state tooltip until flag flipped"
  - "PipaConsent client component gating both OAuth buttons (D-06.4 + PIPA §22) with /privacy policy link"
  - "SignInPanel composite: consent state drives disabled prop on both providers"
  - "/[locale]/login page (server) with open-redirect validated next param + ?error surface + i18n-driven copy"
  - "UserMenu header component (server, async): anonymous → Login link; authed → email + POST signout form"
  - "/[locale]/me/profile placeholder authed page echoing email + JWT role claim (verification hook for end-to-end OAuth + custom_access_token_hook)"
  - "docs/auth/KAKAO_BUSINESS_APP.md — parallel-blocker checklist for the Kakao Business app approval + account_email scope"
  - "docs/auth/SUPABASE_AUTH_HOOK.md — one-page dashboard enable guide for custom_access_token_hook"
  - "NEXT_PUBLIC_KAKAO_ENABLED env var contract documented in .env.example"
  - "login.* + login.pipa.* + auth.* i18n keys in ko.json + en.json with identical key tree (D-05.2)"
affects: [01-05, 01-06, 01-08, 04a-all, 04b-all, 04c-all, 05-all, 06-all]

tech-stack:
  added: []
  patterns:
    - "Browser OAuth kickoff + server PKCE exchange: client button → supabase.auth.signInWithOAuth({ provider, options: { redirectTo: '/auth/callback?next=...' } }) → provider → callback → supabase.auth.exchangeCodeForSession(code)"
    - "Open-redirect guard: next query param validated to startsWith('/') && !startsWith('//') in both /[locale]/login server page AND /auth/callback route handler (defense in depth)"
    - "CSRF-defense signout: POST-only route handler; no GET export; 303 Post/Redirect/Get semantics"
    - "Feature-flagged provider: NEXT_PUBLIC_KAKAO_ENABLED gates BOTH the click handler (no-op when false) AND the disabled attribute + tooltip — cannot be bypassed by DOM override"
    - "Consent-gated action: SignInPanel keeps consent state; providers receive disabled={!consented} prop — adding a new provider reuses the pattern"
    - "Session source of truth: /me/profile redirects to /login when getSessionUser() returns null — guard is page-local until Phase 4c adds the (authed) layout-level requireUser()"

key-files:
  created:
    - src/app/auth/callback/route.ts
    - src/app/auth/signout/route.ts
    - src/components/site/user-menu.tsx
    - src/components/auth/pipa-consent.tsx
    - src/components/auth/google-button.tsx
    - src/components/auth/kakao-button.tsx
    - src/components/auth/sign-in-panel.tsx
    - src/app/[locale]/(public)/login/page.tsx
    - src/app/[locale]/(authed)/me/profile/page.tsx
    - docs/auth/KAKAO_BUSINESS_APP.md
    - docs/auth/SUPABASE_AUTH_HOOK.md
  modified:
    - src/messages/ko.json
    - src/messages/en.json
    - .env.example

key-decisions:
  - "Kakao ships code-complete but feature-flagged OFF — no UX branching at the code level; the env flag is the switch (D-01.1)"
  - "Open-redirect guard duplicated in server LoginPage AND callback route handler — defense in depth; neither layer alone is sufficient if the other is bypassed"
  - "Signout is POST-only with no GET export — a GET-returning 405 is a feature, not a bug, for CSRF posture"
  - "PipaConsent lives in the SignInPanel, not in each button — single consent checkbox gates every current and future provider; state cannot desync across buttons"
  - "JWT role claim read inside /me/profile is the end-to-end verification surface for custom_access_token_hook — absence of user_role in the payload is visible to the authenticated user via '역할:' (no role shown) rather than buried in logs"
  - "alert() is an acknowledged stopgap for OAuth errors — Plan 07 replaces with Sentry + toast"

patterns-established:
  - "Auth route-handler directory: src/app/auth/{callback,signout}/route.ts — NOT locale-scoped (OAuth redirect URIs are locale-agnostic; Supabase's callback contract and the signout side-effect apply uniformly)"
  - "Auth client component directory: src/components/auth/*.tsx — each provider gets its own file (easy to add/remove without touching the panel composer)"
  - "Site chrome directory: src/components/site/user-menu.tsx — Plan 05 adds header/footer here"
  - "Doc directory: docs/auth/*.md — human-action checklists co-located with the code they setup"

requirements-completed: [FOUND-02, FOUND-03, FOUND-05, FOUND-08]
requirements-partial: [FOUND-04]

duration: 24min
completed: 2026-04-20
---

# Phase 01 / Plan 04: OAuth Wiring — Google (shipped) + Kakao (feature-flagged) Summary

**Google OAuth ships end-to-end via @supabase/ssr; Kakao ships code-complete but feature-flagged OFF until the Business app is approved (D-01.1). PIPA consent gates both providers. Session exchange happens server-side with an open-redirect guard on the `next` param, signout is POST-only (CSRF defense), and a `/me/profile` placeholder page exposes the `user_role` JWT claim for end-to-end verification of `custom_access_token_hook`.**

## Performance

- **Duration:** ~24 min
- **Started:** 2026-04-20 (Plan 01-03 HEAD + initial reads)
- **Completed:** 2026-04-20 (Task 3 docs commit `ac23c98`)
- **Tasks:** 3 (2 code, 1 docs-producing checkpoint)
- **Files created:** 11 (2 routes + 5 components + 2 pages + 2 docs)
- **Files modified:** 3 (ko.json, en.json, .env.example)

## OAuth Flow Diagram

```
/ko/login (server)
   │ validates `next` → SignInPanel (client)
   │
   ├── user ticks PIPA consent ──────► disabled={false}
   │
   └── user clicks Google button (client)
           │
           ▼
   supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: '<origin>/auth/callback?next=<encoded nextPath>' }
   })
           │
           ▼
   Google consent screen (external)
           │
           ▼
   GET https://<PROJECT>.supabase.co/auth/v1/callback
           │ (Supabase exchanges Google code for its own PKCE code)
           ▼
   GET /auth/callback?code=<supabase-code>&next=<validated next>
           │ (our route handler — open-redirect guard re-runs)
           │
           ▼
   supabase.auth.exchangeCodeForSession(code)
           │ (sets httpOnly session cookie, SameSite=Lax, Secure in prod)
           │
           ▼
   303 redirect → <next> (default /ko/)
           │
           ▼
   /ko/ or /ko/me/profile — session visible to RSC via getSessionUser()
                            user_role claim populated by
                            public.custom_access_token_hook (if Dashboard-enabled)
```

Kakao is identical except `provider: 'kakao'`, `scopes: 'account_email profile_nickname'`, and the button is disabled + no-op when `NEXT_PUBLIC_KAKAO_ENABLED !== 'true'`.

## Task Commits

Each task committed atomically with `--no-verify` (parallel-executor convention):

1. **Task 1: OAuth callback + signout route + user-menu** — `e3f8162` (feat)
2. **Task 2: /[locale]/login page with Google + Kakao + PIPA consent** — `6d18d7b` (feat)
3. **Task 3: Kakao Business + Supabase Auth Hook setup checklists** — `ac23c98` (docs)

_Plan metadata commit (this SUMMARY) follows._

## What Shipped vs What's Pending User Action

| Item | Status | Blocker |
|------|:------:|---------|
| `/auth/callback` route handler | shipped | — |
| `/auth/signout` route handler | shipped | — |
| `/[locale]/login` page | shipped | — |
| Google OAuth button (code) | shipped | User must enable Google provider in Supabase Dashboard + register OAuth client |
| Kakao OAuth button (code, flagged OFF) | shipped | Kakao Business app approval (1–5 business days) + Supabase Dashboard Kakao provider enable + flip `NEXT_PUBLIC_KAKAO_ENABLED=true` |
| PipaConsent + SignInPanel | shipped | — |
| UserMenu | shipped | — (Plan 05 mounts it in the header) |
| `/me/profile` placeholder | shipped | — |
| `KAKAO_BUSINESS_APP.md` | shipped | — |
| `SUPABASE_AUTH_HOOK.md` | shipped | — |
| End-to-end Google OAuth smoke test | **pending** | User must complete the dashboard configuration in the checkpoint section below |
| `user_role` JWT claim verification | **pending** | User must enable `custom_access_token_hook` in Supabase Dashboard |

FOUND-04 (Kakao) is flagged **partial** — code ships but provider is OFF until Business app approves. FOUND-03 / FOUND-05 / FOUND-08 flip green the moment the user completes the dashboard steps; no further code is needed.

## Kakao Feature-Flag Strategy (D-01.1)

Default `NEXT_PUBLIC_KAKAO_ENABLED=false` is set in `.env.example`. When this value is not `'true'`:

- `kakao-button.tsx` disables the button (`disabled={disabled || !KAKAO_ENABLED}`).
- The click handler returns immediately (`if (!KAKAO_ENABLED) return;`) — a DOM-level "enabled" override cannot initiate an OAuth request.
- A "(준비 중)" badge appears next to the label.
- Tooltip reads "Kakao Business 앱 등록 완료 후 활성화됩니다".

To flip on (after completing `docs/auth/KAKAO_BUSINESS_APP.md`):

1. Set `NEXT_PUBLIC_KAKAO_ENABLED=true` in:
   - Vercel Production env vars
   - Vercel Preview env vars
   - Local `.env.local` (for any developer testing the flow)
2. Redeploy / restart dev server.
3. No code change needed.

## Decisions Made

- **Code ships, flag gates.** No UX branching at the component-tree level; the decision to show / hide Kakao lives entirely in a single env var. This keeps Plan 4c and later plans oblivious to Kakao's approval status.
- **Open-redirect guard lives in two places.** Both the server `LoginPage` (which passes `nextPath` to the client panel) and the `/auth/callback` route handler (which consumes `next` directly from the request URL) independently validate the param. Either is sufficient alone; having both prevents a future refactor from accidentally removing the guard from one layer.
- **Signout is POST-only.** No `export async function GET` exists, so drive-by GETs receive a 405 from Next.js routing — stronger than a 200 with a Set-Cookie. The `UserMenu` uses `<form method="POST">` to cooperate.
- **PipaConsent lives in SignInPanel, not each button.** One consent state drives every provider's disabled prop — adding a future provider reuses the gate without risk of desync.
- **`alert()` for OAuth errors is a deliberate stopgap.** Plan 07 replaces with Sentry + Sonner toasts. Using `alert` now avoids adding a toast dependency pre-observability setup.

## Deviations from Plan

None — Plan 04 Tasks 1 + 2 executed exactly as written. The plan's Task 1 snippet contained a self-correction ("actually for Plan 04 use `next/link` with `/ko/login` path" → "revised `user-menu.tsx`"); the revised snippet was followed (locale-aware via `useLocale() from next-intl/server` using `getLocale()`, not a hardcoded path).

**Total deviations:** 0 auto-fixes. All three tasks' automated verification blocks passed on the first run:

- `tsc --noEmit` exit 0 after Task 1.
- `tsc --noEmit` exit 0 after Task 2; `ko.json` ↔ `en.json` key-tree match confirmed (15 identical leaves).
- `npm run build` exit 0 producing `/[locale]/login` (78.3 kB First Load JS), `/auth/callback`, `/auth/signout`, `/[locale]/me/profile` routes.

## Threat Model Verification

| Threat ID | Mitigation | Verified |
|-----------|------------|:--------:|
| T-01-04-01 (open-redirect in `next`) | Server LoginPage + callback route both `startsWith('/') && !startsWith('//')` | ✓ |
| T-01-04-02 (OAuth code replay) | `exchangeCodeForSession` is single-use, PKCE binds code to verifier in cookie | ✓ (handled by @supabase/ssr) |
| T-01-04-03 (Kakao `account_email` ungranted) | `NEXT_PUBLIC_KAKAO_ENABLED` flag defaults off; flip gated on `docs/auth/KAKAO_BUSINESS_APP.md` | ✓ |
| T-01-04-04 (fake hook via malicious migration) | Migrations in CI + reviewed; hook enable is Dashboard click | accept |
| T-01-04-05 (CSRF signout) | POST-only route (no GET export); same-site cookie blocks cross-site POSTs | ✓ |
| T-01-04-06 (error-message leak) | `encodeURIComponent(error.message)` in redirect URL | ✓ |
| T-01-04-07 (PIPA bypass) | SignInPanel disables buttons until consent; provider click handler cannot fire via keyboard navigation alone | ✓ |
| T-01-04-08 (cookie trust without validation) | `getSessionUser` uses `supabase.auth.getUser()` (signature-verified) + `React.cache` dedupe | ✓ |
| T-01-04-09 (email XSS in user-menu) | React auto-escapes text nodes | accept |
| T-01-04-10 (JS-disabled users) | v1 persona is modern browsers; signout form works without JS | accept |
| T-01-04-11 (Kakao missing email) | Business app + `account_email` scope checklist in `KAKAO_BUSINESS_APP.md`; flag defaults off | ✓ |
| T-01-04-12 (XSS exfiltration of cookie) | @supabase/ssr sets session cookie `httpOnly` by default | ✓ |

## Known Stubs

- `src/app/[locale]/(authed)/me/profile/page.tsx` is a **verification placeholder**, intentionally renders a minimal email + role + deferral note. Not a UI stub in the sense of hardcoded empty data — it reads real session state. Full profile UI lands in Phase 4c.
- `alert()` inside `google-button.tsx` and `kakao-button.tsx` — replaced by Sentry + Sonner toast in Plan 07. Acknowledged as a stopgap rather than a stub.

No hardcoded-empty stubs render in the OAuth / login flow.

## Threat Flags

None — all new surface (OAuth callback, signout, login page, PIPA consent, JWT read in /me/profile) was modeled in the plan's `<threat_model>` block and is mitigated per the table above.

## User Setup Required

**This section is the checkpoint.** Plan 04 is `autonomous: false`; the remaining work is Supabase / Google / Kakao dashboard configuration the executor cannot perform. All code is merged and verified. The orchestrator should relay the checkpoint to the user.

### Dashboard steps (ordered)

1. **Create a Google OAuth 2.0 Client ID** at
   https://console.cloud.google.com/apis/credentials
   - Application type: Web application.
   - Authorized JavaScript origins: `http://localhost:3000` (dev) + `https://<YOUR_DOMAIN>` (prod, after Vercel deploy).
   - Authorized redirect URI: `https://<YOUR_PROJECT>.supabase.co/auth/v1/callback`
   - Copy Client ID + Client Secret.

2. **Enable Google provider in Supabase** at
   https://app.supabase.com/project/_/auth/providers
   - Paste Google Client ID + Client Secret from step 1.
   - Save.

3. **Enable `custom_access_token_hook`** at
   https://app.supabase.com/project/_/auth/hooks
   (see `docs/auth/SUPABASE_AUTH_HOOK.md` for exact fields)
   - Section: "Customize Access Token (JWT) Claims" → Enable Hook.
   - Schema: `public`, Function: `custom_access_token_hook`, Save.
   - Requires Plan 08 `supabase db push` to have run, so `custom_access_token_hook` exists in the database.

4. **Register Kakao Business app** — see `docs/auth/KAKAO_BUSINESS_APP.md`.
   This is a 1–5 business day process (Kakao legal verification). Can run in parallel; Plan 04 does not block on it. Flip `NEXT_PUBLIC_KAKAO_ENABLED=true` once approved.

### Local env vars to populate

After step 1, put into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>     # server-only
DATABASE_URL=<pooler-connection-string>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_KAKAO_ENABLED=false                   # until Kakao approves
```

(Sentry/heartbeat vars land in Plan 07; leave blank.)

### Verification commands once dashboard configured

```bash
npm run dev
# Visit http://localhost:3000/ko/login
# 1. Tick PIPA consent → Google button enables
# 2. Click Google → Google consent screen → back to /ko/
# 3. Visit /ko/me/profile → email + "역할: user" must render
# 4. DevTools → Application → Cookies → sb-...-auth-token → decode at jwt.io
#    Payload must contain "user_role": "user"
# 5. POST /auth/signout (click the logout button in UserMenu once it's mounted
#    in Plan 05; or `curl -X POST -b cookies.txt http://localhost:3000/auth/signout`)
#    Cookie is cleared; /ko/me/profile redirects back to /ko/login.
```

## Handoff Notes

- **Plan 05 (public pages + chrome)** — `UserMenu` exists at `src/components/site/user-menu.tsx` and is ready to be dropped into the public layout header. `/ko/login` already renders `<main>` with padding; the chrome's `<header>` should sit above it. No additional auth logic needed in Plan 05.
- **Plan 06 (DSAR + privacy policy)** — `PipaConsent` points at `/<locale>/privacy`; that page must exist (Plan 06). Until it does the link 404s — acceptable during Phase 1 progression because consent text still parses.
- **Plan 08 (schema push + dashboard config)** — the dashboard steps listed above are Plan 08's purview. Plan 08 will run `supabase db push` (installing `custom_access_token_hook`) and then walk the Supabase Dashboard enable toggles. The two markdown docs in `docs/auth/` are Plan 08's script.
- **Phase 4c (`/me/*`)** — replaces the placeholder `/me/profile` with the real profile UI. The `(authed)` group can grow a `requireUser()` guard at the layout level at that point, making this page's in-page redirect redundant.

## Next Phase Readiness

- Code: complete, committed, typechecks, builds. 4 new route entries in the Next.js build.
- Docs: `KAKAO_BUSINESS_APP.md` + `SUPABASE_AUTH_HOOK.md` are the Plan 08 script.
- Blockers: 4 dashboard tasks (Google console, Supabase provider, Supabase hook, Kakao Business app). All documented.
- Kakao flag default is `false` — Google-only launch is the Phase 1 fallback per D-01.1.

## Self-Check: PASSED

**Files verified on disk:**

- FOUND: src/app/auth/callback/route.ts
- FOUND: src/app/auth/signout/route.ts
- FOUND: src/components/site/user-menu.tsx
- FOUND: src/components/auth/pipa-consent.tsx
- FOUND: src/components/auth/google-button.tsx
- FOUND: src/components/auth/kakao-button.tsx
- FOUND: src/components/auth/sign-in-panel.tsx
- FOUND: src/app/[locale]/(public)/login/page.tsx
- FOUND: src/app/[locale]/(authed)/me/profile/page.tsx
- FOUND: docs/auth/KAKAO_BUSINESS_APP.md
- FOUND: docs/auth/SUPABASE_AUTH_HOOK.md

**Commits verified in git log:**

- FOUND: e3f8162 feat(01-04): OAuth callback + signout route + user-menu
- FOUND: 6d18d7b feat(01-04): /[locale]/login page with Google + Kakao buttons + PIPA consent
- FOUND: ac23c98 docs(01-04): Kakao Business app + Supabase Auth Hook setup checklists

**TypeScript:** `npx tsc --noEmit` exits 0.
**Production build:** `npm run build` exits 0; routes `/auth/callback`, `/auth/signout`, `/[locale]/login`, `/[locale]/me/profile` all generated.
**i18n key tree:** `ko.json` ↔ `en.json` match exactly (15 identical leaves).

---
*Phase: 01-foundation-compliance-baseline*
*Completed: 2026-04-20 (code complete; dashboard configuration checkpoint pending user action)*
