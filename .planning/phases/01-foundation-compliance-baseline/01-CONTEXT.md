# Phase 1: Foundation & Compliance Baseline — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning
**Mode:** Claude auto-selected recommended defaults (user said "알아서 진행해")

<domain>
## Phase Boundary

Deliverable: A deployed Next.js 15.5 + Supabase project where a developer can sign up via Google (and Kakao when Business app ready), every canonical table exists with provenance + identity + currency + currency-triple baked in, RLS protects user-scoped data while allowing anon read on canonical tables, every UI string flows through `t()`, a PIPA-compliant Korean privacy policy is live, and the DSAR endpoint accepts requests.

**In scope (Phase 1):**
- Tech bootstrap (Next.js 15.5 App Router + TS + Tailwind v4 + shadcn/Radix + Drizzle + next-intl + @supabase/ssr)
- Auth flows (Google OAuth; Kakao OAuth when Business app approved — Google-only fast-follow fallback)
- Full canonical schema migration (13 tables + staging schema stub)
- RLS policies (anon read canonical; `auth.uid()`-scoped user tables; role-gated admin)
- Audit log triggers + soft-delete columns
- i18n scaffolding (`/[locale]/*` with `/ko/*` default)
- PIPA compliance (privacy policy, DSAR endpoint, CPO designation)
- Observability (Sentry, Vercel Analytics, Speed Insights)
- Minimal public landing page + `/sources` index + gated `/admin/*` stub
- Storage-budget heartbeat to prevent 7-day auto-pause

**Out of scope (other phases):**
- Seed companies + real profile content (Phase 2)
- Search facets / Korean tokenization (Phase 3)
- ETL worker / Fly.io / GitHub Actions cron (Phase 4a)
- Admin curation UI implementation (Phase 4b)
- Watchlists / saved searches UI (Phase 4c)
- Charts, comparison, alerts (Phase 6–7)

</domain>

<decisions>
## Implementation Decisions

### D-01 — Auth Scope & Flow

- **D-01.1** Kakao Business app registration starts Day 1 of Phase 1 as a **parallel blocker task** (user owns the Kakao Developers business-account submission). Google OAuth is the unblocked path; ship Google-only if Kakao approval slips past Phase 1 end. Add Kakao as a fast-follow in a subsequent plan when approved.
- **D-01.2** **No email/password fallback in v1.** Social-only reduces spam + password-reset surface; matches PROJECT.md persona (리서처/언론/구직자 — all social-login tolerant). Email/password deferred to v2 AUTH-V2-02.
- **D-01.3** **Post-login redirect = `/` (landing).** No `/me/*` routes exist in Phase 1; signed-in state is visible via header avatar. `/me/*` redirect target arrives in Phase 4c.
- **D-01.4** **Unauthenticated users get full read access** to future `/search` and `/companies/[slug]` (Phase 2–3). Anonymous browsing is core to SEO + researcher UX (anti-Crunchbase paywall per PROJECT.md premium-gating decision). Login-only gates apply to write actions (watchlist, saved searches, submissions) in later phases.
- **D-01.5** Sign-in UI = two prominent OAuth buttons (Google, Kakao) on a shared `/login` page, plus a minimal inline "로그인" header CTA. `@supabase/ssr` cookie-based session with Node middleware refresh (Next.js 15.5 pattern).

### D-02 — Environments & Deploy Strategy

