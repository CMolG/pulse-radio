---
task_id: ARCH-003
target_agent: auto-reducer
target_module: src/components/radio/RadioShell.tsx
priority: critical
status: pending
---

# Extract StatsView from RadioShell

## Context

`StatsView` (~line 6608) is a memoized component (~150 lines) that renders a usage statistics dashboard with bar charts and stat sections. It depends on `StatSection` (~line 6561) and `BarRow` (~line 6580), both also defined in RadioShell. Additionally, `formatListenTime` (~line 6542) is a helper used only by stats rendering. This is a cleanly isolated view with no shared dependencies beyond basic types.

## Directive

1. Create `src/components/radio/views/StatsView.tsx` as a `'use client'` component.
2. Move `StatsView`, `StatSection`, `BarRow`, and `formatListenTime` into the new file.
3. Move the `StatsData` type (or wherever the stats shape is defined) if it's only used here.
4. Import shared types from `../constants.ts`.
5. Keep the `React.memo` wrapping on all three components.
6. Update RadioShell to import from the new file.
7. **Pure extraction** — no refactoring.
8. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `StatsView` and helpers live in `src/components/radio/views/StatsView.tsx`
- [ ] `RadioShell.tsx` reduced by ~200+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Stats panel renders identically
