---
task_id: ARCH-029
target_agent: auto-reducer
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Extract Shared UI Primitives (LiquidGlass, UiImage, Cards, AnimatedBars)

## Context

Several reusable UI components are defined inline in RadioShell but used by multiple views (BrowseView, TheaterView, NowPlayingBar, SongDetailModal, etc.). After the major view extractions (ARCH-001 through ARCH-006), these will need to be importable from a shared location:

- `LiquidGlassSvgFilter` (~line 231, ~30 lines) — SVG filter definition for glass effects
- `LiquidGlassButton` (~line 260, ~145 lines) — Reusable glass-styled button
- `UiImage` (~line 533, ~55 lines) — Image component with fallback/error handling
- `SongCard` (~line 2885, ~140 lines, memoized) — Song display card
- `StationCard` (~line 3080, ~200 lines, memoized) — Station display card
- `AnimatedBars` (~line 3028, ~50 lines, memoized) — Audio visualizer bars

Total: ~620 lines of shared UI primitives.

## Dependencies

- Should run AFTER the major view extractions (ARCH-001 through ARCH-006) so extracted views can import these from the shared location.

## Directive

1. Create `src/components/radio/components/LiquidGlassButton.tsx` — move `LiquidGlassSvgFilter`, `LiquidGlassButton`, and `LiquidGlassButtonProps` type.
2. Create `src/components/radio/components/UiImage.tsx` — move `UiImage` and `UiImageProps`.
3. Create `src/components/radio/components/SongCard.tsx` — move `SongCard`, `SongCardProps`, `SongCardItem`, `HeartAction` types.
4. Create `src/components/radio/components/StationCard.tsx` — move `StationCard`, `StationCardProps`.
5. Create `src/components/radio/components/AnimatedBars.tsx` — move `AnimatedBars`.
6. Update all consumers (RadioShell + any already-extracted views) to import from new paths.
7. **Pure extraction** — no visual changes.
8. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] 5 new component files in `components/` directory
- [ ] `RadioShell.tsx` reduced by ~620 lines
- [ ] All views that reference these components import from shared location
- [ ] `npm run build` passes with zero errors
- [ ] No circular dependencies
