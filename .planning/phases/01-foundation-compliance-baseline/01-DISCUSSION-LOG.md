# Phase 1: Foundation & Compliance Baseline — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 01-foundation-compliance-baseline
**Mode:** Interactive discuss; user deferred all grey areas to Claude ("알아서 진행해")
**Areas surfaced:** Auth scope & flow, Environments & deploy strategy, RLS · role · schema details, PIPA compliance identity, i18n URL scheme (discretion), Phase 1 public UI scope (discretion)

---

## Grey Area Selection

| Area | Surfaced Options | Selected |
|------|------------------|----------|
| Auth 범위 & 플로우 | Kakao Business timing / 이메일·패스워드 fallback / post-login redirect / 미가입자 접근 | ✓ (auto-decided) |
| 환경 & 배포 전략 | Single vs dev/prod Supabase / 로컬 Supabase vs 클라우드 직접 / Vercel preview / `.env.example` | ✓ (auto-decided) |
| RLS · 역할 · 스키마 세부 | 캐노니컬 anon read / JWT role claim / 파티셔닝 day-1 / enum 정의 | ✓ (auto-decided) |
| PIPA 컴플라이언스 실체 | CPO 지정 / 처리방침 소스 / DSAR 본인확인 강도 / 쿠키 동의 UX | ✓ (auto-decided) |

**User's choice:** "알아서 진행해" (treat all surfaced areas as discretion — apply recommended defaults).

**Notes:** User has pre-authored a deeply researched PROJECT.md, REQUIREMENTS.md (81 reqs), ROADMAP.md (8 phases), and 5 research docs. STATE.md explicitly locks 10 key decisions before Phase 1 planning. Most foundational technical choices were already made; the remaining grey areas were largely operational (Kakao timing, environment split, enum shapes, PIPA identity). With that level of prior alignment, deferring to Claude for sensible defaults is low-risk. Decisions below are grounded in the research artifacts, not invented.

---

## Auth 범위 & 플로우 (D-01)

