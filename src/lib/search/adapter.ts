import 'server-only';
import type {
  SearchQuery,
  SearchResult,
  AutocompleteQuery,
  AutocompleteHit,
} from './types';
import { postgresAdapter } from './postgres';

/**
 * SRCH-11 — thin abstraction over the search backend.
 *
 * Replace only `./postgres.ts` with `./meilisearch.ts` to swap implementations
 * in v2 (RESEARCH Assumption A4). No other consumer needs to change because
 * they all import `searchAdapter` from this module.
 *
 * Contract kept intentionally small (two methods) to maximize swap parity.
 * Zero SQL, zero Supabase imports — see `./postgres.ts` for implementation.
 */
export interface SearchAdapter {
  search(query: SearchQuery): Promise<SearchResult>;
  autocomplete(query: AutocompleteQuery): Promise<AutocompleteHit[]>;
}

export const searchAdapter: SearchAdapter = postgresAdapter;
