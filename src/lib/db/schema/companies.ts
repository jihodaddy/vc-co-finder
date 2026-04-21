import { pgTable, uuid, text, char, date, timestamp, unique } from 'drizzle-orm/pg-core';
import { companyStatus, aliasType, identifierKind } from './enums';
import { dataSources } from './data-sources';

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  legalName: text('legal_name'),
  displayNameKo: text('display_name_ko').notNull(),
  displayNameEn: text('display_name_en'),
  region: char('region', { length: 2 }).notNull().default('KR'),
  status: companyStatus('status').notNull().default('alive'),
  foundedAt: date('founded_at'),
  sector: text('sector'),
  subSector: text('sub_sector'),
  hqAddress: text('hq_address'),
  descriptionKo: text('description_ko'),
  descriptionEn: text('description_en'),
  websiteUrl: text('website_url'),
  logoUrl: text('logo_url'),
  sourceId: uuid('source_id').notNull().references(() => dataSources.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
export type Company = typeof companies.$inferSelect;

export const aliases = pgTable('aliases', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  alias: text('alias').notNull(),
  aliasType: aliasType('alias_type').notNull(),
  validFrom: date('valid_from'),
  validTo: date('valid_to'),
  sourceId: uuid('source_id').notNull().references(() => dataSources.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  uniqCompanyAliasType: unique('aliases_company_alias_type_unique').on(t.companyId, t.alias, t.aliasType),
}));
export type Alias = typeof aliases.$inferSelect;

export const companyIdentifiers = pgTable('company_identifiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  kind: identifierKind('kind').notNull(),
  value: text('value').notNull(),
  sourceId: uuid('source_id').notNull().references(() => dataSources.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  uniqKindValue: unique('company_identifiers_kind_value_unique').on(t.kind, t.value),
}));
export type CompanyIdentifier = typeof companyIdentifiers.$inferSelect;
