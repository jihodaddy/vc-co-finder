-- format_krw: BIGINT 원 → '1억 2,345만원' display string per D-03.8 / PROF-11.
CREATE OR REPLACE FUNCTION public.format_krw(amount_minor BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_jo BIGINT;
  v_eok BIGINT;
  v_man BIGINT;
  v_remainder BIGINT;
  v_parts TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF amount_minor IS NULL THEN
    RETURN NULL;
  END IF;
  IF amount_minor = 0 THEN
    RETURN '0원';
  END IF;

  v_jo := amount_minor / 1000000000000;                          -- 조 = 10^12 원
  v_remainder := amount_minor % 1000000000000;
  v_eok := v_remainder / 100000000;                              -- 억 = 10^8 원
  v_remainder := v_remainder % 100000000;
  v_man := v_remainder / 10000;                                  -- 만 = 10^4 원
  v_remainder := v_remainder % 10000;

  IF v_jo > 0 THEN v_parts := array_append(v_parts, v_jo::TEXT || '조'); END IF;
  IF v_eok > 0 THEN v_parts := array_append(v_parts, v_eok::TEXT || '억'); END IF;
  IF v_man > 0 THEN v_parts := array_append(v_parts, v_man::TEXT || '만'); END IF;
  IF v_remainder > 0 THEN v_parts := array_append(v_parts, v_remainder::TEXT); END IF;

  RETURN array_to_string(v_parts, ' ') || '원';
END;
$$;
COMMENT ON FUNCTION public.format_krw(BIGINT) IS 'Format 원-minor to 한국어 display string (조/억/만원). Per D-03.8 + PROF-11.';

-- Generic updated_at touch trigger (applied to canonical tables in Plan 03).
CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Signup trigger: create profiles row with default role 'user' (D-03.3).
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user'::public.user_role)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- custom_access_token_hook (D-03.3): injects profiles.role into JWT as user_role claim.
-- Referenced by Supabase Auth Hook config in Plan 03.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB;
  v_user_role public.user_role;
BEGIN
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  v_claims := event->'claims';
  IF v_user_role IS NULL THEN
    v_user_role := 'user'::public.user_role;
  END IF;
  v_claims := jsonb_set(v_claims, '{user_role}', to_jsonb(v_user_role::TEXT));

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;
COMMENT ON FUNCTION public.custom_access_token_hook(JSONB) IS 'Supabase Auth Hook. Register in Dashboard > Auth > Hooks. Injects profiles.role as user_role claim (D-03.3).';

-- Grant Supabase Auth the right to invoke the hook.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) FROM authenticated, anon, public;
GRANT SELECT ON public.profiles TO supabase_auth_admin;  -- hook needs to read role
