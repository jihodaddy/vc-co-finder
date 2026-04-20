---
phase: 01-foundation-compliance-baseline
plan: 03
subsystem: security
tags: [rls, postgres, audit-log, jwt, auth, supabase, next-intl, vitest]

requires:
  - phase: 01-01
    provides: "Next.js 15.5 + @supabase/ssr server client + [locale]/(admin) route group skeleton"
  - phase: 01-02
    provides: "13 canonical tables + profiles + user_* tables + dsar_requests + audit_log + fn_audit_log_write + fn_touch_updated_at + custom_access_token_hook"
provides:
  - RLS ENABLED + FORCED on 12 canonical tables (anon SELECT where deleted_at IS NULL; anon+authenticated INSERT/UPDATE/DELETE blocked; service-role bypasses)
  - RLS on audit_log blocks SELECT for anon + authenticated (forensic integrity — service-role-only reads via server action)
  - RLS on profiles with role-immutable self-UPDATE (subquery pins role); admin-UPDATE policy permits role changes
  - RLS on user_watchlists, user_watchlist_companies, user_saved_searches, user_submissions keyed on auth.uid() (EXISTS for the join table)
  - RLS on dsar_requests permitting anon INSERT with length CHECK (1-100 name, 5-320 email, 1-5000 description); admin-only SELECT/UPDATE; DELETE blocked
  - GRANTs aligned with each RLS policy's expected role (anon SELECT canonical; authenticated SELECT+UPDATE profiles; admin path via JWT claim)
  - trg_audit_* AFTER INSERT/UPDATE/DELETE triggers on all 12 canonical tables calling fn_audit_log_write('app')
  - trg_touch_updated_at_* BEFORE UPDATE triggers on all canonicals + profiles + dsar_requests
  - rls-fixture-company seed row (UUID 11111111-1111-1111-1111-111111111111) for integration test
  - src/lib/auth/session.ts — getSessionUser() cached per request, reads user_role JWT claim
  - src/lib/auth/admin-guard.ts — requireAdminOrEditor() calls notFound() (404, not 403) per D-06.3
  - src/app/[locale]/(admin)/layout.tsx — async layout invoking the guard before rendering children
  - tests/rls/rls.test.ts — 7 integration cases exercising anon rights against canonical + audit_log + dsar_requests
  - vitest + tsx devDependencies + npm test / test:watch / test:rls scripts
affects: [01-04, 01-05, 01-06, 01-07, 01-08, 04a-all, 04b-all, 04c-all, 05-all, 06-all]

tech-stack:
  added:
    - vitest@4.1.4
    - tsx@4.21.0
  patterns:
    - "Canonical RLS pattern: ENABLE + FORCE RLS; anon SELECT USING (deleted_at IS NULL); anon+authenticated blocked on writes; service-role bypass via BYPASSRLS"
    - "User-scoped RLS pattern: USING (user_id = auth.uid()) or EXISTS parent-ownership check for join tables"
    - "Admin elevation pattern: (auth.jwt() ->> 'user_role') IN ('admin','editor') — zero per-query join, populated by custom_access_token_hook"
    - "Self-role immutability pattern: profiles_update_self WITH CHECK compares new role to existing via subquery"
    - "Admin 404 pattern (D-06.3): notFound() in layout.tsx instead of throwing 403 — identical response to unknown paths so admin surface is non-discoverable"
    - "Audit trigger pattern: TG_ARGV[0] = 'app' source tag; Phase 4a ETL will SET LOCAL audit.source before writes to distinguish"

