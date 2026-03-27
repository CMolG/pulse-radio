---
task_id: ARCH-062
target_agent: auto-optimizer-finite
target_module: src/lib/storageUtils.ts
priority: high
status: completed
---

# Add In-Memory Fallback for localStorage Failures (Private/Incognito Mode)

## Context

When users browse in Private/Incognito mode, `localStorage.setItem()` may throw `QuotaExceededError` immediately (some browsers) or silently limit storage to 0-5MB. The current `storageUtils.ts` handles quota errors by returning `false` from `trySave()`, but:

1. **No user feedback**: Settings appear to save (UI updates) but don't persist.
2. **No in-memory fallback**: When `trySave()` fails, the data is simply lost.
3. **No detection**: The app cannot distinguish private mode from genuine quota exhaustion.

Users in private mode configure EQ presets, add favorites, and set language preferences — all silently discarded on page reload. This is a frustrating "phantom" bug because everything appears to work.

## Directive

1. **Add an in-memory fallback Map** to `storageUtils.ts`:
   ```typescript
   const _memoryFallback = new Map<string, string>();

   export function saveToStorage<T>(key: string, value: T): boolean {
     const raw = JSON.stringify(value);
     const saved = trySave(key, raw);
     if (!saved) {
       _memoryFallback.set(key, raw);
       return false;
     }
     return true;
   }

   export function loadFromStorage<T>(key: string, fallback: T): T {
     // Try localStorage first, then memory fallback
     const raw = tryLoad(key) ?? _memoryFallback.get(key);
     if (!raw) return fallback;
     try { return JSON.parse(raw); }
     catch { return fallback; }
   }
   ```

2. **Add storage availability detection**:
   ```typescript
   export function isStorageAvailable(): boolean {
     try {
       const testKey = '__pulse_storage_test__';
       localStorage.setItem(testKey, '1');
       localStorage.removeItem(testKey);
       return true;
     } catch {
       return false;
     }
   }
   ```

3. **Export a `storageMode` indicator**: `'persistent' | 'memory-only'` so the UI can optionally show a subtle badge ("Session storage only — data won't persist after closing this tab").

4. **Call `isStorageAvailable()` once on app init** and cache the result.

**Boundaries:**
- Do NOT change the `saveToStorage` / `loadFromStorage` function signatures.
- Do NOT add a UI notification (a separate visual card can use the `storageMode` indicator).
- The memory fallback is session-scoped (lost on page close) — this is expected for private mode.
- Do NOT modify the schema versioning logic.

## Acceptance Criteria

- [ ] `_memoryFallback` Map catches data that fails to persist to localStorage.
- [ ] `loadFromStorage` checks memory fallback when localStorage returns null.
- [ ] `isStorageAvailable()` correctly detects private/incognito mode.
- [ ] `storageMode` exported as `'persistent' | 'memory-only'`.
- [ ] In private mode, settings work for the session duration (not lost between hook calls).
- [ ] TypeScript compiles without errors.
- [ ] `npm run build` passes.
