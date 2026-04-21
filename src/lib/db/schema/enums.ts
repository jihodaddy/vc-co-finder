import { pgEnum } from 'drizzle-orm/pg-core';

export const fundingStage = pgEnum('funding_stage', [
  'pre_a', 'seed', 'series_a', 'series_b', 'series_c', 'series_d',
  'bridge', 'safe', 'convertible_note', 'grant', 'undisclosed',
]);
export const sourceType = pgEnum('source_type', [
  'dart', 'manual', 'user_submission', 'press_release',
  'vc_portfolio', 'news_mention', 'kstartup',
]);
export const aliasType = pgEnum('alias_type', [
  'legal', 'brand', 'english', 'former', 'common',
]);
export const companyStatus = pgEnum('company_status', [
  'alive', 'dead', 'acquired', 'ipo',
]);
export const investorType = pgEnum('investor_type', [
  'vc', 'cvc', 'angel', 'gov_fund', 'accelerator', 'other',
]);
export const roundParticipantType = pgEnum('round_participant_type', [
  'lead', 'co_lead', 'participant', 'follow_on', 'unknown',
]);
export const identifierKind = pgEnum('identifier_kind', [
  'dart_corp_code', 'business_registration_number',
  'corporate_registration_number', 'website_domain',
]);
