import type { SeedCompany } from '../types';

/**
 * Toss (비바리퍼블리카) — SRCH-13 critical brand family.
 * Do NOT delete aliases without updating:
 *   - scripts/seed/companies/CRITICAL.md
 *   - tests/unit/seed-coverage.test.ts
 */
export const toss: SeedCompany = {
  slug: 'toss',
  display_name_ko: '토스',
  display_name_en: 'Toss',
  legal_name: '비바리퍼블리카',
  sector: 'fintech',
  sub_sector: 'payments',
  hq_address: '서울특별시 강남구 테헤란로 142',
  founded_at: '2013-04-23',
  description_ko: '간편 송금과 통합 금융 서비스를 제공하는 한국 핀테크 플랫폼.',
  website_url: 'https://toss.im',
  logo_file: 'toss.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '토스', alias_type: 'brand', valid_from: '2015-02-01' },
    { alias: '비바리퍼블리카', alias_type: 'legal', valid_from: '2013-04-23' },
    { alias: 'Toss', alias_type: 'english' },
    { alias: 'Viva Republica', alias_type: 'english' },
    { alias: '토스뱅크', alias_type: 'brand', valid_from: '2021-10-05' },
  ],
  funding_rounds: [
    {
      stage: 'series_d',
      amount_minor: 170_000_000_000n, // ₩170B (2018, Sequoia lead)
      currency_code: 'KRW',
      original_text: '₩170B (2018, Sequoia lead)',
      announced_at: '2018-12-13',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '세쿼이아캐피탈', name_en: 'Sequoia Capital', investor_type: 'vc', participant_type: 'lead' },
        { name_ko: '클라이너퍼킨스', name_en: 'Kleiner Perkins', investor_type: 'vc', participant_type: 'participant' },
      ],
    },
    {
      stage: 'series_d',
      // 2021 pre-IPO round — amount varies by report. Mark 비공개 for honesty.
      announced_at: '2021-06-23',
      original_text: '프리IPO 라운드 (공개 자료 출처: 보도자료 — 금액 비공개)',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '알카에온파이낸스', name_en: 'Alkeon Capital', investor_type: 'vc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'business_registration_number', value: '110-81-94746', last_verified_at: '2026-04-21' },
    { kind: 'website_domain', value: 'toss.im', last_verified_at: '2026-04-21' },
  ],
};
