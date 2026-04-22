import type { SeedCompany } from '../types';

/**
 * Woowa Brothers (우아한형제들) — 배민 모회사 (법인 관점 별도 slug).
 *
 * baemin.ts와의 관계: baemin.ts는 브랜드("배민/배달의민족") 관점의 프로필,
 * woowa.ts는 법인 관점의 프로필. 두 슬러그가 분리되어 있으면 검색 결과에서
 * "우아한형제들" 쿼리가 woowa로, "배민"이 baemin으로 분리 해석 가능.
 * (SRCH-13 호환을 위해 baemin.ts에도 '우아한형제들' alias는 유지.)
 */
export const woowa: SeedCompany = {
  slug: 'woowa',
  display_name_ko: '우아한형제들',
  display_name_en: 'Woowa Brothers',
  legal_name: '주식회사 우아한형제들',
  sector: 'mobility',
  sub_sector: 'food_delivery',
  hq_address: '서울특별시 송파구 위례성대로 2',
  founded_at: '2010-07-01',
  description_ko: '배달의민족 앱을 운영하는 법인 — Delivery Hero 산하.',
  website_url: 'https://www.woowahan.com',
  logo_file: 'woowa.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '우아한형제들', alias_type: 'brand' },
    { alias: '주식회사 우아한형제들', alias_type: 'legal' },
    { alias: 'Woowa Brothers', alias_type: 'english' },
    { alias: 'Woowa Brothers Corp.', alias_type: 'english' },
  ],
  funding_rounds: [],
  // NOTE: 사업자등록번호 '120-87-81003'은 baemin.ts가 보유 (company_identifiers
  // UNIQUE (kind, value) 글로벌 제약). woowa 슬러그는 corporate_registration_number
  // 또는 법인등록번호 공개 자료 확보 시 승격 가능. 현재는 도메인만.
  identifiers: [
    { kind: 'website_domain', value: 'woowahan.com', last_verified_at: '2026-04-21' },
  ],
};
