import { ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CompanyLogo } from './CompanyLogo';
import { SourceBadge } from './SourceBadge';
import { WatchlistButton } from './WatchlistButton';
import type { CompanyHero } from '@/lib/data/companies';
import type { WithMeta } from '@/lib/data/_meta';

/**
 * PROF-02 Hero. Implements UI-SPEC §Typography (Display/Heading tiers),
 * §Color accent (website link = reserved accent item #1),
 * §Spacing (gap-6 inter-block, gap-4 inter-item).
 *
 * Placement of SourceBadge: one inline badge at the bottom of the Hero
 * (per D-01 "one per row/section"), carrying the company-level meta
 * (not per-field).
 */
export async function Hero({ company }: { company: WithMeta<CompanyHero> }) {
  const t = await getTranslations('profile.hero');
  return (
    <section
      id="hero"
      aria-labelledby="hero-sr-heading"
      className="flex flex-col gap-6"
    >
      <h2 id="hero-sr-heading" className="sr-only">
        {t('srHeading')}
      </h2>

      <div className="flex items-start gap-4">
        <CompanyLogo
          displayNameKo={company.displayNameKo}
          logoUrl={company.logoUrl}
          size={72}
          priority
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold leading-tight">
            {company.displayNameKo}
          </h1>
          {company.displayNameEn && (
            <p
              className="text-xl font-semibold text-muted-foreground"
              lang="en"
            >
              {company.displayNameEn}
            </p>
          )}
          {company.sector && (
            <Badge variant="secondary" className="w-fit">
              {company.sector}
            </Badge>
          )}
        </div>
        <div className="ml-auto">
          <WatchlistButton companyId={company.id} />
        </div>
      </div>

      <Separator />

      {company.descriptionKo && (
        <p className="text-sm leading-normal line-clamp-2">
          {company.descriptionKo}
        </p>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {company.hqAddress && (
          <>
            <dt className="text-muted-foreground">{t('hqLabel')}</dt>
            <dd>{company.hqAddress}</dd>
          </>
        )}
        {company.websiteUrl && (
          <>
            <dt className="text-muted-foreground">{t('websiteLabel')}</dt>
            <dd>
              <a
                href={company.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                {t('websiteCta')}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </dd>
          </>
        )}
      </dl>

      <div>
        <SourceBadge meta={company._meta} />
      </div>
    </section>
  );
}
