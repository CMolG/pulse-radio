---
task_id: ARCH-132
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# ARCH-132: Network Resilience & Reconnection Handling

## Context

RadioShell detects offline state (`streamQuality = 'offline'`) but has no reconnection logic. When a user regains connectivity after going offline, the app stays in a degraded state — metadata fetches remain failed, the player doesn't retry, and there's no user feedback that the connection has recovered.

ARCH-069 (PWA) covers the service worker manifest but not offline state handling. ARCH-119 (bandwidth-aware streaming) covers codec detection but not connection adaptation. No existing card covers reconnection logic or `online`/`offline` event handling.

## Directive

1. **Connection state manager** — Add to Zustand store (or create `src/lib/connection-state.ts`):
   - Track: `isOnline`, `effectiveType` (from `navigator.connection`), `lastOnlineAt`.
   - Listen to `window.addEventListener('online'/'offline')`.
   - Listen to `navigator.connection.addEventListener('change')` (where supported).

2. **Reconnection handler**:
   - On `online` event:
     - Retry the last failed metadata fetch (lyrics, artist info, artwork).
     - If a station was playing, verify the audio stream is still active.
     - Show a brief "Reconnected" toast notification (auto-dismiss 3s).
   - On `offline` event:
     - Show "You're offline" indicator (persistent until reconnection).
     - Pause non-critical fetches (artwork, lyrics) — don't waste battery.
     - Keep audio playing if the stream buffer has data.

3. **Bandwidth adaptation** (progressive enhancement):
   - Check `navigator.connection.effectiveType` on connection change.
   - On `2g`/`slow-2g`: disable visualizer, use thumbnail artwork, reduce metadata fetch frequency.
   - On `3g`: disable visualizer.
   - On `4g`/`wifi`: full features.

4. **Offline action queue**:
   - If user adds a favorite while offline, queue the action.
   - Replay queued actions on reconnection (favorites are localStorage-based, so this may just need a UI sync).

5. **Mobile-first design**:
   - Offline indicator: subtle top bar or status badge (not a blocking modal).
   - Touch target ≥ 44px on any retry button.

## Acceptance Criteria

- [ ] `online`/`offline` events trigger state updates
- [ ] "Reconnected" toast shown when connection restores
- [ ] "Offline" indicator shown when connection drops
- [ ] Failed metadata fetches retried on reconnection
- [ ] Visualizer disabled on slow connections (if `navigator.connection` available)
- [ ] No runtime errors if `navigator.connection` is unsupported
- [ ] Playwright test: simulate offline → verify indicator → restore → verify recovery
