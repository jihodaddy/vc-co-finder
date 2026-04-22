/* eslint-disable no-console */
import 'dotenv/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { usdToKrwMinor } from './fx';
import { companies as allCompanies } from './companies';
import type { SeedCompany, SeedFundingRound } from './types';

/**
 * Seed pipeline entry point for Phase 2 manual curation.
 *
 * - Pivots idempotency on `companies.slug` via UPSERT.
 * - Scopes child-row idempotency by `company_id` via delete-then-insert.
 * - Dedupes investors per (name_ko, source_id = MANUAL_SOURCE_ID).
 * - Converts USD → KRW at seed time (D-Discretion-2; no runtime FX calls).
 * - `DRY_RUN=1` prints intended writes without touching the DB.
 *
 * See Plan 02-05 RESEARCH §Pattern 7 for the algorithm.
 */

// Reserved UUID pre-seeded by supabase/migrations/0003_data_sources.sql.
const MANUAL_SOURCE_ID = '00000000-0000-0000-0000-000000000001';
const DRY_RUN = process.env.DRY_RUN === '1';

function logStep(s: string) {
  console.log(`[seed] ${s}`);
}

function normalizeFundingRound(r: SeedFundingRound): {
  amount_minor: bigint | null;
  currency_code: string | null;
  original_text: string | null;
} {
  // USD → KRW conversion at seed time (D-Discretion-2). Preserve original
  // string for researcher transparency.
  if (r.currency_code === 'USD' && r.amount_minor !== undefined && r.announced_at) {
    const year = Number(r.announced_at.slice(0, 4));
    // Interpret amount_minor as USD cents → convert to dollars → KRW minor.
    const usdCents = Number(r.amount_minor);
    const usdDollars = usdCents / 100;
    const krwMinor = usdToKrwMinor(usdDollars, year);
    return {
      amount_minor: krwMinor,
      currency_code: 'KRW',
      original_text: r.original_text ?? `$${usdDollars.toLocaleString('en-US')} @ ${year} BoK avg`,
    };
  }
  if (r.amount_minor === undefined) {
    return { amount_minor: null, currency_code: null, original_text: r.original_text ?? null };
  }
  return {
    amount_minor: r.amount_minor,
    currency_code: r.currency_code ?? 'KRW',
    original_text: r.original_text ?? null,
  };
}

