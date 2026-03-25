/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
/**
 * In-memory LRU cache with TTL for server-side API routes.
 * Shared within a single Node.js process (single Vercel function instance).
 * Cache entries expire automatically via TTL and eviction when max size is reached.
 */

type Namespace = 'itunes' | 'artist-info' | 'concerts' | 'lyrics' | 'station-blacklist';

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const MAX_ENTRIES_PER_NS = 1000;

const _stores = new Map<Namespace, Map<string, CacheEntry<unknown>>>();

function _store(ns: Namespace): Map<string, CacheEntry<unknown>> {
  let s = _stores.get(ns);
  if (!s) {
    s = new Map();
    _stores.set(ns, s);
  }
  return s;
}

function _evict(store: Map<string, CacheEntry<unknown>>): void {
  const now = Date.now();
  // First pass: remove expired entries
  for (const [k, e] of store) {
    if (e.expires <= now) store.delete(k);
  }
  // Second pass: if still too large, remove oldest (first inserted) entries
  if (store.size >= MAX_ENTRIES_PER_NS) {
    const toDelete = store.size - MAX_ENTRIES_PER_NS + 1;
    let deleted = 0;
    for (const k of store.keys()) {
      store.delete(k);
      if (++deleted >= toDelete) break;
    }
  }
}

export function cacheGet<T>(ns: Namespace, key: string): T | undefined {
  const store = _store(ns);
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (entry.expires <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  // LRU: re-insert to move to end
  store.delete(key);
  store.set(key, entry);
  return entry.value;
}

export function cacheSet<T>(ns: Namespace, key: string, value: T, ttlMs: number): void {
  const store = _store(ns);
  if (store.size >= MAX_ENTRIES_PER_NS) _evict(store);
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheHas(ns: Namespace, key: string): boolean {
  return cacheGet(ns, key) !== undefined;
}

export function cacheDelete(ns: Namespace, key: string): void {
  _store(ns).delete(key);
}

// ---------------------------------------------------------------------------
// Station blacklist helpers
// ---------------------------------------------------------------------------

interface BlacklistEntry {
  failures: number;
  lastFailure: number;
}

const BLACKLIST_TTL_MS = 15 * 60 * 1000; // 15 minutes
const BLACKLIST_THRESHOLD = 3;

/** Returns true if the station URL is currently blacklisted. */
export function isStationBlacklisted(stationUrl: string): boolean {
  const entry = cacheGet<BlacklistEntry>('station-blacklist', stationUrl);
  if (!entry) return false;
  return entry.failures >= BLACKLIST_THRESHOLD;
}

/** Record a failure for a station URL. Returns true if it is now blacklisted. */
export function recordStationFailure(stationUrl: string): boolean {
  const existing = cacheGet<BlacklistEntry>('station-blacklist', stationUrl);
  const failures = (existing?.failures ?? 0) + 1;
  cacheSet<BlacklistEntry>('station-blacklist', stationUrl, { failures, lastFailure: Date.now() }, BLACKLIST_TTL_MS);
  return failures >= BLACKLIST_THRESHOLD;
}

/** Reset a station's failure count (e.g., on successful connection). */
export function clearStationFailures(stationUrl: string): void {
  cacheDelete('station-blacklist', stationUrl);
}