| Sub-decision | Options considered | Locked |
|---|---|---|
| Kakao Business app timing | (a) Block Phase 1 until approved / (b) Start Day 1 parallel, Google-only fallback / (c) Defer Kakao to Phase 2 | **(b)** — Google-first ship with Kakao fast-follow |
| Email/password fallback | (a) Ship in v1 / (b) Defer to v2 AUTH-V2-02 | **(b)** — No email/password in v1 |
| Post-login redirect | (a) `/` landing / (b) `/me` (doesn't exist yet) / (c) `/search` (Phase 3) | **(a)** — Land on `/` |
| Unauthenticated reach | (a) Full read (search + profiles) / (b) Login required for profile view / (c) Teaser only | **(a)** — Full anonymous read |

**Rationale:** Persona = researcher/journalist = friction-sensitive. PROJECT.md explicitly: "검색 공개 / 저장·알림은 로그인 (premium gating, NOT paywall)." Kakao Business timing is a paperwork risk not a tech risk — isolate it.

---

## 환경 & 배포 전략 (D-02)

| Sub-decision | Options considered | Locked |
|---|---|---|
| Supabase projects | (a) Single prod / (b) dev + prod split / (c) dev + staging + prod | **(a)** — Single until ARCHITECTURE.md D3 trigger |
| Local dev | (a) `supabase start` CLI / (b) Cloud-only dev / (c) Docker Compose | **(a)** — Supabase CLI local |
| Migration tool | (a) Supabase CLI migrations / (b) Drizzle Kit / (c) Both | **(a)** — CLI only (Drizzle for queries only) |
| Vercel preview write access | (a) Full writes / (b) Read-only env-guard / (c) Preview-specific Supabase branch | **(b)** — Env-guarded, anon-key only |
| Free-tier auto-pause | (a) Heartbeat Day 1 / (b) Add when paused / (c) Rely on real traffic | **(a)** — GitHub Actions heartbeat Day 1 |

**Rationale:** Solo-dev v1 on free tier. Splitting infra is operational debt without a team to justify it. `supabase start` gives full Postgres + auth + storage locally; identical schema ships to cloud.

---

## RLS · 역할 · 스키마 세부 (D-03)

| Sub-decision | Options considered | Locked |
|---|---|---|
| Canonical read policy | (a) Anon read / (b) Authenticated only | **(a)** — Anon read (SEO + persona) |
| User-scoped tables | (a) Create all in Phase 1 / (b) Create per-phase as needed | **(a)** — Create all now; features land later |
| Role claim injection | (a) `custom_access_token_hook` → JWT / (b) Per-query join to profiles / (c) Hybrid | **(a)** — JWT claim (zero join cost) |
| audit_log partitioning | (a) Day-1 monthly partitions / (b) Single table + index, partition later | **(b)** — YAGNI; documented threshold |
| company_facts partitioning | (a) Day-1 yearly partitions / (b) Single table + index, partition later | **(b)** — YAGNI; documented threshold |
| Enum vs check-constraint | (a) Postgres ENUM for fixed / TEXT+CHECK for evolving / (b) All TEXT+CHECK / (c) All ENUM | **(a)** — Hybrid by stability |
| staging.* schema | (a) Create empty in Phase 1 / (b) Create in Phase 4a | **(a)** — Empty schema now |
| Soft-delete | (a) `deleted_at TIMESTAMPTZ` on canonical / (b) Separate archive table / (c) Hard delete + audit | **(a)** — `deleted_at` column |

**Rationale:** Anonymous read is core to the anti-Crunchbase premium-gating stance in PROJECT.md. JWT role claim is the Supabase-idiomatic pattern per ARCHITECTURE.md Pattern 5. Partitioning retrofit is straightforward in Postgres — upfront partitioning adds complexity without volume to justify.

---

## PIPA 컴플라이언스 실체 (D-04)

| Sub-decision | Options considered | Locked |
|---|---|---|
| CPO 지정 | (a) Project owner + dedicated alias / (b) Owner's personal email / (c) Legal firm | **(a)** — Owner as CPO + `privacy@{domain}` alias |
| 처리방침 소스 | (a) KISA 표준 템플릿 + 커스텀 / (b) Auto-generator service / (c) Full custom from scratch | **(a)** — KISA skeleton + project-specific sections |
| DSAR 본인확인 | (a) iPIN/PASS 통합 / (b) Email-based challenge / (c) Manual admin review | **(b)** — Email challenge (v1 pragmatic) |
| 쿠키 동의 UX | (a) EU geo-detect + banner / (b) Simple Korean functional-cookie notice / (c) No banner | **(b)** — Korean notice only; marketing opt-in separate in Phase 7 |
| 데이터 보존 | (a) Stated in policy / (b) Deferred to admin docs / (c) Not stated | **(a)** — Stated: audit 5y, soft-delete + 30d, PIPA/GDPR 30d SLA |
| `/terms` | (a) Ship in Phase 1 / (b) Defer to Phase 8 | **(a)** — Minimal v1 terms Phase 1 |

**Rationale:** PITFALLS.md #7 explicitly warns against deferring DSAR — "first privacy complaint becomes a regulatory incident." iPIN/PASS is expensive and adds friction inconsistent with researcher persona. KISA template is authoritative; auto-generators often miss Korean-specific clauses.

---

## i18n URL 구조 (D-05 — Claude's Discretion)

| Sub-decision | Options considered | Locked |
|---|---|---|
| URL pattern | (a) `/[locale]/*` prefix / (b) Root-only + cookie / (c) Subdomain per locale | **(a)** — `/ko/*` with `/` → `/ko/` |
| `en.json` shape | (a) Structural stub (keys, empty strings) / (b) Missing (fallback at runtime) / (c) Fully translated | **(a)** — Structural stub |
| Middleware order | (a) i18n → Supabase / (b) Supabase → i18n | **(a)** — i18n first (locale resolved before session read) |
| Translation direction | (a) ko → en / (b) en → ko / (c) Bilingual source | **(a)** — Korean is source of truth |

**Rationale:** next-intl App Router pattern is well-documented. `/ko/*` prefix upfront avoids URL churn when English ships in Phase 7+.

---

## Phase 1 공개 UI 범위 (D-06 — Claude's Discretion)

| Sub-decision | Options considered | Locked |
|---|---|---|
| Landing `/ko/` | (a) Placeholder "Coming Soon" / (b) Minimal real landing / (c) Full marketing site | **(b)** — Minimal real (hero + CTAs + footer) |
| `/ko/sources` content | (a) Empty list / (b) Active + planned sources labelled / (c) Defer to Phase 8 | **(b)** — Transparent roadmap |
| `/ko/admin/*` in Phase 1 | (a) Not created / (b) Middleware stub only / (c) Full curation UI | **(b)** — Gated stub (tests role flow) |
| `/ko/login` | (a) Modal on any page / (b) Dedicated route / (c) Inline only | **(b)** — Dedicated route with PIPA consent |
| Privacy/terms/DSAR pages | (a) Full content in Phase 1 / (b) Lorem placeholder / (c) Link to external doc | **(a)** — Real content Phase 1 |

**Rationale:** Phase 1 phase goal from ROADMAP.md requires DSAR to *accept* requests and i18n to be *live* — these need real routes, not placeholders. Landing-as-placeholder would break the phase's success criteria #4.

---

## Deferred Ideas

- Email/password auth fallback → v2 (AUTH-V2-02)
- `/me/*` routes → Phase 4c
- Admin curation UI body → Phase 4b
- Seed data → Phase 2
- Korean tokenizer → Phase 3
- audit_log / company_facts partitioning → threshold-triggered
- Supabase project split → ARCHITECTURE.md D3 trigger
- Vercel Pro upgrade → Phase 8 (LAUNCH-04)
- Cloudflare R2 → Phase 2
- iPIN/PASS DSAR verification → v2 if volume justifies
- EU GDPR cookie banner → v2 with Asia expansion

---

*Discussion log: 2026-04-20*
