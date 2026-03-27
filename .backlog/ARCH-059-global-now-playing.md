---
task_id: ARCH-059
target_agent: auto-feature-engineer-finite
target_module: src/app/api/now-playing/route.ts
priority: low
status: completed
---

# Add Global "Now Playing" Aggregation Endpoint

## Context

Pulse Radio polls ICY metadata for the currently-playing station, but there's no way to see what's playing across ALL stations simultaneously. A "Now Trending" or "What's Playing Now" view would be a unique differentiator — no other web radio aggregator offers this. It would enable:

1. **Trending songs view**: "Shape of You is playing on 12 stations right now."
2. **Song search across stations**: "Find stations playing [song title]."
3. **Music discovery**: See what's popular across the radio landscape in real-time.

This requires a new API endpoint that aggregates ICY metadata across recently-polled stations.

## Directive

1. **Create `src/app/api/now-playing/route.ts`**:
   - **Mechanism**: Use a new SQLite table `now_playing` to store recent ICY metadata:
     ```
     stationUuid: text (PK)
     stationName: text
     streamTitle: text          // "Artist - Song"
     detectedAt: integer        // epoch ms
     country: text
     genre: text
     ```
   - **Write path**: The existing `/api/icy-meta` route should insert/update this table whenever it successfully extracts metadata. This piggybacks on the existing metadata polling without adding new network requests.
   - **Read path**: `GET /api/now-playing?limit=50&genre=rock` returns the most recent now-playing entries, optionally filtered by genre.

2. **Trending aggregation**:
   - `GET /api/now-playing/trending` returns the most frequently appearing song titles across stations in the last hour:
     ```json
     [
       { "title": "Shape of You", "artist": "Ed Sheeran", "stationCount": 12, "stations": ["Station A", "Station B", ...] },
       ...
     ]
     ```
   - Group by normalized song title. Return top 20.

3. **Staleness**: Entries older than 30 minutes should be excluded from queries (station may have changed songs). A cleanup sweep should run on every read.

**Boundaries:**
- Do NOT create a separate polling system — piggyback on existing `/api/icy-meta` calls.
- Keep the SQLite writes fast (upsert by stationUuid).
- Do NOT expose station stream URLs in the response (only metadata).
- Add appropriate cache headers (`s-maxage=10`).

## Acceptance Criteria

- [ ] `now_playing` table exists in Drizzle schema.
- [ ] `/api/icy-meta` writes to `now_playing` on successful metadata extraction.
- [ ] `GET /api/now-playing` returns recent now-playing data.
- [ ] `GET /api/now-playing/trending` aggregates popular songs.
- [ ] Entries older than 30 minutes are excluded.
- [ ] TypeScript compiles without errors.
- [ ] `npm run build` passes.
