---
task_id: ARCH-005
target_agent: auto-reducer
target_module: src/components/radio/RadioShell.tsx
priority: critical
status: pending
---

# Extract NowPlayingBar from RadioShell

## Context

`_NowPlayingBar` (~line 5860, ~380 lines) is the bottom playback bar showing current track info, play/pause controls, volume, favorites, and navigation. It's wrapped with `React.memo` as `NowPlayingBar` (~line 6242). This is one of the most user-facing components and deserves its own file for focused iteration.

## Directive

1. Create `src/components/radio/components/NowPlayingBar.tsx` as a `'use client'` component.
2. Move `_NowPlayingBar` and the `NowPlayingBar = React.memo(...)` wrapper into the new file.
3. Move the `NowPlayingBarProps` type definition.
4. Import shared components (`LiquidGlassButton`, `UiImage`, `AnimatedBars`, `ShareButton`) — keep these in their current location and import them. If any are only used by NowPlayingBar, move them.
5. Import types from `../constants.ts`.
6. Update RadioShell to `import { NowPlayingBar } from './components/NowPlayingBar'`.
7. **Pure extraction** — no behavioral changes.
8. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `NowPlayingBar` in `src/components/radio/components/NowPlayingBar.tsx`
- [ ] `RadioShell.tsx` reduced by ~380+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Bottom bar displays and controls work identically
