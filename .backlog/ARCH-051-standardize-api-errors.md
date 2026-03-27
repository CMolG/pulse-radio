---
task_id: ARCH-051
target_agent: auto-reducer-finite
target_module: src/lib/api-response.ts
priority: medium
status: completed
---

# Standardize API Error Response Schema

## Context

The 7 API routes in Pulse Radio return inconsistent error response shapes:

- `/api/itunes` errors include `{ error, results: [] }` (extra `results` array).
- `/api/proxy-stream` errors include `{ error, blacklisted: true }` (extra boolean).
- `/api/lyrics` returns `null` for "not found" instead of `{ error }`.
- `/api/icy-meta` returns `{ error }` for all errors.
- Status codes vary: the same "bad input" scenario returns 400 in some routes and 500 in others.

This inconsistency makes client-side error handling fragile — the client must handle different shapes per endpoint. It also makes it harder to add global error monitoring.

## Directive

1. **Create `src/lib/api-response.ts`** with standardized response helpers:
   ```typescript
   interface ApiErrorResponse {
     error: string;
     code: string;        // machine-readable: 'INVALID_PARAM', 'TIMEOUT', 'UPSTREAM_ERROR', etc.
     status: number;
   }

   export function apiError(message: string, code: string, status: number, headers?: HeadersInit): NextResponse;
   export function apiSuccess<T>(data: T, headers?: HeadersInit): NextResponse;
   ```

2. **Define standard error codes**: `INVALID_PARAM`, `MISSING_PARAM`, `TIMEOUT`, `UPSTREAM_ERROR`, `RATE_LIMITED`, `BLACKLISTED`, `NOT_FOUND`, `INTERNAL_ERROR`.

3. **Update all 7 routes** to use the helpers. Keep existing HTTP status codes but normalize the response body shape.

4. **Special cases**:
   - `/api/lyrics` "not found" should return `{ data: null }` with 200 (it's a valid response, not an error).
   - `/api/proxy-stream` remains binary for success but uses `apiError()` for error responses.

**Boundaries:**
- Do NOT change HTTP status codes used today (400, 500, 502, 503, 504).
- Do NOT change the success response shapes (only standardize errors).
- Keep it lightweight — no schema validation library.
- Ensure backward compatibility — clients that check for `error` field still work.

## Acceptance Criteria

- [ ] `src/lib/api-response.ts` exists with `apiError()` and `apiSuccess()` helpers.
- [ ] All 7 API routes use the standardized helpers for error responses.
- [ ] Error responses all have `{ error, code, status }` shape.
- [ ] Standard error codes are defined and documented in the file.
- [ ] Existing client-side error handling still works (the `error` field is preserved).
- [ ] `npm run build` passes.
- [ ] All existing Playwright tests pass.
