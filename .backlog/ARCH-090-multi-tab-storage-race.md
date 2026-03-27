---
task_id: ARCH-090
target_agent: auto-optimizer-finite
target_module: src/lib/storageUtils.ts
priority: medium
status: pending
---

# Prevent Multi-Tab localStorage Race Condition (Data Loss)

## Context

Multiple browser tabs can corrupt shared localStorage data. The `useStorageSync` hook (~line 379 in RadioShell.tsx) listens to `storage` events for cross-tab sync, but the write pattern is vulnerable:

1. Tab A writes `{ favorites: [..., song1] }` to localStorage.
2. Tab B simultaneously writes `{ favorites: [..., song2] }` to localStorage.
3. `localStorage.setItem()` is atomic per-call, but the app does **read-modify-write** without locks:
   ```
   const current = loadFromStorage('favorites');  // Tab A reads [a, b]
   current.push(song1);                           // Tab A appends
   saveToStorage('favorites', current);            // Tab A writes [a, b, song1]
   // Tab B read [a, b] BEFORE Tab A wrote, appends song2
   saveToStorage('favorites', [a, b, song2]);      // Tab B OVERWRITES, losing song1
   ```

**Real scenario**: User hearts a song in Tab 1 while Tab 2 updates playback history within 100ms. One write is lost.

## Directive

1. **Add a `StorageTransaction` wrapper** in `storageUtils.ts`:
   ```typescript
   export function updateStorage<T>(key: string, updater: (current: T) => T): void {
     // Read-modify-write in a single synchronous block
     const current = loadFromStorage<T>(key);
     const updated = updater(current);
     saveToStorage(key, updated);
   }
   ```
   This doesn't prevent cross-tab races, but consolidates the pattern.

2. **Use `BroadcastChannel` for cross-tab coordination** (better than `storage` events):
   ```typescript
   const channel = new BroadcastChannel('pulse-radio-sync');
   channel.postMessage({ type: 'storage-updated', key, timestamp: Date.now() });
   ```
   Receiving tabs should re-read from localStorage (source of truth) rather than using the event's value.

3. **Implement last-write-wins with timestamps**:
   - Add a `_ts` field to each stored value.
   - On `storage` event, compare timestamps — only update local state if the incoming write is newer.

4. **For array-type values (favorites, history)**, use merge instead of replace:
   - On conflict, take the **union** of both arrays (deduplicate by ID).
   - This ensures data is never lost — only duplicated (which is safe since dedup follows).

**Boundaries:**
- Do NOT implement a full CRDT or distributed state system.
- Do NOT add IndexedDB (that's a larger migration).
- Keep the solution simple — timestamp-based last-write-wins with array merging.
- `BroadcastChannel` has good browser support (all modern browsers).

## Acceptance Criteria

- [ ] `updateStorage()` function provides read-modify-write in single call.
- [ ] Array values (favorites, history) merged on conflict instead of overwritten.
- [ ] Cross-tab `storage` events trigger re-read from localStorage (not stale event value).
- [ ] No user data loss when 2 tabs modify the same key within 100ms.
- [ ] `npm run build` passes.
- [ ] Playwright test: open 2 tabs, modify favorites simultaneously, verify both changes persist.