- **D-02.1** **Single Supabase cloud project for v1.** No dev/prod split until ARCHITECTURE.md D3 fires (operational split). Saves the 2nd free-tier slot for emergency. Dev-vs-prod separation is env-var + branch-level, not project-level.
- **D-02.2** **Local development uses Supabase CLI (`supabase start`).** Migrations written as SQL files in `supabase/migrations/`; Drizzle used for typed queries only (per STACK.md: set `prepare: false` for Supabase pooler). Do NOT use Drizzle Kit for migrations (would conflict with Supabase CLI workflow).
- **D-02.3** **Vercel preview deployments connect to prod Supabase with anon key only.** Write paths are env-guarded (`if (process.env.VERCEL_ENV === 'preview') throw`). Pragmatic for solo-dev v1; revisit when a team is involved.
- **D-02.4** **Free-tier heartbeat from Day 1.** GitHub Actions cron (every 6 days) pings a public health endpoint to prevent the 7-day Supabase auto-pause. This is included in Phase 1 scope (small cost, big insurance).
- **D-02.5** **`.env.example` is the onboarding contract.** Every required var documented with a comment + source link. README has a single-command dev setup section.
- **D-02.6** Deployment target is **Vercel Hobby for Phase 1 only**. Pro upgrade gate is Phase 8 (LAUNCH-04). Commercial-use ToS clock starts only at public launch.

### D-03 — RLS · Role Model · Schema Details

- **D-03.1** **Canonical tables = public readable, service-role writable.** RLS enabled on all canonical tables (`companies`, `funding_rounds`, `investors`, `round_investors`, `persons`, `person_roles`, `aliases`, `company_identifiers`, `company_relations`, `data_sources`, `company_facts`, `news_mentions`). Policy: `USING (true)` for SELECT; INSERT/UPDATE/DELETE policy = `false` (only service-role client bypasses).
- **D-03.2** **User-scoped tables created in Phase 1, features land in Phase 4c.** Create `user_watchlists`, `user_watchlist_companies`, `user_saved_searches`, `user_submissions`, `profiles` with full RLS (`auth.uid() = user_id`) now. UI that uses them is Phase 4c; this avoids a second migration wave.
- **D-03.3** **Role stored in `profiles.role` + injected into JWT via Supabase `custom_access_token_hook`.** RLS policies on admin-gated tables use `(auth.jwt() ->> 'user_role')` — zero per-query join cost. `profiles.role` CHECK constraint = `IN ('user','editor','admin')`. Default 'user' on signup via trigger.
- **D-03.4** **`audit_log` trigger + table from Day 1, NOT partitioned yet.** Single table with `created_at DESC` index; append-only. Partitioning retrofit planned for when row count approaches 10M (documented threshold, not Phase 1 work).
- **D-03.5** **`company_facts` table in Phase 1 schema, NOT partitioned.** Postgres declarative partitioning plan (by year) documented in migration comments for future enablement when row count >3M.
- **D-03.6** **Postgres ENUMs for fixed taxonomies:** `funding_stage` (pre_a, seed, series_a, series_b, series_c, series_d, bridge, safe, convertible_note, grant, undisclosed), `user_role` (user, editor, admin), `source_type` (dart, manual, user_submission, press_release, vc_portfolio, news_mention, kstartup). TEXT with CHECK for open-ended fields (sector, region) — promote to taxonomy table in Phase 3 when facets stabilize.
- **D-03.7** **`staging.*` schema created empty in Phase 1** (per REQUIREMENTS.md DATA-02) — actual staging tables land in Phase 4a, but the schema itself exists so RLS and grants are correct from Day 1.
- **D-03.8** **Currency triple on every monetary column** (FOUND-14): `amount_minor BIGINT NOT NULL`, `currency_code CHAR(3) NOT NULL`, `original_text TEXT` (nullable — manual seed may not have original). Helper SQL function `format_krw(amount_minor)` for 억/조 rendering.
- **D-03.9** **`last_verified_at` distinct from `updated_at`** (TRUST-02) on every fact-bearing canonical table. Default to `created_at`; ETL updates explicitly.
- **D-03.10** **Soft-delete via `deleted_at TIMESTAMPTZ`** on canonical tables. No hard deletes from app code; admin rollback via Phase 4b uses audit log.

### D-04 — PIPA Compliance Identity

