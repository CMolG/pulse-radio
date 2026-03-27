---
task_id: ARCH-105
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# ARCH-105: Audio Codec Detection & Graceful Fallback

## Context

Radio stations stream in various codecs: MP3, AAC, OGG/Vorbis, Opus, FLAC, and occasionally WMA or proprietary formats. The app currently attempts to play any stream URL blindly — if the browser doesn't support the codec, the `<audio>` element silently fails or throws an opaque error. The user sees a loading spinner that never resolves, or silence. There is no feedback about **why** a station isn't playing.

ARCH-060 addresses silent play errors but doesn't solve the root cause: codec incompatibility. This card addresses the upstream detection.

## Directive

1. **Probe codec support on mount**:
   - Use `MediaSource.isTypeSupported()` or `HTMLMediaElement.canPlayType()` to detect supported codecs.
   - Build a capability map: `{ mp3: boolean, aac: boolean, ogg: boolean, opus: boolean, flac: boolean }`.
   - Cache this map for the session (it won't change during a single browser session).

2. **Station codec metadata**:
   - The Radio Browser API returns a `codec` field for each station (e.g., `"MP3"`, `"AAC"`, `"OGG"`).
   - Before playing a station, check the station's codec against the capability map.
   - If unsupported: show a user-friendly error toast: "This station uses [codec] which isn't supported by your browser. Try a different station or browser."

3. **Visual indicator on station cards**:
   - Add a small codec badge on station cards (e.g., "MP3", "AAC") — desktop only, hidden on mobile per AGENTS.md rules.
   - Dim or mark stations with unsupported codecs in the browse list (reduce opacity to 0.5, add a tooltip: "Unsupported format").

4. **Fallback strategy**:
   - If a station's codec field is empty or unknown, attempt playback normally (assume MP3).
   - If playback fails within 5 seconds (no `canplay` event), surface the error with a suggestion to try another station.

## Acceptance Criteria

- [ ] Codec capability map is built on mount using `canPlayType()`
- [ ] Stations with unsupported codecs show a warning before/instead of playing
- [ ] Codec badge visible on desktop station cards
- [ ] Codec badge hidden on mobile
- [ ] Unknown codec stations attempt playback with timeout-based error detection
- [ ] Playwright test: mock a station with unsupported codec → verify error message appears
