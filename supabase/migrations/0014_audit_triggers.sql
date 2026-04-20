-- Plan 01-03 / Task 2: Attach audit + updated_at triggers to every canonical
-- table. fn_audit_log_write (defined in migration 0008) runs SECURITY DEFINER
-- and bypasses the audit_log RLS policies authored in 0012.
--
-- TG_ARGV[0] tags the write source. Phase 4a ETL will set a GUC (e.g.
-- SET LOCAL audit.source = 'etl') before its writes so the trigger can
-- emit 'etl' rather than the default 'app'. For v1 we tag every write 'app'
-- because only the Next.js server action path + admin UI will write.
--
-- References:
--   .planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md (D-03.4)
--   supabase/migrations/0008_audit_log.sql (fn_audit_log_write, fn_touch_updated_at adjacent)

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
    -- Audit trigger — emits one row in public.audit_log per INSERT/UPDATE/DELETE.
    EXECUTE format(
      $trg$CREATE TRIGGER trg_audit_%I
             AFTER INSERT OR UPDATE OR DELETE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_write('app')$trg$,
      t, t
    );

    -- updated_at touch trigger — applied BEFORE UPDATE so the new row's
    -- updated_at reflects the write, and fn_audit_log_write (AFTER) sees the
    -- bumped value in after_row.
    EXECUTE format(
      $trg$CREATE TRIGGER trg_touch_updated_at_%I
             BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at()$trg$,
      t, t
    );
  END LOOP;
END $$;

-- profiles + dsar_requests get updated_at touch triggers too (they are not
-- canonical, but both carry updated_at and may be edited). audit_log itself
-- is append-only and does not need either trigger.
CREATE TRIGGER trg_touch_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

CREATE TRIGGER trg_touch_updated_at_dsar_requests
  BEFORE UPDATE ON public.dsar_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();
