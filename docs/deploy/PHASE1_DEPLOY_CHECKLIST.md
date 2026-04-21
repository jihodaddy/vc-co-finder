# Phase 1 Deploy Runbook

Single source of truth for taking VC Co-Finder from "code merged on main" to "live production on Vercel with all 5 Phase 1 success criteria passing".

This runbook consolidates the deferred work from:

- **Plan 01-06** (DSAR — Resend domain, privacy@ alias, ko.json `[도메인]` substitution)
- **Plan 01-07** (Sentry project, GitHub Actions secrets, heartbeat secret)
- **Plan 01-08** Tasks 1, 2, 4 (Supabase push + Vercel deploy + live smoke verification)

Run sections in order. Each step is atomic — do not skip ahead.

> **Estimated total time:** ~60–90 min one-shot (Resend domain DNS verification dominates wall time; Supabase + Vercel + smoke verification is ~25 min once Resend is verified).

---

## Section 0 — Prerequisites

Install once on the workstation that will perform the deploy:

| Tool | Install command | Verify |
|---|---|---|
| Node.js 20+ | nvm / volta | `node -v` |
| Supabase CLI ≥ 1.180 | `npm i -g supabase` (or Scoop / Homebrew) | `supabase --version` |
| Vercel CLI ≥ 35 | `npm i -g vercel` | `vercel --version` |
| `git` + GitHub repo push access | (assumed) | `git remote -v` |
| `openssl` (for secret generation) | bundled on macOS/Linux; Git Bash on Windows | `openssl rand -hex 4` |

Domain you control (for CPO alias + Resend sending domain). Examples below use `YOUR_DOMAIN` as placeholder.

---

## Section 1 — Supabase project setup

### 1.1 Create project

- [ ] Sign in at <https://app.supabase.com> → New project
- [ ] Region: ap-northeast-1 (Tokyo) or ap-northeast-2 (Seoul) for KR latency
- [ ] Save the **DB password** in a password manager — Supabase shows it once
- [ ] Note the **project ref** (looks like `abcdefghijklmnop`) from the project URL

### 1.2 Capture connection details

Open Dashboard → Project Settings → API:

- [ ] Copy `URL` → will become `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copy `anon public` key → will become `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Copy `service_role` key → will become `SUPABASE_SERVICE_ROLE_KEY` — **NEVER commit this; production-only env var**

Open Dashboard → Project Settings → Database → Connection string → URI (pooler, mode = **transaction**):

- [ ] Copy that string → will become `DATABASE_URL`. Replace `[YOUR-PASSWORD]` with the DB password.

### 1.3 Populate `.env.local`

Copy the template, fill in the values from 1.2 plus placeholders for everything else (we will fill the rest as the runbook proceeds):

```bash
cp .env.example .env.local
```

