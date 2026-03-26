/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
/**
 * 3-Tier Cache Repository (PROP-003)
 *
 * Tier 1: In-memory LRU  (server-cache.ts) — instant, per-process
 * Tier 2: SQLite database (.data/cache.db)  — persistent, survives restarts
 * Tier 3: External API fetch                — last resort, slow & rate-limited
 *
 * Every successful external fetch is mirrored into both Tier 2 and Tier 1
 * so subsequent requests never touch the network again until TTL expires.
 */
import { db } from '@/lib/db';
import {
  itunesCache,
  artistInfoCache,
  concertsCache,
  lyricsCache,
} from '@/lib/db/schema';
import { cacheGet, cacheSet, type Namespace } from '@/lib/server-cache';
import { eq, sql } from 'drizzle-orm';
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';

type CacheTable = typeof itunesCache | typeof artistInfoCache | typeof concertsCache | typeof lyricsCache;

const TABLE_MAP: Record<string, CacheTable> = {
  itunes: itunesCache,
  'artist-info': artistInfoCache,
  concerts: concertsCache,
  lyrics: lyricsCache,
};

interface CacheOptions<T> {
  /** server-cache namespace */
  namespace: Namespace;
  /** normalized cache key */
  key: string;
  /** TTL in milliseconds for both LRU and SQLite */
  ttlMs: number;
  /** Async function that fetches from the external API. Return null for "no data". */
  fetcher: () => Promise<T | null>;
}

/**
 * Main entry point for the 3-tier cache.
 * Returns cached data or fetches fresh, persisting across all tiers.
 */
export async function cacheResolve<T>(opts: CacheOptions<T>): Promise<T | null> {
  const { namespace, key, ttlMs, fetcher } = opts;

  // ── Tier 1: In-memory LRU ──
  const mem = cacheGet<T>(namespace, key);
  if (mem !== undefined) return mem;

  // ── Tier 2: SQLite persistent cache ──
  const table = TABLE_MAP[namespace];
  if (table) {
    try {
      const row = db.select().from(table).where(eq(table.key, key)).get() as
        | { key: string; payload: string; fetchedAt: number; ttlMs: number }
        | undefined;

      if (row) {
        const age = Date.now() - row.fetchedAt;
        if (age < row.ttlMs) {
          // Still fresh — promote to Tier 1 and return
          const parsed = JSON.parse(row.payload) as T;
          cacheSet(namespace, key, parsed, row.ttlMs - age);
          return parsed;
        }
        // Stale but exists — we'll re-fetch, but keep stale as fallback
      }
    } catch {
      // SQLite read failure — proceed to Tier 3
    }
  }

  // ── Tier 3: External API ──
  const fresh = await fetcher();

  // Persist into both tiers (even null results to avoid repeated lookups)
  const payload = JSON.stringify(fresh);
  cacheSet(namespace, key, fresh, ttlMs);

  if (table) {
    try {
      db.insert(table)
        .values({ key, payload, fetchedAt: Date.now(), ttlMs })
        .onConflictDoUpdate({
          target: table.key,
          set: { payload, fetchedAt: Date.now(), ttlMs },
        })
        .run();
    } catch {
      // SQLite write failure — non-fatal, data still in LRU
    }
  }

  return fresh;
}

/**
 * Returns all stale records from a given namespace table.
 * Used by the cron sync endpoint to know what needs refreshing.
 */
export function getStaleKeys(namespace: Namespace): string[] {
  const table = TABLE_MAP[namespace];
  if (!table) return [];
  try {
    const rows = db
      .select({ key: table.key })
      .from(table)
      .where(sql`${table.fetchedAt} + ${table.ttlMs} < ${Date.now()}`)
      .all();
    return rows.map((r) => r.key);
  } catch {
    return [];
  }
}

/**
 * Directly persist a record into the SQLite tier (used by cron sync).
 */
export function persistToDb<T>(namespace: Namespace, key: string, value: T, ttlMs: number): void {
  const table = TABLE_MAP[namespace];
  if (!table) return;
  const payload = JSON.stringify(value);
  try {
    db.insert(table)
      .values({ key, payload, fetchedAt: Date.now(), ttlMs })
      .onConflictDoUpdate({
        target: table.key,
        set: { payload, fetchedAt: Date.now(), ttlMs },
      })
      .run();
  } catch {
    // non-fatal
  }
}
