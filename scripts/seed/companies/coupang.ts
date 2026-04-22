import type { SeedCompany } from '../types';

/**
 * Coupang (쿠팡) — SRCH-13 critical brand family.
 * NYSE-listed (CPNG) — SEC filings are primary source.
 *
 * Note on stage mapping: The 2018 SoftBank round was originally reported
 * as "Series G" by Reuters. Phase 2 funding_stage ENUM (migration 0002)
 * does NOT include series_e/f/g — per CONTEXT §In-Scope we do NOT extend
 * the ENUM in Phase 2. Map to `series_d` (nearest late-stage) and annotate
 * the original stage string in `original_text` for researcher transparency.
 */
export const coupang: SeedCompany = {
  slug: 'coupang',
  display_name_ko: '쿠팡',
  display_name_en: 'Coupang',
  legal_name: '쿠팡 주식회사',
  sector: 'commerce',
  sub_sector: 'ecommerce',
  hq_address: '서울특별시 송파구 송파대로 570',
  founded_at: '2010-08-10',
  description_ko: '한국의 대규모 이커머스 플랫폼 — Rocket Delivery 배송 네트워크 운영.',
  website_url: 'https://www.coupang.com',
  logo_file: 'coupang.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '쿠팡', alias_type: 'brand', valid_from: '2010-08-10' },
    { alias: 'Coupang', alias_type: 'english' },
    { alias: '쿠팡 주식회사', alias_type: 'legal' },
    { alias: 'Coupang, Inc.', alias_type: 'english' }, // Delaware parent
  ],
  funding_rounds: [
    {
      stage: 'series_d',
      announced_at: '2018-11-20',
      original_text: '$2B (2018, SoftBank Vision Fund lead — 원본은 Series G; funding_stage ENUM 한정으로 series_d로 매핑). 출처: Reuters 공식 발표',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '소프트뱅크 비전펀드', name_en: 'SoftBank Vision Fund', investor_type: 'vc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '120-88-00767', last_verified_at: '2026-04-21' },
    { kind: 'website_domain', value: 'coupang.com', last_verified_at: '2026-04-21' },
  ],
};