Minimum to fill before pushing migrations:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://postgres.YOUR_PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000      # Will be updated to Vercel URL after first deploy
NEXT_PUBLIC_KAKAO_ENABLED=false                 # Flip to true only after Kakao Business app is approved
```

---

## Section 2 — Push schema (Plan 08 Task 1)

### 2.1 Link the local repo to the Supabase project

- [ ] `supabase login` (opens browser tab — one-time per workstation)
- [ ] `supabase link --project-ref YOUR_PROJECT_REF`
  - Prompts for the DB password from 1.1
- [ ] `supabase status` → confirms link

### 2.2 Push all 15 migrations

- [ ] `supabase db push --linked`
  - Expected output ends with: `Finished supabase db push.`
  - Migrations applied: `0001_extensions.sql` through `0015_rls_test_fixtures.sql`
  - **If any migration fails:** fix the SQL in `supabase/migrations/`, re-stage, re-run `db push` (idempotent on already-applied migrations)

### 2.3 Generate typed schema for the app

- [ ] `supabase gen types typescript --linked > src/lib/db/database.types.ts`
- [ ] `git add src/lib/db/database.types.ts`
- [ ] `git commit -m "chore(schema): generate Supabase TypeScript types"`

### 2.4 Verify schema in Dashboard

- [ ] Table Editor: 13 canonical tables + user-scoped tables + `audit_log` visible
- [ ] Database → Schemas: `staging` schema exists (empty — Phase 4a populates)
- [ ] Authentication → Policies: RLS policies on every canonical + user-scoped table
- [ ] Database → Functions: `format_krw`, `fn_handle_new_user`, `fn_audit_log_write`, `custom_access_token_hook` present

### 2.5 Smoke RLS against the live DB

- [ ] `NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run test:rls`
- [ ] All RLS assertions pass

---

## Section 3 — Supabase Auth configuration

### 3.1 Enable `custom_access_token_hook`

- [ ] Dashboard → Authentication → Hooks → Customize Access Token (JWT) Claims → **Enable**
- [ ] Schema: `public`. Function: `custom_access_token_hook`
- [ ] Save
- [ ] Reference: `docs/auth/SUPABASE_AUTH_HOOK.md` (Plan 04)

### 3.2 Enable Google OAuth

Pre-req: Google Cloud project with OAuth client created (see <https://console.cloud.google.com/apis/credentials>):

- [ ] Authorized redirect URI on the Google Client = `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- [ ] Dashboard → Authentication → Providers → Google → Enable
- [ ] Paste Google **Client ID** + **Client Secret**
- [ ] Save

### 3.3 Enable Kakao OAuth (only when Kakao Business app is approved)

- [ ] Defer if not yet approved. Until then leave `NEXT_PUBLIC_KAKAO_ENABLED=false` (the login page renders the Kakao button as "준비 중")
- [ ] When approved:
  - [ ] Reference: `docs/auth/KAKAO_BUSINESS_APP.md` (Plan 04)
  - [ ] Dashboard → Authentication → Providers → Kakao → Enable
  - [ ] Paste Kakao **REST API key** + **Client Secret**
  - [ ] Set `NEXT_PUBLIC_KAKAO_ENABLED=true` in `.env.local` and (later) Vercel env

### 3.4 (Optional) Seed an admin user

Useful once you sign in for the first time and want to test admin gating:

```sql
-- Run in Supabase SQL Editor after first OAuth signup
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'OWNER@YOUR_DOMAIN');
```

Then sign out + sign back in — the JWT picks up `user_role: admin` via the access-token hook.

---

## Section 4 — Sentry project (Plan 07 Task 4 deferred items 1–2)

### 4.1 Create the Sentry project

- [ ] Sign up / sign in at <https://sentry.io>
- [ ] New Project → platform **Next.js** → name `vc-co-finder`
- [ ] Capture the **DSN** → will become `NEXT_PUBLIC_SENTRY_DSN`
- [ ] Note the **org slug** + **project slug** → become `SENTRY_ORG` + `SENTRY_PROJECT`

### 4.2 Issue an Auth Token (for sourcemap upload at build time)

- [ ] Settings → Auth Tokens → Create New Token
- [ ] Scopes: `org:read` + `project:releases` (minimum required by `withSentryConfig`)
- [ ] Copy → will become `SENTRY_AUTH_TOKEN`

### 4.3 Generate `HEARTBEAT_SECRET` (Plan 07 Task 4 item 3)

- [ ] `openssl rand -hex 32` → copy the value
- [ ] Will be used in two places: Vercel env var **and** GitHub Actions secret (must match exactly)

---

## Section 5 — Resend (Plan 06 Task 3 deferred items 1–3)

### 5.1 Resend account + sending domain

- [ ] Sign up at <https://resend.com> (free tier: 3,000 emails/mo, 100/day — sufficient for v1)
- [ ] Add Domain → enter `YOUR_DOMAIN`
- [ ] Resend shows DNS records to install (3 entries: SPF TXT, DKIM CNAME × 1–2, optional Return-Path)
- [ ] Add the records at your DNS provider
- [ ] Wait for Resend dashboard to show **Verified** for the domain (usually 5–60 min)

