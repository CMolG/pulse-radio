---
task_id: ARCH-060
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: critical
status: pending
---

# Replace Silent .catch(_NOOP) with Proper Error Handling on audio.play()

## Context

RadioShell.tsx contains **57 instances** of `.catch(_NOOP)` — a pattern that silently swallows ALL errors. The most critical instances are on `audio.play()` calls (lines ~1974, 1983, 1803), where non-autoplay errors are silently discarded:

- `NotSupportedError` (unsupported codec) → user sees "playing" but hears nothing.
- `AbortError` (fetch aborted) → swallowed, no retry.
- `NetworkError` → stream dies silently, no reconnection triggered.

The app correctly detects `NotAllowedError` (iOS autoplay block) via `isAutoplayBlocked()`, but all OTHER `.play()` errors are treated identically to "no error" — a critical observability gap in production.

## Directive

1. **Audit all `.catch(_NOOP)` instances** in RadioShell.tsx. Categorize each into:
   - **Audio play calls**: Replace with proper error classification (autoplay blocked → paused; abort → ignore; not supported → error + log; network → reconnect).
   - **AudioContext.resume() calls**: Replace with retry logic (1 retry after 500ms).
   - **Non-critical operations** (e.g., clipboard copy): Keep `_NOOP` but add a `// intentional` comment.

2. **Create a classified error handler for audio.play()**:
   ```typescript
   function handlePlayError(err: unknown, station: Station, reconnect: (ms: number) => void) {
     if (isAutoplayBlocked(err)) { setStatus('paused'); return; }
     if (err instanceof DOMException && err.name === 'AbortError') return; // expected
     if (err instanceof DOMException && err.name === 'NotSupportedError') {
       setStatus('error');
       return;
     }
     reconnect(500); // network or other transient error
   }
   ```

3. **Replace at minimum these 5 critical call sites** where `.catch(_NOOP)` hides audio failures. Log unknown errors with `console.warn` (not `console.error` — these are recoverable).

**Boundaries:**
- Do NOT add error tracking infrastructure (that's ARCH-036).
- Do NOT modify the reconnect logic or session ID system.
- Keep `_NOOP` for truly ignorable cases (clipboard, non-critical UI state), but add a comment explaining why.
- Do NOT change the `isAutoplayBlocked()` function.

## Acceptance Criteria

- [ ] All `audio.play().catch(_NOOP)` replaced with classified error handlers.
- [ ] `AudioContext.resume().catch(_NOOP)` replaced with retry or warning log.
- [ ] Remaining `_NOOP` catches have `// intentional: <reason>` comments.
- [ ] Unsupported codec errors set status to 'error' (visible to user).
- [ ] Network errors trigger reconnect.
- [ ] `npm run build` passes.
- [ ] All existing Playwright tests pass.
