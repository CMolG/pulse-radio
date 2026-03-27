---
task_id: ARCH-033
target_agent: auto-feature-engineer-finite
target_module: src/app/api/health/route.ts
priority: high
status: pending
---

# Add Health Check Endpoint

## Context

Pulse Radio is deployed to a VPS managed by pm2. There is no health check endpoint for monitoring. If the SQLite database becomes corrupted, if the process hangs, or if external APIs become unreachable, there is no way to detect this programmatically. The CI/CD pipeline (`deploy.yml`) blindly restarts pm2 with no verification that the new deployment is healthy.

For production reliability at scale, an ops-friendly health endpoint is essential for uptime monitoring (UptimeRobot, Pingdom, etc.) and deployment verification.

## Directive

Create a health check API route at `src/app/api/health/route.ts`:

1. **Basic Health** (`GET /api/health`): Return `200 OK` with JSON body:
   ```json
   {
     "status": "healthy",
     "timestamp": "<ISO 8601>",
     "uptime": <process.uptime() in seconds>,
     "version": "<from package.json>"
   }
   ```

2. **Deep Health** (`GET /api/health?deep=true`): Additionally check:
   - **SQLite connectivity**: Execute `SELECT 1` on the cache database. Report `"database": "ok"` or `"database": "error: <message>"`.
   - **External API reachability**: Ping Radio Browser API (`https://de1.api.radio-browser.info/json/stats`) with a 3-second timeout. Report `"radioBrowser": "ok"` or `"radioBrowser": "unreachable"`.
   - If any deep check fails, still return 200 but set `"status": "degraded"` (not unhealthy — the app can function with stale cache).

3. **Response time**: The basic check must respond in <50ms. Deep check should timeout at 5s max.

**Boundaries:**
- Do NOT require authentication (health checks must be publicly accessible for monitoring tools).
- Do NOT expose sensitive information (no env vars, no file paths, no internal IPs).
- Import the existing Drizzle database instance from the project's db module for the SQLite check.
- Use the existing Node.js `fetch` for the Radio Browser ping (no new dependencies).

## Acceptance Criteria

- [ ] `GET /api/health` returns 200 with status, timestamp, uptime, version.
- [ ] `GET /api/health?deep=true` additionally checks SQLite and Radio Browser API.
- [ ] Degraded external API does not cause a 500 — returns "degraded" status.
- [ ] No sensitive information exposed in response.
- [ ] TypeScript compiles without errors.
- [ ] Response time <50ms for basic check.
