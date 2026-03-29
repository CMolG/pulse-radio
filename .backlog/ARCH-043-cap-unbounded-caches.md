---
task_id: ARCH-043
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Cap Unbounded Module-Level Caches with TTL/LRU

## Context

RadioShell.tsx contains several module-level `Map` caches that grow indefinitely without eviction:

1. **`_artistInfoCache`** — Caches artist info lookups (MusicBrainz + Wikipedia). Every unique artist name adds an entry. After 10,000 unique artist searches across a long session, this consumes significant memory.
2. **`_concertsCache`** — Caches concert data per artist. Same unbounded growth pattern.
3. **`_albumArtLru`** — Already has LRU (512 max) ✅, but no TTL.
4. **`radioApiCache`** — Has LRU (100 max) ✅ with 1-minute TTL ✅.

The first two are the problem. In a long-running browser session (users leave radio tabs open for days), these Maps can accumulate thousands of entries, each holding JSON objects with bios, images, concert arrays, etc.

## Directive

1. **Create a simple `LRUMap<K, V>` class** (or reuse the pattern from `radioApiCache` if one exists):
   - Constructor takes `maxSize: number` and `ttlMs: number`.
   - `get(key)`: Returns value if exists and not expired; deletes if expired.
   - `set(key, value)`: Inserts; evicts oldest entry if at capacity.
   - `has(key)`: Check existence + TTL.
   - Use a `Map` internally (Map preserves insertion order for LRU).

2. **Replace unbounded caches**:
   - `_artistInfoCache`: Replace with `new LRUMap(200, 3_600_000)` (200 entries, 1-hour TTL).
   - `_concertsCache`: Replace with `new LRUMap(100, 1_800_000)` (100 entries, 30-minute TTL).

3. **Verify `_albumArtLru`**: If it already has size limits, add TTL (1 hour). If not, cap at 512 with TTL.

**Boundaries:**
- Do NOT extract these caches to separate files (that's ARCH-016's job). Just fix the data structure in-place.
- Do NOT change the cache lookup or write logic — only swap the underlying Map for an LRU.
- The LRUMap class can be defined at the top of RadioShell.tsx or in a small utility.
- Do NOT modify any React component rendering or hook interfaces.

## Acceptance Criteria

- [ ] `_artistInfoCache` is bounded to 200 entries with 1-hour TTL.
- [ ] `_concertsCache` is bounded to 100 entries with 30-minute TTL.
- [ ] Expired entries are cleaned up on access (lazy eviction).
- [ ] LRU eviction works correctly (oldest entries removed first).
- [ ] Artist info and concert lookups still work correctly after the change.
- [ ] `npm run build` passes.
- [ ] All existing Playwright tests pass.
