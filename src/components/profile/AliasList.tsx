import { getTranslations } from 'next-intl/server';
import { SourceBadge } from './SourceBadge';
import { cn } from '@/lib/utils';
import type { CompanyAlias } from '@/lib/data/companies';
import type { WithMeta } from '@/lib/data/_meta';

/**
 * PROF-10 Alias list. Implements UI-SPEC §Interaction Contract:
 * - Current legal alias (validTo === null): font-semibold
 * - Former alias (validTo !== null): line-through decoration-muted-foreground
 *                                    + "(YYYY–YYYY)" annotation
 *
 * One SourceBadge per alias row (per D-01).
 */
function formatYearRange(validFrom: string | null, validTo: string | null): string {
  const from = validFrom ? validFrom.slice(0, 4) : '';
  const to = validTo ? validTo.slice(0, 4) : '';
  if (from && to) return `(${from}–${to})`;
  if (to) return `(–${to})`;
  if (from) return `(${from}–)`;
  return '';
}

export async function AliasList({ aliases }: { aliases: WithMeta<CompanyAlias>[] }) {
  const t = await getTranslations('profile.aliases');
  if (aliases.length === 0) {
    return (
      <section id="aliases" className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t('heading')}</h2>
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </section>
    );
  }
  return (
    <section id="aliases" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('heading')}</h2>
      <ul className="flex flex-col gap-2">
        {aliases.map((a) => {
          const isCurrent = a.validTo === null;
          const range = formatYearRange(a.validFrom, a.validTo);
          return (
            <li
              key={a.id}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm"
            >
              <span
                className={cn(
                  isCurrent
                    ? 'font-semibold'
                    : 'line-through decoration-muted-foreground',
                )}
              >
                {a.alias}
              </span>
              {range && (
                <span className="text-muted-foreground">{range}</span>
              )}
              <SourceBadge meta={a._meta} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