- **D-04.1** **CPO (개인정보보호책임자) = project owner for v1.** Named individual + contact email listed in `/privacy`. Contact email is a dedicated alias (e.g., `privacy@{domain}`) rather than the owner's personal inbox — create a forwarding alias Day 1. DNS + email forwarding setup is a Phase 1 task, not deferred.
- **D-04.2** **Privacy policy = hand-written Korean using KISA 표준 개인정보처리방침 as skeleton.** NOT an auto-generated boilerplate. Include project-specific sections: data sources (DART API, 사용자 제보, 수동 큐레이션), retention (임원 퇴임 후 30일 이내 현재 표시 제거; 감사 로그 보존), third-party processors (Supabase US/EU, Vercel, Resend — list DPA links), international transfer disclosure.
- **D-04.3** **DSAR form (`/contact/dsar`) captures:** requester name, contact email (or phone), request type (열람 / 정정 / 삭제 / 처리정지), subject (personal info type), description, optional evidence attachment. **No inline identity verification** (본인인증 PASS / iPIN is too expensive for v1). Instead, email-based challenge: admin sends a verification email to the requester's address before processing. Documented SLA: "10일 이내 접수 확인, 30일 이내 처리 완료."
- **D-04.4** **Cookie consent = minimal Korean functional-cookie notice banner.** No EU geo-detect in v1 — single Korean-language banner stating "로그인 세션 유지를 위해 필수 쿠키를 사용합니다." Marketing-purpose cookies/analytics are opt-in separately (Phase 7 alert signup has a distinct marketing consent checkbox, default unchecked per PIPA §22-2).
- **D-04.5** **Data retention policy stated in privacy policy:** raw audit log retained 5 years (내부 감사 목적); user account soft-delete + 30-day hard-delete; personal data requests processed within 30 days (GDPR-aligned).
- **D-04.6** **`/terms` (이용약관)** — minimal v1 version covering: data accuracy disclaimer, no warranty, no redistribution for commercial data-mining (anti-scraping clause), contact for disputes. Separate from privacy policy.
- **D-04.7** **TRUST-06 disclaimer** ("데이터 완전성을 보장하지 않습니다") lives in the global footer + `/privacy` + `/sources`.

### D-05 — i18n URL Scheme (Claude's Discretion default)

- **D-05.1** **`/[locale]/*` routing with `/ko/*` default and root `/` → 302 to `/ko/`.** next-intl App Router pattern. Prepares clean English expansion (`/en/*` Phase 7+) without URL rewrites on launch.
- **D-05.2** **`en.json` is a structural stub** — same key tree as `ko.json`, empty strings (not missing keys). Prevents runtime fallback crashes when English expansion begins.
- **D-05.3** **Middleware chain order**: next-intl locale middleware → Supabase `updateSession` → route handler. `@supabase/ssr` cookie pattern preserved.
- **D-05.4** **Korean is the copy source of truth.** Translators in Phase 7+ translate from `ko.json` to `en.json`, not the reverse.

### D-06 — Phase 1 Public UI Scope (Claude's Discretion default)

- **D-06.1** **Landing (`/ko/`) is real, not "Coming Soon".** Hero (project name + one-liner "한국·아시아 스타트업 검색·비교 인텔리전스"), brief value prop, OAuth sign-in CTAs, footer with disclaimer + privacy/terms/sources links. Minimal but shippable — sets the tone.
- **D-06.2** **`/ko/sources` implements TRUST-07** with the active sources list: "수동 큐레이션 (Phase 2)", "DART Open API (Phase 4a 연동 예정)", "사용자 제보 (Phase 5 연동 예정)". Acknowledging future sources signals roadmap transparency.
- **D-06.3** **`/ko/admin/*` = middleware-gated stub only.** Route group exists with RLS + middleware check (`role IN ('admin','editor')` → else 404, not 403, to avoid admin URL discovery). Body is a single "Admin — Phase 4b에서 구축됩니다" placeholder. This lets us validate role gating end-to-end in Phase 1 without Phase 4b UI.
- **D-06.4** **Sign-in page (`/ko/login`)** — dedicated route with Google + Kakao buttons, Korean-first copy, PIPA consent checkbox (required, linked to `/privacy`).
- **D-06.5** **`/ko/privacy`, `/ko/terms`, `/ko/contact/dsar`** live routes with real PIPA-compliant content (not lorem).

