---
task_id: ARCH-013
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Extract OnboardingModal, UsageGuide, and KeyboardShortcutsHelp from RadioShell

## Context

Three modals/overlays are defined inline in RadioShell that are independent UI components:
- `_OnboardingModal` / `OnboardingModal` (~line 7687, ~110 lines) — First-time user flow with `PWAStep` (~line 7608)
- `_UsageGuide` / `UsageGuide` (~line 6449, ~90 lines) — Help/usage overlay
- `KeyboardShortcutsHelp` (~line 8249, ~55 lines) — Keyboard shortcuts reference

These are self-contained modals with minimal props (typically just `onClose`). They have no business being in a 10K-line file.

## Directive

1. Create `src/components/radio/components/OnboardingModal.tsx` — move `_OnboardingModal`, `OnboardingModal`, and `PWAStep`.
2. Create `src/components/radio/components/UsageGuide.tsx` — move `_UsageGuide`, `UsageGuide`.
3. Create `src/components/radio/components/KeyboardShortcutsHelp.tsx` — move `KeyboardShortcutsHelp`.
4. Keep all `React.memo` wrappings.
5. Update RadioShell imports.
6. **Pure extraction** — no changes to content or behavior.
7. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Three new component files created
- [ ] `RadioShell.tsx` reduced by ~260+ lines
- [ ] `npm run build` passes with zero errors
- [ ] All three modals open and display correctly
