-- Phase 3 Plan 02 — PGroonga Korean tokenization + denormalized columns + refresh triggers.
-- Supersedes migration 0010 search_tsv strategy for company-name search (search_tsv kept as fallback).
-- Idempotent: re-running this file is a no-op per scripts/seed/_push_migrations.cjs contract.
--
-- SRCH-12: Korean tokenization via PGroonga TokenBigram.
-- SRCH-05: p95 < 1s discipline via denormalized columns + partial/composite indexes.
-- Threat T-03-02-01 mitigated by `WHERE deleted_at IS NULL` on every new index.
-- Threat T-03-02-05 mitigated by re-reading source of truth (no incremental math) in refresh fn.

-- (1) Extension — preinstalled on Supabase managed; enable per project.
-- Fallback Plan B: if CREATE EXTENSION fails (access denied), operator enables via
-- Supabase Dashboard → Database → Extensions and re-runs this migration.
CREATE EXTENSION IF NOT EXISTS pgroonga;

-- (2) Denormalized columns on public.companies.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS cumulative_funding_minor BIGINT,
  ADD COLUMN IF NOT EXISTS latest_round_stage public.funding_stage,
  ADD COLUMN IF NOT EXISTS latest_round_announced_at DATE,
  ADD COLUMN IF NOT EXISTS employees_latest INTEGER,
  ADD COLUMN IF NOT EXISTS hq_region TEXT,
  ADD COLUMN IF NOT EXISTS search_doc TEXT;

-- (3) founded_year as generated column (pure from founded_at; no trigger needed).
-- NOTE: ALTER TABLE ADD COLUMN ... GENERATED is not IF NOT EXISTS-friendly before PG16.
-- Wrap in DO block to guarantee idempotency on PG15.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'founded_year'
  ) THEN
    ALTER TABLE public.companies
      ADD COLUMN founded_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM founded_at)::INTEGER) STORED;
  END IF;
END $$;

