import { sql, type SQL } from 'drizzle-orm';
import { SORT_KEYS } from './types';

/**
 * Sort key → SQL fragment map (SRCH-08 + CONTEXT D-07/D-08).
 *
 * SECURITY (Threat T-03-03-02 mitigation): every value is a compile-time
 * literal created via drizzle-orm's `sql` tagged template with NO placeholder
 * interpolation. Keys come from the `SORT_KEYS` allowlist (enforced by
 * `parseAsStringLiteral(SORT_KEYS)` in query-params.ts). There is no runtime
 * string concatenation path — SQL injection via sort param is impossible.
 *
 * NULL handling: denormalized sort columns (latest_round_announced_at,
 * cumulative_funding_minor, founded_year) may be NULL for companies with
 * no rounds / undisclosed founding date. Always `NULLS LAST` on DESC.
 *
 * Column source of truth: supabase/migrations/0017_pgroonga_and_denormalized_columns.sql
 */
export const SORT_SQL: Record<(typeof SORT_KEYS)[number], SQL> = {
  recent_funding_desc: sql`latest_round_announced_at DESC NULLS LAST`,
  recent_funding_asc: sql`latest_round_announced_at ASC NULLS LAST`,
  name_asc: sql`display_name_ko ASC`,
  name_desc: sql`display_name_ko DESC`,
  cumulative_funding_desc: sql`cumulative_funding_minor DESC NULLS LAST`,
  cumulative_funding_asc: sql`cumulative_funding_minor ASC NULLS LAST`,
  founded_desc: sql`founded_year DESC NULLS LAST`,
  founded_asc: sql`founded_year ASC NULLS LAST`,
};
