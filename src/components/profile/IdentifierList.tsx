import { getTranslations } from 'next-intl/server';
import { SourceBadge } from './SourceBadge';
import type { CompanyIdentifierRow } from '@/lib/data/companies';
import type { WithMeta } from '@/lib/data/_meta';

/**
 * Phase 2 identifier list (corp_code / 사업자번호 / 법인번호 / domain).
 *
 * D-03 section order: renders after FundingRounds, before any future
 * Phase 4a/6/7 sections. One SourceBadge per row.
 *
 * Value column uses `tabular-nums` (UI-SPEC §Typography tier whitelist
 * compliance — a variant, not a tier, so compatible with the
 * Display/Heading/Body/Meta tier restriction). Monospace fonts are
 * intentionally avoided — hyphenated 사업자번호 already reads as
 * fixed-width, and `tabular-nums` aligns digits without font change.
 */
export async function IdentifierList({
  identifiers,
}: {
  identifiers: WithMeta<CompanyIdentifierRow>[];
}) {
  const t = await getTranslations('profile.identifiers');
  if (identifiers.length === 0) {
    return (
      <section id="identifiers" className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t('heading')}</h2>
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </section>
    );
  }
  // Container-query layout: narrow widths stack the SourceBadge onto a
  // second row beneath the value (prevents 3-line wraps for long hyphenated
  // 사업자번호 at 375 px). ≥ 480px container width switches to the
  // 3-column grid (label | value | source) to keep desktop reading density.
  return (
    <section id="identifiers" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('heading')}</h2>
      <div className="@container">
        <ul className="flex flex-col gap-3 @[28rem]:hidden">
          {identifiers.map((i) => (
            <li key={i.id} className="flex flex-col gap-1 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground shrink-0">
                  {t(`kind.${i.kind}`)}
                </span>
                <span className="tabular-nums break-all">{i.value}</span>
              </div>
              <div className="pl-0">
                <SourceBadge meta={i._meta} />
              </div>
            </li>
          ))}
        </ul>
        <dl className="hidden @[28rem]:grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-2 text-sm">
          {identifiers.map((i) => (
            <div key={i.id} className="contents">
              <dt className="text-muted-foreground">{t(`kind.${i.kind}`)}</dt>
              <dd className="tabular-nums">{i.value}</dd>
              <dd><SourceBadge meta={i._meta} /></dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
