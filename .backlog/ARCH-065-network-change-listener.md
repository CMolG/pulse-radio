---
task_id: ARCH-065
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Add Network Connection Change Listener for Adaptive Streaming

## Context

The `useRadio` hook reads `navigator.connection.effectiveType` reactively (when a reconnect is needed), but does NOT listen to the `change` event on the NetworkInformation API. This means:

1. **WiFi → Cellular transition**: Stream continues buffering on the old WiFi connection. When it finally fails (3-10 seconds later), the app starts reconnecting with cellular — wasting time.
2. **Cellular → WiFi transition**: The app doesn't take advantage of the better connection (e.g., could reconnect with higher quality).
3. **Save Data mode**: `navigator.connection.saveData` is checked but only at reconnect time, not proactively.

Proactive network monitoring would enable:
- Immediate reconnect on network type change (no waiting for buffer starvation).
- Logging the connection type for debugging playback quality issues.

## Directive

1. **Add a `navigator.connection` change event listener** in `useRadio`:
   ```typescript
   useEffect(() => {
     const conn = (navigator as any).connection;
     if (!conn) return;
     const onChange = () => {
       const { effectiveType, saveData, downlink } = conn;
       // If playing and connection improved, consider reconnecting for better quality
       // If connection degraded (4g → 2g), log warning
       if (effectiveType === 'slow-2g' || effectiveType === '2g') {
         // Proactively prepare for buffer issues
       }
     };
     conn.addEventListener('change', onChange);
     return () => conn.removeEventListener('change', onChange);
   }, []);
   ```

2. **On degradation** (4g/3g → 2g/slow-2g): Set a `connectionDegraded` flag that makes the stall detection more aggressive (check sooner, reconnect faster).

3. **On improvement** (2g → 4g): If currently in a reconnection backoff, cancel the delay and reconnect immediately.

4. **Feature detection**: The NetworkInformation API is Chrome/Edge only. Wrap in `if ('connection' in navigator)` guard. Firefox/Safari users get the existing behavior.

**Boundaries:**
- Do NOT change the streaming proxy or audio source.
- Do NOT implement adaptive bitrate streaming (that would require station metadata about available bitrates, which Radio Browser doesn't provide).
- This is purely about faster detection and reaction to network changes.
- Keep the implementation lightweight — no new hooks, just add to existing `useRadio`.

## Acceptance Criteria

- [ ] `navigator.connection` change event listener added with proper cleanup.
- [ ] Feature-detected — no errors on Firefox/Safari.
- [ ] Connection degradation logged and used to adjust stall timeout.
- [ ] Connection improvement triggers immediate reconnect attempt.
- [ ] `npm run build` passes.
- [ ] All existing Playwright tests pass.