key-files:
  created:
    - supabase/migrations/0012_rls_canonical.sql
    - supabase/migrations/0013_rls_user_scoped.sql
    - supabase/migrations/0014_audit_triggers.sql
    - supabase/migrations/0015_rls_test_fixtures.sql
    - src/lib/auth/session.ts
    - src/lib/auth/admin-guard.ts
    - tests/rls/rls.test.ts
    - tests/rls/README.md
  modified:
    - src/app/[locale]/(admin)/layout.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "FORCE ROW LEVEL SECURITY applied to every RLS-enabled table so policies are honored even for the table owner — prevents accidental GRANT leakage"
  - "audit_log SELECT blocked for anon AND authenticated (D-03.4 extended) — admin UI will read via server-role server action in Phase 4b, not direct query"
  - "profiles_update_self pins role via subquery (SELECT role FROM profiles WHERE id = auth.uid()) — T-01-03-01 elevation mitigation in the RLS layer, not app layer"
  - "dsar_requests length bounds live in RLS WITH CHECK (not only app validation) — defense in depth against direct PostgREST abuse; matches T-01-03-04 plan"
  - "JWT claim decoded locally in session.ts (no extra DB round-trip) — @supabase/ssr has already verified the signature via auth.getUser() before we peek at claims"
  - "Admin guard uses notFound() not forbidden() — Next.js forbidden() exists in canary only, and the 404 behavior is what D-06.3 requires regardless"
  - "RLS integration test skips when env missing — keeps npm test green in fresh-clone CI; Plan 08 will set env and flip it on"

patterns-established:
  - "Canonical RLS triad: ENABLE + FORCE RLS + 4 policies (select_public + no_insert + no_update + no_delete)"
  - "JWT claim read pattern: base64url-normalize payload → Buffer.from('base64') → JSON.parse with try/catch; never trust signature here (already validated by auth.getUser upstream)"
  - "Admin route gating lives in (admin)/layout.tsx — a single server async layout awaiting requireAdminOrEditor() before rendering"
  - "Test file layout: tests/<domain>/<domain>.test.ts with a sibling README documenting prerequisites + expected error shapes"

requirements-completed: [FOUND-07, FOUND-08, FOUND-09]

duration: 12min
completed: 2026-04-20
---

# Phase 01 / Plan 03: RLS · Audit Triggers · Admin-404 Guard Summary

**Postgres RLS installed across 12 canonical + 6 user-scoped tables (anon read where deleted_at IS NULL; auth.uid() ownership; admin JWT-claim elevation), audit triggers wired to every canonical write, and a 404-on-non-admin route guard anchoring the admin surface per D-06.3.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-20T (Plan 01-02 HEAD + initial reads)
- **Completed:** 2026-04-20T (task 3 commit e22078a)
- **Tasks:** 3
- **Files created:** 8 (4 migrations + 2 auth files + 2 test files)
- **Files modified:** 3 (admin layout, package.json, lockfile)

## Accomplishments

- **FOUND-07 met** — RLS enabled on user_watchlists / user_watchlist_companies / user_saved_searches / user_submissions / dsar_requests / profiles with `auth.uid() = user_id` (or EXISTS parent-ownership) and admin JWT-claim elevation.
- **FOUND-08 met** — `profiles.role` drives admin route access via the `user_role` JWT claim populated by `custom_access_token_hook` (Plan 02 migration 0011). Plan 08 will enable the hook in the Supabase Dashboard.
- **FOUND-09 met** — 12 canonical tables have AFTER INSERT/UPDATE/DELETE triggers invoking `fn_audit_log_write('app')`.
- **D-03.1 met** — canonical tables are anon-readable (deleted_at IS NULL) and anon+authenticated-write-blocked; service-role bypasses RLS.
- **D-03.4 met** — audit_log blocks SELECT for anon + authenticated (forensic integrity); service-role reads only.
- **D-06.3 met** — `/ko/admin/*` returns HTTP 404 (via `notFound()`) for non-admin/editor users, not 403 — admin URL surface is non-discoverable.
- **T-01-03-01 mitigated** — `profiles_update_self` WITH CHECK compares new role to existing via subquery, blocking self-escalation.
- **RLS integration test suite** — 7 Vitest cases covering the full anon threat surface, gated on env presence (skipped in fresh-clone CI until Plan 08 sets the anon key).

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-executor convention):