-- (4) Refresh function — single point of truth, idempotent, handles INSERT/UPDATE/DELETE.
-- Re-reads source of truth (no incremental math) per RESEARCH §Pitfall 2.
-- cumulative_funding_minor = SUM(KRW-only amounts) per Assumption A6 (v1 excludes USD/FX);
-- documented in column comment for future FX integration.
CREATE OR REPLACE FUNCTION public.fn_refresh_company_search_fields(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_aliases TEXT;
  v_employees INTEGER;
BEGIN
  -- cumulative_funding_minor / latest_round_stage / latest_round_announced_at in one UPDATE.
  UPDATE public.companies c SET
    cumulative_funding_minor = (
      SELECT COALESCE(SUM(fr.amount_minor), NULL)
      FROM public.funding_rounds fr
      WHERE fr.company_id = p_company_id
        AND fr.deleted_at IS NULL
        AND fr.currency_code = 'KRW'
    ),
    latest_round_stage = (
      SELECT fr.stage FROM public.funding_rounds fr
      WHERE fr.company_id = p_company_id AND fr.deleted_at IS NULL
      ORDER BY fr.announced_at DESC NULLS LAST, fr.created_at DESC
      LIMIT 1
    ),
    latest_round_announced_at = (
      SELECT fr.announced_at FROM public.funding_rounds fr
      WHERE fr.company_id = p_company_id AND fr.deleted_at IS NULL
      ORDER BY fr.announced_at DESC NULLS LAST, fr.created_at DESC
      LIMIT 1
    )
  WHERE c.id = p_company_id;

  -- employees_latest: most recent company_facts row with fact_type='employees'.
  -- Phase 4a will start populating company_facts; v1 seed may have zero rows → v_employees stays NULL.
  SELECT COALESCE(cf.value_numeric::INTEGER, NULLIF(cf.original_text, '')::INTEGER)
    INTO v_employees
    FROM public.company_facts cf
   WHERE cf.company_id = p_company_id
     AND cf.fact_type = 'employees'
     AND cf.deleted_at IS NULL
   ORDER BY cf.observed_at DESC NULLS LAST
   LIMIT 1;

  UPDATE public.companies c SET employees_latest = v_employees
  WHERE c.id = p_company_id;

  -- search_doc: concat display names + legal + all non-deleted aliases.
  SELECT string_agg(a.alias, ' ')
    INTO v_aliases
    FROM public.aliases a
   WHERE a.company_id = p_company_id AND a.deleted_at IS NULL;

  UPDATE public.companies c SET
    search_doc = concat_ws(' ',
      NULLIF(c.display_name_ko, ''),
      NULLIF(c.display_name_en, ''),
      NULLIF(c.legal_name, ''),
      v_aliases
    )
  WHERE c.id = p_company_id;
END;
$$;

-- (5) Three trigger shims — all AFTER, FOR EACH ROW, call the same refresh function.
-- Separate shims (not one multiplex) to avoid TG_ARGV complexity and keep each trigger auditable.
CREATE OR REPLACE FUNCTION public.fn_search_trg_funding()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.fn_refresh_company_search_fields(COALESCE(NEW.company_id, OLD.company_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_search_trg_alias()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.fn_refresh_company_search_fields(COALESCE(NEW.company_id, OLD.company_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_search_trg_company_facts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only fire refresh for employees fact_type — other facts (revenue, MAU, …) don't touch companies denorm.
  IF (TG_OP = 'DELETE' AND OLD.fact_type = 'employees')
     OR ((TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.fact_type = 'employees') THEN
    PERFORM public.fn_refresh_company_search_fields(COALESCE(NEW.company_id, OLD.company_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_search_refresh_funding_rounds ON public.funding_rounds;
CREATE TRIGGER trg_search_refresh_funding_rounds
AFTER INSERT OR UPDATE OR DELETE ON public.funding_rounds
FOR EACH ROW EXECUTE FUNCTION public.fn_search_trg_funding();

DROP TRIGGER IF EXISTS trg_search_refresh_aliases ON public.aliases;
CREATE TRIGGER trg_search_refresh_aliases
AFTER INSERT OR UPDATE OR DELETE ON public.aliases
FOR EACH ROW EXECUTE FUNCTION public.fn_search_trg_alias();

DROP TRIGGER IF EXISTS trg_search_refresh_company_facts ON public.company_facts;
CREATE TRIGGER trg_search_refresh_company_facts
AFTER INSERT OR UPDATE OR DELETE ON public.company_facts
FOR EACH ROW EXECUTE FUNCTION public.fn_search_trg_company_facts();

-- (6) Backfill — apply refresh across all existing seeded companies.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.companies WHERE deleted_at IS NULL LOOP
    PERFORM public.fn_refresh_company_search_fields(r.id);
  END LOOP;
END $$;

-- (7) hq_region backfill — derive Korean region prefix from hq_address first-word.
-- Examples: "서울특별시 강남구 테헤란로 152" → "서울", "경기도 성남시 분당구 …" → "경기".
UPDATE public.companies
  SET hq_region = regexp_replace(
    SPLIT_PART(COALESCE(hq_address, ''), ' ', 1),
    '(특별시|광역시|특별자치시|특별자치도|도|시|군|구)$',
    ''
  )
  WHERE hq_region IS NULL AND hq_address IS NOT NULL AND hq_address <> '';

-- (8) Indexes — all partial (deleted_at IS NULL), matching existing soft-delete discipline (Pitfall 2 + T-03-02-01).
-- PGroonga TokenBigram default (RESEARCH Open Question #1 — validate against SRCH-13 corpus in Plan 07).
CREATE INDEX IF NOT EXISTS ix_companies_search_doc_pgroonga
  ON public.companies USING pgroonga (search_doc)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_aliases_alias_pgroonga
  ON public.aliases USING pgroonga (alias)
  WHERE deleted_at IS NULL;

-- Composite filter path (D-04 facet order: sector + latest_round_stage most-used combo).
CREATE INDEX IF NOT EXISTS ix_companies_sector_stage_funding
  ON public.companies (sector, latest_round_stage, cumulative_funding_minor DESC)
  WHERE deleted_at IS NULL;

-- Default sort (recent_funding_desc) scanning path.
CREATE INDEX IF NOT EXISTS ix_companies_latest_round_announced
  ON public.companies (latest_round_announced_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;

-- Cumulative funding sort scan + range facet.
CREATE INDEX IF NOT EXISTS ix_companies_cumulative_funding
  ON public.companies (cumulative_funding_minor DESC NULLS LAST)
  WHERE deleted_at IS NULL;

-- Founded-year range facet.
CREATE INDEX IF NOT EXISTS ix_companies_founded_year
  ON public.companies (founded_year)
  WHERE deleted_at IS NULL AND founded_year IS NOT NULL;

-- hq_region facet.
CREATE INDEX IF NOT EXISTS ix_companies_hq_region
  ON public.companies (hq_region)
  WHERE deleted_at IS NULL AND hq_region IS NOT NULL;

-- employees_latest facet.
CREATE INDEX IF NOT EXISTS ix_companies_employees_latest
  ON public.companies (employees_latest)
  WHERE deleted_at IS NULL AND employees_latest IS NOT NULL;

-- Comments for future contributors.
COMMENT ON COLUMN public.companies.search_doc IS 'Phase 3: denormalized search-text aggregate of display names + legal + aliases. Fed by fn_refresh_company_search_fields via triggers on funding_rounds/aliases/company_facts.';
COMMENT ON COLUMN public.companies.cumulative_funding_minor IS 'Phase 3: denormalized SUM(funding_rounds.amount_minor) WHERE currency_code=KRW AND deleted_at IS NULL. USD/FX excluded per research Assumption A6.';
COMMENT ON COLUMN public.companies.hq_region IS 'Phase 3: Korean 시/도 prefix parsed from hq_address first-word. Backfilled from existing rows; future ETL writes directly.';
COMMENT ON COLUMN public.companies.latest_round_stage IS 'Phase 3: denormalized funding_stage of the most-recent non-deleted funding_rounds row (ORDER BY announced_at DESC NULLS LAST, created_at DESC LIMIT 1).';
COMMENT ON COLUMN public.companies.latest_round_announced_at IS 'Phase 3: denormalized announced_at of the most-recent non-deleted funding_rounds row. Default sort key for /search (recent_funding_desc).';
COMMENT ON COLUMN public.companies.employees_latest IS 'Phase 3: denormalized headcount from most-recent company_facts WHERE fact_type=employees AND deleted_at IS NULL.';
COMMENT ON COLUMN public.companies.founded_year IS 'Phase 3: generated column — EXTRACT(YEAR FROM founded_at). Used by founded-year range facet.';