async function seedOne(
  supabase: ReturnType<typeof createAdminClient>,
  co: SeedCompany,
): Promise<void> {
  logStep(`→ ${co.slug} (${co.display_name_ko})`);

  // --- 1. UPSERT company by slug -------------------------------------------
  const companyRow = {
    slug: co.slug,
    display_name_ko: co.display_name_ko,
    display_name_en: co.display_name_en ?? null,
    legal_name: co.legal_name ?? null,
    sector: co.sector,
    sub_sector: co.sub_sector ?? null,
    hq_address: co.hq_address ?? null,
    founded_at: co.founded_at ?? null,
    description_ko: co.description_ko,
    website_url: co.website_url ?? null,
    logo_url: co.logo_file ? `/logos/${co.logo_file}` : null,
    source_id: MANUAL_SOURCE_ID,
    last_verified_at: co.last_verified_at,
    updated_at: new Date().toISOString(),
  };

  if (DRY_RUN) {
    console.log('  DRY: would upsert company', companyRow);
  }

  const { data: inserted, error: upsertErr } = await supabase
    .from('companies')
    .upsert(companyRow, { onConflict: 'slug' })
    .select('id')
    .single();
  if (upsertErr || !inserted) {
    if (DRY_RUN) {
      // In dry-run we might not even have a DB connection; skip child rows.
      return;
    }
    throw new Error(`seed ${co.slug}: company upsert failed: ${upsertErr?.message}`);
  }
  const companyId = inserted.id as string;

  // --- 2. Aliases — delete-then-insert scoped by company_id ----------------
  const aliasRows = co.aliases.map((a) => ({
    company_id: companyId,
    alias: a.alias,
    alias_type: a.alias_type,
    valid_from: a.valid_from ?? null,
    valid_to: a.valid_to ?? null,
    source_id: MANUAL_SOURCE_ID,
    last_verified_at: co.last_verified_at,
  }));

  if (!DRY_RUN) {
    await supabase.from('aliases').delete().eq('company_id', companyId);
    if (aliasRows.length > 0) {
      const { error: aErr } = await supabase.from('aliases').insert(aliasRows);
      if (aErr) throw new Error(`seed ${co.slug}: aliases insert failed: ${aErr.message}`);
    }
  }

  // --- 3. Identifiers — delete-then-insert scoped by company_id ------------
  const idRows = co.identifiers.map((i) => ({
    company_id: companyId,
    kind: i.kind,
    value: i.value,
    source_id: MANUAL_SOURCE_ID,
    last_verified_at: i.last_verified_at,
  }));
  if (!DRY_RUN) {
    await supabase.from('company_identifiers').delete().eq('company_id', companyId);
    if (idRows.length > 0) {
      const { error: iErr } = await supabase.from('company_identifiers').insert(idRows);
      if (iErr) throw new Error(`seed ${co.slug}: identifiers insert failed: ${iErr.message}`);
    }
  }

  // --- 4. Funding rounds + investors + junctions ---------------------------
  // Cascade: deleting funding_rounds rows deletes their round_investors.
  if (!DRY_RUN) {
    await supabase.from('funding_rounds').delete().eq('company_id', companyId);
  }

  for (const r of co.funding_rounds) {
    const normalized = normalizeFundingRound(r);
    const roundPayload = {
      company_id: companyId,
      stage: r.stage,
      amount_minor: normalized.amount_minor === null ? null : normalized.amount_minor.toString(),
      currency_code: normalized.currency_code,
      original_text: normalized.original_text,
      announced_at: r.announced_at ?? null,
      closed_at: r.closed_at ?? null,
      source_id: MANUAL_SOURCE_ID,
      last_verified_at: r.last_verified_at,
    };

    if (DRY_RUN) {
      console.log('  DRY: would insert funding_round', roundPayload);
      continue;
    }

    const { data: roundIns, error: rErr } = await supabase
      .from('funding_rounds')
      .insert(roundPayload)
      .select('id')
      .single();
    if (rErr || !roundIns) {
      throw new Error(`seed ${co.slug}: funding_round insert failed: ${rErr?.message}`);
    }
    const roundId = roundIns.id as string;

    // Investors: upsert by (name_ko, source_id) via read-before-insert.
    for (const inv of r.investors) {
      const { data: existing } = await supabase
        .from('investors')
        .select('id')
        .eq('name_ko', inv.name_ko)
        .eq('source_id', MANUAL_SOURCE_ID)
        .is('deleted_at', null)
        .maybeSingle();

      let investorId = existing?.id as string | undefined;
      if (!investorId) {
        const { data: invIns, error: invErr } = await supabase
          .from('investors')
          .insert({
            name_ko: inv.name_ko,
            name_en: inv.name_en ?? null,
            investor_type: inv.investor_type ?? 'other',
            source_id: MANUAL_SOURCE_ID,
            last_verified_at: r.last_verified_at,
          })
          .select('id')
          .single();
        if (invErr || !invIns) {
          throw new Error(`seed ${co.slug}: investor "${inv.name_ko}" insert failed: ${invErr?.message}`);
        }
        investorId = invIns.id as string;
      }

      const { error: riErr } = await supabase.from('round_investors').insert({
        round_id: roundId,
        investor_id: investorId,
        participant_type: inv.participant_type,
        source_id: MANUAL_SOURCE_ID,
        last_verified_at: r.last_verified_at,
      });
      if (riErr) {
        throw new Error(
          `seed ${co.slug}: round_investors insert for "${inv.name_ko}" failed: ${riErr.message}`,
        );
      }
    }
  }

  logStep(`✓ ${co.slug}: ${co.aliases.length} aliases, ${co.funding_rounds.length} rounds, ${co.identifiers.length} identifiers`);
}

async function main() {
  logStep(`starting (DRY_RUN=${DRY_RUN}; ${allCompanies.length} companies)`);
  if (allCompanies.length === 0) {
    console.error('[seed] No companies to seed. Add modules under scripts/seed/companies/ and re-export from index.ts.');
    process.exit(2);
  }

  const supabase = createAdminClient();
  let ok = 0;
  let fail = 0;
  for (const co of allCompanies) {
    try {
      await seedOne(supabase, co);
      ok++;
    } catch (e) {
      fail++;
      console.error(`[seed] FAIL ${co.slug}:`, (e as Error).message);
    }
  }
  logStep(`done: ${ok} ok, ${fail} fail${DRY_RUN ? ' (DRY_RUN — nothing written)' : ''}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('[seed] fatal:', e);
  process.exit(1);
});
