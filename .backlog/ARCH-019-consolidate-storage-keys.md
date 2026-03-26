---
task_id: ARCH-019
target_agent: auto-reducer
target_module: src/components/radio/constants.ts
priority: high
status: pending
---

# Consolidate All localStorage Keys into STORAGE_KEYS

## Context

`STORAGE_KEYS` in constants.ts is the canonical registry of localStorage keys, but several components bypass it with hardcoded duplicates:

1. **RadioShell.tsx ~line 1141**: `STATS_STORAGE_KEY = 'radio-usage-stats'` — duplicates `STORAGE_KEYS.USAGE_STATS`
2. **RadioShell.tsx ~line 7572**: `ONBOARDING_KEY = 'radio-onboarding-done'` — duplicates `STORAGE_KEYS.ONBOARDING_DONE`
3. **RadioShell.tsx ~line 8395**: `QUALITY_DEFAULTS_MIGRATION_KEY = 'radio-quality-defaults-v2-applied'` — NOT in STORAGE_KEYS at all
4. **RadioShell.tsx ~line 8930**: `STORAGE_KEY = 'radio-station-queue'` — NOT in STORAGE_KEYS at all
5. **LocaleContext.tsx line 32**: `LOCALE_STORAGE_KEY = 'radio-locale'` — duplicates `STORAGE_KEYS.LOCALE`

This fragmentation means `ensureStorageVersion()` in storageUtils.ts cannot track all keys, and a schema migration could leave orphaned data.

## Directive

1. Add missing keys to `STORAGE_KEYS` in constants.ts:
   - `STATION_QUEUE: 'radio-station-queue'`
   - `QUALITY_MIGRATION: 'radio-quality-defaults-v2-applied'`
2. Replace all hardcoded key strings in RadioShell.tsx with `STORAGE_KEYS.*` imports:
   - `STATS_STORAGE_KEY` → `STORAGE_KEYS.USAGE_STATS`
   - `ONBOARDING_KEY` → `STORAGE_KEYS.ONBOARDING_DONE`
   - `QUALITY_DEFAULTS_MIGRATION_KEY` → `STORAGE_KEYS.QUALITY_MIGRATION`
   - Line ~8930 `STORAGE_KEY` → `STORAGE_KEYS.STATION_QUEUE`
3. In LocaleContext.tsx, replace `LOCALE_STORAGE_KEY` with `STORAGE_KEYS.LOCALE` imported from constants.
4. Remove the now-redundant local constant declarations.
5. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `STORAGE_KEYS` is the single source of truth for ALL localStorage keys
- [ ] Zero hardcoded `'radio-*'` strings outside of constants.ts
- [ ] `npm run build` passes with zero errors
- [ ] No behavioral changes — same keys, same values
