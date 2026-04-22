-- Fix migration: fn_audit_log_write fails on tables without a singular `id`
-- column (round_investors, person_roles — both use composite PKs).
--
-- Symptom discovered while seeding Phase 2 manual data:
--   "record 'new' has no field 'id'"
--
-- Fix: derive v_entity_id via JSON path extraction on to_jsonb(NEW|OLD).
-- When the `id` key is present, emit it; otherwise serialize the full row
-- as the entity_id so audit_log still carries a stable reference.

CREATE OR REPLACE FUNCTION public.fn_audit_log_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_before JSONB;
  v_after JSONB;
  v_entity_id TEXT;
  v_row JSONB;
BEGIN
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD);
    v_after := NULL;
    v_row := v_before;
  ELSIF TG_OP = 'UPDATE' THEN
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    v_row := v_after;
  ELSE  -- INSERT
    v_before := NULL;
    v_after := to_jsonb(NEW);
    v_row := v_after;
  END IF;

  -- Prefer single `id` column; fall back to full-row JSON for composite PKs.
  IF v_row ? 'id' THEN
    v_entity_id := COALESCE(v_row ->> 'id', 'unknown');
  ELSE
    v_entity_id := v_row::TEXT;
  END IF;

  INSERT INTO public.audit_log (
    actor_id, action, entity_schema, entity_table, entity_id,
    before_row, after_row, source
  ) VALUES (
    v_actor, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_entity_id,
    v_before, v_after, TG_ARGV[0]
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.fn_audit_log_write() IS
  'Trigger function attached to canonical tables in Plan 03. TG_ARGV[0] is the source tag (app/etl/admin/manual). Handles composite-PK tables by falling back to full-row JSON for entity_id.';
