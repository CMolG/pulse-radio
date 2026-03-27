---
task_id: ARCH-101
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: critical
status: pending
---

# ARCH-101: Fix iOS Background Audio & Dynamic Island Integration

## Context

Tech proposal `.tech_proposals/002-pwa-improvements.md` documents a **critical UX defect**: audio playback cuts out on iOS Safari when the app is backgrounded or the screen locks. This is because the Web Audio API graph (equalizer + analyser) interrupts the native `<audio>` element's background playback privileges on iOS. Additionally, the Media Session API metadata is not being surfaced to iOS Dynamic Island or Lock Screen controls.

This is a **production-blocking issue** for the ~45% of mobile users on iOS. A radio app that stops playing when you lock your phone is fundamentally broken.

## Directive

1. **Audio pipeline restructure for iOS**:
   - Detect iOS via User-Agent or `navigator.platform` (check for `iPad|iPhone|iPod`).
   - On iOS: keep the native `<audio>` element as the **primary output** and do NOT route it through `AudioContext` by default. The EQ and visualizer should be opt-in features that warn the user about background playback limitations.
   - On non-iOS: continue using the current always-proxy `AudioContext` pipeline.

2. **Media Session API compliance**:
   - Ensure `navigator.mediaSession.metadata` is set with: `title`, `artist`, `album` (station name), and `artwork` (array with multiple sizes: 96x96, 128x128, 256x256, 512x512).
   - Register action handlers: `play`, `pause`, `previoustrack` (previous station in queue), `nexttrack` (next station in queue).
   - Update metadata on every ICY metadata change.

3. **AudioContext resume strategy**:
   - On iOS, when the user returns to the app (visibility change to `visible`), call `audioContext.resume()` to reconnect the Web Audio graph if effects are enabled.
   - Handle the `AudioContext` state change events (`statechange`) to detect when iOS suspends the context.

4. **Dynamic Island / Lock Screen**:
   - The `artwork` property in `MediaMetadata` must use absolute HTTPS URLs (not relative paths or blob URLs). If the artwork is fetched from iTunes, use the original URL directly.

5. **Do NOT break desktop or Android**: The restructure must be platform-conditional. Desktop and Android should continue using the current pipeline unchanged.

## Acceptance Criteria

- [ ] Audio continues playing on iOS when the app is backgrounded
- [ ] Audio continues playing on iOS when the screen locks
- [ ] Lock Screen controls (play/pause/next/prev) work on iOS
- [ ] Dynamic Island shows track metadata on supported iPhones
- [ ] Desktop and Android pipelines are unchanged
- [ ] EQ/visualizer work when app is in foreground on iOS
- [ ] Playwright test (mobile Safari user agent) verifying Media Session metadata is set