### Claude's Discretion (downstream agents may decide)

- **Design system specifics** — shadcn theme tokens, Tailwind config, typography scale. No user-declared aesthetic beyond "Stripe/Linear style" from PROJECT.md — Claude picks tasteful defaults within Tailwind v4 + shadcn Radix.
- **Component structure under `components/ui/`** — Button / Card / Input variants. shadcn CLI defaults unless a specific need arises.
- **Drizzle schema file organization** — single `schema.ts` vs per-table files. Claude's call (favor per-domain group for readability).
- **Database naming conventions** — snake_case tables/columns, PostgreSQL conventions. Per STACK.md + Supabase norms.
- **Migration file naming** — timestamped SQL files per Supabase CLI default.
- **Sentry sampling rates, tags, scrubbing rules** — sensible defaults (100% errors, 10% performance traces in dev, 1% in prod); scrub request bodies containing `password`/`token`/`email` fields.
- **Free-tier heartbeat implementation** — GitHub Actions workflow with a simple `curl` + 200 assertion.

### Folded Todos

None — no active todos matched Phase 1 at init time.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher, planner) MUST read these before acting.**

### Project context (always)
- `.planning/PROJECT.md` — Vision, persona, core value, v1 boundaries, out-of-scope reasoning
- `.planning/REQUIREMENTS.md` — 81 v1 requirements; §Foundation (FOUND-01 to FOUND-14), §Trust & Provenance (TRUST-01, -02, -03, -06, -07), §Out of Scope
- `.planning/ROADMAP.md` §Phase 1 — Goal, success criteria, pitfalls-addressed mapping
- `.planning/STATE.md` §Accumulated Context — 10 locked key decisions + pitfalls watchlist

### Research artifacts (Phase 1 relevant)
- `.planning/research/STACK.md` — Next.js 15.5 + Supabase + Drizzle versions, `@supabase/ssr` migration note, Kakao Business warning, Cloudflare R2 vs Supabase Storage tradeoff, Korean tokenization deferral rationale, free-tier limits table
- `.planning/research/ARCHITECTURE.md` — Route-group layout (`(public)`/`(authed)`/`(admin)`), RLS boundary pattern, provenance-per-fact data flow, staging→review→publish pattern, ETL-NOT-on-Vercel rationale, Decision Points D1–D5
- `.planning/research/PITFALLS.md` — 16 pitfalls with first-surface phase; Phase 1 owns: #1 (scraping), #2 (stale data — schema), #3 (provenance), #5 (currency), #7 (PIPA), #8 (entity resolution schema), #9 (index strategy), #11 (storage budget), #12 (Vercel commercial), #14 (audit log from Day 1)
- `.planning/research/SUMMARY.md` — Cross-cutting concerns checklist (provenance, i18n, RLS, identity, currency, audit, freshness, compliance, adapter, free-tier monitoring)
- `.planning/research/FEATURES.md` — Feature-level v1 definitions (read for UI scope calibration on landing/sources pages)

