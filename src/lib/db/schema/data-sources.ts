import { pgTable, uuid, text, timestamp, numeric } from 'drizzle-orm/pg-core';
import { sourceType } from './enums';

export const dataSources = pgTable('data_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceType: sourceType('source_type').notNull(),
  sourceUrl: text('source_url'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  etlRunId: text('etl_run_id'),
  confidence: numeric('confidence', { precision: 3, scale: 2 }),
  rawPayloadRef: text('raw_payload_ref'),
  licenseNote: text('license_note'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type DataSource = typeof dataSources.$inferSelect;
