/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const DATA_DIR = join(process.cwd(), '.data');
const DB_PATH = join(DATA_DIR, 'cache.db');

let _db: BetterSQLite3Database<typeof schema> | null = null;

function initDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;
  mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  // Auto-create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS itunes_cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at INTEGER NOT NULL, ttl_ms INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS artist_info_cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at INTEGER NOT NULL, ttl_ms INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS concerts_cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at INTEGER NOT NULL, ttl_ms INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS lyrics_cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at INTEGER NOT NULL, ttl_ms INTEGER NOT NULL);
  `);
  _db = drizzle(sqlite, { schema });
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
