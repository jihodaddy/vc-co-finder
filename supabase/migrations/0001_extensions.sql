-- Required extensions for Phase 1 schema.
-- pg_trgm: trigram GIN index for Korean alias fuzzy matching (Plan 3 Phase).
-- btree_gin: composite GIN indexes mixing scalar + text for facet queries.
-- pgcrypto: gen_random_uuid() as default for id columns.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
