-- Plan 01-03 / Task 1: RLS on canonical tables.
-- Policy: anon + authenticated may SELECT rows with deleted_at IS NULL.
-- INSERT / UPDATE / DELETE are blocked for anon AND authenticated.
-- The service-role client bypasses RLS by default, so the ETL + admin
-- back-office paths still write through unchanged.
--
-- References:
--   .planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md (D-03.1)
--   .planning/research/ARCHITECTURE.md §Pattern 5 (RLS as the security boundary)
--   .planning/research/PITFALLS.md §Security Mistakes (RLS disabled for ETL = leak)

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'data_sources',
    'companies',
    'aliases',
    'company_identifiers',
    'company_relations',
    'funding_rounds',
    'investors',
    'round_investors',
    'persons',
    'person_roles',
    'company_facts',
    'news_mentions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- FORCE ensures the table owner (including service-role bypass? no — service-role
    -- has BYPASSRLS attribute and is unaffected) also honors policies. This blocks
    -- accidental writes from roles we grant permissions to without meaning to bypass RLS.
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);

    -- Permissive SELECT for anon + authenticated.
    -- Anonymous browsing is core UX per D-01.4; only non-deleted rows are visible.
    EXECUTE format(
      $p$CREATE POLICY canonical_select_public ON public.%I
           FOR SELECT TO anon, authenticated
           USING (deleted_at IS NULL)$p$,
      t
    );

    -- Explicit block on INSERT / UPDATE / DELETE for anon + authenticated.
    -- service-role has BYPASSRLS and is unaffected by these policies.
    EXECUTE format(
      $p$CREATE POLICY canonical_no_insert ON public.%I
           FOR INSERT TO anon, authenticated
           WITH CHECK (false)$p$,
      t
    );
    EXECUTE format(
      $p$CREATE POLICY canonical_no_update ON public.%I
           FOR UPDATE TO anon, authenticated
           USING (false) WITH CHECK (false)$p$,
      t
    );
    EXECUTE format(
      $p$CREATE POLICY canonical_no_delete ON public.%I
           FOR DELETE TO anon, authenticated
           USING (false)$p$,
      t
    );
  END LOOP;
END $$;

-- audit_log: service-role only. Even admins must read through a server action
-- that uses the service-role client — preserves forensic integrity (an admin
-- compromised via XSS cannot page through the audit log directly).
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_log_no_read ON public.audit_log
  FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY audit_log_no_insert ON public.audit_log
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY audit_log_no_update ON public.audit_log
  FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY audit_log_no_delete ON public.audit_log
  FOR DELETE TO anon, authenticated
  USING (false);

COMMENT ON TABLE public.audit_log IS
  'Append-only forensic log. RLS: service-role only (BYPASSRLS). '
  'Triggers in 0014_audit_triggers.sql run as SECURITY DEFINER and bypass these policies. '
  'Partitioning planned when rowcount approaches 10M (D-03.4).';
