-- B-tree indexes on common filter scalars (Phase 3 facets).
CREATE INDEX ix_companies_slug ON public.companies(slug) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_region ON public.companies(region) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_sector ON public.companies(sector) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_status ON public.companies(status) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_founded_at ON public.companies(founded_at) WHERE deleted_at IS NULL;

CREATE INDEX ix_funding_rounds_company_id ON public.funding_rounds(company_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_funding_rounds_stage ON public.funding_rounds(stage) WHERE deleted_at IS NULL;
CREATE INDEX ix_funding_rounds_closed_at ON public.funding_rounds(closed_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX ix_company_facts_company_type_observed ON public.company_facts(company_id, fact_type, observed_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX ix_news_mentions_company_published ON public.news_mentions(company_id, published_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX ix_aliases_company ON public.aliases(company_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_company_identifiers_company ON public.company_identifiers(company_id) WHERE deleted_at IS NULL;

-- Trigram GIN indexes for Korean fuzzy alias search (Phase 3 consumes).
CREATE INDEX ix_companies_display_name_ko_trgm ON public.companies USING GIN (display_name_ko public.gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX ix_companies_display_name_en_trgm ON public.companies USING GIN (display_name_en public.gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX ix_aliases_alias_trgm ON public.aliases USING GIN (alias public.gin_trgm_ops) WHERE deleted_at IS NULL;

-- Materialized tsvector column seeded now (Phase 3 populates search_tokens with app-side morpheme tokens).
ALTER TABLE public.companies ADD COLUMN search_tsv TSVECTOR GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', COALESCE(display_name_ko, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(display_name_en, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(legal_name, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(description_ko, '')), 'C')
) STORED;
CREATE INDEX ix_companies_search_tsv ON public.companies USING GIN (search_tsv) WHERE deleted_at IS NULL;
COMMENT ON COLUMN public.companies.search_tsv IS 'Seed tsvector using simple config. Phase 3 replaces with app-side morpheme tokens (mecab-ko via ETL) per STACK.md Korean Tokenization.';

-- User-scoped indexes.
CREATE INDEX ix_user_watchlists_user ON public.user_watchlists(user_id);
CREATE INDEX ix_user_saved_searches_user ON public.user_saved_searches(user_id);
CREATE INDEX ix_user_submissions_status ON public.user_submissions(status) WHERE status = 'pending';
CREATE INDEX ix_dsar_requests_status ON public.dsar_requests(status);
CREATE INDEX ix_dsar_requests_email ON public.dsar_requests(requester_email);
