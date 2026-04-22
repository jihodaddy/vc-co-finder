#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Synthetic data generator for Phase 3 load testing (Plan 07 Task 1).
 *
 * Marker: slug LIKE 'synth-%' → counterpart cleanup via purge-synthetic.ts.
 * Distributions per 03-RESEARCH.md §Pitfall 4 + 03-07-PLAN.md <interfaces>.
 *
 * Usage:
 *   npx tsx scripts/search/generate-synthetic.ts [count=5000]
 *   npm run synth:gen
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY   (RLS-bypass writes against canonical tables)
 * Both loaded from .env.local at import time.
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local first (dev credentials), then fall back to .env.
loadEnv({ path: '.env.local' });

/** Fixed UUID seeded by supabase/migrations/0003_data_sources.sql. */
const MANUAL_SOURCE_ID = '00000000-0000-0000-0000-000000000001';
const TARGET = Number(process.argv[2] ?? 5000);
const BATCH = 500;

const SECTORS = [
  '핀테크',
  'AI',
  '커머스',
  '헬스케어',
  '모빌리티',
  '프롭테크',
  '에듀테크',
  '푸드테크',
  '인슈어테크',
  '게임',
  '콘텐츠',
  'SaaS',
  'B2B',
  'O2O',
  '바이오',
  '로봇',
  '팹리스',
  '블록체인',
  'ESG',
  '기타',
];

// Weighted toward seed/series_a/series_b (realistic distribution).
// Only uses valid funding_stage enum values per supabase/migrations/0002_enums.sql.
const STAGES = [
  'pre_a',
  'seed',
  'seed',
  'seed',
  'series_a',
  'series_a',
  'series_a',
  'series_b',
  'series_b',
  'series_c',
  'series_d',
  'bridge',
  'safe',
  'convertible_note',
  'grant',
  'undisclosed',
] as const;

const ALIAS_TYPES = ['legal', 'brand', 'english', 'former', 'common'] as const;

const REGIONS_ADDR: Array<[string, number]> = [
  ['서울특별시 강남구 테헤란로 152', 65],
  ['경기도 성남시 분당구 판교역로 235', 20],
  ['부산광역시 해운대구 센텀동로 71', 5],
  ['대구광역시 수성구 동대구로 465', 3],
  ['인천광역시 연수구 송도과학로 32', 3],
  ['광주광역시 북구 첨단과기로 123', 2],
  ['대전광역시 유성구 대학로 291', 2],
];

function pickWeighted<T>(pairs: Array<[T, number]>): T {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of pairs) {
    r -= w;
    if (r <= 0) return v;
  }
  return pairs[0][0];
}

function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Power-law KRW minor amount: median ~10억원, max ~5조원. */
function powerLawAmountMinor(): bigint {
  const p = Math.pow(Math.random(), 2.2);
  return BigInt(Math.floor(p * 5_000_000_000_000 + 100_000_000));
}

