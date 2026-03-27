---
task_id: ARCH-136
target_agent: auto-feature-engineer-finite
target_module: src/app/api/analytics/route.ts
priority: low
status: completed
---

# ARCH-136: Privacy-First Server-Side Analytics

## Context

ARCH-112 covers a client-side listening statistics dashboard computed from localStorage. This card adds **server-side aggregate analytics** — anonymous, privacy-first metrics that help the operator understand how the app is used without tracking individual users.

No external analytics service needed — self-hosted in the existing SQLite database.

## Directive

1. **Analytics event collector** — Create `/api/analytics/route.ts`:
   - Accept POST with: `{ event, properties }`.
   - Events: `station_play`, `station_stop`, `search`, `favorite_add`, `favorite_remove`, `page_view`.
   - Properties: station genre, country, codec (no station URL or user identity).
   - Store in SQLite: `analytics_events` table with `event`, `properties` (JSON), `created_at`.
   - Rate limit: max 60 events/minute per IP.
   - No cookies, no fingerprinting, no PII.

2. **Client-side reporter** — Create `src/lib/analytics-reporter.ts`:
   - Batch events (collect for 10s, send in one POST).
   - Respect `Do Not Track` header: skip if `navigator.doNotTrack === '1'`.
   - Feature flag: `NEXT_PUBLIC_ANALYTICS=true` to enable.
   - Fail silently — never block UI for analytics.

3. **Aggregate query API** — Create `/api/analytics/summary/route.ts`:
   - Protected by CRON_SECRET (admin only).
   - Return: top 10 genres, top 10 countries, plays per day (last 30 days), peak hours.
   - Aggregated data only — no individual event access.

4. **Data retention** — Auto-purge events older than 90 days (via cron or on-write cleanup).

## Acceptance Criteria

- [ ] Analytics events stored in SQLite
- [ ] No PII collected (no IPs stored, no user identity)
- [ ] `Do Not Track` respected
- [ ] Feature flag controls analytics collection
- [ ] Summary endpoint returns aggregate data
- [ ] Events older than 90 days auto-purged
- [ ] Batched client-side reporting (no per-event POST)
