/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
/**
 * In-memory LRU cache with TTL for server-side API routes.
 * Shared within a single Node.js process (single Vercel function instance).
 * Cache entries expire automatically via TTL and eviction when max size is reached.
 */

export type Namespace = 'itunes' | 'artist-info' | 'concerts' | 'lyrics' | 'station-blacklist';

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
  ttlMs: number;
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
    if (now - e.fetchedAt >= e.ttlMs) store.delete(k);
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
  if (Date.now() - entry.fetchedAt >= entry.ttlMs) {
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
  store.set(key, { value, fetchedAt: Date.now(), ttlMs });
}

export function cacheHas(ns: Namespace, key: string): boolean {
  return cacheGet(ns, key) !== undefined;
}

export function cacheDelete(ns: Namespace, key: string): void {
  _store(ns).delete(key);
}

// ---------------------------------------------------------------------------
// Station blacklist helpers (ARCH-046: TTL-based blacklist with progressive expiry)
// ---------------------------------------------------------------------------

interface BlacklistEntry {
  failedAt: number;
  failCount: number;
}

// TTL thresholds based on failure count
function getTTLForFailCount(failCount: number): number {
  if (failCount <= 2) return 5 * 60 * 1000; // 5 minutes
  if (failCount <= 5) return 30 * 60 * 1000; // 30 minutes
  return 2 * 60 * 60 * 1000; // 2 hours
}

// Direct in-memory blacklist map (separate from general cache for deterministic cleanup)
const stationBlacklistMap = new Map<string, BlacklistEntry>();
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

let cleanupHandle: NodeJS.Timeout | null = null;

function startCleanupSweep() {
  if (cleanupHandle) return;
  cleanupHandle = setInterval(() => {
    const now = Date.now();
    const toDelete: string[] = [];
    for (const [url, entry] of stationBlacklistMap) {
      if (now - entry.failedAt > MAX_AGE_MS) {
        toDelete.push(url);
      }
    }
    for (const url of toDelete) {
      stationBlacklistMap.delete(url);
    }
  }, CLEANUP_INTERVAL_MS);
}

/** Returns true if the station URL is currently blacklisted (TTL not expired). */
export function isStationBlacklisted(stationUrl: string): boolean {
  const entry = stationBlacklistMap.get(stationUrl);
  if (!entry) return false;
  
  const now = Date.now();
  const ttl = getTTLForFailCount(entry.failCount);
  const isExpired = now - entry.failedAt > ttl;
  
  if (isExpired) {
    // TTL expired; allow retry on next request (remove from blacklist)
    stationBlacklistMap.delete(stationUrl);
    return false;
  }
  
  return true;
}

/** Record a failure for a station URL. Returns true if it is now blacklisted. */
export function recordStationFailure(stationUrl: string): boolean {
  startCleanupSweep();
  
  const existing = stationBlacklistMap.get(stationUrl);
  const failCount = (existing?.failCount ?? 0) + 1;
  
  stationBlacklistMap.set(stationUrl, {
    failedAt: Date.now(),
    failCount,
  });
  
  // Blacklist only if failCount >= 3
  return failCount >= 3;
}

/** Reset a station's failure count (e.g., on successful connection). */
export function clearStationFailures(stationUrl: string): void {
  stationBlacklistMap.delete(stationUrl);
}
