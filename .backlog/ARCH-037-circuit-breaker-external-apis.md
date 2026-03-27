---
task_id: ARCH-037
target_agent: auto-feature-engineer-finite
target_module: src/lib/circuit-breaker.ts
priority: medium
status: pending
---

# Implement Circuit Breaker for External API Calls

## Context

Pulse Radio depends on 6 external APIs: Radio Browser, iTunes, MusicBrainz, Wikipedia, LrcLib, and Bandsintown. If any of these services goes down (which happens regularly — MusicBrainz has maintenance windows, LrcLib has outages), the current code will:

1. **Block on every request** — Each user action triggers a fresh fetch with an 8-10s timeout.
2. **Cascade failures** — Slow upstream responses tie up Node.js event loop threads.
3. **Degrade UX silently** — Users see spinning loaders for 10 seconds before getting an error.

At scale (100K users), a single upstream outage could bring down the entire app because every request waits for a timeout.

## Directive

Create a circuit breaker utility at `src/lib/circuit-breaker.ts`:

1. **States**: `CLOSED` (normal), `OPEN` (failing — skip calls), `HALF_OPEN` (testing recovery).
2. **Configuration per circuit**:
   - `failureThreshold`: Number of consecutive failures to trip open (default: 5).
   - `resetTimeoutMs`: How long to stay open before trying half-open (default: 30000ms).
   - `successThreshold`: Successes needed in half-open to close (default: 2).
3. **Behavior**:
   - **CLOSED**: Pass requests through. On failure, increment counter. If counter >= threshold, trip to OPEN.
   - **OPEN**: Immediately return a cached/fallback response (no network call). After `resetTimeoutMs`, transition to HALF_OPEN.
   - **HALF_OPEN**: Allow one request through. On success, increment success counter. On failure, trip back to OPEN.
4. **API**: `const breaker = createCircuitBreaker('itunes', config); const result = await breaker.call(() => fetch(...), fallbackValue);`
5. **Integration**: Wrap the external fetch calls in these API routes:
   - `/api/itunes` → circuit for iTunes
   - `/api/artist-info` → circuit for MusicBrainz + Wikipedia
   - `/api/lyrics` → circuit for LrcLib
   - `/api/concerts` → circuit for Bandsintown
6. **Fallback**: When circuit is OPEN, return the last cached response from SQLite (the 3-tier cache already stores this). If no cache exists, return an empty result with a `X-Circuit-State: open` header so the client knows.

**Boundaries:**
- Do NOT install any npm packages (no `opossum` or similar).
- Do NOT modify the SQLite schema — use the existing cache tables for fallback data.
- Keep circuits in-memory (they reset on server restart, which is acceptable).
- Do NOT apply to `/api/proxy-stream` — streaming connections have different failure semantics.

## Acceptance Criteria

- [ ] `src/lib/circuit-breaker.ts` exists with `createCircuitBreaker()` factory.
- [ ] Circuit breaker has CLOSED, OPEN, HALF_OPEN states with correct transitions.
- [ ] 4 API routes wrap their external calls with circuit breakers.
- [ ] When circuit is OPEN, cached data is returned (no network call).
- [ ] `X-Circuit-State` header is present in responses when circuit is not CLOSED.
- [ ] TypeScript compiles without errors.
- [ ] All existing Playwright tests pass.
