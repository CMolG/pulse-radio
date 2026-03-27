---
task_id: ARCH-129
target_agent: auto-feature-engineer-finite
target_module: src/lib/error-reporting.ts
priority: high
status: pending
---

# ARCH-129: Structured Error Reporting & Classification

## Context

The app has 5+ scattered `console.error()` calls with inconsistent formatting. The ErrorBoundary component catches render errors but doesn't report them anywhere. There's no error classification (network vs. client vs. API), no error rate tracking, and no way to detect production errors on the self-hosted VPS deployment.

ARCH-075 covers server-side structured logging. ARCH-036 covers Web Vitals scaffolding. This card adds **client-side error classification, context enrichment, and a reporting pipeline** that can later integrate with Sentry/Datadog.

## Directive

1. **Error classifier** — Create `src/lib/error-reporting.ts`:
   - Classify errors: `network` (fetch failures, timeouts), `audio` (playback errors, codec issues), `client` (render crashes, unhandled rejections), `api` (non-2xx responses).
   - Enrich with context: current locale, viewport size, audio context state, active station, Zustand store snapshot (sanitized).
   - Deduplicate: fingerprint errors by message + stack trace, batch identical errors.

2. **Error sink**:
   - Default: structured `console.error()` with JSON format (for VPS log scraping).
   - Optional: POST to `/api/error-report` endpoint (create a minimal receiver that writes to SQLite or logs).
   - Feature flag: `NEXT_PUBLIC_ERROR_REPORTING=true` to enable POST reporting.
   - Exponential backoff: don't flood on cascading failures (max 10 reports/minute).

3. **Integrate with ErrorBoundary**:
   - On catch, call `reportError({ type: 'client', error, componentStack })`.
   - Include the component tree path in the report.

4. **Global handlers**:
   - `window.addEventListener('unhandledrejection', ...)` — classify and report.
   - `window.addEventListener('error', ...)` — classify and report.
   - Deduplicate with ErrorBoundary reports.

5. **Audio error tracking**:
   - Hook into audio element `onerror` events.
   - Report: codec, station URL, error code, network state.

## Acceptance Criteria

- [ ] All errors classified into network/audio/client/api categories
- [ ] Error context includes locale, viewport, audio state
- [ ] ErrorBoundary reports errors through the pipeline
- [ ] Global unhandled rejection/error handlers installed
- [ ] Error deduplication prevents flood (max 10/minute)
- [ ] Feature flag controls remote reporting
- [ ] Structured JSON format in console output
