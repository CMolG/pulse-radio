---
task_id: ARCH-020
target_agent: auto-optimizer
target_module: src/app/api/artist-info/route.ts
priority: medium
status: pending
---

# Return 504 for Timeout Errors in artist-info Route

## Context

The `/api/artist-info` route (line ~103-105) returns HTTP 500 for all errors, including timeouts. Every other API route in the project correctly differentiates: 504 for timeout/abort errors, 500 for unexpected failures. This inconsistency breaks client-side retry logic that uses status codes to decide whether to retry (504 = transient, retry; 500 = bug, don't retry).

## Directive

1. In the catch block of `/api/artist-info/route.ts`, check if the error is an abort/timeout error (e.g., `error.name === 'AbortError'` or `error.name === 'TimeoutError'`).
2. Return 504 with `{ error: 'timeout' }` for timeout errors.
3. Keep 500 with `{ error: 'internal' }` for other errors.
4. Follow the exact same pattern used in `lyrics/route.ts` or `concerts/route.ts` for consistency.
5. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Timeout errors return HTTP 504
- [ ] Other errors return HTTP 500
- [ ] Error response JSON shape matches other routes (`{ error: string }`)
- [ ] `npm run build` passes with zero errors
