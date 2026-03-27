---
task_id: ARCH-071
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Extract Persistence & Data Hooks from RadioShell

## Context

This card was split from ARCH-016 (which was narrowed to audio processing hooks only). These hooks handle data persistence, user preferences, and external API data fetching — all using `localStorage` via `storageUtils`:

- `useFavoriteSongs` (~50 lines) — Favorite songs CRUD with localStorage
- `useFavorites` (~55 lines) — Favorite stations CRUD with localStorage
- `useHistory` (~145 lines) — Listening history tracking
- `useRecent` (~30 lines) — Recently played stations
- `useAlbumArt` (~95 lines) — iTunes album art fetching
- `useConcerts` (~30 lines) — Bandsintown concert fetching
- `useStats` (~200 lines) — Usage statistics tracking

These hooks share a common pattern: load from localStorage on mount, update state + persist on change. They have no dependencies on each other or on audio processing hooks.

## Directive

1. Create persistence hook files:
   - `src/components/radio/hooks/useFavorites.ts` — useFavoriteSongs + useFavorites + `songKey` + `buildFavInput` helpers
   - `src/components/radio/hooks/useHistory.ts` — useHistory + useRecent
   - `src/components/radio/hooks/useAlbumArt.ts` — useAlbumArt + `selectBestItunesResult` + `itunesSearchUrl`
   - `src/components/radio/hooks/useConcerts.ts` — useConcerts
   - `src/components/radio/hooks/useStats.ts` — useStats
2. Import `STORAGE_KEYS` from `../constants.ts`.
3. Import `loadFromStorage`, `saveToStorage` from `@/lib/storageUtils`.
4. **Pure extraction** — no hook logic changes.
5. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] 5 new hook files in `src/components/radio/hooks/`
- [ ] `RadioShell.tsx` reduced by ~605 lines
- [ ] `npm run build` passes with zero errors
- [ ] Favorites, history, recent, album art, concerts, and stats work identically
