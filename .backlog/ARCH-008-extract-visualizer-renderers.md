---
task_id: ARCH-008
target_agent: auto-reducer
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Extract Visualizer Renderers into Dedicated Module

## Context

RadioShell contains three canvas-based audio visualizer components: `SpiralRenderer` (~line 4232, ~190 lines), `FerrofluidRenderer` (~line 5726, ~130 lines), and the shared `useCanvasLoop` hook (~line 707, ~90 lines). FerrofluidRenderer also depends on helper functions: `hexToRgb`, `lerp`, `createBlobs`, `drawMetaballs`. These are self-contained rendering systems with no dependency on radio business logic — they only need audio analysis data (frequency/time domain arrays).

## Directive

1. Create `src/components/radio/components/visualizers/SpiralRenderer.tsx` — move `SpiralRenderer` component.
2. Create `src/components/radio/components/visualizers/FerrofluidRenderer.tsx` — move `FerrofluidRenderer` and its helpers (`hexToRgb`, `lerp`, `createBlobs`, `drawMetaballs`, `Blob` type).
3. Create `src/components/radio/hooks/useCanvasLoop.ts` — move the `useCanvasLoop` hook.
4. Create `src/components/radio/components/visualizers/index.ts` — barrel export both renderers.
5. Update imports in RadioShell.
6. **Pure extraction** — no rendering changes.
7. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Visualizer renderers in dedicated `visualizers/` directory
- [ ] `useCanvasLoop` in hooks directory
- [ ] `RadioShell.tsx` reduced by ~400+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Both visualizers render identically (verify with Playwright screenshot test)
