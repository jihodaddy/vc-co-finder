-- Append-only audit log. Single table (NOT partitioned yet per D-03.4).
-- Attached to canonical tables via trigger in Plan 03.
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,                       -- auth.uid() at time of write; NULL for service-role writes
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  entity_schema TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  entity_id TEXT NOT NULL,             -- TEXT for cross-table id compatibility (UUID|BIGINT)
  before_row JSONB,
  after_row JSONB,
  source TEXT,                         -- 'app' | 'etl' | 'admin' | 'manual'
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_audit_log_occurred_at ON public.audit_log(occurred_at DESC);
CREATE INDEX ix_audit_log_entity ON public.audit_log(entity_schema, entity_table, entity_id);
COMMENT ON TABLE public.audit_log IS 'Append-only. Partitioning planned when rowcount approaches 10M (D-03.4). Trigger attached in Plan 03.';

-- Trigger function that canonical tables will attach per Plan 03.
-- Reads auth.uid() via current_setting; falls back to NULL for service-role writes.
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
BEGIN
  BEGIN
    v_actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD);
    v_after := NULL;
    v_entity_id := COALESCE((OLD.id)::TEXT, 'unknown');
  ELSIF TG_OP = 'UPDATE' THEN
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    v_entity_id := COALESCE((NEW.id)::TEXT, 'unknown');
  ELSE  -- INSERT
    v_before := NULL;
    v_after := to_jsonb(NEW);
    v_entity_id := COALESCE((NEW.id)::TEXT, 'unknown');
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity_schema, entity_table, entity_id, before_row, after_row, source)
  VALUES (v_actor, TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_entity_id, v_before, v_after, TG_ARGV[0]);

  RETURN COALESCE(NEW, OLD);
END;
$$;
COMMENT ON FUNCTION public.fn_audit_log_write() IS 'Trigger function attached to canonical tables in Plan 03. TG_ARGV[0] is the source tag (app/etl/admin/manual).';
