---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to plan
last_updated: "2026-04-22T23:50:52.593Z"
progress:
  total_phases: 10
  completed_phases: 3
  total_plans: 21
  completed_plans: 21
  percent: 100
---

# State: VC Co-Finder

**Initialized:** 2026-04-20
**Last updated:** 2026-04-20

## Project Reference

- **Core value**: 리서처가 "특정 조건(섹터·라운드·지역·인원·트래픽)에 맞는 한국·아시아 스타트업"을 30초 안에 찾아내고, 시계열 추이로 검증할 수 있어야 한다.
- **ONE thing**: Best-in-class faceted multi-condition search over a Korean-deep startup dataset, anchored by per-fact provenance.
- **Persona**: 리서처 / 언론 / 구직자 (NOT investor — anti-Crunchbase positioning).
- **Tech stack**: Next.js 15.5 + Supabase (Postgres + Auth + RLS) + Drizzle ORM + shadcn (Radix) + next-intl + Recharts + Cloudflare R2 + Python 3.12 ETL on Fly.io + GitHub Actions cron.

## Current Position

Phase: 4a
Plan: Not started

- **Milestone**: v1
- **Phase**: 1 — Foundation & Compliance Baseline (context gathered)
- **Plan**: TBD (awaiting `/gsd-plan-phase 1`)
- **Status**: CONTEXT.md written with Claude-selected defaults (user: "알아서 진행해"), ready for planning
- **Granularity**: standard (8 phases, 4a/4b/4c parallelizable)
- **Mode**: yolo
- **Parallelization**: enabled

## Progress

```
[ ] Phase 1: Foundation & Compliance Baseline
[ ] Phase 2: Read-Only Profiles + Manual Seed
[ ] Phase 3: Faceted Search (Postgres Path)
[ ] Phase 4a: DART ETL + Staging→Review→Publish
[ ] Phase 4b: Admin Curation UI
[ ] Phase 4c: Watchlists + Saved Searches
[ ] Phase 5: Additional Sources + User Submissions
[ ] Phase 6: Time-Series Visualization + Comparison View
[ ] Phase 7: Email Alerts + Export + News Aggregation
[ ] Phase 8: SEO + Sector Dashboards + Launch Readiness
```

**Overall:** 0 / 10 phase-tracks complete (0%)

## Performance Metrics

- **Phases planned**: 0 / 10
- **Plans executed**: 0
- **Requirements completed**: 0 / 81 (0%)
- **Validated requirements**: 0
- **Checkpoints fired**: 0

## Accumulated Context

### Key Decisions (carried from PROJECT.md + research)

1. **No THE VC scraping — ever.** ToS prohibits, jurisprudence supports DB-rights claims (잡코리아 vs 사람인, 야놀자 vs 여기어때). Build round dataset from DART + press releases + K-Startup + per-VC portfolios + user submissions. Codified as CI grep-block in Phase 4a.
2. **Provenance is a Phase 1 schema concern, not a UI patch.** `source_id NOT NULL` on every fact-bearing row; `data_sources` table foundational.
3. **Korean tokenization = app-side morpheme tokens (mecab-ko/KoNLPy in Python ETL) + GIN trigram index.** Avoid `pg_cjk_parser` unless verified on Supabase managed plan.
4. **Postgres-first search behind `lib/search/adapter.ts`.** Meilisearch deferred until D1 trigger fires (>50k records OR p95 >800ms).
5. **ETL outside Vercel.** Python on Fly.io triggered by GitHub Actions cron — never Vercel cron, never Vercel functions for scrapers.
6. **Identity-aware from day 1.** `aliases`, `company_relations`, `company_identifiers` tables in Phase 1.
7. **Currency = `(amount_minor BIGINT, currency_code CHAR(3), original_text TEXT)` triple.** Normalized to USD at ETL with historical FX.
8. **i18n scaffolded from Phase 1.** All strings via `t()`; `ko.json` populated, `en.json` stub.
9. **Audit log + soft-delete from Phase 1.** Append-only trigger on every canonical write enables admin rollback in Phase 4b.
10. **PIPA + DSAR live before any public exposure.** Privacy policy + `/contact/dsar` endpoint in Phase 1.

### Open Questions (resolve at planning time of relevant phase)

- **Phase 1**: Kakao Business app registration timeline; Supabase managed plan extension permissions (`pg_cjk_parser` availability).
- **Phase 3**: Korean morphological analyzer choice — KoNLPy vs mecab-ko vs KOMORAN vs Khaiii (benchmark on representative startup-name corpus).
- **Phase 4a**: DART API key tier (personal 10k/day vs institutional unlimited); HWP/HWPX parsing strategy for 사업보고서 attachments.
- **Phase 5**: Per-VC robots.txt + ToS legal review checklist; THE VC partnership outreach status (defer if no response).
- **Phase 7**: SimilarWeb pricing reality (deferred to v2 unless cheap).
- **Phase 8**: Original-summary generation strategy (template vs LLM-with-validation).

### Active Todos

(None — awaiting Phase 1 planning)

### Blockers

(None)

### Pitfalls Watchlist (cross-phase)

| Pitfall | First Surfaced | Status |
|---------|----------------|--------|
| 1. THE VC scraping | Phase 1 (policy) | Codified — no scraping permitted ever |
| 2. Stale data trust collapse | Phase 1 (schema) + Phase 2 (UI) | Pending — `last_verified_at` schema in Phase 1 |
| 3. No per-fact provenance | Phase 1 (schema) | Pending — `data_sources` FK on every fact-bearing row |
| 4. Korean search broken | Phase 3 (build) | Pending — app-side morpheme tokens + alias table |
| 5. Currency confusion | Phase 1 (schema) | Pending — triple-format mandated |
| 6. DART parsing complexity | Phase 4a (ETL) | Pending — OpenDartReader adoption planned |
| 7. PIPA/GDPR exposure | Phase 1 (compliance) | Pending — DSAR + privacy policy required |
| 8. Entity resolution | Phase 1 (schema) + Phase 4a (matcher) | Pending — alias + relation tables |
| 9. Faceted search degradation | Phase 1 (indexes) + Phase 3 (queries) | Pending — GIN index strategy required |
| 10. SEO thin content | Phase 8 (launch) | Pending — noindex threshold + JSON-LD |
| 11. Supabase free-tier wall | Phase 1 (storage budget) | Pending — monitoring + heartbeat |
| 12. Vercel commercial use | Phase 8 (launch) | Pending — Pro upgrade gated |
| 13. Premium gating backfire | (v2 only) | Documented in PROJECT.md key decisions |
| 14. Admin/curation neglect | Phase 4b (UI) | Pending — first-class admin app |
| 15. Cold-start chicken-egg | Phase 8 (launch gate) | Pending — ≥5k seed required |
| 16. Time-series chart traps | Phase 6 (visualization) | Pending — gap-as-break + log toggle + unit validation |

## Session Continuity

- **Last session**: 2026-04-20 — `/gsd-discuss-phase 1` completed. User deferred all 4 surfaced grey areas ("알아서 진행해"); Claude wrote `.planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md` capturing 37 locked decisions across Auth/Env/RLS/PIPA/i18n/UI domains, plus `01-DISCUSSION-LOG.md` audit trail.
- **Next session**: Run `/gsd-plan-phase 1` to produce PLAN.md with task decomposition.
- **Resume command**: `/gsd-plan-phase 1`

---
*State initialized: 2026-04-20 after roadmap creation*
*Updated: 2026-04-20 after Phase 1 discuss-phase (context captured)*
