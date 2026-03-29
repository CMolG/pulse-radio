---
task_id: ARCH-001
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: critical
status: failed
---

# Extract BrowseView from RadioShell

## Context

`RadioShell.tsx` is a 10,935-line God Component. `BrowseView` (starting ~line 3383) is the largest embedded view at ~620 lines. It handles genre/country browsing with infinite scroll, category loading, search, and station filtering. It is self-contained with clear prop boundaries and is the single highest-ROI extraction target.

## Directive

1. Create `src/components/radio/views/BrowseView.tsx` as a `'use client'` component.
2. Move the `BrowseView` function and its direct helper `ScrollRow` (~line 3309) into the new file.
3. Move associated types (`CategoryState`, etc.) that are only used by BrowseView.
4. Import shared types (`Station`, `NowPlayingTrack`, etc.) from `../constants.ts`.
5. Import shared utilities (`stationInitials`, `UiImage`, `StationCard`, `AnimatedBars`) — if these are only used by BrowseView, move them too; if shared, keep in RadioShell and import.
6. The extracted component must accept the same props it currently receives from RadioShell's JSX.
7. Update RadioShell to `import { BrowseView } from './views/BrowseView'`.
8. **Do NOT refactor internal logic** — this is a pure extraction, not a rewrite.
9. Run `npm run build` to verify zero type errors after extraction.

## Acceptance Criteria

- [ ] `BrowseView` lives in its own file at `src/components/radio/views/BrowseView.tsx`
- [ ] `RadioShell.tsx` is reduced by ~620+ lines
- [ ] `npm run build` passes with zero errors
- [ ] No behavioral changes — the browse UI works identically
- [ ] All imports resolve correctly (no circular dependencies)
