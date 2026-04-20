-- Investors canonical table.
CREATE TABLE public.investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ko TEXT NOT NULL,
  name_en TEXT,
  investor_type public.investor_type NOT NULL DEFAULT 'other',
  country CHAR(2) NOT NULL DEFAULT 'KR',
  website_url TEXT,
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Funding rounds. Currency triple (FOUND-14) on amount + valuation.
CREATE TABLE public.funding_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stage public.funding_stage NOT NULL,
  -- Currency triple per D-03.8 / FOUND-14. amount_minor = KRW 원 (not 억원). BIGINT for 조원-scale rounds.
  amount_minor BIGINT,
  currency_code CHAR(3),
  original_text TEXT,
  post_money_valuation_minor BIGINT,
  post_money_valuation_currency_code CHAR(3),
  post_money_valuation_original_text TEXT,
  announced_at DATE,
  closed_at DATE,
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  -- Currency triple integrity: amount_minor present → currency_code must be present.
  CONSTRAINT chk_amount_triple CHECK ((amount_minor IS NULL AND currency_code IS NULL) OR (amount_minor IS NOT NULL AND currency_code IS NOT NULL)),
  CONSTRAINT chk_valuation_triple CHECK ((post_money_valuation_minor IS NULL AND post_money_valuation_currency_code IS NULL) OR (post_money_valuation_minor IS NOT NULL AND post_money_valuation_currency_code IS NOT NULL))
);
COMMENT ON COLUMN public.funding_rounds.amount_minor IS 'Currency minor units (KRW: 원, USD: cents). Never 만원/억원. Per FOUND-14 + PITFALLS #5.';

-- Round participants (M:N junction with lead vs participant discipline per Pitfalls #5).
CREATE TABLE public.round_investors (
  round_id UUID NOT NULL REFERENCES public.funding_rounds(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  participant_type public.round_participant_type NOT NULL DEFAULT 'unknown',
  amount_minor BIGINT,
  currency_code CHAR(3),
  amount_original_text TEXT,
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (round_id, investor_id),
  CONSTRAINT chk_ri_amount_triple CHECK ((amount_minor IS NULL AND currency_code IS NULL) OR (amount_minor IS NOT NULL AND currency_code IS NOT NULL))
);

-- Persons (executives, founders). Pitfalls #7 — minimize PII per PIPA.
CREATE TABLE public.persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ko TEXT NOT NULL,
  name_en TEXT,
  linkedin_url TEXT,       -- only if publicly linked by company/DART; NEVER scraped from LinkedIn
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
COMMENT ON TABLE public.persons IS 'PII-minimal per PITFALLS #7 / PIPA. Only DART-public / IR-disclosed individuals. Retention: dropped from display when role ends (Phase 4a trigger to set deleted_at).';

-- Person roles at companies.
CREATE TABLE public.person_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_kind public.person_role_kind NOT NULL,
  role_title_original TEXT,
  started_at DATE,
  ended_at DATE,
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
