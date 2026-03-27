---
task_id: ARCH-075
target_agent: auto-feature-engineer-finite
target_module: src/lib/logger.ts
priority: high
status: pending
---

# Add Structured Logging with Correlation IDs

## Context

The entire codebase uses `console.log/warn/error()` for diagnostics with no structure:
- No correlation IDs to trace a request through cache → API → response.
- Silent `catch { }` blocks in `CacheRepository.ts` (lines ~72, 95, 116) swallow errors without logging.
- `ErrorBoundary.tsx` logs to stderr with no context (no component name, no user action).
- API routes don't capture request metadata (user agent, response time, status code).
- No way to diagnose production issues — errors are invisible.

## Directive

1. **Create `src/lib/logger.ts`** — a lightweight structured logger:
   ```typescript
   export const logger = {
     info: (event: string, data?: Record<string, unknown>) => { ... },
     warn: (event: string, data?: Record<string, unknown>) => { ... },
     error: (event: string, error?: unknown, data?: Record<string, unknown>) => { ... },
   };
   ```
   - Output JSON in production, pretty-print in development.
   - Include `timestamp`, `level`, `event`, and spread `data`.
   - Add `requestId` field when available (from a request-scoped header or generated UUID).

2. **Add request logging middleware** to API routes:
   - Log request start: method, path, user-agent.
   - Log request end: status code, duration (using `performance.now()`).
   - Generate a `requestId` (crypto.randomUUID()) and pass through the call chain.

3. **Replace silent `catch { }` blocks** in CacheRepository with `logger.error()`:
   - `catch (e) { logger.error('cache_read_failed', e, { key }); }`
   - Still fail gracefully (return null/undefined) but now visible.

4. **Add cache hit/miss logging** (at `debug` level, only in development):
   - `logger.info('cache_hit', { key, table, age_ms })` / `logger.info('cache_miss', { key, table })`

**Boundaries:**
- Do NOT install external logging libraries (winston, pino, etc.) — keep it stdlib.
- Do NOT add log file rotation or external log shipping (that's infrastructure).
- Do NOT log sensitive data (request bodies, user preferences, station URLs).
- Keep the logger under 100 lines — this is a foundation, not a framework.
- Use `console.log` under the hood (Next.js server captures stdout/stderr).

## Acceptance Criteria

- [ ] `src/lib/logger.ts` exists with `info`, `warn`, `error` methods.
- [ ] JSON output format in production, pretty-print in development.
- [ ] All `catch { }` blocks in CacheRepository replaced with `logger.error()`.
- [ ] API routes log request start/end with duration.
- [ ] `requestId` generated per request for correlation.
- [ ] `npm run build` passes.
- [ ] No sensitive data in log output.
