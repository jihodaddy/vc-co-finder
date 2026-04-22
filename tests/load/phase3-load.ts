#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Phase 3 Load Test — SRCH-05 / ROADMAP SC #4 (Plan 07 Task 2).
 *
 * Runs 100 search queries against searchAdapter (authentic code path — no
 * mocks, no bypass) and records p50/p95/p99 latency. Assumes synthetic rows
 * are present; run `npm run synth:gen` first if the DB hasn't been seeded.
 *
 * Exit 0 if p95 < 1000ms.
 * Exit 1 if p95 ≥ 1000ms (Plan B remediation section rendered in REPORT.md).
 *
 * Usage: npm run test:load
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { writeFileSync } from 'node:fs';

// Load .env.local BEFORE importing the search adapter — postgres.ts reads
// DATABASE_URL at first-call time.
loadEnv({ path: '.env.local' });

import { searchAdapter } from '@/lib/search/adapter';
import { makeSearchQuery } from '../unit/search-fixtures';
import type { SearchQuery, SortKey } from '@/lib/search/types';

const SECTORS_POOL = ['핀테크', 'AI', '커머스', '헬스케어', '모빌리티'];
const STAGES_POOL = ['seed', 'series_a', 'series_b', 'series_c'];
const REGIONS_POOL = ['서울', '경기', '부산'];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * The fixture factory returns a shape wider than SearchQuery (employees is
 * a 3-variant union; sort is a plain string). The adapter accepts only the
 * strict SearchQuery. Narrow at the boundary.
 */
function toSearchQuery(raw: ReturnType<typeof makeSearchQuery>): SearchQuery {
  return raw as unknown as SearchQuery;
}

function buildQueryMix(): SearchQuery[] {
  const out: SearchQuery[] = [];
  // 20 single-facet (sector only)
  for (let i = 0; i < 20; i++) {
    out.push(toSearchQuery(makeSearchQuery({ sectors: [pick(SECTORS_POOL)] })));
  }
  // 30 3-facet combos
  for (let i = 0; i < 30; i++) {
    out.push(
      toSearchQuery(
        makeSearchQuery({
          sectors: [pick(SECTORS_POOL)],
          stage: [pick(STAGES_POOL)],
          region: [pick(REGIONS_POOL)],
        }),
      ),
    );
  }
  // 25 5-facet + sort variation
  const SORTS = ['name_asc', 'cumulative_funding_desc', 'founded_desc'] as const;
  for (let i = 0; i < 25; i++) {
    out.push(
      toSearchQuery(
        makeSearchQuery({
          sectors: [pick(SECTORS_POOL), pick(SECTORS_POOL)],
          stage: [pick(STAGES_POOL), pick(STAGES_POOL)],
          region: [pick(REGIONS_POOL)],
          sort: pick(SORTS) as SortKey,
        }),
      ),
    );
  }
  // 15 free-text q (SRCH13_CORPUS members + synthetic Brand prefix)
  const QS = ['토스', '당근', '쿠팡', '합성', 'Brand'];
  for (let i = 0; i < 15; i++) {
    out.push(toSearchQuery(makeSearchQuery({ q: pick(QS) })));
  }
  // 10 edge cases — pagination deep page + per_page=100
  for (let i = 0; i < 10; i++) {
    out.push(
      toSearchQuery(
        makeSearchQuery({
          page: 10 + Math.floor(Math.random() * 40),
          perPage: 100 as const,
        }),
      ),
    );
  }
  return out;
}

async function getDatasetSize(): Promise<{ alive: number; synth: number }> {
  const res = await searchAdapter.search(
    toSearchQuery(
      makeSearchQuery({
        page: 1,
        perPage: 25 as const,
      }),
    ),
  );
  const alive = res.total;
  const synthRes = await searchAdapter.search(
    toSearchQuery(makeSearchQuery({ q: 'Synthetic', page: 1, perPage: 25 as const })),
  );
  return { alive, synth: synthRes.total };
}

