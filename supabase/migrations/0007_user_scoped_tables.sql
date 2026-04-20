-- Profiles: 1:1 with auth.users; role column per D-03.3 for RLS + custom_access_token_hook.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'user',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Per-user metadata. role is read by custom_access_token_hook (Plan 03) and injected into JWT as user_role claim.';

-- Watchlists (Phase 4c fills, schema here per D-03.2).
CREATE TABLE public.user_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '내 관심 기업',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_watchlist_companies (
  watchlist_id UUID NOT NULL REFERENCES public.user_watchlists(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  PRIMARY KEY (watchlist_id, company_id)
);

CREATE TABLE public.user_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query_jsonb JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- anonymous submissions allowed (rate-limited)
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload_jsonb JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note TEXT
);

-- DSAR (Data Subject Access Request) — FOUND-12.
-- Captures 열람 / 정정 / 삭제 / 처리정지 requests per D-04.3.
CREATE TABLE public.dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('access','rectification','erasure','restriction')),
  subject_description TEXT NOT NULL,
  evidence_url TEXT,
  email_verification_token TEXT NOT NULL,    -- UUID sent to requester_email; status advances after click
  email_verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification','verified','in_progress','completed','rejected')),
  ip_address INET,                            -- for rate-limit audit (scrubbed per D-04.4)
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processor_notes TEXT
);
COMMENT ON TABLE public.dsar_requests IS 'PIPA DSAR endpoint per FOUND-12 / D-04.3. Email verification (NOT iPIN) gates processing. SLA: 10일 이내 접수 확인, 30일 이내 처리 완료.';
