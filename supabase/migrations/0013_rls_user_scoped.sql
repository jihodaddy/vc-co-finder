-- Plan 01-03 / Task 1: RLS on user-scoped + PIPA-compliance tables.
-- Pattern: auth.uid() = user_id for ownership; (auth.jwt() ->> 'user_role')
-- for admin/editor elevation. The JWT claim is populated by
-- public.custom_access_token_hook (migration 0011) — zero per-query join.
--
-- References:
--   .planning/phases/01-foundation-compliance-baseline/01-CONTEXT.md (D-03.2, D-03.3)
--   .planning/research/ARCHITECTURE.md §Pattern 5

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- SELECT: user reads own row; admin/editor can read all (for curation + DSAR).
CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR (auth.jwt() ->> 'user_role') IN ('admin', 'editor')
  );

-- INSERT: blocked for everyone. fn_handle_new_user trigger (SECURITY DEFINER)
-- creates the profile row on auth.users INSERT — users cannot create profiles
-- directly.
CREATE POLICY profiles_no_direct_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- UPDATE (self): users may update own non-role fields. The subquery pins role
-- to its current value so a user cannot escalate themselves to admin/editor.
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- UPDATE (admin): admin role may update any profile, including role changes.
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

-- DELETE (admin only).
CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'admin');

-- ---------------------------------------------------------------------------
-- user_watchlists
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlists FORCE ROW LEVEL SECURITY;

CREATE POLICY watchlists_owner_all ON public.user_watchlists
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_watchlist_companies (join table — ownership via parent watchlist)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_watchlist_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlist_companies FORCE ROW LEVEL SECURITY;

CREATE POLICY watchlist_companies_owner_all ON public.user_watchlist_companies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_watchlists w
      WHERE w.id = watchlist_id AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_watchlists w
      WHERE w.id = watchlist_id AND w.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- user_saved_searches
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_searches FORCE ROW LEVEL SECURITY;

CREATE POLICY saved_searches_owner_all ON public.user_saved_searches
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_submissions
-- INSERT: authenticated insert own (user_id = auth.uid() or NULL for anon submissions via service-role helper).
-- SELECT: self or admin/editor.
-- UPDATE: admin/editor only (they triage + publish).
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_submissions FORCE ROW LEVEL SECURITY;

CREATE POLICY submissions_insert_self ON public.user_submissions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY submissions_select_self_or_admin ON public.user_submissions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (auth.jwt() ->> 'user_role') IN ('admin', 'editor')
  );

CREATE POLICY submissions_update_admin ON public.user_submissions
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'user_role') IN ('admin', 'editor'))
  WITH CHECK ((auth.jwt() ->> 'user_role') IN ('admin', 'editor'));

-- ---------------------------------------------------------------------------
-- dsar_requests (FOUND-12 / D-04.3)
-- INSERT: public (anon) with length bounds to blunt DoS via giant payloads.
-- SELECT / UPDATE: admin only.
-- DELETE: blocked for everyone (5-year retention per D-04.5).
-- ---------------------------------------------------------------------------
ALTER TABLE public.dsar_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsar_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY dsar_insert_public ON public.dsar_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    requester_name IS NOT NULL
    AND requester_email IS NOT NULL
    AND char_length(requester_name) BETWEEN 1 AND 100
    AND char_length(requester_email) BETWEEN 5 AND 320
    AND char_length(subject_description) BETWEEN 1 AND 5000
  );

CREATE POLICY dsar_select_admin ON public.dsar_requests
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY dsar_update_admin ON public.dsar_requests
  FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY dsar_no_delete ON public.dsar_requests
  FOR DELETE TO anon, authenticated
  USING (false);

-- ---------------------------------------------------------------------------
-- GRANTs — RLS is orthogonal to GRANT. Anon/authenticated need the SELECT
-- privilege before the SELECT policy is even evaluated.
-- ---------------------------------------------------------------------------

-- Canonical table SELECT for anonymous browsing (D-01.4).
GRANT SELECT ON
  public.data_sources,
  public.companies,
  public.aliases,
  public.company_identifiers,
  public.company_relations,
  public.funding_rounds,
  public.investors,
  public.round_investors,
  public.persons,
  public.person_roles,
  public.company_facts,
  public.news_mentions
  TO anon, authenticated;

-- DSAR form is publicly accessible.
GRANT INSERT ON public.dsar_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.dsar_requests TO authenticated;

-- Authenticated-only grants.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.user_watchlists,
  public.user_watchlist_companies,
  public.user_saved_searches,
  public.user_submissions
  TO authenticated;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
