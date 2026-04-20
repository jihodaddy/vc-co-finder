-- Staging schema lives from Day 1 per D-03.7 so Phase 4a ETL doesn't need schema-creation privileges.
-- Tables populate in Phase 4a.
CREATE SCHEMA IF NOT EXISTS staging;
COMMENT ON SCHEMA staging IS 'ETL staging area (Phase 4a). Tables land raw + parsed; published to public.* via publish() function.';

-- Revoke PUBLIC (including anon, authenticated) access from staging.
-- Service-role bypasses GRANTS anyway (it is a superuser equivalent in Supabase).
REVOKE ALL ON SCHEMA staging FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA staging FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA staging FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA staging FROM PUBLIC;
