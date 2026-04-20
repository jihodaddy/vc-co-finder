import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Drizzle query-only client.
 *
 * `prepare: false` is MANDATORY for Supabase's transaction-mode pooler
 * (PgBouncer). Without it, prepared statements leak between connections and
 * the pooler errors under load. See STACK.md §Supporting Libraries.
 *
 * Migrations are managed by the Supabase CLI (SQL files in
 * `supabase/migrations/`), NOT by Drizzle Kit — see phase context D-02.2.
 * Drizzle is used exclusively for typed query composition here.
 */
const client = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(client);
