---
task_id: ARCH-114
target_agent: auto-feature-engineer-finite
target_module: src/app/api/station-health/route.ts
priority: medium
status: completed
---

# ARCH-114: Station Health Scoring & Uptime Tracking

## Context

The Radio Browser API provides 40,000+ stations, but many of them are **dead, intermittent, or low-quality**. Users frequently click on a station only to find it's offline, producing a poor experience. The existing station blacklist (in-memory, 15-minute TTL) helps but is ephemeral — it resets on every server restart and doesn't inform the UI.

A persistent station health scoring system would:
1. Track which stations reliably connect vs. which frequently fail.
2. Surface reliability info in the UI so users can make informed choices.
3. De-prioritize unreliable stations in browse results.
4. Provide data for the recommendation engine (ARCH-056).

## Directive

1. **Health tracking table** — extend the SQLite schema (`src/lib/db/schema.ts`):
   ```sql
   CREATE TABLE station_health (
     station_uuid TEXT PRIMARY KEY,
     success_count INTEGER DEFAULT 0,
     failure_count INTEGER DEFAULT 0,
     last_check_at INTEGER,        -- Unix timestamp
     avg_response_ms INTEGER,      -- Average connection time
     last_codec TEXT,               -- Detected codec
     last_bitrate INTEGER,         -- Detected bitrate
     health_score REAL DEFAULT 0.5  -- 0.0 (dead) to 1.0 (reliable)
   );
   ```

2. **Health score calculation**:
   ```
   health_score = success_count / (success_count + failure_count)
   ```
   - Weighted recency: Recent results count more than old ones (exponential decay with half-life of 7 days).
   - Minimum 3 data points before the score is considered reliable.

3. **Data collection** — instrument existing endpoints:
   - In `/api/proxy-stream/route.ts`: On successful stream connection, increment `success_count` and update `avg_response_ms`. On failure/timeout, increment `failure_count`.
   - In `/api/icy-meta/route.ts`: On successful metadata read, record `last_codec` and `last_bitrate`.
   - Use `station_uuid` from the Radio Browser station data as the key.

4. **API endpoint** — Create `/api/station-health/route.ts`:
   - `GET ?uuid=<station_uuid>`: Return health data for a single station.
   - `GET ?uuids=<comma-separated>`: Batch health lookup for multiple stations (for list views).
   - Cache response: `s-maxage=300` (5 minutes).

5. **UI integration**:
   - On station cards, show a small health indicator:
     - 🟢 score ≥ 0.8 (reliable)
     - 🟡 score 0.5–0.79 (intermittent)
     - 🔴 score < 0.5 (unreliable)
     - ⚪ no data (unscored)
   - Desktop only (hide on mobile per AGENTS.md rules).
   - In station detail: show uptime percentage and average response time.

6. **Privacy**: Only store station UUIDs and connection metrics. No user data, no IP addresses.

## Acceptance Criteria

- [ ] `station_health` table exists in SQLite schema
- [ ] Successful/failed connections update health data automatically
- [ ] Health score is calculated with recency weighting
- [ ] `/api/station-health` endpoint returns health data
- [ ] Batch lookup supports multiple UUIDs efficiently
- [ ] Health indicator badge appears on desktop station cards
- [ ] Badge hidden on mobile
- [ ] Playwright test: verify health badge renders on station cards
