---
task_id: ARCH-017
target_agent: auto-optimizer
target_module: src/app/api/proxy-stream/route.ts
priority: critical
status: pending
---

# Re-enable Stream Proxy Timeout Protection

## Context

In `proxy-stream/route.ts`, `MAX_DURATION_MS` is set to `0` (line ~41), which causes the timeout guard `if (MAX_DURATION_MS > 0)` to always be false. This means stream requests have **zero timeout protection** — a slow or hanging upstream server will hold the connection indefinitely, consuming serverless function compute time and potentially exhausting connection limits.

Every other API route has an 8-10s timeout. The stream proxy is the most resource-intensive route and the one most in need of a ceiling.

## Directive

1. Set `MAX_DURATION_MS` to a reasonable value for audio streaming. Since `maxDuration` is set to 25 in the route config, use `25_000` (25 seconds) or a value slightly below to allow graceful cleanup.
2. Verify the timeout cleanup logic in catch/finally blocks is still correct (lines ~101, 111, 133, 139).
3. Ensure the timeout fires a proper abort signal that cancels the upstream fetch and closes the stream reader.
4. Test that the `request.signal` abort listener (for client disconnects) still works alongside the timeout.
5. **Do NOT change the SSRF protection, CORS headers, or any other logic** — only fix the timeout.
6. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `MAX_DURATION_MS` is a positive value (≥15000, ≤30000)
- [ ] Timeout guard condition `if (MAX_DURATION_MS > 0)` now evaluates to true
- [ ] Stream requests that hang are terminated after the timeout
- [ ] Client disconnect still properly cleans up the stream
- [ ] `npm run build` passes with zero errors
