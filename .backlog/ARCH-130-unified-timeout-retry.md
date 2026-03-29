---
task_id: ARCH-130
target_agent: auto-optimizer-finite
target_module: src/lib/fetch-with-retry.ts
priority: medium
status: completed
---

# ARCH-130: Unified Timeout & Retry Policy

## Context

API routes and client-side fetches use inconsistent timeout and retry strategies:
- `icy-meta`: 8s timeout, no client retry
- `proxy-stream`: timeout disabled (MAX_DURATION_MS = 0)
- `artist-info`, `concerts`, `lyrics`, `itunes`: 8s timeout, cacheResolve may retry internally
- Client-side: RadioShell has retry logic for metadata but with hardcoded constants

ARCH-017 fixes the proxy-stream timeout. ARCH-037 covers circuit breakers. ARCH-118 standardizes client-side fetch patterns. This card creates the **shared server-side retry utility** that all API routes and the client can use consistently.

## Directive

1. **Create `src/lib/fetch-with-retry.ts`**:
   - `fetchWithRetry(url, options)` where options include:
     - `timeout`: per-request timeout in ms (default: 8000)
     - `retries`: max retry attempts (default: 3)
     - `backoff`: initial backoff in ms (default: 1000)
     - `maxBackoff`: cap on backoff (default: 8000)
     - `retryOn`: predicate `(status, error) => boolean` (default: retry on 5xx + timeout)
     - `signal`: parent AbortSignal for cancellation
   - Exponential backoff with jitter: `delay * 2^attempt + random(0, delay/2)`.
   - Compose abort signals: parent signal + per-attempt timeout signal.
   - Return the last response/error if all retries exhausted.
   - Never retry on 4xx errors.

2. **Apply to API routes**:
   - Replace raw `fetch()` calls in all API routes with `fetchWithRetry()`.
   - Configure per-route: metadata (8s, 2 retries), artwork (10s, 1 retry), audio proxy (per ARCH-017).

3. **Client-side variant** — Create `src/lib/client-fetch-retry.ts`:
   - Lighter version without server-side AbortSignal composition.
   - Integrates with `navigator.onLine` — skip retries if offline.

4. **Document retry budget**:
   - Add JSDoc comments with each route's retry policy.
   - Worst-case latency per route: timeout × (retries + 1).

## Acceptance Criteria

- [ ] `fetchWithRetry` utility handles timeout, retries, and backoff
- [ ] Exponential backoff with jitter implemented
- [ ] No retries on 4xx responses
- [ ] AbortSignal composition works (parent + timeout)
- [ ] All API routes use `fetchWithRetry` instead of raw `fetch`
- [ ] Per-route timeout/retry configs documented
- [ ] Client-side variant respects `navigator.onLine`
