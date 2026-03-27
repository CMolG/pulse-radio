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
import { mkdirSync, statSync } from 'node:fs';
import { logger } from '@/lib/logger';

const DATA_DIR = join(process.cwd(), '.data');
const DB_PATH = join(DATA_DIR, 'cache.db');
const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

const DB_SIZE_WARNING_BYTES = 100 * 1024 * 1024; // 100 MB

// Query performance monitoring (ARCH-085)
const cacheStats = { hits: 0, misses: 0, writes: 0 };

export function getCacheStats() {
  return { ...cacheStats };
}

export function timedQuery<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  if (duration > 50) {
    logger.warn('slow_query', { label, duration_ms: Math.round(duration) });
  }
  return result;
}

export function recordCacheHit() {
  cacheStats.hits++;
}

export function recordCacheMiss() {
  cacheStats.misses++;
}

export function recordCacheWrite() {
  cacheStats.writes++;
}

let _db: BetterSQLite3Database<typeof schema> | null = null;
let _sqlite: InstanceType<typeof Database> | null = null;

function initDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;
  mkdirSync(DATA_DIR, { recursive: true });
  _sqlite = new Database(DB_PATH);
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.pragma('busy_timeout = 5000');
  _sqlite.pragma('analysis_limit = 1000');
  _sqlite.exec('ANALYZE;');
  _db = drizzle(_sqlite, { schema });
  migrate(_db, { migrationsFolder: MIGRATIONS_DIR });

  // Warn if the database file exceeds the size threshold
  const sizeBytes = getDatabaseSizeBytes();
  if (sizeBytes > DB_SIZE_WARNING_BYTES) {
    console.warn(
      `[pulse-radio] SQLite database is ${(sizeBytes / 1024 / 1024).toFixed(1)} MB — exceeds ${DB_SIZE_WARNING_BYTES / 1024 / 1024} MB threshold`,
    );
  }

  return _db;
}

/** Check whether the SQLite database is healthy via an integrity check. */
export function isDatabaseHealthy(): boolean {
  try {
    if (!_sqlite) initDb();
    _sqlite!.pragma('integrity_check(1)');
    return true;
  } catch {
    return false;
  }
}

/** Return the size of the database file in bytes. */
export function getDatabaseSizeBytes(): number {
  const stat = statSync(DB_PATH);
  return stat.size;
}

let _closed = false;

/** Close the database gracefully — flush WAL and release the file handle. */
export function closeDb(): void {
  if (_sqlite) {
    _closed = true;
    try {
      _sqlite.pragma('wal_checkpoint(TRUNCATE)');
    } catch { /* best-effort checkpoint */ }
    try {
      _sqlite.close();
    } catch { /* best-effort close */ }
    _sqlite = null;
    _db = null;
  }
}

/** Lazy-initialized Drizzle database instance — safe for multi-worker builds. */
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop, receiver) {
    if (_closed) throw new Error('Database is shutting down');
    const real = initDb();
    return Reflect.get(real, prop, receiver);
  },
});

export { schema };
