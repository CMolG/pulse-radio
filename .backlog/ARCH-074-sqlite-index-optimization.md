---
task_id: ARCH-074
target_agent: auto-optimizer-finite
target_module: src/lib/db/schema.ts
priority: high
status: pending
---

# Add SQLite Indexes & Database Maintenance for Cache Performance

## Context

The SQLite schema in `src/lib/db/schema.ts` defines 4 cache tables with only `PRIMARY KEY` constraints. There are **no secondary indexes**, despite the codebase performing:

- **TTL-based cleanup queries**: `CacheRepository.ts` queries `fetchedAt + ttlMs < Date.now()` to find expired entries — this requires a **full table scan** without an index on `fetchedAt`.
- **Composite lookups**: Cache reads query by `(key)` then check `fetchedAt + ttlMs` — a composite index would eliminate the two-step check.
- **Cron sync scans**: The `/api/cron/sync` route calls `getStaleKeys()` which scans entire tables sequentially.

Additionally, `src/lib/db/index.ts` sets WAL mode and busy timeout but never runs `VACUUM` or `ANALYZE`, meaning:
- Deleted rows leave dead pages (fragmentation grows over time).
- The query planner has no statistics for optimization.

With 40K+ stations and millions of cache operations, this will degrade over time.

## Directive

1. **Add indexes** to `src/lib/db/schema.ts`:
   ```sql
   -- On each cache table:
   CREATE INDEX idx_<table>_fetched_at ON <table>(fetchedAt);
   ```
   Use Drizzle's `index()` builder syntax.

2. **Add periodic maintenance** to the cron sync route (`/api/cron/sync/route.ts`):
   - Run `PRAGMA optimize` (lightweight, safe for production) at the end of each sync.
   - Run `VACUUM` only when total deleted rows exceed a threshold (e.g., every 100th sync run, tracked via a counter in the DB).

3. **Add `ANALYZE`** to the database initialization in `src/lib/db/index.ts`:
   ```typescript
   db.exec('PRAGMA analysis_limit=1000; ANALYZE;');
   ```

**Boundaries:**
- Do NOT change the table schemas (columns, types).
- Do NOT add connection pooling (better-sqlite3 is single-threaded by design).
- Keep maintenance operations fast (<100ms) to not block the cron endpoint.
- Use Drizzle migration patterns if the project uses them; otherwise, add raw SQL.

## Acceptance Criteria

- [ ] At least 1 index per cache table on `fetchedAt` column.
- [ ] `ANALYZE` runs on database initialization.
- [ ] `PRAGMA optimize` runs at end of cron sync.
- [ ] `npm run build` passes.
- [ ] Database operations remain fast (<50ms for typical cache reads).
