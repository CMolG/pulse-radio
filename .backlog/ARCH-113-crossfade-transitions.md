---
task_id: ARCH-113
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# ARCH-113: Crossfade Audio Transitions Between Stations

## Context

When a user switches radio stations, the current behavior is abrupt: the playing stream is immediately stopped and the new stream starts from silence. This produces a jarring audio gap — especially noticeable if the user is quickly browsing through stations to find something they like.

Professional radio apps (TuneIn, iHeartRadio) implement **crossfade**: the outgoing station fades out over ~1-2 seconds while the incoming station fades in, creating a smooth listening experience. The Web Audio API's `GainNode` with `linearRampToValueAtTime` makes this straightforward.

## Directive

1. **Dual audio element strategy**:
   - Maintain two `<audio>` elements (or `HTMLAudioElement` instances): `primaryAudio` and `secondaryAudio`.
   - When switching stations:
     a. Start loading the new stream into whichever element is not currently playing (the "incoming" element).
     b. Once the incoming element fires `canplay`, begin the crossfade:
        - Ramp the outgoing element's `GainNode` from current volume → 0 over `CROSSFADE_DURATION` (default 1.5s).
        - Ramp the incoming element's `GainNode` from 0 → target volume over `CROSSFADE_DURATION`.
     c. After the crossfade completes, pause and reset the outgoing element.
   - Alternate between primary and secondary on each station switch.

2. **Web Audio integration**:
   - Each audio element needs its own `MediaElementSourceNode` → `GainNode` → destination chain.
   - Use `gainNode.gain.linearRampToValueAtTime()` for smooth, glitch-free fading.
   - The existing EQ chain should be connected to whichever element is currently "active" (the one fading in).

3. **User preference**:
   - Add a "Crossfade" toggle in the settings panel (default: on).
   - Persist the preference in localStorage via `STORAGE_KEYS`.
   - When disabled, switch stations instantly (current behavior).

4. **Edge cases**:
   - If the user rapidly switches stations (< 1.5s between switches), cancel the ongoing crossfade and start a new one from the current gain level.
   - If the incoming stream fails to load, abort the crossfade and keep the current station playing.
   - Do NOT crossfade when starting playback from stopped state (only on station-to-station transitions).

5. **iOS consideration**: On iOS, only one `<audio>` element can play at a time. Detect iOS and fall back to instant switching (no crossfade). Reference ARCH-101 for iOS detection pattern.

## Acceptance Criteria

- [ ] Switching stations produces a smooth audio crossfade (no silence gap)
- [ ] Crossfade duration is ~1.5 seconds
- [ ] Crossfade toggle exists in settings
- [ ] Crossfade preference persists across sessions
- [ ] Rapid station switching doesn't produce audio artifacts
- [ ] Failed stream loads don't interrupt current playback
- [ ] iOS falls back to instant switching
- [ ] Playwright test: switch stations → verify both audio elements exist → verify gain transition
