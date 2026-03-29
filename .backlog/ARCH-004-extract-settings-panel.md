---
task_id: ARCH-004
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: critical
status: completed
---

# Extract MobileSettingsPanel from RadioShell

## Context

`MobileSettingsPanel` (~line 6755, ~440 lines) is a large, self-contained settings UI handling EQ controls, effects toggles, compressor settings, language selection, quality options, and audio settings. It also includes `LanguageSelector` (~line 7918) and references `EqPanel` (~line 7966). Together these form the settings subsystem (~700+ lines).

## Directive

1. Create `src/components/radio/views/MobileSettingsPanel.tsx` as a `'use client'` component.
2. Move `MobileSettingsPanel` into the new file.
3. If `LanguageSelector` is only used within the settings panel, move it too. If shared elsewhere, keep it separate.
4. `EqPanel` is likely shared (used in both settings and standalone). If so, extract it to `src/components/radio/components/EqPanel.tsx` and import from both locations.
5. Move related types (`MobileSettingsPanelProps`, any EQ-specific types not in constants) along.
6. Import shared constants (`EQ_BANDS`, `EQ_PRESETS`, `STORAGE_KEYS`) from `../constants.ts`.
7. Update RadioShell imports.
8. **Pure extraction** — no logic changes.
9. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `MobileSettingsPanel` in `src/components/radio/views/MobileSettingsPanel.tsx`
- [ ] `EqPanel` extracted if independently usable
- [ ] `RadioShell.tsx` reduced by ~500+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Settings panel opens, toggles work, EQ responds — all identical behavior