/** Log-normal headcount: median ~50, max ~10,000. */
function logNormalEmployees(): number {
  // Math.pow(random, 2) shape gives heavy right tail; scale to [1, 10000].
  const u = Math.pow(Math.random(), 2);
  return Math.max(1, Math.floor(u * 10_000 + 1));
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required but not set');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required but not set');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const supa = createAdminClient();

  // Safety: confirm manual data_source row exists.
  const { data: src, error: srcErr } = await supa
    .from('data_sources')
    .select('id')
    .eq('id', MANUAL_SOURCE_ID)
    .maybeSingle();
  if (srcErr) throw new Error(`[synth] data_sources lookup failed: ${srcErr.message}`);
  if (!src) {
    throw new Error(
      `[synth] manual_curation data_source (${MANUAL_SOURCE_ID}) missing — run migrations first`,
    );
  }

  console.log(`[synth] generating ${TARGET} synthetic companies (BATCH=${BATCH})`);

  // ---- 1. Companies upsert (batched) -------------------------------------
  let inserted = 0;
  for (let batchStart = 0; batchStart < TARGET; batchStart += BATCH) {
    const end = Math.min(batchStart + BATCH, TARGET);
    const rows = [];
    for (let i = batchStart; i < end; i++) {
      const foundedYear = randInt(1990, 2025);
      rows.push({
        slug: `synth-${String(i).padStart(5, '0')}`,
        display_name_ko: `합성기업${i}`,
        display_name_en: `Synthetic Co ${i}`,
        legal_name: `주식회사 합성${i}`,
        sector: pickOne(SECTORS),
        region: 'KR',
        status: 'alive' as const, // company_status enum: 'alive' | 'dead' | 'acquired' | 'ipo'
        hq_address: pickWeighted(REGIONS_ADDR),
        founded_at: `${foundedYear}-01-01`,
        description_ko: `합성 회사 ${i} — 로드 테스트 전용`,
        website_url: null,
        logo_url: null,
        source_id: MANUAL_SOURCE_ID,
      });
    }
    const { error } = await supa.from('companies').upsert(rows, { onConflict: 'slug' });
    if (error) {
      console.error('[synth] companies upsert error:', error);
      process.exit(2);
    }
    inserted += rows.length;
    process.stdout.write(`[synth] companies ${inserted}/${TARGET}\r`);
  }
  console.log(`\n[synth] companies done (${inserted} rows)`);

  // ---- 2. Fetch ids of all synth companies for child-row insertion -------
  // Supabase REST defaults to 1000-row page limit; paginate to cover TARGET.
  const byId: Array<{ id: string; slug: string }> = [];
  {
    const PAGE = 1000;
    let from = 0;
    while (from < TARGET + 1000) {
      const { data, error } = await supa
        .from('companies')
        .select('id, slug')
        .ilike('slug', 'synth-%')
        .order('slug', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`[synth] companies fetch error: ${error.message}`);
      if (!data || data.length === 0) break;
      byId.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  console.log(`[synth] fetched ${byId.length} synth company ids for child-row insertion`);

  // ---- 3. Funding rounds (0-3 per company) -------------------------------
  console.log(`[synth] generating funding rounds (0-3 per company)`);
  let fundingCount = 0;
  let fundingBatch: Array<Record<string, unknown>> = [];
  for (const c of byId) {
    const n = randInt(0, 3);
    for (let k = 0; k < n; k++) {
      fundingBatch.push({
        company_id: c.id,
        stage: pickOne(STAGES),
        amount_minor: powerLawAmountMinor().toString(),
        currency_code: 'KRW',
        announced_at: `${randInt(2015, 2025)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
        source_id: MANUAL_SOURCE_ID,
      });
      if (fundingBatch.length >= BATCH) {
        const { error } = await supa.from('funding_rounds').insert(fundingBatch);
        if (error) throw new Error(`[synth] funding_rounds insert: ${error.message}`);
        fundingCount += fundingBatch.length;
        process.stdout.write(`[synth] funding_rounds ${fundingCount}\r`);
        fundingBatch = [];
      }
    }
  }
  if (fundingBatch.length) {
    const { error } = await supa.from('funding_rounds').insert(fundingBatch);
    if (error) throw new Error(`[synth] funding_rounds final insert: ${error.message}`);
    fundingCount += fundingBatch.length;
  }
  console.log(`\n[synth] funding_rounds done (${fundingCount} rows)`);

  // ---- 4. Aliases (1 brand alias per company) ----------------------------
  console.log(`[synth] generating aliases (1 per company)`);
  let aliasCount = 0;
  let aliasBatch: Array<Record<string, unknown>> = [];
  for (const c of byId) {
    const num = c.slug.replace('synth-', '');
    aliasBatch.push({
      company_id: c.id,
      alias: `Brand${num}`,
      alias_type: pickOne(ALIAS_TYPES),
      source_id: MANUAL_SOURCE_ID,
    });
    if (aliasBatch.length >= BATCH) {
      const { error } = await supa.from('aliases').insert(aliasBatch);
      if (error) throw new Error(`[synth] aliases insert: ${error.message}`);
      aliasCount += aliasBatch.length;
      process.stdout.write(`[synth] aliases ${aliasCount}\r`);
      aliasBatch = [];
    }
  }
  if (aliasBatch.length) {
    const { error } = await supa.from('aliases').insert(aliasBatch);
    if (error) throw new Error(`[synth] aliases final insert: ${error.message}`);
    aliasCount += aliasBatch.length;
  }
  console.log(`\n[synth] aliases done (${aliasCount} rows)`);

  // ---- 5. Employees facts (~60% of companies) ----------------------------
  // Schema: company_facts has value_numeric NUMERIC + observed_at NOT NULL.
  // fn_refresh_company_search_fields reads value_numeric first for employees fact.
  console.log(`[synth] generating employees facts (~60% of companies)`);
  let factsCount = 0;
  let factsBatch: Array<Record<string, unknown>> = [];
  for (const c of byId) {
    if (Math.random() > 0.4) {
      factsBatch.push({
        company_id: c.id,
        fact_type: 'employees',
        value_numeric: logNormalEmployees(),
        observed_at: '2025-01-01',
        period_type: 'snapshot',
        source_id: MANUAL_SOURCE_ID,
      });
      if (factsBatch.length >= BATCH) {
        const { error } = await supa.from('company_facts').insert(factsBatch);
        if (error) throw new Error(`[synth] company_facts insert: ${error.message}`);
        factsCount += factsBatch.length;
        process.stdout.write(`[synth] facts ${factsCount}\r`);
        factsBatch = [];
      }
    }
  }
  if (factsBatch.length) {
    const { error } = await supa.from('company_facts').insert(factsBatch);
    if (error) throw new Error(`[synth] company_facts final insert: ${error.message}`);
    factsCount += factsBatch.length;
  }
  console.log(`\n[synth] facts done (${factsCount} rows)`);

  console.log(
    `[synth] DONE — ${inserted} companies / ${fundingCount} rounds / ${aliasCount} aliases / ${factsCount} facts`,
  );
}

main().catch((e) => {
  console.error('[synth] fatal:', e);
  process.exit(1);
});
