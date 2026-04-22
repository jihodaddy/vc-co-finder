/* eslint-disable no-console */
// One-off migration pusher. Reads DATABASE_URL from .env.local, connects via
// Postgres wire protocol (bypasses supabase CLI URL-parsing bug with @ in
// password), and applies every supabase/migrations/*.sql in numeric order.
//
// Idempotency: each migration file is wrapped in a tx that records its name
// in supabase_migrations.schema_migrations so reruns are safe.
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL missing from .env.local');
  process.exit(1);
}

// Manual parse — pg's `new URL()` chokes on unencoded `@` in password.
// Format: postgresql://USER:PASSWORD@HOST:PORT/DB?params
function parseUrl(raw) {
  const m = raw.match(/^postgres(?:ql)?:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/([^?]+)(\?.*)?$/);
  if (!m) throw new Error('DATABASE_URL parse failed');
  const [, user, password, host, port, database] = m;
  return {
    user,
    password: decodeURIComponent(password),
    host,
    port: Number(port),
    database,
  };
}

const MIG_DIR = path.join(__dirname, '..', '..', 'supabase', 'migrations');

async function main() {
  const cfg = parseUrl(DATABASE_URL.replace(/^"(.*)"$/, '$1'));
  console.log(`[mig] connecting user=${cfg.user} host=${cfg.host} port=${cfg.port} db=${cfg.database}`);
  const client = new Client({ ...cfg, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('[mig] connected');

  await client.query(`
    CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const files = fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    (await client.query('SELECT version FROM supabase_migrations.schema_migrations')).rows.map(
      (r) => r.version
    )
  );

  let ran = 0;
  for (const f of files) {
    const version = f.replace(/\.sql$/, '');
    if (applied.has(version)) {
      console.log(`[mig] skip ${f} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIG_DIR, f), 'utf8');
    console.log(`[mig] → ${f} (${sql.length} chars)`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2)',
        [version, f]
      );
      await client.query('COMMIT');
      console.log(`[mig] ✓ ${f}`);
      ran++;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`[mig] ✗ ${f}: ${err.message}`);
      throw err;
    }
  }

  console.log(`[mig] done: ${ran} applied, ${files.length - ran} skipped`);
  await client.end();
}

main().catch((err) => {
  console.error('[mig] FATAL:', err.message);
  process.exit(1);
});
