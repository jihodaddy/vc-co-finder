'use client';

import { useTranslations } from 'next-intl';
import { CommandItem } from '@/components/ui/command';
import type { AutocompleteHit } from '@/lib/search/types';

/**
 * Autocomplete suggestion rows (SRCH-07 + UI-SPEC §Autocomplete).
 *
 * Each row renders:
 *   - a small letter-avatar (client-safe; avoids the server-only
 *     `<CompanyLogo>` async RSC so this client component can render
 *     inside a Popover without stepping on RSC/client boundaries)
 *   - the canonical `displayNameKo` at Body weight/size
 *   - an optional trailing alias hint when the match was on an alias
 *     rather than the canonical name (e.g., "비바리퍼블리카 (법인명)")
 *
 * Alias-type label path (UI-SPEC §Copywriting Contract):
 *   - Phase 2 `profile.stage.*` exists, but there is no `profile.alias.type.*`
 *     namespace. Until that lands, fall back to the raw `matchedAliasType`
 *     string — the ICU `autocomplete.aliasHint` message already includes
 *     both canonical name and alias-type value in a human-parseable form.
 */
type Props = {
  hits: AutocompleteHit[];
  onSelect: (slug: string) => void;
};

export function AutocompleteList({ hits, onSelect }: Props) {
  const t = useTranslations('search');
  return (
    <>
      {hits.map((h) => {
        const letter = h.displayNameKo.trim().charAt(0) || '?';
        return (
          <CommandItem
            key={h.companyId}
            value={`${h.slug}|${h.matchedAlias ?? ''}`}
            onSelect={() => onSelect(h.slug)}
            className="flex items-center gap-2"
          >
            <span
              aria-hidden
              className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-muted text-muted-foreground text-[10px] font-semibold"
            >
              {letter}
            </span>
            <span className="font-semibold">{h.displayNameKo}</span>
            {h.matchedAlias && h.matchedAliasType && (
              <span className="text-muted-foreground text-xs ml-auto">
                {t('autocomplete.aliasHint', {
                  canonical: h.matchedAlias,
                  aliasType: h.matchedAliasType,
                })}
              </span>
            )}
          </CommandItem>
        );
      })}
    </>
  );
}
