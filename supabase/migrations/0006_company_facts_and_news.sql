-- Generic time-series/per-fact table. Value-triple (amount_minor/currency for $ facts; value_text for string facts).
-- D-03.5: declarative partitioning documented but not enabled yet (row count <3M expected in Phase 2-3).
CREATE TABLE public.company_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL,         -- open namespace: 'revenue', 'op_income', 'employees', 'mau', 'web_visits', etc.
  value_numeric NUMERIC(30,6),     -- generic numeric (employees, counts, ratios)
  value_text TEXT,                 -- open text (e.g., executive title)
  amount_minor BIGINT,             -- monetary facts (FOUND-14)
  currency_code CHAR(3),           -- monetary facts
  original_text TEXT,              -- source verbatim
  unit TEXT,                       -- '명', '만원', '%', etc.
  observed_at DATE NOT NULL,       -- when the fact pertains to (e.g., fiscal year end)
  period_type TEXT,                -- 'annual' | 'quarterly' | 'monthly' | 'snapshot'
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_fact_amount_triple CHECK ((amount_minor IS NULL AND currency_code IS NULL) OR (amount_minor IS NOT NULL AND currency_code IS NOT NULL))
);
COMMENT ON TABLE public.company_facts IS 'Per-fact time-series (revenue, employees, MAU, web_visits). Partitioning by observed_at year planned when rowcount >3M (D-03.5).';

-- News mentions (PROF-07 + Phase 7 RSS poller).
CREATE TABLE public.news_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  outlet TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,  -- dedupe on URL
  published_at TIMESTAMPTZ NOT NULL,
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
