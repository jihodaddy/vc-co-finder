-- Funding stage taxonomy (PROF-03 / SRCH-02 covers the full list).
CREATE TYPE public.funding_stage AS ENUM (
  'pre_a',
  'seed',
  'series_a',
  'series_b',
  'series_c',
  'series_d',
  'bridge',
  'safe',
  'convertible_note',
  'grant',
  'undisclosed'
);

-- User role taxonomy (D-03.3). Injected into JWT via custom_access_token_hook (Plan 03).
CREATE TYPE public.user_role AS ENUM ('user', 'editor', 'admin');

-- Source type taxonomy (used by data_sources.source_type).
CREATE TYPE public.source_type AS ENUM (
  'dart',
  'manual',
  'user_submission',
  'press_release',
  'vc_portfolio',
  'news_mention',
  'kstartup'
);

-- Alias type taxonomy (Pitfalls #8 — 토스 / 비바리퍼블리카 / Toss).
CREATE TYPE public.alias_type AS ENUM ('legal', 'brand', 'english', 'former', 'common');

-- Company status.
CREATE TYPE public.company_status AS ENUM ('alive', 'dead', 'acquired', 'ipo');

-- Investor type.
CREATE TYPE public.investor_type AS ENUM ('vc', 'cvc', 'angel', 'gov_fund', 'accelerator', 'other');

-- Round participant type (Pitfalls #5 — lead vs participant discipline).
CREATE TYPE public.round_participant_type AS ENUM ('lead', 'co_lead', 'participant', 'follow_on', 'unknown');

-- Company identifier kinds (Pitfalls #6 — corp_code vs 사업자번호 vs 법인등록번호).
CREATE TYPE public.identifier_kind AS ENUM ('dart_corp_code', 'business_registration_number', 'corporate_registration_number', 'website_domain');

-- Company relation kinds.
CREATE TYPE public.relation_kind AS ENUM ('parent_subsidiary', 'merger', 'spinoff', 'acquisition');

-- Person role kinds.
CREATE TYPE public.person_role_kind AS ENUM ('ceo', 'cto', 'cfo', 'founder', 'director', 'executive', 'other');
