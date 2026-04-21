import 'server-only';

/**
 * Provenance metadata attached to every fact-bearing row read from the
 * canonical schema. Implements TRUST-03 ("source-attribution at the row
 * level") + the ARCHITECTURE.md "Provenance as First-Class" pattern.
 *
 * Phase 1 only ships these types and helpers. Phase 2's `lib/data/*` query
 * wrappers consume them after JOINing `data_sources`.
 */
export type SourceType =
  | 'dart'
  | 'manual'
  | 'user_submission'
  | 'press_release'
  | 'vc_portfolio'
  | 'news_mention'
  | 'kstartup';

export type SourceMeta = {
  /** PK of the corresponding `data_sources` row (UUID). */
  sourceId: string;
  /** Discriminator mirrored from `data_sources.source_type` ENUM (D-03.6). */
  sourceType: SourceType;
  /** Canonical URL of the source document, or null for manual entries. */
  sourceUrl: string | null;
  /** When the ETL pipeline (or curator) last fetched the row. ISO-8601. */
  fetchedAt: string;
  /**
   * When the fact was last verified against the source (TRUST-02). Distinct
   * from `updated_at` which only tracks DB write time. ISO-8601.
   */
  lastVerifiedAt: string;
  /**
   * Optional [0..1] confidence score from the matcher / curator. Null when
   * provenance is exact (e.g., DART filing). Phase 4a populates this.
   */
  confidence: number | null;
};

/**
 * Row decorated with its source metadata. Use in lib/data/* return types so
 * call sites get compile-time safety against forgetting to render provenance.
 */
export type WithMeta<T> = T & { _meta: SourceMeta };

/**
 * Wraps a single row with its provenance. Phase 2's data wrappers call this
 * after JOINing `data_sources` on the fact-bearing table.
 */
export function attachSource<T>(row: T, source: SourceMeta): WithMeta<T> {
  return { ...row, _meta: source };
}

/**
 * Convenience to attach the same source to a batch of rows. Use when one
 * query returns multiple rows that share a single source (e.g., all
 * `funding_rounds` from a single DART filing).
 */
export function attachSourceAll<T>(
  rows: T[],
  source: SourceMeta
): WithMeta<T>[] {
  return rows.map((r) => attachSource(r, source));
}
