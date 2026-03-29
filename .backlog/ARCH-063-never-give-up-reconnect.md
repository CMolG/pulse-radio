---
task_id: ARCH-063
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Extend Reconnect Logic — Never Give Up Permanently

## Context

The `useRadio` hook's reconnect logic gives up permanently after 10 failed retries (line ~1687):

```typescript
if (retryRef.current >= 10) {
  setStatus('error');
  return; // ← App stops trying, user must manually restart
}
```

With the current backoff delays (~500ms–5s + jitter), this means the app gives up after roughly 10-50 seconds of network issues. On mobile, network transitions (WiFi→cellular, tunnel passages, elevator rides) frequently cause 30-60 second gaps. The user's radio stops and they must manually tap play again.

Competing apps (TuneIn, iHeartRadio) never give up — they show a "reconnecting" indicator and keep trying indefinitely with increasing backoff.

## Directive

1. **Replace the hard retry cap with exponential backoff + indefinite retry**:
   - Retries 1-5: 1s, 2s, 4s, 8s, 16s (exponential).
   - Retries 6+: Cap at 30s, retry every 30s indefinitely.
   - Add jitter (±20%) to prevent thundering herd.

2. **Add a "reconnecting" UI state**:
   - After 3 failed retries, set a `isReconnecting: boolean` state (or status = `'reconnecting'`).
   - This allows the UI to show a subtle "Reconnecting..." indicator instead of hard error.

3. **Add network-aware behavior**:
   - If `navigator.onLine === false`, pause retries entirely. Resume immediately when `online` event fires.
   - Listen to `navigator.connection` `change` event to detect WiFi→cellular transitions and trigger immediate reconnection attempt.

4. **Reset retry counter on success**: When playback resumes successfully, reset `retryRef.current = 0`.

5. **Manual error state**: Only show hard "error" state if the user explicitly clicks a "stop trying" button, or if the error is non-recoverable (e.g., `NotSupportedError` codec issue, SSRF block).

**Boundaries:**
- Do NOT modify the audio element creation or source management.
- Do NOT change the CORS proxy logic.
- Keep the session ID validation (prevent stale reconnects for old stations).
- Do NOT modify the BroadcastChannel multi-tab logic.

## Acceptance Criteria

- [ ] No hard retry cap — retries indefinitely with 30s max interval.
- [ ] Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (cap).
- [ ] Jitter applied to prevent thundering herd.
- [ ] `isReconnecting` state available for UI indicator.
- [ ] Retries pause when `navigator.onLine === false`.
- [ ] Retries resume immediately on `online` event.
- [ ] Retry counter resets to 0 on successful playback.
- [ ] Non-recoverable errors (codec, SSRF) still show hard error.
- [ ] `npm run build` passes.
- [ ] All existing Playwright tests pass.
