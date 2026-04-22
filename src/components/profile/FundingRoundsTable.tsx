import { getTranslations } from 'next-intl/server';
import {
  Table, TableBody, TableCaption, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SourceBadge } from './SourceBadge';
import { formatKRW } from '@/lib/format/currency';
import { stageLabel } from '@/lib/format/stage';
import { formatProfileDate } from '@/lib/format/date';
import { cn } from '@/lib/utils';
import type { CompanyFundingRound } from '@/lib/data/companies';
import type { WithMeta } from '@/lib/data/_meta';

/**
 * PROF-03 funding-round table + PROF-08 mobile responsive.
 *
 * Implements UI-SPEC §Responsive Contract: @container query switches
 * between <Table> (≥ 640px container width) and <ul> of cards
 * (< 640px container width). Tailwind v4 has built-in @container.
 *
 * Investor chips: lead = font-semibold border, participant = default.
 * Row-level SourceBadge (D-01 one-per-row rule).
 */

type Props = { rounds: WithMeta<CompanyFundingRound>[] };

export async function FundingRoundsTable({ rounds }: Props) {
  const t = await getTranslations('profile.rounds');
  const columns = {
    stage: t('columns.stage'),
    announcedAt: t('columns.announcedAt'),
    amount: t('columns.amount'),
    investors: t('columns.investors'),
  };
  const leadSr = t('leadAriaLabel');
  const participantSr = t('participantAriaLabel');
  const tableCaption = t('tableCaption');
  const undisclosed = t('undisclosed');

  if (rounds.length === 0) {
    return (
      <section id="funding-rounds" className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t('heading')}</h2>
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </section>
    );
  }

  return (
    <section id="funding-rounds" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('heading')}</h2>
      <div className="@container">
        {/* Table variant (container ≥ 640px wide) */}
        <div className="hidden @sm:block">
          <Table>
            <TableCaption className="sr-only">{tableCaption}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{columns.stage}</TableHead>
                <TableHead>{columns.announcedAt}</TableHead>
                <TableHead>{columns.amount}</TableHead>
                <TableHead>{columns.investors}</TableHead>
                <TableHead className="sr-only">출처</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rounds.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/40">
                  <TableCell className="font-normal">
                    {stageLabel(r.stage, 'ko')}
                  </TableCell>
                  <TableCell>
                    {r.announcedAt ? formatProfileDate(r.announcedAt) : '—'}
                  </TableCell>
                  <TableCell>
                    {r.amountMinor === null
                      ? undisclosed
                      : r.originalText ?? formatKRW(r.amountMinor)}
                  </TableCell>
                  <TableCell>
                    <InvestorChips
                      investors={r.investors}
                      leadSr={leadSr}
                      participantSr={participantSr}
                    />
                  </TableCell>
                  <TableCell>
                    {r.amountMinor === null ? null : <SourceBadge meta={r._meta} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Card variant (container < 640px) — mobile + Phase 6 narrow layouts */}
        <ul className="@sm:hidden flex flex-col gap-3">
          {rounds.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border bg-card p-4 flex flex-col gap-2"
            >
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">{columns.stage}</dt>
                <dd>{stageLabel(r.stage, 'ko')}</dd>

                <dt className="text-muted-foreground">{columns.announcedAt}</dt>
                <dd>{r.announcedAt ? formatProfileDate(r.announcedAt) : '—'}</dd>

                <dt className="text-muted-foreground">{columns.amount}</dt>
                <dd>
                  {r.amountMinor === null
                    ? undisclosed
                    : r.originalText ?? formatKRW(r.amountMinor)}
                </dd>

                <dt className="text-muted-foreground">{columns.investors}</dt>
                <dd>
                  <InvestorChips
                    investors={r.investors}
                    leadSr={leadSr}
                    participantSr={participantSr}
                  />
                </dd>
              </dl>
              {r.amountMinor !== null && <SourceBadge meta={r._meta} />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function InvestorChips({
  investors,
  leadSr,
  participantSr,
}: {
  investors: CompanyFundingRound['investors'];
  leadSr: string;
  participantSr: string;
}) {
  if (investors.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {investors.map((inv) => {
        const isLead = inv.participantType === 'lead' || inv.participantType === 'co_lead';
        return (
          <Badge
            key={inv.id}
            variant="secondary"
            className={cn(
              'text-[11px] font-normal',
              isLead && 'font-semibold border-primary/40',
            )}
          >
            <span className="sr-only">
              {isLead ? leadSr : participantSr}:&nbsp;
            </span>
            {inv.nameKo}
          </Badge>
        );
      })}
    </div>
  );
}
