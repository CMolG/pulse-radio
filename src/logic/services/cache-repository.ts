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
 *
 * Request Deduplication (ARCH-053): Concurrent identical Tier 3 requests share
 * a single in-flight Promise to avoid duplicate API calls.
 */
import { db, timedQuery, recordCacheHit, recordCacheMiss, recordCacheWrite } from '@/logic/db';
import {
  itunesCache,
  artistInfoCache,
  concertsCache,
  lyricsCache,
} from '@/logic/db/schema';
import { cacheGet, cacheSet, type Namespace } from '@/logic/server-cache';
import { safeJsonParse } from '@/logic/sanitize';
import { eq, sql } from 'drizzle-orm';
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';
import { logger } from '@/logic/logger';
import { z } from 'zod';

type CacheTable = typeof itunesCache | typeof artistInfoCache | typeof concertsCache | typeof lyricsCache;

const TABLE_MAP: Record<string, CacheTable> = {
  itunes: itunesCache,
  'artist-info': artistInfoCache,
  concerts: concertsCache,
  lyrics: lyricsCache,
};

// ARCH-053: In-flight request deduplication tracker (module-scoped singleton)
const inflight = new Map<string, Promise<unknown>>();

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
      const row = timedQuery(`cache_read_${namespace}`, () =>
        db.select().from(table).where(eq(table.key, key)).get() as
          | { key: string; payload: string; fetchedAt: number; ttlMs: number }
          | undefined
      );

      if (row) {
        const age = Date.now() - row.fetchedAt;
        if (age < row.ttlMs) {
          // Still fresh — promote to Tier 1 and return
          recordCacheHit();
          const parsed = JSON.parse(row.payload) as T;
          cacheSet(namespace, key, parsed, row.ttlMs - age);
          return parsed;
        }
        // Stale but exists — we'll re-fetch, but keep stale as fallback
      } else {
        recordCacheMiss();
      }
    } catch (e) {
      logger.error('cache_read_failed', e, { namespace, key });
    }
  }

  // ── Tier 3: External API (with request deduplication) ──
  const inflightKey = `${namespace}:${key}`;
  const existing = inflight.get(inflightKey);
  
  let fresh: T | null;
  if (existing) {
    // An identical request is already in-flight; share the Promise
    fresh = await existing as T | null;
  } else {
    // Start new fetch and track it
    const fetchPromise = (async () => {
      try {
        return await fetcher();
      } finally {
        // Clean up after resolution (success or error)
        inflight.delete(inflightKey);
      }
    })();
    
    inflight.set(inflightKey, fetchPromise);
    fresh = await fetchPromise;
  }

  // Persist into both tiers (even null results to avoid repeated lookups)
  const payload = JSON.stringify(fresh);
  cacheSet(namespace, key, fresh, ttlMs);

  if (table) {
    try {
      timedQuery(`cache_write_${namespace}`, () =>
        db.insert(table)
          .values({ key, payload, fetchedAt: Date.now(), ttlMs })
          .onConflictDoUpdate({
            target: table.key,
            set: { payload, fetchedAt: Date.now(), ttlMs },
          })
          .run()
      );
      recordCacheWrite();
    } catch (e) {
      logger.error('cache_write_failed', e, { namespace, key });
    }
  }

  return fresh;
}

interface CacheOptionsWithSchema<T> {
  /** server-cache namespace */
  namespace: Namespace;
  /** normalized cache key */
  key: string;
  /** TTL in milliseconds for both LRU and SQLite */
  ttlMs: number;
  /** Zod schema to validate cached data */
  schema: z.ZodType<T>;
  /** Async function that fetches from the external API. Return null for "no data". */
  fetcher: () => Promise<T | null>;
}

/**
 * Cache resolver with Zod schema validation (ARCH-073).
 * Validates deserialized cache data; if validation fails, treats as cache miss and re-fetches.
 * Never crashes on schema mismatch — just logs a warning and refreshes.
 * Request deduplication (ARCH-053) applies to Tier 3 fetches.
 */
