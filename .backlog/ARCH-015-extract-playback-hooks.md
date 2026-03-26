---
task_id: ARCH-015
target_agent: auto-reducer
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Extract Core Playback Hooks from RadioShell

## Context

RadioShell defines 10+ custom hooks inline that manage the application's core state. The highest-value extractions are the hooks that form the playback subsystem:
- `useRadio` (~line 1577, ~540 lines) — Core playback state machine (play, pause, crossfade, stream proxy)
- `useStationMeta` (~line 1458, ~95 lines) — ICY metadata polling and track parsing
- `useStationQueue` (~line 8932, ~135 lines) — Station queue management
- `useMediaSession` (~line 9343, ~80 lines) — OS media session integration

These hooks have clear inputs/outputs and can be extracted without breaking the internal state flow. They depend on shared types from constants.ts and some utility functions.

## Directive

1. Create `src/components/radio/hooks/useRadio.ts` — move `useRadio`, `isValidStreamUrl`, `isIOSDevice`, and related helper functions used only by this hook.
2. Create `src/components/radio/hooks/useStationMeta.ts` — move `useStationMeta`, `parseTrack`, `isAdContent`.
3. Create `src/components/radio/hooks/useStationQueue.ts` — move `useStationQueue`.
4. Create `src/components/radio/hooks/useMediaSession.ts` — move `useMediaSession` and `MediaSessionConfig` type.
5. Shared audio utilities (`getSharedContext`, `getOrCreateAudioSource`, `resumeAudioContext`, `hasAudioSource`) should go to `src/components/radio/hooks/audioContext.ts` if used by multiple hooks.
6. Update RadioShell to import all hooks.
7. **Pure extraction** — no state management changes.
8. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Four+ new hook files in `src/components/radio/hooks/`
- [ ] Shared audio context utilities in dedicated file
- [ ] `RadioShell.tsx` reduced by ~850+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Audio playback, metadata, queue, and media session all work identically
