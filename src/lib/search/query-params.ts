import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  parseAsInteger,
} from 'nuqs/server';
import { SORT_KEYS, VIEW_KEYS, PER_PAGE_KEYS } from './types';

/**
 * nuqs parser contract for the /search route — shared by server RSC
 * (`searchParamsCache.parse(await searchParams)`) and client components
 * (`useQueryStates(searchParsers)`).
 *
 * URL encoding (UI-SPEC §URL state encoding, mirrors ROADMAP SC #1 example):
 *   - Multi-select facets: comma-separated, single URL param:
 *       `?sectors=fintech,ai&stage=series_a,series_b&region=KR`
 *   - Ranges: `-` separator, stored as a single string param; adapter parses
 *     the "min-max" halves. Open-ended ranges allowed (`50-` or `-500`):
 *       `?employees=50-500` · `?funding=10000000000-` · `?founded=-2020`
 *   - Single-select: literal allowlist (sort / view / per_page). Unknown
 *     values are rejected by `parseAsStringLiteral` → fall back to default.
 *   - Defaults omitted from URL to keep canonical share-links short
 *     (`sort=recent_funding_desc`, `view=table`, `page=1`, `per_page=25`).
 *
 * Security:
 *   - `parseAsStringLiteral(SORT_KEYS)` is the allowlist that protects
 *     ORDER BY from any user-supplied string (T-03-03-02).
 *   - `q` is free-text — the adapter clamps to 100 chars (T-03-03-03).
 *   - `parseAsArrayOf` caps length implicitly via browser URL byte budget
 *     (~8KB) — the adapter also treats cardinality 0 as "no filter".
 *
 * Sources:
 *   - RESEARCH §Pattern 1 (createSearchParamsCache verbatim)
 *   - UI-SPEC §URL state encoding (default values + separators)
 *   - CONTEXT D-04..D-09 (facet + sort + view + pagination defaults)
 */
export const searchParsers = {
  q: parseAsString.withDefault(''),
  sectors: parseAsArrayOf(parseAsString, ',').withDefault([]),
  stage: parseAsArrayOf(parseAsString, ',').withDefault([]),
  region: parseAsArrayOf(parseAsString, ',').withDefault([]),
  employees: parseAsString.withDefault(''),
  funding: parseAsString.withDefault(''),
  founded: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(SORT_KEYS).withDefault('recent_funding_desc'),
  view: parseAsStringLiteral(VIEW_KEYS).withDefault('table'),
  page: parseAsInteger.withDefault(1),
  per_page: parseAsStringLiteral(PER_PAGE_KEYS).withDefault('25'),
} as const;

/**
 * Server-side cache: Plan 05's /search page calls
 *   `await searchParamsCache.parse(await searchParams)`
 * inside the Server Component to convert untyped URL state into a typed
 * record. This is also the single-parse path for `generateMetadata`.
 */
export const searchParamsCache = createSearchParamsCache(searchParsers);
