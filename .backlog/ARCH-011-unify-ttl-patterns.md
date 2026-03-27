---
task_id: ARCH-011
target_agent: auto-optimizer-finite
target_module: src/lib/server-cache.ts
priority: medium
status: pending
---

# Unify TTL Calculation Patterns Across Cache Tiers

## Context

The 3-tier cache system uses two inconsistent TTL calculation approaches:
- **server-cache.ts** stores an `expires` timestamp (`Date.now() + ttlMs`) and checks `entry.expires <= Date.now()`
- **CacheRepository.ts** stores `fetchedAt` + `ttlMs` separately and calculates `age = Date.now() - row.fetchedAt; if (age < row.ttlMs)`

Both are correct but the inconsistency creates cognitive overhead when debugging cache behavior. The DB schema uses `fetchedAt + ttlMs` (which is the more debuggable pattern since you can see when data was fetched), so the in-memory cache should align.

## Directive

1. Refactor `server-cache.ts` internal `CacheEntry` to store `fetchedAt: number` and `ttlMs: number` instead of `expires: number`.
2. Update `cacheSet` to store `fetchedAt: Date.now()` and `ttlMs`.
3. Update `cacheGet` expiry check to use `Date.now() - entry.fetchedAt >= entry.ttlMs`.
4. Update the eviction logic in `evict()` to use the new fields.
5. The blacklist helpers use different TTL logic — verify they still work correctly.
6. **Do NOT change the public API** — `cacheGet`, `cacheSet`, `cacheHas`, `cacheDelete` signatures must remain identical.
7. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Both cache tiers use `fetchedAt + ttlMs` pattern
- [ ] Public API unchanged
- [ ] `npm run build` passes with zero errors
- [ ] Station blacklist still expires correctly after 15 minutes
- [ ] All API routes still cache/retrieve correctly
