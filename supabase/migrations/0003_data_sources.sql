-- First-class provenance table. Every fact-bearing row FKs to data_sources.id.
-- See PITFALLS.md #3 (no per-fact provenance = trust collapse) and D-03.1.
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type public.source_type NOT NULL,
  source_url TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  etl_run_id TEXT,
  confidence NUMERIC(3,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  raw_payload_ref TEXT,  -- pointer into Supabase Storage for heavy payloads
  license_note TEXT,     -- "DART Open API — public domain" etc.
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX ix_data_sources_source_type ON public.data_sources(source_type);
CREATE INDEX ix_data_sources_fetched_at ON public.data_sources(fetched_at DESC);
CREATE INDEX ix_data_sources_not_deleted ON public.data_sources(id) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.data_sources IS 'First-class provenance. Every canonical fact-bearing row has source_id NOT NULL FK → this table. Per TRUST-01, PITFALLS #3.';

-- Seed one row for manual curation (Phase 2 uses this).
INSERT INTO public.data_sources (id, source_type, source_url, license_note, notes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'manual',
  NULL,
  'Internal curation — Phase 2 seed',
  'Reserved UUID for manual curation rows; do not delete.'
);
