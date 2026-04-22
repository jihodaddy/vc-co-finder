/**
 * Phase 3 success-criteria harness — Wave 5 live assertions.
 *
 * Wave 0 (Plan 01) seeded this file with 20 `it.todo(...)` stubs mapped to
 * ROADMAP §Phase 3 Success Criteria #1..#6. Plan 06 (this file) flips
 * ≥12 of those stubs into live assertions — the remaining ~8 `it.todo`
 * entries are deferred to Plan 07 (load test + SRCH-13 full regression
 * + 375px mobile human-verify).
 *
 * Runtime split:
 * - **HTTP assertions** (SC #1, SC #2, SC #5) require `npm run dev` on
 *   http://localhost:3000 (or whatever SMOKE_BASE_URL points at) with a
 *   seeded DB. Run via:
 *     SMOKE_BASE_URL=http://localhost:3000 npm run test:smoke
 *   (NOT `BASE_URL` — Vite/Vitest injects BASE_URL='/' into process.env,
 *   which would break fetch; Phase 2 learning codified.)
 * - **Filesystem assertions** (SC #6 adapter abstraction) run on any
 *   platform without a dev server. These MUST be cross-platform portable:
 *   no shell utilities (grep / sed / awk) invoked via execSync, no shell
 *   stderr redirections, no short-circuit shell-logic operators. Windows
 *   11 cmd.exe has none of those. We use Node `fs/promises` + a manual
 *   walker (`filesImporting`) instead — T-03-06-05 mitigation.
 *
 * Pattern mirrors tests/smoke/phase2-success-criteria.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// Dead-referenced so vitest/ts don't prune the env-var read.
export const SMOKE_BASE_URL =
  process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';

/**
 * Cross-platform file walker — scans `.ts`/`.tsx` files under each root
 * directory and returns a list of absolute paths whose contents include
 * `pattern` as a substring. Used by SC #6 to enforce the adapter
 * abstraction boundary without invoking shell grep.
 *
 * Windows 11 dev hosts have no grep by default (cmd.exe), so this walker
 * is the portability guarantee. Directories that don't exist are treated
 * as zero hits rather than errors — supports fresh clones.
 */
async function filesImporting(
  pattern: string,
  roots: string[],
): Promise<string[]> {
  const hits: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      // Directory missing is OK — treat as zero hits.
      return;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (/\.(ts|tsx)$/.test(e.name)) {
        const src = await readFile(full, 'utf8');
        if (src.includes(pattern)) hits.push(full);
      }
    }
  }
  for (const r of roots) await walk(r);
  return hits;
}

/**
 * Extract the first N-character unsigned integer immediately preceding
 * the literal `개 기업`. Returns null when the count isn't rendered yet
 * (e.g., loading fallback caught the page). Accepts both bare digits and
 * Intl-grouped numbers (`1,247개 기업`) — the regex strips commas.
 */
