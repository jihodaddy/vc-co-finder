#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Idempotent purge of Phase 3 synthetic load-test data (Plan 07 Task 1).
 *
 * Criterion: public.companies.slug LIKE 'synth-%'.
 * Cascade order: children (funding_rounds / aliases / company_facts) first,
 * then parent rows in companies.
 *
 * Usage:
 *   npx tsx scripts/search/purge-synthetic.ts
 *   npm run synth:purge
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: '.env.local' });

const PAGE = 1000;

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

  // Paginate the id set (>1000 rows exceeds Supabase default page).
  const ids: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supa
      .from('companies')
      .select('id')
      .ilike('slug', 'synth-%')
      .order('slug', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`[purge] companies fetch: ${error.message}`);
    if (!data || data.length === 0) break;
    ids.push(...data.map((r) => r.id as string));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`[purge] found ${ids.length} synth companies`);
  if (ids.length === 0) {
    console.log('[purge] nothing to delete — done');
    return;
  }

  // Child-row deletes in chunks (.in() list URL length limit on REST calls).
  for (const table of ['funding_rounds', 'aliases', 'company_facts'] as const) {
    let deleted = 0;
    for (let i = 0; i < ids.length; i += PAGE) {
      const chunk = ids.slice(i, i + PAGE);
      const { error } = await supa.from(table).delete().in('company_id', chunk);
      if (error) console.error(`[purge] ${table} chunk error:`, error);
      else deleted += chunk.length;
    }
    console.log(`[purge] ${table}: scoped delete for ${deleted} company_ids`);
  }

  // Parent delete in chunks.
  let companyDeleted = 0;
  for (let i = 0; i < ids.length; i += PAGE) {
    const chunk = ids.slice(i, i + PAGE);
    const { error } = await supa.from('companies').delete().in('id', chunk);
    if (error) console.error('[purge] companies chunk error:', error);
    else companyDeleted += chunk.length;
  }
  console.log(`[purge] companies: deleted ${companyDeleted} rows`);
  console.log('[purge] done');
}

main().catch((e) => {
  console.error('[purge] fatal:', e);
  process.exit(1);
});