### 5.2 Issue API key

- [ ] Resend Dashboard → API Keys → Create API Key
- [ ] Permission: `Sending access`
- [ ] Copy the `re_...` value → will become `RESEND_API_KEY`

### 5.3 Set up `privacy@YOUR_DOMAIN` forwarding alias (Plan 06 Task 3 item 3)

Reference: `docs/compliance/CPO_FORWARDING_ALIAS.md`

Pick **Option A** (registrar email forwarding — simplest) or **Option B** (Google Workspace alias — more capable):

- [ ] Configure forwarding so mail to `privacy@YOUR_DOMAIN` reaches the project owner's inbox
- [ ] Send a test email to confirm receipt + reply-from-real-inbox path works

### 5.4 Substitute the privacy-policy CPO placeholder

Plan 06 left `privacy@[도메인]` as a literal placeholder in `src/messages/ko.json`. Replace it now:

- [ ] Open `src/messages/ko.json` → find `privacy.cpoBody`
- [ ] Replace `privacy@[도메인]` with `privacy@YOUR_DOMAIN`
- [ ] (Same edit in `src/messages/en.json` if applicable)
- [ ] `git commit -m "chore(privacy): substitute CPO email with real domain"`

---

## Section 6 — Vercel deploy (Plan 08 Task 2)

### 6.1 Push to GitHub + import to Vercel

- [ ] Ensure `git push` is up to date on `main`
- [ ] <https://vercel.com/new> → Import Git Repository → select the repo
- [ ] Framework Preset: Next.js (auto-detected)
- [ ] Keep default build settings

### 6.2 Add ALL env vars (Production + Preview, except where noted)

| Key | Source | Production | Preview |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Section 1.2 | yes | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Section 1.2 | yes | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Section 1.2 | **yes** | **NO** (D-02.3 — preview branches must NOT have write access) |
| `DATABASE_URL` | Section 1.2 (pooler URI) | yes | yes |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR_PROJECT.vercel.app` (placeholder; updated in 6.4) | yes | yes |
| `NEXT_PUBLIC_KAKAO_ENABLED` | `false` (or `true` after Section 3.3) | yes | yes |
| `NEXT_PUBLIC_SENTRY_DSN` | Section 4.1 | yes | yes |
| `SENTRY_AUTH_TOKEN` | Section 4.2 | yes | yes |
| `SENTRY_ORG` | Section 4.1 | yes | yes |
| `SENTRY_PROJECT` | Section 4.1 | yes | yes |
| `SENTRY_TRACES_SAMPLE_RATE_PROD` | `0.01` | yes | yes |
| `SENTRY_TRACES_SAMPLE_RATE_DEV` | `0.1` | yes | yes |
| `RESEND_API_KEY` | Section 5.2 | yes | yes |
| `DSAR_FROM_EMAIL` | `noreply@YOUR_DOMAIN` | yes | yes |
| `DSAR_ADMIN_NOTIFY_EMAIL` | `privacy@YOUR_DOMAIN` | yes | yes |
| `DSAR_RATE_LIMIT_PER_HOUR` | `5` | yes | yes |
| `HEARTBEAT_SECRET` | Section 4.3 | yes | yes |
| `REVALIDATE_SECRET` | `openssl rand -hex 32` (Phase 4a uses) | yes | yes |

### 6.3 First deploy

- [ ] Click Deploy. Wait ~2–3 min for the first build
- [ ] Build should succeed; Sentry sourcemap upload step should run (visible in build log)
- [ ] Capture the deployed URL: `https://YOUR_PROJECT.vercel.app`

### 6.4 Update post-deploy env + redeploy

- [ ] Vercel → Project Settings → Environment Variables → set `NEXT_PUBLIC_APP_URL` to the real deployed URL from 6.3
- [ ] Trigger a redeploy (Deployments → latest → Redeploy)

