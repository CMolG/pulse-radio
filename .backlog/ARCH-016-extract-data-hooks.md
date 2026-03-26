---
task_id: ARCH-016
target_agent: auto-reducer
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Extract Data & Persistence Hooks from RadioShell

## Context

RadioShell defines several hooks for data persistence and user preferences:
- `useEqualizer` (~line 8410, ~520 lines) — EQ state, presets, compressor, noise reduction, normalizer
- `useFavoriteSongs` (~line 9082, ~50 lines) — Favorite songs CRUD with localStorage
- `useFavorites` (~line 9136, ~55 lines) — Favorite stations CRUD with localStorage
- `useHistory` (~line 9195, ~145 lines) — Listening history tracking
- `useRecent` (~line 9425, ~30 lines) — Recently played stations
- `useSleepTimer` (~line 9455, ~95 lines) — Sleep timer with gradual fade
- `useWakeLock` (~line 9551, ~65 lines) — Screen wake lock API
- `useAlbumArt` (~line 924, ~95 lines) — iTunes album art fetching
- `useConcerts` (~line 1020, ~30 lines) — Bandsintown concert fetching
- `useStats` (~line 1191, ~200 lines) — Usage statistics tracking
- `useContainerSize` (~line 9623, ~25 lines) — Container dimension tracking
- `useParallaxBg` (~line 7797, ~70 lines) — Parallax background effect
- `useAudioAnalyser` (~line 8304, ~90 lines) — Web Audio FFT analysis
- `useAudioReactiveBackground` (~line 10, ~110 lines) — Audio-reactive background

## Directive

1. Group by domain and create separate hook files:
   - `src/components/radio/hooks/useEqualizer.ts` — useEqualizer (largest, highest priority)
   - `src/components/radio/hooks/useFavorites.ts` — useFavoriteSongs + useFavorites + `songKey` + `buildFavInput` helpers
   - `src/components/radio/hooks/useHistory.ts` — useHistory + useRecent
   - `src/components/radio/hooks/useSleepTimer.ts` — useSleepTimer
   - `src/components/radio/hooks/useWakeLock.ts` — useWakeLock
   - `src/components/radio/hooks/useAlbumArt.ts` — useAlbumArt + `selectBestItunesResult` + `itunesSearchUrl`
   - `src/components/radio/hooks/useStats.ts` — useStats
   - `src/components/radio/hooks/useAudioAnalyser.ts` — useAudioAnalyser + useAudioReactiveBackground
   - `src/components/radio/hooks/useContainerSize.ts` — useContainerSize
   - `src/components/radio/hooks/useParallaxBg.ts` — useParallaxBg
2. Move related helper functions and types alongside each hook.
3. Import `STORAGE_KEYS`, `EQ_BANDS`, `EQ_PRESETS` from `../constants.ts`.
4. Import `loadFromStorage`, `saveToStorage` from `@/lib/storageUtils`.
5. **Pure extraction** — no hook logic changes.
6. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] 10+ new hook files in `src/components/radio/hooks/`
- [ ] `RadioShell.tsx` reduced by ~1,500+ lines
- [ ] `npm run build` passes with zero errors
- [ ] All features (EQ, favorites, history, sleep timer, etc.) work identically
