import { format, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * Profile-page date formatter. Outputs `YYYY-MM-DD` for use inside the
 * SourceBadge ICU slot `{date}` (see `profile.source.badge`).
 *
 * Rationale: Stripe/Linear tone — precise, unambiguous, locale-neutral
 * (both ko and en readers parse YYYY-MM-DD). When we add en.json
 * translations in Phase 8, we can introduce `formatProfileDateLocalized`
 * using date-fns `format` with the per-locale module.
 *
 * NOT server-only — usable in RSC AND client (for the Phase 4c ♡ button).
 */
export function formatProfileDate(iso: string): string {
  const d = iso.length === 10 ? parseISO(iso) : new Date(iso);
  if (!isValid(d)) throw new Error(`formatProfileDate: invalid input "${iso}"`);
  return format(d, 'yyyy-MM-dd', { locale: ko });
}
