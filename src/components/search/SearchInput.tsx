'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandList,
} from '@/components/ui/command';
import { autocompleteAction } from '@/lib/search/autocomplete-action';
import { AutocompleteList } from './AutocompleteList';
import type { AutocompleteHit } from '@/lib/search/types';

/**
 * SRCH-07 — global alias-aware autocomplete input (UI-SPEC §Autocomplete).
 *
 * Contract:
 *   - Debounce 150ms (UI-SPEC §Interaction Timing) before hitting the
 *     Server Action. Each keystroke clears the pending timer so only
 *     the "rest state" input fires a query.
 *   - `<Command shouldFilter={false}>` — suggestions are server-driven
 *     (PGroonga bigram + alias JOIN); client does NOT filter. Otherwise
 *     cmdk's built-in substring filter would double-cull bigram hits.
 *   - Enter / click on a suggestion calls `router.push('/{locale}/companies/{slug}')`
 *     — autocomplete commits NAVIGATION, not filter state (UI-SPEC
 *     §Autocomplete "Non-goals"). The search input is a jump-to-company
 *     affordance, not a free-text facet.
 *   - Escape closes the popover without changing the query or URL.
 *   - Loading copy flashes only while the in-flight transition is
 *     pending — consumers of the `loading` flag see < 120ms jitter on
 *     fast matches and an explicit "검색 중..." row on slow matches.
 *
 * Accessibility: left-side search glyph is `aria-hidden`; the input
 * carries `aria-label={t('input.srLabel')}` for screen readers.
 */
export function SearchInput() {
  const t = useTranslations('search');
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<AutocompleteHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length === 0) {
      setHits([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        void (async () => {
          setLoading(true);
          try {
            const res = await autocompleteAction(query);
            setHits(res);
            setOpen(true);
          } finally {
            setLoading(false);
          }
        })();
      });
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function navigate(slug: string) {
    setOpen(false);
    router.push(`/${locale}/companies/${slug}`);
  }

  const showPopover = open && (loading || hits.length > 0 || query.length > 0);

  return (
    <Popover open={showPopover} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative rounded-[14px] border border-[color:var(--border)] bg-[color:var(--card)] shadow-[0_2px_8px_rgba(20,18,14,0.04),0_20px_40px_-20px_rgba(20,18,14,0.12)] focus-within:ring-2 focus-within:ring-[color:var(--primary)]/25 transition-shadow">
          <Search
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          />
          <Input
            type="text"
            placeholder={t('input.placeholder')}
            aria-label={t('input.srLabel')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.length > 0) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
            className="pl-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-0 w-[var(--radix-popover-trigger-width)]"
      >
        <Command shouldFilter={false}>
          <CommandList>
            {loading && (
              <div className="p-3 text-sm text-muted-foreground">
                {t('autocomplete.loading')}
              </div>
            )}
            {!loading && hits.length === 0 && query.length > 0 && (
              <CommandEmpty>{t('autocomplete.empty')}</CommandEmpty>
            )}
            {!loading && hits.length > 0 && (
              <CommandGroup heading={t('autocomplete.heading')}>
                <AutocompleteList hits={hits} onSelect={navigate} />
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
