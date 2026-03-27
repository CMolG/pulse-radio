---
task_id: ARCH-119
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: completed
---

# ARCH-119: Bandwidth-Aware Stream Quality Selection

## Context

Radio stations often offer multiple stream endpoints at different bitrates (32kbps, 64kbps, 128kbps, 320kbps). The Radio Browser API provides the `bitrate` field for each station, and some station operators host multiple URLs at different qualities.

Currently, Pulse Radio plays whatever URL is returned without considering the user's network conditions. On a slow mobile connection (2G/3G), attempting a 320kbps stream causes constant buffering and stalls. On fast WiFi, playing a 32kbps stream wastes audio quality.

The Network Information API (`navigator.connection`) provides real-time network quality data that can inform stream selection.

## Directive

1. **Network quality detection**:
   - Use `navigator.connection.effectiveType` to detect: `'4g'`, `'3g'`, `'2g'`, `'slow-2g'`.
   - Use `navigator.connection.downlink` for estimated bandwidth in Mbps.
   - Listen for `change` events on `navigator.connection` to detect quality transitions.
   - Graceful fallback: if `navigator.connection` is not available (Firefox, Safari), default to high quality.

2. **Bitrate preference mapping**:
   ```typescript
   const QUALITY_MAP = {
     '4g':      { maxBitrate: Infinity, label: 'High Quality' },
     '3g':      { maxBitrate: 128,      label: 'Standard' },
     '2g':      { maxBitrate: 64,       label: 'Low' },
     'slow-2g': { maxBitrate: 32,       label: 'Minimal' },
   };
   ```

3. **Station filtering**:
   - In the browse view, sort stations with compatible bitrates higher.
   - Show a network quality indicator in the player: "📶 High Quality" / "📶 Low Bandwidth".
   - If the current station's bitrate exceeds the recommended max, show an advisory: "You're on a slow connection. This station may buffer."

4. **User override**:
   - Add a "Stream Quality" preference in settings: Auto (default), High, Standard, Low.
   - "Auto" uses the Network Information API detection.
   - Manual settings override the auto-detection.
   - Persist preference in localStorage.

5. **Smart station suggestion**:
   - If a station is buffering (stall events detected), suggest a lower-bitrate alternative from the same genre/country.
   - Use the Radio Browser API to find similar stations with lower bitrate.

## Acceptance Criteria

- [ ] Network quality is detected via `navigator.connection` when available
- [ ] Stream quality preference is available in settings (Auto, High, Standard, Low)
- [ ] Stations are annotated with bitrate information
- [ ] Buffering on slow connections triggers a quality suggestion
- [ ] Quality preference persists across sessions
- [ ] Fallback behavior works when Network API is unavailable
- [ ] Playwright test: mock slow network → verify quality indicator shows