1. **Task 1: Canonical + user-scoped RLS policies** — `4e067ce` (feat)
2. **Task 2: Audit triggers on canonical tables + RLS integration tests** — `0c4df74` (feat)
3. **Task 3: Admin-guard — 404 on non-admin /ko/admin/* visits** — `e22078a` (feat)

_Plan metadata commit (this SUMMARY) follows._

## RLS Policy Inventory

### Canonical tables (`0012_rls_canonical.sql`)

Applied uniformly across 12 tables (data_sources, companies, aliases, company_identifiers, company_relations, funding_rounds, investors, round_investors, persons, person_roles, company_facts, news_mentions):

| Policy | Operation | Roles | Predicate |
|--------|-----------|-------|-----------|
| `canonical_select_public` | SELECT | anon, authenticated | `USING (deleted_at IS NULL)` |
| `canonical_no_insert` | INSERT | anon, authenticated | `WITH CHECK (false)` |
| `canonical_no_update` | UPDATE | anon, authenticated | `USING (false) WITH CHECK (false)` |
| `canonical_no_delete` | DELETE | anon, authenticated | `USING (false)` |

**audit_log** adds `audit_log_no_read` (blocks SELECT for anon+authenticated) plus the same write-blocking triad. Triggers defined SECURITY DEFINER bypass these policies when invoked from `fn_audit_log_write`.

### User-scoped + compliance tables (`0013_rls_user_scoped.sql`)

| Table | Policy | Op | Predicate |
|-------|--------|----|-----------|
| profiles | `profiles_select_self_or_admin` | SELECT | `auth.uid() = id OR (auth.jwt() ->> 'user_role') IN ('admin','editor')` |
| profiles | `profiles_no_direct_insert` | INSERT | `WITH CHECK (false)` — only `fn_handle_new_user` trigger creates rows |
| profiles | `profiles_update_self` | UPDATE | self + `role = (SELECT role FROM profiles WHERE id = auth.uid())` (role-immutable) |
| profiles | `profiles_update_admin` | UPDATE | `(auth.jwt() ->> 'user_role') = 'admin'` |
| profiles | `profiles_delete_admin` | DELETE | admin only |
| user_watchlists | `watchlists_owner_all` | ALL | `user_id = auth.uid()` |
| user_watchlist_companies | `watchlist_companies_owner_all` | ALL | `EXISTS (SELECT 1 FROM user_watchlists WHERE id = watchlist_id AND user_id = auth.uid())` |
| user_saved_searches | `saved_searches_owner_all` | ALL | `user_id = auth.uid()` |
| user_submissions | `submissions_insert_self` | INSERT | `user_id = auth.uid() OR user_id IS NULL` |
| user_submissions | `submissions_select_self_or_admin` | SELECT | self or admin/editor |
| user_submissions | `submissions_update_admin` | UPDATE | admin/editor only |
| dsar_requests | `dsar_insert_public` | INSERT | anon+auth, length-bounded CHECK (1-100 name, 5-320 email, 1-5000 desc) |
| dsar_requests | `dsar_select_admin` | SELECT | admin only |
| dsar_requests | `dsar_update_admin` | UPDATE | admin only |
| dsar_requests | `dsar_no_delete` | DELETE | blocked (5-yr retention per D-04.5) |

### Audit triggers (`0014_audit_triggers.sql`)

12 canonical tables each get:

- `trg_audit_<table>` — AFTER INSERT OR UPDATE OR DELETE → `fn_audit_log_write('app')`
- `trg_touch_updated_at_<table>` — BEFORE UPDATE → `fn_touch_updated_at()`

`profiles` and `dsar_requests` additionally get `trg_touch_updated_at_*` (no audit trigger — they are not canonical).

## Admin-guard Pattern

```tsx
// src/app/[locale]/(admin)/layout.tsx
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminOrEditor();
  return <>{children}</>;
}
```

`requireAdminOrEditor` reads the cached `SessionUser` and calls `notFound()` if the user is missing or lacks `admin`/`editor` role. `notFound()` triggers the nearest `not-found.tsx` which renders HTTP 404 — identical to any unknown path, so attackers probing for `/ko/admin/*` cannot distinguish "exists but forbidden" from "does not exist" (D-06.3 / T-01-03-03 mitigation).

Role is read from the JWT `user_role` claim, populated by `public.custom_access_token_hook` (Plan 02 migration 0011). Plan 08 will activate the hook in the Supabase Dashboard (Auth > Hooks).

## Files Created/Modified

- `supabase/migrations/0012_rls_canonical.sql` — RLS on 12 canonical tables + audit_log
- `supabase/migrations/0013_rls_user_scoped.sql` — RLS on profiles + 4 user tables + dsar_requests + GRANTs
- `supabase/migrations/0014_audit_triggers.sql` — trg_audit_* + trg_touch_updated_at_* on every canonical + profiles/dsar
- `supabase/migrations/0015_rls_test_fixtures.sql` — seed fixture row for RLS integration test
- `src/lib/auth/session.ts` — getSessionUser() with JWT claim decode, cached per request
- `src/lib/auth/admin-guard.ts` — requireAdminOrEditor() 404 gate
- `src/app/[locale]/(admin)/layout.tsx` — async layout awaiting the guard (replaces Plan 01 passthrough)
- `tests/rls/rls.test.ts` — 7 Vitest integration cases
- `tests/rls/README.md` — how to run + expected error shapes
- `package.json` — vitest + tsx devDependencies + test / test:watch / test:rls scripts
- `package-lock.json` — 150-package install tree

## Decisions Made

- **FORCE ROW LEVEL SECURITY on every RLS-enabled table** — beyond ENABLE, FORCE applies policies to the table owner too, so accidental GRANTs to non-service-role owners cannot silently bypass RLS. No Phase 1 owner other than postgres writes, but this is the secure default.
- **Local JWT payload decode rather than another `getSession()` round-trip per role check** — `auth.getUser()` has already validated the signature; extracting the claim from `session.access_token` is a cheap string parse and avoids duplicating upstream work.
- **`notFound()` rather than canary `forbidden()`** — D-06.3 mandates 404 semantics regardless, and `forbidden()` (HTTP 403) is currently only in Next.js canary. `notFound()` has been stable since 13 and cleanly routes to the nearest `not-found.tsx`.
- **RLS integration suite is env-gated rather than mocked** — the whole point of an RLS test is that PostgREST + Postgres + the actual policy text behave correctly together. A mocked version would validate nothing. `describe.skipIf(!hasEnv)` keeps fresh-clone CI green until Plan 08 plugs the env.
- **Length CHECK on `dsar_insert_public` inside RLS, not only in app validation** — PostgREST will honor WITH CHECK regardless of whether the form-handler runs, so a direct curl attack against the DSAR endpoint still fails the size bound. Defense in depth vs. T-01-03-04.
- **Role elevation mitigation (T-01-03-01) lives in the policy, not the app** — `profiles_update_self WITH CHECK (role = (SELECT role FROM profiles WHERE id = auth.uid()))` cannot be bypassed by any UI or server action because it runs in Postgres after the update is attempted.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks' automated verification blocks passed on the first run. Minor syntactic choices (e.g., `$trg$...$trg$` dollar-quoted strings in 0014 instead of the `'...'` string form shown in the plan's SQL snippet) are equivalent semantically and chosen for readability of nested quotes.

## Issues Encountered

- `npm install -D vitest tsx` ran ~5 minutes in background on this Windows environment (typical cold cache) — completed with exit 0, 150 packages added, `package.json` and `package-lock.json` updated correctly. No functional impact.

## Threat Flags

None — this plan authors DB-level security policies + app-level guard only. All new surface (admin route, DSAR INSERT) was already modeled in the plan's `<threat_model>` and is mitigated per that table.

## Known Stubs

None. Plan 05 will add a single stub page at `src/app/[locale]/(admin)/admin/page.tsx` ("Admin — Phase 4b에서 구축됩니다" placeholder) per D-06.3; that is a separately-tracked deferred UI stub and is out of scope for this plan.

## User Setup Required

None for Plan 03 — migrations are authored but not pushed. Plan 08 owns the `supabase db push` + Supabase Dashboard steps, specifically:

- Enable the Auth Hook `custom_access_token_hook` (Dashboard > Authentication > Hooks > Custom Access Token).
- Verify `anon` role is the default anonymous client role (standard).
- After push, set env `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in CI so `npm run test:rls` actually executes.

## Handoff Notes

- **Plan 04 (OAuth wiring)** — `profiles` row is auto-created on `auth.users` INSERT via `fn_handle_new_user` (Plan 02). OAuth callback can depend on `profiles.id = auth.uid()` being populated by the time the user reaches the first authenticated page.
- **Plan 05 (public pages + admin stub)** — `/ko/admin/*` already 404s for non-admins; Plan 05 only needs to drop in a single `src/app/[locale]/(admin)/admin/page.tsx` with the placeholder copy. No additional gating work.
- **Plan 06 (DSAR endpoint)** — `dsar_requests` anon INSERT is RLS-allowed with length CHECK; the route handler just validates + forwards. Email-challenge token is still app-layer (server-generated `crypto.randomUUID()`) per T-01-03-10.
- **Plan 08 (schema push)** — 15 migrations in strict lexical order (`0001` → `0015`) with no cross-file ordering hazards. Plan 08 also enables the Auth Hook so the admin guard works end-to-end.
- **Phase 4a (ETL)** — audit triggers currently tag every write `source='app'`. Phase 4a should `SET LOCAL audit.source = 'etl'` (plus update `fn_audit_log_write` to read the GUC via `current_setting('audit.source', true)`) before service-role writes to distinguish ETL rows in the forensic log.
- **Phase 4b (admin UI)** — `audit_log` read path requires service-role server action, not a direct SELECT from the authenticated session. Architect accordingly.

## Next Phase Readiness

- All RLS policies + audit triggers authored and committed.
- Admin guard shipped; `npx tsc --noEmit` exits 0; `npm install` exits 0.
- RLS integration test suite authored and env-gated; ready to run green against a migrated project in Plan 08.
- Plan 04 can proceed in parallel (Wave 4) — nothing it needs is blocked by Plan 03's artifacts.

## Self-Check: PASSED

**Files verified on disk:**
- FOUND: supabase/migrations/0012_rls_canonical.sql
- FOUND: supabase/migrations/0013_rls_user_scoped.sql
- FOUND: supabase/migrations/0014_audit_triggers.sql
- FOUND: supabase/migrations/0015_rls_test_fixtures.sql
- FOUND: src/lib/auth/session.ts
- FOUND: src/lib/auth/admin-guard.ts
- FOUND: src/app/[locale]/(admin)/layout.tsx (modified — now awaits requireAdminOrEditor)
- FOUND: tests/rls/rls.test.ts
- FOUND: tests/rls/README.md

**Commits verified in git log:**
- FOUND: 4e067ce feat(01-03): install RLS on canonical + user-scoped tables
- FOUND: 0c4df74 feat(01-03): audit triggers on canonical tables + RLS integration tests
- FOUND: e22078a feat(01-03): admin-guard — 404 on non-admin /ko/admin/* visits

**TypeScript:** `npx tsc --noEmit` exits 0.

---
*Phase: 01-foundation-compliance-baseline*
*Completed: 2026-04-20*
