-- Companies canonical table. Brand/legal/english names are aliases, not fields (Pitfalls #8).
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  legal_name TEXT,                        -- nullable: brand may precede legal entity
  display_name_ko TEXT NOT NULL,
  display_name_en TEXT,
  region CHAR(2) NOT NULL DEFAULT 'KR',   -- ISO 3166-1 alpha-2; KR for v1; ready for JP/SG expansion
  status public.company_status NOT NULL DEFAULT 'alive',
  founded_at DATE,
  sector TEXT,                            -- open taxonomy (promoted to enum/table in Phase 3 per D-03.6)
  sub_sector TEXT,
  hq_address TEXT,
  description_ko TEXT,
  description_en TEXT,
  website_url TEXT,
  logo_url TEXT,                          -- Cloudflare R2 URL (Phase 2 fills)
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- TRUST-02 — distinct from updated_at
  deleted_at TIMESTAMPTZ                                -- D-03.10 soft delete
);
COMMENT ON COLUMN public.companies.region IS 'ISO 3166-1 alpha-2. KR for v1; schema-ready for JP/SG/ID/VN per research/SUMMARY.md.';

-- Aliases (KR / EN / former / brand). 토스, 비바리퍼블리카, Toss, (주)비바리퍼블리카 all reach same company_id.
CREATE TABLE public.aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_type public.alias_type NOT NULL,
  valid_from DATE,
  valid_to DATE,  -- NULL = currently active
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (company_id, alias, alias_type)
);

-- Identifiers (corp_code / 사업자번호 / 법인번호 / domain). Pitfalls #6.
CREATE TABLE public.company_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind public.identifier_kind NOT NULL,
  value TEXT NOT NULL,
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (kind, value)  -- same 사업자번호 cannot map to two companies
);

-- Parent/subsidiary/merger/spinoff relations. Pitfalls #8.
CREATE TABLE public.company_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  relation_kind public.relation_kind NOT NULL,
  started_at DATE,
  ended_at DATE,
  source_id UUID NOT NULL REFERENCES public.data_sources(id),  -- TRUST-01
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (parent_id <> child_id)
);
