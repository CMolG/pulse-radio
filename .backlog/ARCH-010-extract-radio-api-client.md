---
task_id: ARCH-010
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Extract Radio API Client Functions into Standalone Module

## Context

RadioShell contains a complete Radio Browser API client defined inline (~line 1049-1114): `getBase()`, `rotateServer()`, `searchBy()`, `searchStations()`, `stationsByTag()`, `stationsByCountry()`, `trendingStations()`. These are pure async functions with no React dependencies — they manage server rotation and fetch station data. They belong in `src/lib/` as a reusable API client.

## Directive

1. Create `src/lib/radioApi.ts` — move all Radio Browser API functions: `getBase`, `rotateServer`, `searchBy`, `searchStations`, `stationsByTag`, `stationsByCountry`, `trendingStations`.
2. Move the server list constants and any caching state (the servers array, currentIndex, etc.).
3. Export all public functions (`searchStations`, `stationsByTag`, `stationsByCountry`, `trendingStations`).
4. Import the `Station` type from `@/components/radio/constants` (or define a minimal interface in the API module if it creates a cleaner dependency graph).
5. Update RadioShell to import from `@/lib/radioApi`.
6. **Pure extraction** — no API behavior changes.
7. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Radio API client in `src/lib/radioApi.ts`
- [ ] `RadioShell.tsx` reduced by ~100+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Station browsing, search, and trending still function correctly
- [ ] No circular dependencies with constants
