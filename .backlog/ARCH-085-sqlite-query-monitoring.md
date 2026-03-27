---
task_id: ARCH-085
target_agent: auto-optimizer-finite
target_module: src/lib/db/index.ts
priority: medium
status: pending
---

# Add SQLite Query Performance Monitoring

## Context

All SQLite operations in `src/lib/services/CacheRepository.ts` run silently — there is no visibility into:
- **Query execution time**: Slow queries block the Node.js event loop (better-sqlite3 is synchronous).
- **Cache hit/miss rates**: No metrics on how effective the 3-tier cache is.
- **Query frequency**: No way to identify hot paths that need optimization.

> **Related:** ARCH-075 (Structured Logging) provides the logging infrastructure. This card adds database-specific instrumentation on top of it. ARCH-074 (SQLite Index Optimization) adds indexes to speed up queries — this card measures whether those indexes are effective.

## Directive

1. **Create a query wrapper** in `src/lib/db/index.ts`:
   ```typescript
   export function timedQuery<T>(label: string, fn: () => T): T {
     const start = performance.now();
     const result = fn();
     const duration = performance.now() - start;
     if (duration > 50) {
       logger.warn('slow_query', { label, duration_ms: Math.round(duration) });
     }
     return result;
   }
   ```

2. **Wrap CacheRepository operations** with the timer:
   - `getCached()` → log cache hit/miss + duration.
   - `setCached()` → log write duration.
   - `getStaleKeys()` → log scan duration + count.

3. **Add cache effectiveness counters** (module-level):
   ```typescript
   const cacheStats = { hits: 0, misses: 0, writes: 0 };
   export function getCacheStats() { return { ...cacheStats }; }
   ```
   Expose via the health check endpoint (ARCH-033).

4. **Log slow query threshold**: 50ms for single reads, 200ms for batch operations.

**Boundaries:**
- Do NOT add external monitoring tools (Prometheus, Datadog, etc.).
- Do NOT change query logic — only add timing instrumentation around existing calls.
- Use `performance.now()` (available in Node.js) for timing.
- Keep overhead minimal (<1ms per query for the instrumentation itself).
- If ARCH-075 is not yet implemented, use `console.warn` as fallback.

## Acceptance Criteria

- [ ] `timedQuery()` wrapper function exported from `src/lib/db/index.ts`.
- [ ] Slow queries (>50ms) logged with label and duration.
- [ ] Cache hit/miss/write counters tracked.
- [ ] `getCacheStats()` function exported for health endpoint.
- [ ] `npm run build` passes.
- [ ] No measurable performance regression from instrumentation.
