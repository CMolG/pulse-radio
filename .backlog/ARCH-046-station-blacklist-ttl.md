---
task_id: ARCH-046
target_agent: auto-optimizer-finite
target_module: src/app/api/proxy-stream/route.ts
priority: medium
status: pending
---

# Add TTL to Station Blacklist — Prevent Permanent Bans

## Context

The `/api/proxy-stream` route maintains a station blacklist (`stationBlacklist` Set) for URLs that fail to connect. Once a station URL is added to this Set, it stays there forever — until the server process restarts. This creates a silent, permanent ban on stations that may have temporary issues:

1. A station has a 5-minute maintenance window → blacklisted permanently.
2. A DNS hiccup causes one failed connection → blacklisted permanently.
3. Over days of uptime, the blacklist grows, silently removing valid stations from availability.

Users see "station unavailable" for stations that have long since recovered, with no way to clear the blacklist short of restarting pm2.

## Directive

1. **Replace `Set<string>` with `Map<string, { failedAt: number, failCount: number }>`**:
   - Track when each station was blacklisted and how many times it has failed.

2. **Add TTL-based expiry**:
   - Stations with 1-2 failures: blacklist for 5 minutes.
   - Stations with 3-5 failures: blacklist for 30 minutes.
   - Stations with 6+ failures: blacklist for 2 hours.
   - On each request, check if the TTL has expired before blocking.

3. **Add re-check on expiry**:
   - When a blacklisted station's TTL expires, allow the next request through.
   - If it fails again, increment `failCount` and re-blacklist with longer TTL.
   - If it succeeds, remove it from the blacklist entirely.

4. **Add cleanup sweep**:
   - Every 10 minutes, sweep the Map and remove entries older than 4 hours regardless of fail count.
   - This prevents unbounded memory growth.

**Boundaries:**
- Do NOT change the blacklist check logic in the request handler — only change the data structure and add TTL logic.
- Do NOT persist the blacklist to SQLite (it's ephemeral by design).
- Keep the existing `isStationBlacklisted()` and `recordStationFailure()` function signatures compatible.
- Do NOT modify SSRF protection or CORS logic.

## Acceptance Criteria

- [ ] Blacklist uses `Map` with timestamps instead of `Set`.
- [ ] Blacklisted stations auto-expire based on failure count (5min → 30min → 2hr).
- [ ] Recovered stations are removed from blacklist on successful connection.
- [ ] Cleanup sweep runs every 10 minutes, removing stale entries.
- [ ] Memory usage stays bounded even after days of uptime.
- [ ] `npm run build` passes.
