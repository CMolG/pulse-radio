---
task_id: ARCH-038
target_agent: auto-feature-engineer-finite
target_module: src/lib/station-health.ts
priority: medium
status: pending
---

# Implement Station Reliability Scoring & Smart Sorting

## Context

Pulse Radio streams 40,000+ stations, but station reliability varies wildly. Some stations go offline frequently, some have broken URLs, some have intermittent buffering. The current `/api/proxy-stream` route already has a `stationBlacklist` mechanism (a Set of URLs that have failed), but this is:

1. **In-memory only** — resets on every server restart/deploy.
2. **Binary** — a station is either blacklisted or not; there's no nuance.
3. **Invisible to users** — users click a dead station and wait for a timeout.

A station reliability score would allow:
- Smart sorting (reliable stations first).
- Visual indicators (reliability badge).
- Proactive filtering (hide consistently dead stations).

## Directive

1. **Create `src/lib/station-health.ts`**:
   - Add a new SQLite table `station_health` via Drizzle schema:
     ```
     url: text (PK) — station stream URL
     successCount: integer (default 0)
     failureCount: integer (default 0)
     lastSuccess: integer (epoch ms, nullable)
     lastFailure: integer (epoch ms, nullable)
     avgResponseMs: integer (nullable) — rolling average connection time
     ```
   - Export `recordSuccess(url, responseMs)` and `recordFailure(url)` functions.
   - Export `getReliabilityScore(url): number` — returns 0.0–1.0 based on success ratio weighted by recency (recent failures count more).
   - Export `getHealthyStations(urls: string[]): string[]` — filter out stations with score < 0.2.

2. **Integration with proxy-stream**:
   - On successful stream connection, call `recordSuccess(url, responseTimeMs)`.
   - On failure/timeout, call `recordFailure(url)`.
   - Replace the in-memory `stationBlacklist` Set with SQLite-backed health data.

3. **Client-side exposure** (future card will handle UI):
   - Add a new API route `GET /api/station-health?urls=url1,url2,...` that returns reliability scores for a batch of station URLs.
   - Limit to 50 URLs per request.

**Boundaries:**
- Do NOT modify the RadioShell UI — a separate visual-fixer card will handle the badge display.
- Do NOT change the streaming logic inside proxy-stream beyond adding the record calls.
- The Drizzle migration should be auto-handled (the project uses push mode).
- Keep the scoring algorithm simple — weighted success ratio, not ML.

## Acceptance Criteria

- [ ] `station_health` table exists in Drizzle schema.
- [ ] `recordSuccess()` and `recordFailure()` correctly update counts.
- [ ] `getReliabilityScore()` returns 0.0–1.0 with recency weighting.
- [ ] `/api/proxy-stream` records success/failure on every connection.
- [ ] `/api/station-health` endpoint returns batch scores.
- [ ] In-memory blacklist replaced with SQLite-backed health checks.
- [ ] TypeScript compiles without errors.
- [ ] All existing Playwright tests pass.
