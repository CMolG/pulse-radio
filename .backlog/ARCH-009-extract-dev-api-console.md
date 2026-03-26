---
task_id: ARCH-009
target_agent: auto-reducer
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Extract DevApiConsole from RadioShell

## Context

`DevApiConsole` (~line 4420, ~274 lines) is a development-only component that logs and displays all API requests/responses in a collapsible panel. It includes its own helper functions: `normalizeDevApiUrl` (~line 120), `isTrackedDevApiUrl` (~line 139), `isIcyMetaUrl` (~line 143), `buildIcyDedupeKey` (~line 146), and `installDevFetchLogger` (~line 169). This is dev tooling that has zero business in a production component file.

## Directive

1. Create `src/components/radio/components/DevApiConsole.tsx` as a `'use client'` component.
2. Move `DevApiConsole` and ALL its helper functions (`normalizeDevApiUrl`, `isTrackedDevApiUrl`, `isIcyMetaUrl`, `buildIcyDedupeKey`, `installDevFetchLogger`).
3. Move the `ApiLogEntry` type and the `DEV_API_LOG_EVENT` constant.
4. The component should remain wrapped in `React.memo`.
5. In RadioShell, conditionally import it only in development mode (it already should be gated by `process.env.NODE_ENV`).
6. Update RadioShell imports.
7. **Pure extraction** — no logic changes.
8. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `DevApiConsole` in `src/components/radio/components/DevApiConsole.tsx`
- [ ] `RadioShell.tsx` reduced by ~340+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Dev API console works in dev mode, invisible in production
