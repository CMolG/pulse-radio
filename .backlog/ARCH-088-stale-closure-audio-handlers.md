---
task_id: ARCH-088
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Fix Stale Closure Bug in Audio Event Handlers

## Context

The audio event handlers (`onPause`, `onEnded`, `onError`, `onStalled`, `onVisibilityResume`) are closures over `station`, `retryRef`, `playSessionRef`, and other refs (~lines 1682-1830). The effect dependency array (~line 1913) includes `[station, getAudio, startPlayback, handlePlayRejected, audioGen]`.

When `station` changes, the entire effect cleanup/setup cycles. However, old listeners may fire **during the transition** with stale closure values:

- `onError` (~line 1746) checks `station &&` but `station` in the closure is the **old** value.
- `onStalled` (~line 1775) reads `stallCount` which is scoped to the old effect instance.
- If the effect re-runs before old listeners fire, old `stallCount` is abandoned (counter resets to 0).

**Example scenario**: Listener from Station A fires after Station B's effect cleanup → uses wrong `station` variable → reconnects to wrong station or fails silently.

> **Related:** See ARCH-087 for the audio element reuse race condition. These two cards address complementary aspects of the same station-switching problem.

## Directive

1. **Use refs instead of closure values for event handlers**:
   ```typescript
   const stationRef = useRef(station);
   useEffect(() => { stationRef.current = station; }, [station]);
   
   // In handlers, read stationRef.current instead of closure `station`
   ```

2. **Move event handlers to `useCallback` with ref-based reads**:
   - `onError`, `onStalled`, `onEnded` should read `stationRef.current` instead of closing over `station`.
   - This breaks the stale closure chain — handlers always see current state.

3. **Add a mounted/active flag to prevent handlers from firing after cleanup**:
   ```typescript
   useEffect(() => {
     let active = true;
     const onEnded = () => { if (!active) return; /* ... */ };
     // attach listeners
     return () => { active = false; /* remove listeners */ };
   }, [station, audioGen]);
   ```

4. **Ensure `stallCount` resets correctly** — move it to a ref that persists across effect instances, or use a Map keyed by station UUID.

**Boundaries:**
- Do NOT extract these handlers to separate files (that's ARCH-015's job).
- Do NOT change reconnect logic — only fix the stale closure reads.
- Keep the existing effect dependency array — just make handlers ref-safe.

## Acceptance Criteria

- [ ] Audio event handlers read `stationRef.current` instead of closure `station`.
- [ ] `active` flag prevents stale handlers from executing after cleanup.
- [ ] `stallCount` tracking is station-aware (resets per station, not per effect).
- [ ] No reconnections to wrong station after rapid switching.
- [ ] `npm run build` passes.
- [ ] All existing Playwright tests pass.
