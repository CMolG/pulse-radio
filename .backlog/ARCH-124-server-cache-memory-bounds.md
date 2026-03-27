---
task_id: ARCH-124
target_agent: auto-optimizer-finite
target_module: src/lib/server-cache.ts
priority: medium
status: completed
---

# ARCH-124: Server-Cache Memory Bounds & Eviction Race Protection

## Context

The in-memory server cache (`src/lib/server-cache.ts`) has two production-level issues:

1. **No byte-based memory limits**: The cache tracks 1,000 entries per namespace (`MAX_ENTRIES_PER_NS`), but entry sizes vary wildly. An artist info response can be 500 bytes, while a concerts response can be 50KB. At maximum fill, the cache could consume anywhere from 500KB to 50MB per namespace — unpredictable and unmonitored.

2. **Eviction race condition**: `cacheSet()` checks `store.size >= MAX_ENTRIES_PER_NS` and then calls `_evict()`, but in a concurrent Node.js environment (multiple in-flight requests), two `cacheSet()` calls can both pass the size check before either completes eviction. While Node.js is single-threaded, the async event loop means this sequence is possible across microtask boundaries when `cacheSet` is called from different async contexts.

## Directive

1. **Add byte-based tracking**:
   ```typescript
   const MAX_BYTES_PER_NS = 25 * 1024 * 1024; // 25MB per namespace
   let _bytesByNs: Record<string, number> = {};

   function estimateBytes(value: unknown): number {
     return JSON.stringify(value).length * 2; // Rough: 2 bytes per char in V8
   }
   ```
   - On `cacheSet`: add to byte counter.
   - On `_evict`: subtract from byte counter.
   - If `_bytesByNs[ns] >= MAX_BYTES_PER_NS`, evict oldest entries until under limit.

2. **Synchronized eviction**:
   ```typescript
   function cacheSet<T>(ns: Namespace, key: string, value: T, ttlMs: number): void {
     const store = _store(ns);
     const bytes = estimateBytes(value);

     // Evict until within both count AND byte limits
     while (store.size >= MAX_ENTRIES_PER_NS || (_bytesByNs[ns] ?? 0) + bytes > MAX_BYTES_PER_NS) {
       if (store.size === 0) break; // Safety: don't loop forever
       _evictOne(store, ns);
     }

     _bytesByNs[ns] = (_bytesByNs[ns] ?? 0) + bytes;
     store.set(key, { value, expires: Date.now() + ttlMs, bytes });
   }
   ```

3. **Expose memory stats** for the health check endpoint (ARCH-033):
   ```typescript
   export function getCacheStats(): Record<string, { entries: number; bytes: number }> {
     // Return per-namespace stats
   }
   ```

4. **Log warnings** when a namespace exceeds 80% of byte limit:
   ```typescript
   if (byteUsage > MAX_BYTES_PER_NS * 0.8) {
     console.warn(`[server-cache] Namespace "${ns}" at ${(byteUsage / MAX_BYTES_PER_NS * 100).toFixed(0)}% capacity`);
   }
   ```

## Acceptance Criteria

- [ ] Byte-based memory tracking per namespace
- [ ] Eviction triggers on BOTH count and byte limits
- [ ] `getCacheStats()` returns per-namespace entry count and byte usage
- [ ] Warning logged when namespace exceeds 80% byte capacity
- [ ] Cache never exceeds 25MB per namespace
- [ ] Eviction loop has a safety break to prevent infinite loops
- [ ] No behavioral changes to cache consumers
