---
task_id: ARCH-118
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# ARCH-118: Standardize Client-Side Fetch Patterns

## Context

RadioShell.tsx contains ~10 `fetch()` calls using **mixed patterns**:
- Some use `.then().then().catch()` promise chains (lines ~945, ~1030)
- Others use `async/await` with `try/catch` blocks (lines ~1068, ~1423)
- `AbortSignal.timeout()` is used inconsistently — some calls have it, others rely on the parent effect's cleanup signal
- Error type checking varies: some check `error.name === 'AbortError'`, others catch all errors generically

This inconsistency makes the code harder to read, debug, and maintain. When the component is eventually decomposed (ARCH-001 through ARCH-009), each extracted module should follow a single consistent pattern.

## Directive

1. **Standardize on `async/await`**: Convert all `.then()` chains to `async/await` with `try/catch/finally` blocks. This is more readable and the standard pattern for React hooks.

2. **Consistent timeout strategy**:
   - Every client-side fetch should use `AbortSignal.any([AbortSignal.timeout(TIMEOUT_MS), parentSignal])` where `parentSignal` comes from the effect's `AbortController`.
   - Default timeout: `10_000` (10 seconds) for metadata calls, `15_000` for artwork/concerts.
   - Define timeout constants at the top of the file (or in `constants.ts`).

3. **Consistent error handling**:
   ```typescript
   try {
     const res = await fetch(url, { signal });
     if (!res.ok) return; // or handle specific status codes
     const data = await res.json();
     // use data
   } catch (err) {
     if (err instanceof DOMException && err.name === 'AbortError') return; // Expected cleanup
     console.error('[FeatureName] fetch failed:', err);
   }
   ```

4. **Centralized fetch wrapper** (optional optimization):
   - Create a `safeFetch(url, options)` utility that:
     - Adds a default timeout if none provided
     - Handles AbortError silently
     - Logs non-abort errors with a consistent prefix
     - Returns `null` on failure (instead of throwing)
   - This reduces boilerplate in each call site.

5. **Do NOT change the API routes** — this card is client-side only.

## Acceptance Criteria

- [ ] All `fetch()` calls in RadioShell.tsx use `async/await` (no `.then()` chains)
- [ ] All fetches have explicit timeout via `AbortSignal.timeout()`
- [ ] All error handlers check for `AbortError` before logging
- [ ] Timeout constants are defined in one place
- [ ] No behavioral changes — same data is fetched, same errors are handled
- [ ] All existing Playwright tests pass
