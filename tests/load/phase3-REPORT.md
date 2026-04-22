# Phase 3 Load Test Report

**Run date:** 2026-04-22T08:00:51.228Z
**Queries executed:** 100
**Errors:** 0
**Wall-clock duration:** 32.5s
**Dataset size:** 5016 alive companies (≈5000 synthetic, ≈16 canonical/seed)

## Percentile latencies (searchAdapter.search, sequential)

| Metric | Value (ms) | Target | Verdict |
|--------|-----------|--------|---------|
| mean   | 324.8 | n/a | — |
| p50    | 294.5 | n/a | — |
| p95    | 416.5 | < 1000 | **PASS** |
| p99    | 2141.3 | n/a | — |

## Query mix

| Share | Shape | Count |
|-------|-------|-------|
| 20%   | Single-facet (sector only) | 20 |
| 30%   | 3-facet combo (sector + stage + region) | 30 |
| 25%   | 5-facet combo + sort variation | 25 |
| 15%   | Free-text q (SRCH-13 corpus members + 'Brand' synthetic) | 15 |
| 10%   | Edge cases (deep pagination + per_page=100) | 10 |

## SC #4 Acceptance

**PASSES** ROADMAP §Phase 3 SC #4 "p95 facet response time is <1s on a representative dataset".

## No remediation needed

p95 is within target. Phase 3 SC #4 is satisfied by this run.

## Raw latency sample (first 20 of 100, sorted ascending)

289.0, 289.4, 289.8, 289.9, 289.9, 290.0, 290.1, 290.3, 290.3, 290.4, 290.5, 290.6, 290.6, 291.0, 291.1, 291.2, 291.3, 291.3, 291.3, 291.4

