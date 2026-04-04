/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
/**
 * In-memory LRU cache with TTL for server-side API routes.
 * Shared within a single Node.js process (single Vercel function instance).
 * Cache entries expire automatically via TTL and eviction when max size is reached.
 */

export type Namespace =
  | 'itunes'
  | 'artist-info'
  | 'concerts'
  | 'lyrics'
  | 'station-blacklist'
  | 'popular-icy'
  | 'popular-stations'
  | 'librivox'
  | 'gutenberg';

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
  ttlMs: number;
  bytes: number;
}

const MAX_ENTRIES_PER_NS = 1000;
const MAX_BYTES_PER_NS = 25 * 1024 * 1024; // 25MB per namespace

const _stores = new Map<Namespace, Map<string, CacheEntry<unknown>>>();
const _bytesByNs: Record<string, number> = {};

function _store(ns: Namespace): Map<string, CacheEntry<unknown>> {
  let s = _stores.get(ns);
  if (!s) {
    s = new Map();
    _stores.set(ns, s);
  }
  return s;
}

function estimateBytes(value: unknown): number {
  return JSON.stringify(value).length * 2; // Rough: 2 bytes per char in V8
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _evict(store: Map<string, CacheEntry<unknown>>, ns: Namespace): void {
  const now = Date.now();
  // First pass: remove expired entries
  for (const [k, e] of store) {
    if (now - e.fetchedAt >= e.ttlMs) {
      _bytesByNs[ns] = (_bytesByNs[ns] ?? 0) - e.bytes;
      store.delete(k);
    }
  }
  // Second pass: if still too large, remove oldest (first inserted) entries
  if (store.size >= MAX_ENTRIES_PER_NS) {
    const toDelete = store.size - MAX_ENTRIES_PER_NS + 1;
    let deleted = 0;
    for (const [k, e] of store) {
      _bytesByNs[ns] = (_bytesByNs[ns] ?? 0) - e.bytes;
      store.delete(k);
      if (++deleted >= toDelete) break;
    }
  }
}

function _evictOne(store: Map<string, CacheEntry<unknown>>, ns: Namespace): void {
  const now = Date.now();
  // First try to remove an expired entry
  for (const [k, e] of store) {
    if (now - e.fetchedAt >= e.ttlMs) {
      _bytesByNs[ns] = (_bytesByNs[ns] ?? 0) - e.bytes;
      store.delete(k);
      return;
    }
  }
  // If no expired entries, remove oldest
  if (store.size > 0) {
    const firstKey = store.keys().next().value as string | undefined;
    if (firstKey !== undefined) {
      const entry = store.get(firstKey) as CacheEntry<unknown>;
      _bytesByNs[ns] = (_bytesByNs[ns] ?? 0) - entry.bytes;
      store.delete(firstKey);
    }
  }
}

export function cacheGet<T>(ns: Namespace, key: string): T | undefined {
  const store = _store(ns);
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() - entry.fetchedAt >= entry.ttlMs) {
    _bytesByNs[ns] = (_bytesByNs[ns] ?? 0) - entry.bytes;
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
  const bytes = estimateBytes(value);

  // Evict until within both count AND byte limits
  while (store.size >= MAX_ENTRIES_PER_NS || (_bytesByNs[ns] ?? 0) + bytes > MAX_BYTES_PER_NS) {
    if (store.size === 0) break; // Safety: don't loop forever
    _evictOne(store, ns);
  }

  _bytesByNs[ns] = (_bytesByNs[ns] ?? 0) + bytes;
  store.set(key, { value, fetchedAt: Date.now(), ttlMs, bytes });

  // Log warning at 80% capacity
  const byteUsage = _bytesByNs[ns] ?? 0;
  if (byteUsage > MAX_BYTES_PER_NS * 0.8) {
    console.warn(
      `[server-cache] Namespace "${ns}" at ${((byteUsage / MAX_BYTES_PER_NS) * 100).toFixed(0)}% capacity`,
    );
  }
}

export function cacheHas(ns: Namespace, key: string): boolean {
  return cacheGet(ns, key) !== undefined;
}

export function cacheDelete(ns: Namespace, key: string): void {
  const store = _store(ns);
  const entry = store.get(key) as CacheEntry<unknown> | undefined;
  if (entry) {
    _bytesByNs[ns] = (_bytesByNs[ns] ?? 0) - entry.bytes;
  }
  store.delete(key);
}

export function getCacheStats(): Record<string, { entries: number; bytes: number }> {
  const stats: Record<string, { entries: number; bytes: number }> = {};
  for (const [ns, store] of _stores) {
    stats[ns] = {
      entries: store.size,
      bytes: _bytesByNs[ns] ?? 0,
    };
  }
  return stats;
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
