/**
 * Phase 3 success-criteria harness — Wave 0 scaffolding.
 *
 * Every `it.todo(...)` entry below maps to a row in
 * .planning/phases/03-faceted-search-postgres-path/03-VALIDATION.md
 * §Per-Task Verification Map, grouped by ROADMAP §Phase 3 Success
 * Criteria #1..#6. Later waves will flip each todo to a live assertion:
 *
 * - Plan 05 (route + integration) flips SC #1, #2, #5.
 * - Plan 07 (load + regression) flips SC #3 (SRCH-13) + #4 (p95).
 * - Plan 03 (adapter lib) satisfies SC #6 structurally.
 *
 * Pattern mirrors tests/smoke/phase2-success-criteria.test.ts:
 * - Uses SMOKE_BASE_URL env var (NOT BASE_URL; vite injects BASE_URL='/').
 * - Lives in tests/smoke so `npm run test:smoke` picks it up.
 * - Requires `npm run dev` running in another terminal once todos are live.
 *
 * Invariant enforced by Plan 03-01 acceptance criteria: ≥20 it.todo calls.
 */
import { describe, it } from 'vitest';

// Dead-referenced so vitest/ts don't prune the env-var read; mirrors
// Phase 2's convention (tests/smoke/phase2-success-criteria.test.ts line 172).
export const SMOKE_BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';

describe('Phase 3 SC #1 — multi-facet application renders live count', () => {
  it.todo('GET /ko/search?sectors=fintech,ai&stage=series_a returns 200');
  it.todo('response contains "{count}개 기업" formatted count');
  it.todo('chip bar contains chip per active facet value');
  it.todo('"모두 지우기" link is present when activeFilterCount > 0');
});

describe('Phase 3 SC #2 — URL state shareable', () => {
  it.todo('page A URL copied into new tab restores identical chip state');
  it.todo('default sort omitted from URL when recent_funding_desc');
  it.todo('page=1 omitted from URL');
});

describe('Phase 3 SC #3 — SRCH-13 Korean corpus', () => {
  it.todo('토스 autocomplete returns toss slug');
  it.todo('토스뱅크 autocomplete returns toss slug via alias');
  it.todo('비바리퍼블리카 autocomplete returns toss slug via legal alias');
  it.todo('당근 autocomplete returns daangn slug');
  it.todo('당근마켓 autocomplete returns daangn slug via former alias');
  it.todo('Coupang autocomplete returns coupang slug via display_name_en');
  it.todo('쿠팡 autocomplete returns coupang slug via display_name_ko');
});

describe('Phase 3 SC #4 — p95 < 1s on 5k synthetic rows', () => {
  it.todo('load test harness exists at tests/load/phase3-load.ts');
  it.todo('load test reports p95 < 1000ms in tests/load/phase3-REPORT.md');
});

describe('Phase 3 SC #5 — sort + view toggle', () => {
  it.todo('?sort=name_asc orders results by display_name_ko');
  it.todo('?view=card renders card grid; default ?view=table renders table');
  it.todo('?page=2&per_page=25 returns page-2 slice');
});

describe('Phase 3 SC #6 — lib/search/adapter.ts abstraction', () => {
  it.todo('lib/search/adapter.ts exports SearchAdapter interface');
  it.todo('lib/search/postgres.ts implements SearchAdapter');
  it.todo('no route handler imports @supabase directly for search');
});