### 6.5 Wire OAuth callbacks back to the deployed URL

- [ ] Supabase Dashboard → Authentication → URL Configuration:
  - Site URL: `https://YOUR_PROJECT.vercel.app`
  - Redirect URLs: add `https://YOUR_PROJECT.vercel.app/auth/callback`
- [ ] Google Cloud Console → OAuth Consent Screen / Client:
  - Authorized JavaScript origins: add `https://YOUR_PROJECT.vercel.app`
  - Authorized redirect URI on the Google Client remains `https://YOUR_PROJECT.supabase.co/auth/v1/callback` (Supabase exchanges the code, not Vercel)
- [ ] (If Kakao enabled) Kakao Developer Console: same pattern — add `https://YOUR_PROJECT.vercel.app` to allowed origins

### 6.6 Smoke the deployed URL manually

- [ ] Browse `https://YOUR_PROJECT.vercel.app/` → expect 302 → `/ko/`
- [ ] `/ko/` → landing renders, hero text visible, footer disclaimer visible
- [ ] Navigate to `/ko/sources`, `/ko/privacy`, `/ko/terms`, `/ko/contact/dsar` — all render real Korean content

---

## Section 7 — GitHub Actions secrets + variables (Plan 07 Task 4 item 5)

GitHub repo → Settings → Secrets and variables → Actions:

### 7.1 Repository **Secrets**

- [ ] `HEARTBEAT_SECRET` = same value as Section 4.3 (must exactly match the Vercel env var)

### 7.2 Repository **Variables** (note: variable, not secret)

- [ ] `VERCEL_HEALTH_URL` = `https://YOUR_PROJECT.vercel.app` (the deployed URL from Section 6.3)

### 7.3 Manual dispatch the heartbeat workflow

- [ ] GitHub Actions tab → "Free-tier Heartbeat" workflow → **Run workflow** (workflow_dispatch)
- [ ] Wait for green check
- [ ] Open the run log → confirm HTTP 200 + JSON contains `"dbReachable":true`

### 7.4 Confirm storage-monitor workflow is also armed

- [ ] Actions tab → "Storage Monitor" workflow → Run workflow
- [ ] Confirm green check + DB size reported under 70% of 500 MB

---

## Section 8 — Live smoke verification (Plan 08 Tasks 3 + 4)

### 8.1 Run the automated smoke suite against prod

```bash
BASE_URL=https://YOUR_PROJECT.vercel.app \
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
HEARTBEAT_SECRET=... \
npm run test:smoke
```

