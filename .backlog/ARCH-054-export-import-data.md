---
task_id: ARCH-054
target_agent: auto-feature-engineer-finite
target_module: src/hooks/useExportImport.ts
priority: high
status: completed
---

# Add Favorites & Settings Export/Import for Data Portability

## Context

All user data (favorites, history, EQ presets, stats, favorite songs) lives exclusively in localStorage. If a user clears their browser data, switches browsers, or gets a new device, everything is lost. There are no user accounts and adding a full auth + cloud sync system is a major investment.

A lightweight, zero-infrastructure alternative is **export/import via JSON file**. This gives users data portability without requiring any backend changes:
- Export all settings/favorites to a `.json` file (download to device).
- Import from a previously exported file (upload).
- This is the standard pattern used by uBlock Origin, RSSHub, Bitwarden, and other privacy-focused tools.

This directly addresses the #2 power-user pain point: "favorites die if browser clears data."

## Directive

1. **Create `src/hooks/useExportImport.ts`**:
   - **`exportData(): void`** — Reads all `STORAGE_KEYS` from localStorage, bundles into a JSON object with a version header, and triggers a browser file download:
     ```json
     {
       "app": "pulse-radio",
       "version": 1,
       "exportedAt": "2026-03-27T00:00:00Z",
       "data": {
         "radio-favorites": [...],
         "radio-favorite-songs": [...],
         "radio-history": [...],
         "radio-eq-bands": [...],
         "radio-custom-eq-presets": [...],
         "radio-volume": 0.8,
         "radio-locale": "en",
         ...
       }
     }
     ```
   - **`importData(file: File): Promise<{ imported: number, skipped: number }>`** — Reads a JSON file, validates the schema (checks `app === 'pulse-radio'` and `version`), and writes each key to localStorage. Returns counts.
   - **Merge strategy**: On import, offer a `mode: 'replace' | 'merge'` option:
     - `replace`: Overwrite all keys with imported data.
     - `merge`: Merge arrays (favorites, history) — deduplicate by station UUID or song key.
   - **File naming**: `pulse-radio-backup-YYYY-MM-DD.json`.

2. **Trigger download** via a hidden `<a>` element with `URL.createObjectURL()` — no server involvement.

3. **Trigger upload** via `<input type="file" accept=".json">` — read with `FileReader`.

**Boundaries:**
- Do NOT add any backend API routes — this is 100% client-side.
- Do NOT modify RadioShell.tsx — a separate card will add the UI buttons.
- Do NOT add npm dependencies.
- Validate imported JSON strictly — reject files that don't match the expected schema.
- Handle quota errors gracefully (localStorage may be full).

## Acceptance Criteria

- [ ] `src/hooks/useExportImport.ts` exists with `exportData()` and `importData()`.
- [ ] Export downloads a `.json` file with all user data.
- [ ] Import reads a `.json` file and restores data to localStorage.
- [ ] Schema validation rejects non-Pulse-Radio files.
- [ ] Merge mode deduplicates arrays correctly.
- [ ] Replace mode overwrites all keys.
- [ ] TypeScript compiles without errors.
- [ ] File size is reasonable (favorites + history < 1MB typically).
