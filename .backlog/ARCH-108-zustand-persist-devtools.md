---
task_id: ARCH-108
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# ARCH-108: Migrate Zustand Store to Persist + DevTools Middleware

## Context

The Zustand playback store (`usePlaybackStore` in RadioShell.tsx, lines ~72-97) uses manual `setInterval`-based persistence to localStorage instead of Zustand's built-in `persist` middleware. This has several problems:

1. **Data loss window**: The interval-based save has a gap — if the user closes the tab between saves, the latest state is lost.
2. **No hydration**: On page load, the store starts empty. Volume, muted state, and last-played station are lost. Users must re-adjust settings every time.
3. **No DevTools**: Debugging state changes requires `console.log` — Zustand's `devtools` middleware integrates with Redux DevTools for free time-travel debugging.
4. **Duplicate code**: Manual `saveToStorage` / `loadFromStorage` logic duplicates what `zustand/middleware/persist` does out of the box.

## Directive

1. **Replace manual persistence with `zustand/middleware/persist`**:
   ```typescript
   import { persist, devtools } from 'zustand/middleware';

   const usePlaybackStore = create<PlaybackState>()(
     devtools(
       persist(
         (set) => ({
           volume: 0.8,
           muted: false,
           // ...state
         }),
         {
           name: 'radio-playback',
           partialize: (state) => ({
             volume: state.volume,
             muted: state.muted,
             // Persist settings only, NOT transient state like isPlaying/currentTime
           }),
         }
       ),
       { name: 'PlaybackStore' }
     )
   );
   ```

2. **Selective persistence via `partialize`**: Only persist user preferences (volume, muted, EQ settings). Do NOT persist transient state (isPlaying, currentTime, trackTitle, artworkUrl) — these should reset on load.

3. **Add `devtools` middleware** (conditional on `NODE_ENV === 'development'`): Wraps the store with Redux DevTools support for free.

4. **Remove all manual `setInterval` persistence code** — the `saveTimerRef`, `persist` callback, and `loadFromStorage` calls for store values.

5. **Hydration handling**: Zustand persist handles hydration automatically, but add a `onRehydrateStorage` callback to log hydration status in development mode.

6. **Do NOT change the store shape or any component consumers** — this is a middleware-only refactor.

## Acceptance Criteria

- [ ] `zustand/middleware/persist` is used instead of manual setInterval persistence
- [ ] Volume and muted state survive page reload
- [ ] Transient state (isPlaying, currentTime) resets on load (not persisted)
- [ ] Redux DevTools shows store state in development mode
- [ ] All manual persistence code (setInterval, saveToStorage for store values) is removed
- [ ] No behavioral regression — all existing Playwright tests pass