- [ ] Expect: all 18 assertions pass (criteria #1 + #4 + #5 = 12 HTTP-only; criteria #2 + #3 = 6 Supabase-direct)
- [ ] If any failure, see `tests/smoke/README.md` Failure triage table

### 8.2 Sentry verification

- [ ] Browse `https://YOUR_PROJECT.vercel.app/ko/_debug/sentry-test`
- [ ] Click **Throw runtime error (client)** → page shows error boundary; within ~30 s a `ClientError` event arrives in Sentry
- [ ] Click **Throw server-action error** → page shows "Server-action fired" note; second event arrives in Sentry
- [ ] In Sentry, open both events:
  - [ ] Tag `environment: production` present
  - [ ] No `password`, `token`, `email` fields in payload (PII scrubbing OK)

### 8.3 DSAR end-to-end (Plan 06 Task 3 item 6)

- [ ] Browse `https://YOUR_PROJECT.vercel.app/ko/contact/dsar`
- [ ] Submit a request with your own email + a non-trivial description
- [ ] Within ~1 min an email arrives at the address you submitted
- [ ] Click the verification link → redirects to `/ko/contact/dsar/success?verified=1`
- [ ] In Supabase Studio → Table Editor → `dsar_requests` → confirm the row has `status='verified'`
- [ ] Click the same verification link **again** → confirms replay protection (still `verified`, not crashed)
- [ ] Submit 6 requests within an hour → 6th submission shows the rate-limit banner

### 8.4 Real OAuth sign-up (FOUND-05 session persistence)

- [ ] Open `https://YOUR_PROJECT.vercel.app/ko/login` in a new incognito window
- [ ] Check the PIPA consent box → click **Google** → complete consent → land back on `/ko/`
- [ ] Header shows the email + sign-out link
- [ ] Hard-refresh the page (Ctrl+Shift+R) → still signed in (session persists across refresh = FOUND-05)
- [ ] Browse `/ko/me/profile` → email + role `user` visible
- [ ] (If admin seeded in 3.4) Browse `/ko/admin` → "Admin — Phase 4b에서 구축됩니다" placeholder visible
- [ ] Sign out → header reverts to "로그인" CTA

---

## Section 9 — Pre-handoff cleanup

- [ ] Delete the RLS test fixture row before Phase 2 seed:
  ```sql
  DELETE FROM companies WHERE slug = 'rls-fixture-company';
  DELETE FROM dsar_requests WHERE requester_email IN ('rls-test@example.com', 'smoke@example.com');
  ```
- [ ] Decide whether to **remove** or **admin-gate** `/ko/_debug/sentry-test` before Phase 8 LAUNCH — track in pre-launch checklist
- [ ] Confirm Vercel Analytics dashboard shows traffic (a few pageviews from the smoke testing)
- [ ] Update `.planning/STATE.md` (orchestrator owns) marking Phase 1 complete
- [ ] Hand off to Phase 2 planning: `/gsd-execute-phase 2`

---

## Appendix A — Failure / rollback playbook

| Symptom | Diagnose | Recover |
|---|---|---|
| `supabase db push` fails mid-migration | Check the failing SQL in the named migration file | Fix in place, commit, `supabase db push --linked` (idempotent re-run) |
| Vercel build fails on Sentry sourcemap upload | `SENTRY_AUTH_TOKEN` missing / wrong scope | Re-issue with `org:read` + `project:releases` |
| OAuth redirect 400 after sign-in | Site URL / Redirect URLs mismatch in Supabase Auth | Re-check Section 6.5; the URL must exactly match the deployed origin |
| `/api/health` returns 401 from heartbeat workflow | `HEARTBEAT_SECRET` mismatch between Vercel and GitHub Actions secret | Regenerate, set both places to same value |
| DSAR verification email not received | Resend domain not verified OR `RESEND_API_KEY` missing | Section 5.1; meanwhile rows still persist (admin can process manually) |
| Smoke test criterion #2 column-not-found | Migration not pushed | Re-run Section 2.2 |
| Smoke test criterion #3 anon insert succeeds | RLS policy missing | Re-check Plan 03 migrations applied; confirm in Dashboard → Authentication → Policies |
| Vercel Analytics not appearing | `<Analytics />` removed OR build flag dropped | Check `src/app/[locale]/layout.tsx`; redeploy |

## Appendix B — Pre-launch checklist (Phase 8 LAUNCH-01 inputs)

These items are NOT blocking for Phase 1 sign-off but MUST be resolved before flipping production traffic:

- [ ] `/ko/_debug/sentry-test` removed or admin-gated
- [ ] Kakao OAuth approved + enabled (or explicitly deferred to v2)
- [ ] Vercel Hobby → Pro upgrade decision (commercial-use clock starts at public launch)
- [ ] `NEXT_PUBLIC_APP_URL` matches the canonical custom domain (not the `*.vercel.app` URL)
- [ ] DNS for the custom domain pointed at Vercel + verified
- [ ] Privacy policy reviewed by a PIPA-knowledgeable attorney
- [ ] Real founder/owner contact info in `/ko/privacy` CPO section (no placeholder)

---

*Last updated: end of Phase 01 execution. Next phase that touches deploy: Phase 8 (LAUNCH-01).*
