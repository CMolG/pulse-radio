---
task_id: ARCH-018
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Fix PlaybackState Type Name Conflict

## Context

There are two completely different types both named `PlaybackState`:
- **constants.ts line 159** (exported): Contains `station`, `status`, `track`, `volume`, `muted`, `errorMessage` — represents the global playback state shape.
- **RadioShell.tsx line 55** (internal): A Zustand store interface with `source`, `isPlaying`, `currentTime`, `volume`, `muted`, `trackTitle`, `trackArtist`, `artworkUrl`, and setter methods.

These are semantically different. The constants.ts version represents a serializable state snapshot while the RadioShell version is a Zustand store with methods. This naming collision is a bug waiting to happen — any refactoring that moves types between files will silently use the wrong definition.

## Directive

1. Rename the Zustand store interface in RadioShell.tsx from `PlaybackState` to `PlaybackStore` (line ~55).
2. Update all references to this interface within RadioShell.tsx (check `create<PlaybackState>`, `useStore<PlaybackState>`, and any type annotations).
3. Verify that the constants.ts `PlaybackState` is still used correctly wherever it's imported.
4. **Only rename the type** — do not change any runtime behavior.
5. Run `npm run build` to verify no type errors.

## Acceptance Criteria

- [ ] No two types share the name `PlaybackState`
- [ ] Zustand store uses `PlaybackStore` consistently
- [ ] constants.ts `PlaybackState` remains unchanged and correctly used
- [ ] `npm run build` passes with zero errors
