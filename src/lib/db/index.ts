/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
/**
 * Database singleton with auto-migration.
 *
 * Schema changes workflow:
 *   1. Edit src/lib/db/schema.ts
 *   2. Run `npm run db:generate` to create a migration
 *   3. Commit the migration file in drizzle/
 *   4. Deploy — migrations run automatically on startup
 */
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const DATA_DIR = join(process.cwd(), '.data');
const DB_PATH = join(DATA_DIR, 'cache.db');
const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

let _db: BetterSQLite3Database<typeof schema> | null = null;

function initDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;
  mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('analysis_limit = 1000');
  sqlite.exec('ANALYZE;');
  _db = drizzle(sqlite, { schema });
  migrate(_db, { migrationsFolder: MIGRATIONS_DIR });
  return _db;
}

/** Lazy-initialized Drizzle database instance — safe for multi-worker builds. */
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop, receiver) {
    const real = initDb();
    return Reflect.get(real, prop, receiver);
  },
});

export { schema };
