---
task_id: ARCH-072
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Extract Utility Hooks from RadioShell

## Context

This card was split from ARCH-016 (which was narrowed to audio processing hooks only). These hooks handle UI utilities, browser API wrappers, and visual effects — they are independent of both the audio domain and the persistence domain:

- `useSleepTimer` (~95 lines) — Sleep timer with gradual volume fade-out
- `useWakeLock` (~65 lines) — Screen Wake Lock API wrapper
- `useContainerSize` (~25 lines) — Container dimension tracking via ResizeObserver
- `useParallaxBg` (~70 lines) — Parallax background scroll effect

Total: ~255 lines. Each hook is self-contained with no cross-dependencies.

## Directive

1. Create utility hook files:
   - `src/components/radio/hooks/useSleepTimer.ts` — useSleepTimer + fade-out logic
   - `src/components/radio/hooks/useWakeLock.ts` — useWakeLock
   - `src/components/radio/hooks/useContainerSize.ts` — useContainerSize
   - `src/components/radio/hooks/useParallaxBg.ts` — useParallaxBg
2. Import `STORAGE_KEYS` from `../constants.ts` where needed.
3. **Pure extraction** — no hook logic changes.
4. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] 4 new hook files in `src/components/radio/hooks/`
- [ ] `RadioShell.tsx` reduced by ~255 lines
- [ ] `npm run build` passes with zero errors
- [ ] Sleep timer, wake lock, container sizing, and parallax effect work identically
