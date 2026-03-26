---
task_id: ARCH-014
target_agent: auto-reducer
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Extract FavoriteSongsView, HistoryGridView, and SongContextMenu from RadioShell

## Context

Three list/grid views are embedded in RadioShell that manage collections:
- `FavoriteSongsView` (~line 7360, ~155 lines) — Favorite songs list with remove/clear/select
- `HistoryGridView` (~line 7516, ~90 lines, memoized) — History songs grid display
- `SongContextMenu` (~line 7195, ~48 lines) — Context menu for song actions
- `GroupStack` (~line 7243, ~115 lines) — Groups songs by date/time

These share the `SongCard` component and manage song collections. They form a cohesive "collections" subsystem.

## Directive

1. Create `src/components/radio/views/FavoriteSongsView.tsx` — move `FavoriteSongsView`, `SongContextMenu`, and `GroupStack`.
2. Create `src/components/radio/views/HistoryGridView.tsx` — move `HistoryGridView`.
3. Import `SongCard` from its current location (or from where it will be after other extractions).
4. Move associated props types.
5. Update RadioShell imports.
6. **Pure extraction** — no logic changes.
7. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Two new view files created
- [ ] `RadioShell.tsx` reduced by ~400+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Favorites and history views render and interact correctly