async function main() {
  const queries = buildQueryMix();
  const latencies: number[] = [];
  const errors: Array<{ idx: number; message: string }> = [];

  console.log(`[load] running ${queries.length} queries…`);
  const runStart = performance.now();
  for (let i = 0; i < queries.length; i++) {
    const start = performance.now();
    try {
      await searchAdapter.search(queries[i]);
    } catch (e) {
      errors.push({ idx: i, message: (e as Error).message });
    }
    const elapsed = performance.now() - start;
    latencies.push(elapsed);
    if ((i + 1) % 10 === 0) process.stdout.write(`[load] ${i + 1}/${queries.length}\r`);
  }
  const runTotal = performance.now() - runStart;
  console.log(`\n[load] run complete in ${(runTotal / 1000).toFixed(1)}s`);

  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  const p50 = p(0.5);
  const p95 = p(0.95);
  const p99 = p(0.99);
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;

  let datasetNote = '(dataset size lookup skipped — adapter error)';
  try {
    const ds = await getDatasetSize();
    datasetNote = `${ds.alive} alive companies (≈${ds.synth} synthetic, ≈${ds.alive - ds.synth} canonical/seed)`;
  } catch (e) {
    datasetNote = `(dataset size lookup failed: ${(e as Error).message})`;
  }

  const verdict = p95 < 1000 ? 'PASS' : 'FAIL';
  const passLine =
    verdict === 'PASS'
      ? '**PASSES** ROADMAP §Phase 3 SC #4 "p95 facet response time is <1s on a representative dataset".'
      : '**FAILS** ROADMAP §Phase 3 SC #4 "p95 facet response time is <1s on a representative dataset".';

  const planBSection =
    verdict === 'FAIL'
      ? `
## Plan B — Remediation (in-phase tuning only)

The p95 exceeded target. In-phase remediation is limited to Postgres tuning;
Meilisearch swap and concurrency testing are explicitly OUT OF SCOPE for
Phase 3 (see scope note below).

**In-phase (Plan 07 can execute):**

1. Run \`EXPLAIN ANALYZE\` on the single-query facet SQL (see 03-RESEARCH.md
   §Code Examples) for a representative 5-facet call. Look for
   \`Seq Scan on companies\` — migration 0017 added composite B-tree but may
   need additional index combination.
2. Verify \`VACUUM ANALYZE companies\` was run after synthetic data insertion
   (planner stats drift on bulk insert).
3. Check trigger cost: run
   \`SELECT * FROM pg_stat_user_functions WHERE funcname = 'fn_refresh_company_search_fields'\`
   — if per-call time > 50ms at 5k rows, batch refresh may be needed.
4. Recreate PGroonga indexes with explicit TokenNgram tokenizer (per
   03-RESEARCH.md Open Question 1 RESOLVED path) — drop + create, no new
   migration.
5. Add additional composite indexes for the specific filter combination that
   shows \`Seq Scan\` in EXPLAIN.

**Out of scope (triggers a NEW planning cycle, not an in-phase fix):**

- Meilisearch self-host swap per CLAUDE.md §Faceted Search Phased Strategy.
  If Postgres tuning (steps 1-5 above) is insufficient, the adapter swap
  (\`postgres.ts\` → \`meilisearch.ts\`) requires a new phase or gap-closure
  planning cycle — it is NOT user-approved in-phase remediation for Phase 3.
- Concurrency / high-RPS load testing (100+ concurrent users). Phase 3 SC #4
  targets p95 < 1s at sequential-query load on a representative dataset;
  multi-user stress testing is Phase 8 LAUNCH-05 scope.
`
      : `
## No remediation needed

p95 is within target. Phase 3 SC #4 is satisfied by this run.
`;

  const report = `# Phase 3 Load Test Report

**Run date:** ${new Date().toISOString()}
**Queries executed:** ${queries.length}
**Errors:** ${errors.length}
**Wall-clock duration:** ${(runTotal / 1000).toFixed(1)}s
**Dataset size:** ${datasetNote}

## Percentile latencies (searchAdapter.search, sequential)

| Metric | Value (ms) | Target | Verdict |
|--------|-----------|--------|---------|
| mean   | ${mean.toFixed(1)} | n/a | — |
| p50    | ${p50.toFixed(1)} | n/a | — |
| p95    | ${p95.toFixed(1)} | < 1000 | **${verdict}** |
| p99    | ${p99.toFixed(1)} | n/a | — |

## Query mix

| Share | Shape | Count |
|-------|-------|-------|
| 20%   | Single-facet (sector only) | 20 |
| 30%   | 3-facet combo (sector + stage + region) | 30 |
| 25%   | 5-facet combo + sort variation | 25 |
| 15%   | Free-text q (SRCH-13 corpus members + 'Brand' synthetic) | 15 |
| 10%   | Edge cases (deep pagination + per_page=100) | 10 |

## SC #4 Acceptance

${passLine}
${planBSection}
## Raw latency sample (first 20 of ${sorted.length}, sorted ascending)

${sorted.slice(0, 20).map((l) => l.toFixed(1)).join(', ')}
${errors.length > 0 ? `\n## Errors\n\n${errors.map((e) => `- query ${e.idx}: ${e.message}`).join('\n')}\n` : ''}
`;

  writeFileSync('tests/load/phase3-REPORT.md', report);
  console.log(`\n[load] wrote tests/load/phase3-REPORT.md — verdict: ${verdict}`);
  console.log(`[load] p50=${p50.toFixed(1)}ms  p95=${p95.toFixed(1)}ms  p99=${p99.toFixed(1)}ms`);

  if (verdict === 'FAIL') process.exit(1);
}

main().catch((e) => {
  console.error('[load] FATAL', e);
  process.exit(2);
});
