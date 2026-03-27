---
task_id: ARCH-053
target_agent: auto-optimizer-finite
target_module: src/lib/services/CacheRepository.ts
priority: medium
status: pending
---

# Add Request Deduplication to Cache Layer

## Context

When multiple browser tabs or concurrent UI components request the same data (e.g., album art for the same song playing on two tabs, or ICY metadata polling from two sources), each request independently hits the 3-tier cache pipeline. While Tier 1 (LRU) returns instantly for hits, cache misses all proceed to Tier 3 (external API) simultaneously — creating duplicate network requests for the same key.

This wastes:
1. External API quota (MusicBrainz enforces 1 req/sec).
2. Server CPU (redundant cache writes).
3. Network bandwidth (duplicate upstream fetches).

At scale, popular artists or songs could trigger dozens of concurrent identical API calls.

## Directive

1. **Add an in-flight request tracker** to `CacheRepository.ts`:
   ```typescript
   const inflight = new Map<string, Promise<T | null>>();
   ```

2. **In `cacheResolve()`**, before hitting Tier 3:
   - Check if an identical key is already in-flight.
   - If yes, return the existing Promise (all callers share one network request).
   - If no, create the fetch, store the Promise, and clean up on resolution.
   - Use a `finally` block to remove from `inflight` Map after the Promise settles.

3. **Key format**: Use `${namespace}:${key}` for the inflight Map key.

4. **Edge case**: If the inflight Promise rejects, all waiters receive the rejection. This is correct — they all should retry independently on their next poll cycle.

**Boundaries:**
- Do NOT change the 3-tier cache architecture or TTLs.
- Do NOT modify individual route handlers — this is a cache-layer enhancement.
- The inflight Map should be module-scoped (singleton per server process).
- Do NOT add npm dependencies.

## Acceptance Criteria

- [ ] Concurrent identical `cacheResolve()` calls share a single Tier 3 fetch.
- [ ] The inflight Map is cleaned up after Promise resolution (no memory leak).
- [ ] Tier 1 and Tier 2 cache hits bypass the deduplication (they're already fast).
- [ ] Failed requests are properly propagated to all waiters.
- [ ] `npm run build` passes.
- [ ] All existing Playwright tests pass.
