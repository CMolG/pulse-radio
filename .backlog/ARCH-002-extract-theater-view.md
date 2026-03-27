---
task_id: ARCH-002
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: critical
status: completed
---

# Extract TheaterView and Lyrics Components from RadioShell

## Context

`TheaterView` (~line 4694, ~330 lines) is the immersive full-screen mode with lyrics display, parallax album art, and artist info. It depends on several lyrics-related sub-components also defined in RadioShell: `LyricReelLine` (~line 4059), `LyricsReel` (~line 4106), and lyrics helper functions (`getActiveLyricIndex`, `getEffectiveActiveLyricIndex`, `getRenderableLyricLines`). These form a cohesive unit that should be co-located.

## Directive

1. Create `src/components/radio/views/TheaterView.tsx` as a `'use client'` component.
2. Move into it: `TheaterView`, `LyricReelLine`, `LyricsReel`, `getActiveLyricIndex`, `getEffectiveActiveLyricIndex`, `getRenderableLyricLines`, and the `RenderableLyricLine` type.
3. Also move `ParallaxAlbumBackground` (~line 6252) and `NowPlayingHero` (~line 6302) if they are exclusively used by TheaterView. If shared, keep them in RadioShell and import.
4. Import shared types from `../constants.ts` and shared utilities from RadioShell as needed.
5. The extracted component must accept the same props it currently receives.
6. Update RadioShell to import TheaterView from the new file.
7. **Pure extraction only** — no logic changes.
8. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `TheaterView` and its lyrics sub-components live in `src/components/radio/views/TheaterView.tsx`
- [ ] `RadioShell.tsx` reduced by ~500+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Theater mode and lyrics reel work identically