### External authoritative sources
- [Supabase Server-Side Auth Next.js docs](https://supabase.com/docs/guides/auth/server-side/nextjs) — `@supabase/ssr` + middleware pattern
- [Supabase Kakao OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-kakao) — Business app requirement for `account_email` scope
- [Supabase Auth Hooks / `custom_access_token_hook`](https://supabase.com/docs/guides/auth/auth-hooks) — JWT role claim injection pattern referenced in D-03.3
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — Policy patterns for anon-read + service-role-write
- [Next.js 15.5 release notes](https://nextjs.org/blog/next-15-5) — Node middleware stability for auth
- [next-intl App Router setup](https://next-intl.dev/docs/getting-started/app-router) — `/[locale]/*` routing
- [KISA 표준 개인정보처리방침 템플릿](https://www.kisa.or.kr/) — Privacy policy skeleton source (D-04.2)
- [PIPA Article 15 (수집·이용 법적 근거)](https://www.law.go.kr/법령/개인정보보호법) — Legal basis for personal data processing
- [PIPA Article 22-2 (marketing consent separate from service consent)](https://www.law.go.kr/법령/개인정보보호법) — Marketing opt-in UX requirement
- [Sentry Next.js SDK](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — Error + performance init
- [Vercel Cron job pricing page](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Why heartbeat is on GitHub Actions, not Vercel

### Deferred (not Phase 1 refs, noted so they're not re-discovered)
- DART OpenDART docs — Phase 4a
- Meilisearch Korean tokenizer — Phase 3 at earliest
- Cloudflare R2 setup — Phase 2 when logos first appear
- Resend transactional — Phase 7

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
**Greenfield project.** No existing source code to reuse (root contains only `CLAUDE.md` + `.planning/`).

### Established Patterns
None yet — Phase 1 is where the project's conventions get set. The planner should treat Phase 1 output as the *reference implementation* for:
- `lib/supabase/{client,server,admin}.ts` split
- `lib/data/*` wrapper attaching `_meta.source`
- `lib/i18n/*` + `messages/{ko,en}.json`
- RLS policy naming convention
- Drizzle schema file organization
- Migration file order + naming

### Integration Points
- Future `lib/search/adapter.ts` (Phase 3) — Phase 1 creates index-friendly tsvector columns with GIN indexes seeded per SRCH-12, so Phase 3 only writes queries.
- Future `/api/revalidate` endpoint (Phase 4a) — Phase 1 leaves placeholder with shared-secret env var.
- Future ETL (`etl/` directory, separate deployable — Phase 4a) — Phase 1 keeps `staging.*` schema empty but created, so ETL migrations don't need to create it.
- Future admin curation UI (Phase 4b) — Phase 1 middleware gating is the skeleton.

</code_context>

<specifics>
## Specific Ideas

- **"Stripe/Linear 비주얼 톤"** from PROJECT.md key decisions — Claude applies this at the landing/login level: clean sans-serif, generous whitespace, neutral grays + one accent color, subtle motion. No flashy illustrations.
- **Persona-informed copy tone**: researcher-first. Drop marketing adjectives ("혁신적인", "최고의"). Favor factual precision ("5천~1만 한국 스타트업 · 출처 명시 · 무료").
- **The footer disclaimer is load-bearing trust UI** — not an afterthought. Should appear on every page.
- **Kakao Business app is a process risk, not a tech risk** — tag it explicitly in the plan so the user can start the admin paperwork in parallel with engineering work.

</specifics>

<deferred>
## Deferred Ideas

### Out of Phase 1 scope but noted for future phases

- **Email/password auth fallback** — covered by AUTH-V2-02 in v2.
- **`en.json` actual translation** — translation work begins Phase 7+ when Asian expansion is on deck.
- **`/me/*` pages** — Phase 4c.
- **Actual admin curation UI** — Phase 4b.
- **Seed data** — Phase 2.
- **Korean morphological tokenizer integration** — Phase 3 (app-side mecab-ko via ETL, per STATE.md key decision 3).
- **`audit_log` partitioning** — when row count threshold approaches (documented in D-03.4).
- **`company_facts` partitioning** — same rationale (D-03.5).
- **Supabase project split** — ARCHITECTURE.md D3 trigger; not before v2.
- **Vercel Pro upgrade** — Phase 8 (LAUNCH-04).
- **Cloudflare R2 logo hosting** — Phase 2 when profile UI first renders logos.
- **iPIN / PASS 본인인증** on DSAR form — v2 if volume justifies; v1 uses email verification.
- **EU GDPR cookie banner with geo-detect** — v2 when Asia expansion pulls EU traffic.

### Reviewed but not folded

None — todo matcher returned zero matches at init.

</deferred>

---

*Phase: 01-foundation-compliance-baseline*
*Context gathered: 2026-04-20*
*Mode: discuss (auto-recommended defaults applied at user request "알아서 진행해")*
