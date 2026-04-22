import type { SeedCompany } from '../types';

/**
 * Daangn (당근) — SRCH-13 critical brand family.
 * "당근마켓" is the FORMER brand (renamed "당근" in Feb 2023).
 */
export const daangn: SeedCompany = {
  slug: 'daangn',
  display_name_ko: '당근',
  display_name_en: 'Karrot',
  legal_name: '당근마켓 주식회사',
  sector: 'commerce',
  sub_sector: 'c2c_marketplace',
  hq_address: '서울특별시 서초구 강남대로 465',
  founded_at: '2015-07-01',
  description_ko: '하이퍼로컬 중고거래 및 지역 커뮤니티 플랫폼.',
  website_url: 'https://www.daangn.com',
  logo_file: 'daangn.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '당근', alias_type: 'brand', valid_from: '2023-02-01' },
    { alias: '당근마켓', alias_type: 'former', valid_from: '2015-07-01', valid_to: '2023-02-01' },
    { alias: 'Karrot', alias_type: 'english' },
    { alias: '당근마켓 주식회사', alias_type: 'legal', valid_from: '2018-01-01' },
  ],
  funding_rounds: [
    {
      stage: 'series_c',
      amount_minor: 180_000_000_000n, // ₩180B (2021, DST Global lead)
      currency_code: 'KRW',
      original_text: '₩180B (2021, DST Global lead)',
      announced_at: '2021-08-18',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: 'DST 글로벌', name_en: 'DST Global', investor_type: 'vc', participant_type: 'lead' },
        { name_ko: '굿워터캐피탈', name_en: 'Goodwater Capital', investor_type: 'vc', participant_type: 'participant' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '110-86-22502', last_verified_at: '2026-04-21' },
    { kind: 'website_domain', value: 'daangn.com', last_verified_at: '2026-04-21' },
  ],
};