export async function getCachedOrFetch<T>(
  opts: CacheOptionsWithSchema<T>,
): Promise<T | null> {
  const { namespace, key, ttlMs, schema, fetcher } = opts;

  // ── Tier 1: In-memory LRU ──
  const mem = cacheGet<T>(namespace, key);
  if (mem !== undefined) return mem;

  // ── Tier 2: SQLite persistent cache ──
  const table = TABLE_MAP[namespace];
  if (table) {
    try {
      const row = timedQuery(`cache_read_${namespace}`, () =>
        db.select().from(table).where(eq(table.key, key)).get() as
          | { key: string; payload: string; fetchedAt: number; ttlMs: number }
          | undefined
      );

      if (row) {
        const age = Date.now() - row.fetchedAt;
        if (age < row.ttlMs) {
          // Still fresh — validate before returning
          const parsed = JSON.parse(row.payload);
          const validation = schema.safeParse(parsed);

          if (validation.success) {
            recordCacheHit();
            cacheSet(namespace, key, validation.data, row.ttlMs - age);
            return validation.data;
          }

          // Schema validation failed — log warning and treat as cache miss
          logger.warn('cache_schema_validation_failed', {
            namespace,
            key,
            error: validation.error.message,
          });
          // Delete stale entry to avoid re-validating it
          try {
            db.delete(table).where(eq(table.key, key)).run();
          } catch (delErr) {
            logger.error('cache_delete_failed', delErr, { namespace, key });
          }
        }
        // Stale or invalid — re-fetch
      } else {
        recordCacheMiss();
      }
    } catch (e) {
      logger.error('cache_read_failed', e, { namespace, key });
    }
  }

  // ── Tier 3: External API (with request deduplication) ──
  const inflightKey = `${namespace}:${key}`;
  const existing = inflight.get(inflightKey);
  
  let fresh: T | null;
  if (existing) {
    // An identical request is already in-flight; share the Promise
    fresh = await existing as T | null;
  } else {
    // Start new fetch and track it
    const fetchPromise = (async () => {
      try {
        return await fetcher();
      } finally {
        // Clean up after resolution (success or error)
        inflight.delete(inflightKey);
      }
    })();
    
    inflight.set(inflightKey, fetchPromise);
    fresh = await fetchPromise;
  }

  // Persist into both tiers (even null results to avoid repeated lookups)
  const payload = JSON.stringify(fresh);
  cacheSet(namespace, key, fresh, ttlMs);

  if (table) {
    try {
      timedQuery(`cache_write_${namespace}`, () =>
        db.insert(table)
          .values({ key, payload, fetchedAt: Date.now(), ttlMs })
          .onConflictDoUpdate({
            target: table.key,
            set: { payload, fetchedAt: Date.now(), ttlMs },
          })
          .run()
      );
      recordCacheWrite();
    } catch (e) {
      logger.error('cache_write_failed', e, { namespace, key });
    }
  }

  return fresh;
}

/**
 * Used by the cron sync endpoint to know what needs refreshing.
 */
export function getStaleKeys(namespace: Namespace): string[] {
  const table = TABLE_MAP[namespace];
  if (!table) return [];
  try {
    const rows = timedQuery(`cache_scan_stale_${namespace}`, () =>
      db
        .select({ key: table.key })
        .from(table)
        .where(sql`${table.fetchedAt} + ${table.ttlMs} < ${Date.now()}`)
        .all()
    );
    return rows.map((r) => r.key);
  } catch (e) {
    logger.error('cache_stale_keys_failed', e, { namespace });
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
    timedQuery(`cache_persist_${namespace}`, () =>
      db.insert(table)
        .values({ key, payload, fetchedAt: Date.now(), ttlMs })
        .onConflictDoUpdate({
          target: table.key,
          set: { payload, fetchedAt: Date.now(), ttlMs },
        })
        .run()
    );
    recordCacheWrite();
  } catch (e) {
    logger.error('cache_persist_failed', e, { namespace, key });
  }
}
