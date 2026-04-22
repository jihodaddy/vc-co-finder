/**
 * Phase 3 Plan 02 — Trigger sanity.
 *
 * Proves fn_refresh_company_search_fields fires on AFTER INSERT / UPDATE on
 * public.aliases, which is the load-bearing trigger for search_doc currency.
 *
 * Flow:
 *   1. Read current toss.search_doc (baseline).
 *   2. Insert a uniquely-named probe alias under toss via service-role client
 *      (anon cannot INSERT due to RLS canonical_no_insert).
 *   3. Re-read toss.search_doc → probe must appear (trigger fired, refresh
 *      function aggregated the new alias).
 *   4. Soft-delete the probe (deleted_at = now()) — aliases UPDATE also fires
 *      the trigger, and the refresh function filters `deleted_at IS NULL`, so
 *      search_doc must no longer contain the probe.
 *
 * Skipped if SUPABASE_SERVICE_ROLE_KEY is absent (CI may not ship the key).
 *
 * NOTE on data_sources handoff (deviation from plan Task 3 sample code):
 *   The plan snippet referenced `.eq('slug', 'manual_curation')` on
 *   data_sources, but that table has no `slug` column. Migration 0003 seeds a
 *   fixed row with id '00000000-0000-0000-0000-000000000001' and
 *   source_type='manual' — we use that UUID directly, which matches the
 *   Phase 2 seed contract.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeOrSkip = SUPABASE_URL && SERVICE_KEY ? describe : describe.skip;

// Fixed UUID seeded by migration 0003 for internal/manual curation rows.
const MANUAL_SOURCE_ID = '00000000-0000-0000-0000-000000000001';

describeOrSkip('Trigger sanity — refresh fires on alias INSERT then revert', () => {
  let svc: SupabaseClient;

  beforeAll(() => {
    svc = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('search_doc updates when an alias is inserted, then reverts on soft-delete', async () => {
    // 1. Baseline.
    const { data: pre, error: preErr } = await svc
      .from('companies')
      .select('id, search_doc')
      .eq('slug', 'toss')
      .single();
    expect(preErr).toBeNull();
    expect(pre).toBeTruthy();
    const probe = '테스트알리아스' + Date.now();

    // 2. Insert probe alias.
    const { data: ins, error: insErr } = await svc
      .from('aliases')
      .insert({
        company_id: pre!.id,
        alias: probe,
        alias_type: 'common',
        source_id: MANUAL_SOURCE_ID,
      })
      .select('id')
      .single();
    expect(insErr).toBeNull();
    expect(ins?.id).toBeTruthy();

    try {
      // 3. Verify search_doc now includes probe.
      const { data: mid, error: midErr } = await svc
        .from('companies')
        .select('search_doc')
        .eq('slug', 'toss')
        .single();
      expect(midErr).toBeNull();
      expect(mid!.search_doc).toContain(probe);

      // 4. Soft-delete probe.
      const { error: delErr } = await svc
        .from('aliases')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', ins!.id);
      expect(delErr).toBeNull();

      // 5. Verify search_doc reverted (alias row is now deleted_at NOT NULL;
      //    refresh function filters deleted_at IS NULL so the probe drops out).
      const { data: post, error: postErr } = await svc
        .from('companies')
        .select('search_doc')
        .eq('slug', 'toss')
        .single();
      expect(postErr).toBeNull();
      expect(post!.search_doc ?? '').not.toContain(probe);
    } finally {
      // Best-effort cleanup — hard-delete the probe row to avoid growing aliases.
      // Ignored on failure (audit_log will have already recorded it).
      await svc.from('aliases').delete().eq('id', ins!.id);
    }
  }, 20_000);
});
