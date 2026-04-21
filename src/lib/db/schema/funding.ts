import { pgTable, uuid, text, char, bigint, date, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { fundingStage, investorType, roundParticipantType } from './enums';
import { dataSources } from './data-sources';
import { companies } from './companies';

export const investors = pgTable('investors', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameKo: text('name_ko').notNull(),
  nameEn: text('name_en'),
  investorType: investorType('investor_type').notNull().default('other'),
  country: char('country', { length: 2 }).notNull().default('KR'),
  websiteUrl: text('website_url'),
  sourceId: uuid('source_id').notNull().references(() => dataSources.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
export type Investor = typeof investors.$inferSelect;

export const fundingRounds = pgTable('funding_rounds', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  stage: fundingStage('stage').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }),
  currencyCode: char('currency_code', { length: 3 }),
  originalText: text('original_text'),
  postMoneyValuationMinor: bigint('post_money_valuation_minor', { mode: 'bigint' }),
  postMoneyValuationCurrencyCode: char('post_money_valuation_currency_code', { length: 3 }),
  postMoneyValuationOriginalText: text('post_money_valuation_original_text'),
  announcedAt: date('announced_at'),
  closedAt: date('closed_at'),
  sourceId: uuid('source_id').notNull().references(() => dataSources.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
export type FundingRound = typeof fundingRounds.$inferSelect;

export const roundInvestors = pgTable('round_investors', {
  roundId: uuid('round_id').notNull().references(() => fundingRounds.id, { onDelete: 'cascade' }),
  investorId: uuid('investor_id').notNull().references(() => investors.id, { onDelete: 'cascade' }),
  participantType: roundParticipantType('participant_type').notNull().default('unknown'),
  amountMinor: bigint('amount_minor', { mode: 'bigint' }),
  currencyCode: char('currency_code', { length: 3 }),
  amountOriginalText: text('amount_original_text'),
  sourceId: uuid('source_id').notNull().references(() => dataSources.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  pk: primaryKey({ columns: [t.roundId, t.investorId] }),
}));
export type RoundInvestor = typeof roundInvestors.$inferSelect;
