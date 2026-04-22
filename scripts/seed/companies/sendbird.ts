import type { SeedCompany } from '../types';

/**
 * Sendbird (센드버드) — enterprise SaaS (chat/messaging API).
 * Y Combinator W16 출신, 미국 본사 + 서울 R&D.
 */
export const sendbird: SeedCompany = {
  slug: 'sendbird',
  display_name_ko: '센드버드',
  display_name_en: 'Sendbird',
  legal_name: 'Sendbird, Inc.',
  sector: 'saas',
  sub_sector: 'communication_api',
  hq_address: '미국 캘리포니아주 샌머테이오 (서울 R&D 센터 병행)',
  founded_at: '2013-01-01',
  description_ko: '챗·라이브·콜 통합 커뮤니케이션 API SaaS — YC W16 출신.',
  website_url: 'https://sendbird.com',
  logo_file: 'sendbird.png',
  source_type: 'manual',
  last_verified_at: '2026-04-21',
  aliases: [
    { alias: '센드버드', alias_type: 'brand' },
    { alias: 'Sendbird', alias_type: 'english' },
    { alias: 'Sendbird, Inc.', alias_type: 'legal' },
    { alias: 'SmileFam', alias_type: 'former' },
  ],
  funding_rounds: [
    {
      stage: 'series_c',
      amount_minor: 1_000_000_000_00n, // $100M in USD cents — will be converted at seed time
      currency_code: 'USD',
      announced_at: '2021-04-07',
      original_text: '$100M Series C (2021, Steadfast Capital Ventures lead)',
      last_verified_at: '2026-04-21',
      investors: [
        { name_ko: '스테드패스트캐피탈', name_en: 'Steadfast Capital Ventures', investor_type: 'vc', participant_type: 'lead' },
      ],
    },
  ],
  identifiers: [
    { kind: 'website_domain', value: 'sendbird.com', last_verified_at: '2026-04-21' },
  ],
};
