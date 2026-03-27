---
task_id: ARCH-042
target_agent: auto-optimizer-finite
target_module: src/app/api/proxy-stream/route.ts
priority: critical
status: pending
---

# Add Stream Connection Limits & Backpressure Handling

## Context

The `/api/proxy-stream` route has no concurrency limits or backpressure handling. Every incoming request opens a new fetch connection to the upstream radio server and directly pipes `upstream.body` to the response. This creates three critical failure modes at scale:

1. **Socket exhaustion**: 1,000 simultaneous listeners = 1,000 open upstream connections. No `maxSockets` limit.
2. **Memory bloat from slow clients**: If a client on 2G reads slowly, the upstream buffer fills unboundedly in Node.js memory. There is no drain/backpressure detection.
3. **No concurrent stream cap**: A single malicious IP could open hundreds of streams, monopolizing server resources.

ARCH-017 addresses the timeout (MAX_DURATION_MS=0), but this card handles the structural resource management that timeout alone cannot fix.

## Directive

1. **Add concurrent stream tracking**:
   - Use a module-level `Map<string, number>` to track active streams per IP.
   - Limit to **5 concurrent streams per IP** (generous for multi-tab users).
   - Limit to **200 total concurrent streams server-wide** (VPS resource budget).
   - Return `503 Service Unavailable` with `Retry-After: 10` when limits are hit.
   - Decrement counters in a `finally` block to ensure cleanup on any exit path.

2. **Add basic backpressure awareness**:
   - Instead of directly returning `upstream.body`, use a `TransformStream` as an intermediary.
   - If the transform stream's internal queue grows beyond 256KB (4 chunks of 64KB), abort the upstream connection (the client is too slow and will need to reconnect).
   - Log a warning when backpressure is triggered.

3. **Add connection metrics tracking**:
   - Export a `getStreamMetrics()` function that returns `{ activeStreams, peakStreams, totalServed, backpressureAborts }`.
   - These metrics should be accessible from the health check endpoint (ARCH-033).

**Boundaries:**
- Do NOT modify the SSRF protection, ICY header extraction, or CORS logic.
- Do NOT install npm packages — use Node.js native `TransformStream`.
- The per-IP tracking should use the same IP extraction logic as rate limiting (ARCH-032) if available, otherwise `x-forwarded-for`.
- ARCH-017 handles the timeout fix; this card handles connection management.

## Acceptance Criteria

- [ ] Per-IP stream limit of 5 enforced; excess returns 503.
- [ ] Server-wide stream limit of 200 enforced; excess returns 503.
- [ ] Active stream counters decrement correctly in all exit paths (success, error, abort).
- [ ] Backpressure detection aborts slow client connections after 256KB queue buildup.
- [ ] `getStreamMetrics()` returns accurate counts.
- [ ] Normal single-user playback is unaffected.
- [ ] `npm run build` passes.
