import { Badge } from '@/components/ui/badge';
import { getTranslations } from 'next-intl/server';
import { type SourceMeta } from '@/lib/data/_meta';
import { freshnessLevel, FRESHNESS_DOT_CLASS } from '@/lib/data/freshness';
import { formatProfileDate } from '@/lib/format/date';
import { cn } from '@/lib/utils';

/**
 * TRUST-04 + TRUST-05 inline pill.
 *
 * Implements UI-SPEC §Typography (Meta tier 11px) +
 * §Color (Freshness semantic palette) + §Copywriting (profile.source.badge).
 *
 * Placement policy (D-01): render ONE badge per fact row. Do not render
 * per-cell in tables — causes badge-density fatigue (RESEARCH Pitfall 2).
 */
export async function SourceBadge({ meta }: { meta: SourceMeta }) {
  const t = await getTranslations('profile');
  const level = freshnessLevel(meta.lastVerifiedAt);
  const sourceLabel = t(`source.type.${meta.sourceType}` as const);
  const date = formatProfileDate(meta.lastVerifiedAt);
  const srLabel = t(`freshness.${level}` as const);

  return (
    <Badge
      variant="secondary"
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-normal',
        'leading-tight px-2 py-0.5',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full bg-current',
          FRESHNESS_DOT_CLASS[level],
        )}
      />
      <span className="sr-only">{srLabel}</span>
      <span>{t('source.badge', { sourceLabel, date })}</span>
    </Badge>
  );
}
