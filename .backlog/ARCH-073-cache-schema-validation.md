---
task_id: ARCH-073
target_agent: auto-optimizer-finite
target_module: src/lib/services/CacheRepository.ts
priority: critical
status: completed
---

# Add Runtime Schema Validation on Cache Deserialization

## Context

The SQLite cache stores all API responses as generic `text` fields in `src/lib/db/schema.ts`. When `CacheRepository.ts` calls `JSON.parse()` on retrieved data (around line 66), there is **zero runtime validation** — the parsed object is cast directly to the expected TypeScript type via `as T`.

This creates a **schema drift risk**: if the upstream API (iTunes, radio-browser.info, Bandsintown, MusicBrainz) changes its response format, stale cached data with the old shape silently passes type checks at compile time but causes runtime errors — `undefined` property access, `.map()` on non-arrays, etc.

Since the SQLite cache persists across deployments (`.data/cache.db` in WAL mode), a format change in an external API will corrupt the cache without any warning.

## Directive

1. **Install Zod** (already commonly used in Next.js projects):
   ```bash
   npm install zod
   ```

2. **Define validation schemas** for each cached API response type in a new file `src/lib/schemas/api-responses.ts`:
   - `ItunesSearchResultSchema` — validates iTunes search API response shape
   - `ArtistInfoSchema` — validates artist-info aggregated data
   - `ConcertEventSchema` — validates Bandsintown event objects
   - `StationMetadataSchema` — validates radio-browser.info station objects
   - Use `.passthrough()` on object schemas to allow new fields without breaking

3. **Add a `safeParse` wrapper** to `CacheRepository.ts`:
   ```typescript
   getCachedOrFetch<T>(key: string, schema: z.ZodType<T>, fetcher: () => Promise<T>): Promise<T>
   ```
   - If `safeParse` fails on cached data, treat it as a cache miss (delete stale entry, re-fetch).
   - Log a warning when stale data is evicted due to schema mismatch.

4. **Update all callers** of `getCached()` to pass the appropriate schema.

**Boundaries:**
- Do NOT change the SQLite schema itself.
- Do NOT validate on write (only on read/deserialization).
- Use `.passthrough()` to be forward-compatible with new API fields.
- Gracefully handle validation failures by re-fetching (never crash).

## Acceptance Criteria

- [ ] Zod installed and in dependencies.
- [ ] `src/lib/schemas/api-responses.ts` exists with 4+ schemas.
- [ ] `CacheRepository.getCachedOrFetch()` validates with Zod before returning cached data.
- [ ] Invalid cached data triggers cache miss + re-fetch (not a crash).
- [ ] Warning logged when stale data is evicted.
- [ ] `npm run build` passes.
- [ ] Existing Playwright tests pass.
