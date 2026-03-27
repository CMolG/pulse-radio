---
task_id: ARCH-036
target_agent: auto-feature-engineer-finite
target_module: src/app/layout.tsx
priority: high
status: pending
---

# Implement Web Vitals Tracking & Structured Error Logging

## Context

Pulse Radio has no observability layer. There is no Web Vitals tracking despite Next.js providing native `useReportWebVitals()` support. There is no structured error reporting — errors go to `console.error()` and are lost. When deployed to a VPS with pm2, there is no way to know if users are experiencing:

1. Poor LCP (large contentful paint) due to heavy album art or visualizer.
2. High CLS (cumulative layout shift) from dynamic station metadata updates.
3. Slow FID/INP from the 10,935-line RadioShell component.
4. Uncaught JavaScript errors in production.

Without this data, performance regressions are invisible until users complain.

## Directive

1. **Web Vitals Reporter** — Create `src/components/WebVitalsReporter.tsx`:
   - Use Next.js `useReportWebVitals()` hook.
   - Log all vitals (LCP, FID, CLS, TTFB, INP) to a structured format.
   - For now, log to `console.log()` in a structured JSON format: `{ metric: name, value, rating, navigationType }`.
   - Add a comment noting this is the integration point for future analytics (Vercel Analytics, Plausible, or custom endpoint).
   - Import and render this component in the root layout (`src/app/layout.tsx`).

2. **Global Error Logger** — Create `src/lib/error-logger.ts`:
   - Export a `logError(error: Error, context?: Record<string, unknown>): void` function.
   - Format errors as structured JSON: `{ timestamp, message, stack, context }`.
   - Log to `console.error()` (structured).
   - Add a `window.addEventListener('unhandledrejection', ...)` setup function for uncaught promise rejections.
   - Add a comment noting this is the integration point for future Sentry/Datadog.

3. **Integration**: 
   - Add the unhandled rejection listener in the root layout or RadioShell.
   - Replace the 3 most critical `console.error()` calls in API routes with `logError()` (proxy-stream errors, icy-meta errors, cron sync errors).

**Boundaries:**
- Do NOT install any third-party analytics or error tracking packages.
- Do NOT send data to any external service — log locally only.
- Keep the implementation lightweight — this is scaffolding for future observability.
- Do NOT modify RadioShell.tsx beyond adding the unhandled rejection listener if appropriate.

## Acceptance Criteria

- [ ] `src/components/WebVitalsReporter.tsx` exists and uses `useReportWebVitals()`.
- [ ] Web Vitals are logged as structured JSON in the browser console.
- [ ] `src/lib/error-logger.ts` exists with `logError()` function.
- [ ] Unhandled promise rejections are caught and logged.
- [ ] At least 3 API route error handlers use `logError()`.
- [ ] Root layout imports and renders `WebVitalsReporter`.
- [ ] No external network requests made by this feature.
- [ ] All existing Playwright tests pass.
