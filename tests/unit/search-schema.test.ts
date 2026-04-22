/**
 * Phase 3 Plan 02 — Migration 0017 schema sanity (SRCH-12 + SRCH-05).
 *
 * Runs against the live Supabase DB pointed to by the .env.local credentials
 * (same credentials used by scripts/seed/_push_migrations.cjs). Verifies:
 *
 *   1. pgroonga extension is enabled.
 *   2. The seven denormalized columns exist on public.companies
 *      (cumulative_funding_minor, latest_round_stage, latest_round_announced_at,
 *       employees_latest, founded_year, hq_region, search_doc).
 *   3. The backfill populated search_doc for all 15 Phase 2 seeded companies.
 *   4. search_doc for toss contains the legal-alias '비바리퍼블리카' — proves the
 *      refresh function aggregates aliases correctly.
 *   5. pgroonga GIN indexes + partial B-tree indexes exist with the expected
 *      predicates (WHERE deleted_at IS NULL).
 *
 * Uses:
 *   - A pg client (DATABASE_URL) for pg_catalog / pg_extension / pg_indexes
 *     meta-queries that the PostgREST anon endpoint can't reach.
 *   - The cookie-free anon Supabase JS client to prove that RLS-gated anon
 *     SELECT reaches the new columns (matches production read path in Plan 03).
 *
 * Whole file is skipped at `describe.skip` time if DATABASE_URL is missing,
 * so CI environments without DB credentials remain green without flagging the
 * test as failing.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const describeOrSkip = DATABASE_URL && SUPABASE_URL && SUPABASE_ANON_KEY ? describe : describe.skip;

function parseUrl(raw: string) {
  const m = raw.match(/^postgres(?:ql)?:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/([^?]+)(\?.*)?$/);
  if (!m) throw new Error('DATABASE_URL parse failed');
  const [, user, password, host, port, database] = m;
  return { user, password: decodeURIComponent(password), host, port: Number(port), database };
}

describeOrSkip('Migration 0017 — schema sanity (SRCH-12)', () => {
  let pg: PgClient;
  const anon = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  beforeAll(async () => {
    const cfg = parseUrl(DATABASE_URL!.replace(/^"(.*)"$/, '$1'));
    pg = new PgClient({ ...cfg, ssl: { rejectUnauthorized: false } });
    await pg.connect();
  }, 20_000);

  afterAll(async () => {
    if (pg) await pg.end();
  });

  it('pgroonga extension is enabled', async () => {
    const { rows } = await pg.query<{ extname: string }>(
      "SELECT extname FROM pg_extension WHERE extname = 'pgroonga'"
    );
    expect(rows.length).toBe(1);
    expect(rows[0].extname).toBe('pgroonga');
  });

  it('companies has all 7 denormalized columns from migration 0017', async () => {
    const { rows } = await pg.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'companies'
           AND column_name IN (
             'cumulative_funding_minor','latest_round_stage','latest_round_announced_at',
             'employees_latest','founded_year','hq_region','search_doc'
           )`
    );
    const names = rows.map((r) => r.column_name).sort();
    expect(names).toEqual([
      'cumulative_funding_minor',
      'employees_latest',
      'founded_year',
      'hq_region',
      'latest_round_announced_at',
      'latest_round_stage',
      'search_doc',
    ]);
  });

  it('pgroonga GIN indexes exist on companies.search_doc and aliases.alias', async () => {
    const { rows } = await pg.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname IN ('ix_companies_search_doc_pgroonga', 'ix_aliases_alias_pgroonga')`
    );
    expect(rows.length).toBe(2);
    for (const r of rows) {
      expect(r.indexdef.toLowerCase()).toContain('using pgroonga');
      expect(r.indexdef).toMatch(/WHERE \(deleted_at IS NULL\)/i);
    }
  });

  it('composite + partial B-tree facet indexes exist with deleted_at IS NULL predicate', async () => {
    const expected = [
      'ix_companies_sector_stage_funding',
      'ix_companies_latest_round_announced',
      'ix_companies_cumulative_funding',
      'ix_companies_founded_year',
      'ix_companies_hq_region',
      'ix_companies_employees_latest',
    ];
    const { rows } = await pg.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname = ANY($1::text[])`,
      [expected]
    );
    const found = rows.map((r) => r.indexname).sort();
    expect(found).toEqual([...expected].sort());
    for (const r of rows) {
      // Postgres normalizes multi-predicate partial indexes as
      // `WHERE ((deleted_at IS NULL) AND (...))`, and single-predicate as
      // `WHERE (deleted_at IS NULL)`. Match both shapes.
      expect(r.indexdef).toMatch(/WHERE \(\(?deleted_at IS NULL\)?/i);
    }
  });

  it('refresh function and 3 triggers exist', async () => {
    const fn = await pg.query<{ proname: string }>(
      "SELECT proname FROM pg_proc WHERE proname = 'fn_refresh_company_search_fields'"
    );
    expect(fn.rows.length).toBe(1);

    const triggers = await pg.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger
         WHERE tgname IN (
           'trg_search_refresh_funding_rounds',
           'trg_search_refresh_aliases',
           'trg_search_refresh_company_facts'
         )`
    );
    expect(triggers.rows.map((r) => r.tgname).sort()).toEqual([
      'trg_search_refresh_aliases',
      'trg_search_refresh_company_facts',
      'trg_search_refresh_funding_rounds',
    ]);
  });

  it('companies.search_doc is populated for every non-deleted seeded company', async () => {
    const { data, error } = await anon
      .from('companies')
      .select('slug, search_doc')
      .is('deleted_at', null);
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThanOrEqual(15);
    for (const row of data!) {
      expect(typeof row.search_doc).toBe('string');
      expect((row.search_doc ?? '').length).toBeGreaterThan(0);
    }
  });

  it('denormalized scalar columns readable via anon client for core SRCH-13 set', async () => {
    const { data, error } = await anon
      .from('companies')
      .select(
        'slug, cumulative_funding_minor, latest_round_stage, latest_round_announced_at, founded_year, hq_region'
      )
      .in('slug', ['toss', 'daangn', 'coupang', 'baemin']);
    expect(error).toBeNull();
    expect(data!.length).toBe(4);
    // At least 2 of 4 must have a founded_year (generated column from founded_at).
    const withYear = data!.filter((r) => r.founded_year !== null);
    expect(withYear.length).toBeGreaterThanOrEqual(2);
  });

  it('toss search_doc contains legal-alias 비바리퍼블리카 (trigger aggregated aliases)', async () => {
    const { data, error } = await anon
      .from('companies')
      .select('search_doc')
      .eq('slug', 'toss')
      .single();
    expect(error).toBeNull();
    expect(data!.search_doc).toMatch(/비바리퍼블리카/);
  });
});