function extractCount(html: string): number | null {
  const m = html.match(/([\d,]+)개 기업/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// SC #1 — multi-facet application renders live count
// (4 live assertions; HTTP-dependent)
// ---------------------------------------------------------------------------

describe('Phase 3 SC #1 — multi-facet application renders live count', () => {
  it('GET /ko/search returns 200', async () => {
    const res = await fetch(`${SMOKE_BASE_URL}/ko/search`);
    expect(res.status).toBe(200);
  });

  it('HTML contains count rendered as "{n}개 기업"', async () => {
    const res = await fetch(`${SMOKE_BASE_URL}/ko/search`);
    const html = await res.text();
    expect(html).toMatch(/[\d,]+개 기업/);
  });

  it('sidebar HTML contains all 6 facet labels', async () => {
    const res = await fetch(`${SMOKE_BASE_URL}/ko/search`);
    const html = await res.text();
    expect(html).toContain('섹터');
    expect(html).toContain('라운드 단계');
    expect(html).toContain('지역');
    expect(html).toContain('직원 수');
    expect(html).toContain('누적 투자액');
    expect(html).toContain('설립 연도');
  });

  it('filtering ?sectors=fintech yields a count ≤ the unfiltered count', async () => {
    const [unfilteredRes, filteredRes] = await Promise.all([
      fetch(`${SMOKE_BASE_URL}/ko/search`),
      fetch(`${SMOKE_BASE_URL}/ko/search?sectors=fintech`),
    ]);
    const unfiltered = await unfilteredRes.text();
    const filtered = await filteredRes.text();
    const countUnf = extractCount(unfiltered);
    const countFil = extractCount(filtered);
    // Both should render a number; filtered can never exceed unfiltered.
    expect(countUnf).not.toBeNull();
    expect(countFil).not.toBeNull();
    expect(countFil!).toBeLessThanOrEqual(countUnf!);
  });
});

// ---------------------------------------------------------------------------
// SC #2 — URL state shareable
// (2 live assertions; HTTP-dependent)
// ---------------------------------------------------------------------------

describe('Phase 3 SC #2 — URL state shareable', () => {
  it('full-shape share URL returns 200 and renders card-grid container-query class', async () => {
    const url =
      '/ko/search?sectors=fintech,ai&sort=name_asc&view=card&page=1&per_page=25';
    const res = await fetch(`${SMOKE_BASE_URL}${url}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    // view=card commits a container-query grid class; if we're on the
    // table view the grid class won't appear.
    expect(html).toMatch(/@sm:grid-cols-2|grid-cols-2/);
  });

  it('past-end ?page=999 returns 200 and renders empty-state heading "0개 기업"', async () => {
    const res = await fetch(`${SMOKE_BASE_URL}/ko/search?page=999`);
    expect(res.status).toBe(200);
    const html = await res.text();
    // Empty-state heading from UI-SPEC §Copywriting Contract.
    expect(html).toContain('0개 기업');
  });
});

// ---------------------------------------------------------------------------
// SC #5 — sort + view + pagination
// (3 live assertions; HTTP-dependent)
// ---------------------------------------------------------------------------

describe('Phase 3 SC #5 — sort + view + pagination', () => {
  it('?view=card renders a card-grid class (@sm:grid-cols-2 or similar)', async () => {
    const res = await fetch(`${SMOKE_BASE_URL}/ko/search?view=card`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/@sm:grid-cols-2|grid-cols-2/);
  });

  it('?per_page=50 HTML reflects the selected per-page value', async () => {
    const res = await fetch(`${SMOKE_BASE_URL}/ko/search?per_page=50`);
    expect(res.status).toBe(200);
    const html = await res.text();
    // The Pagination per-page <Select> emits the current value somewhere
    // in the rendered markup (either as the trigger label "50" or as a
    // selected option). We accept any occurrence of the literal ">50<"
    // (the select trigger renders the number as its visible content).
    expect(html).toMatch(/>50</);
  });

  it('?sort=name_asc returns 200 and renders the sort-label copy', async () => {
    const res = await fetch(`${SMOKE_BASE_URL}/ko/search?sort=name_asc`);
    expect(res.status).toBe(200);
    const html = await res.text();
    // The sort trigger label reflects the selected sort's Korean copy
    // (from search.sort.name_asc → "이름 (가나다)"). This is the
    // non-alphabetical-order heuristic: because comparing actual row
    // positions of toss vs daangn requires a seeded DB with known
    // locale collation, asserting the label copy is a more stable
    // smoke signal.
    expect(html).toContain('이름 (가나다)');
  });
});

// ---------------------------------------------------------------------------
// SC #6 — lib/search/adapter.ts abstraction
// (3 live assertions; filesystem-only, platform-portable)
// ---------------------------------------------------------------------------

describe('Phase 3 SC #6 — lib/search/adapter.ts abstraction', () => {
  it('adapter.ts exports SearchAdapter interface and searchAdapter singleton', async () => {
    const src = await readFile('src/lib/search/adapter.ts', 'utf8');
    expect(src).toMatch(/export interface SearchAdapter/);
    expect(src).toMatch(/export const searchAdapter/);
  });

  it('no file under src/app or src/components imports @/lib/search/postgres directly', async () => {
    const hits = await filesImporting("'@/lib/search/postgres'", [
      'src/app',
      'src/components',
    ]);
    expect(hits).toEqual([]);
  });

  it('no file under src/lib/search or src/components/search imports @/lib/supabase/server (Pitfall #5)', async () => {
    // We match on the import-statement form (with surrounding quotes)
    // to avoid false positives from doc-comment mentions of the path.
    const hits = await filesImporting("'@/lib/supabase/server'", [
      'src/lib/search',
      'src/components/search',
    ]);
    expect(hits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Deferred to Plan 07 — preserved as `it.todo` stubs so the phase gate
// keeps the remaining acceptance surface visible.
// ---------------------------------------------------------------------------

describe('Phase 3 SC #3 — SRCH-13 Korean corpus (flipped in Plan 07 via tests/smoke/phase3-srch13.test.ts)', () => {
  it.todo('토스 autocomplete returns toss slug');
  it.todo('토스뱅크 autocomplete returns toss slug via alias');
  it.todo('비바리퍼블리카 autocomplete returns toss slug via legal alias');
  it.todo('당근 autocomplete returns daangn slug');
  it.todo('당근마켓 autocomplete returns daangn slug via former alias');
  it.todo('Coupang autocomplete returns coupang slug via display_name_en');
  it.todo('쿠팡 autocomplete returns coupang slug via display_name_ko');
});

describe('Phase 3 SC #4 — p95 < 1s on 5k synthetic rows (Plan 07)', () => {
  it.todo('load test harness exists at tests/load/phase3-load.ts');
  it.todo('load test reports p95 < 1000ms in tests/load/phase3-REPORT.md');
});
