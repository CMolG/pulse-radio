---
task_id: ARCH-087
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Fix Race Condition in Audio Element Reuse During Station Switching

## Context

When rapidly switching stations, the `audioRef` is reused without proper cleanup. The `getAudio()` function (~line 1643) returns the same `HTMLAudioElement` instance across station changes, creating a race condition window:

1. User switches from Station A → B while A is playing.
2. Station A's `useEffect` cleanup removes event listeners.
3. Station B's `useEffect` setup adds new listeners.
4. **Race**: If Station B's audio ends naturally **before** new listeners are attached, `onEnded` won't fire, so reconnect won't trigger.
5. The `srcChangingRef.current` flag uses `Promise.resolve()` to defer the flag reset, but doesn't guarantee old event handlers are cleared first.

The `replaceAudio()` function (~line 2039) nulls the ref and increments `audioGen`, but it is **never called** during normal station switching — only in cleanup chains. This means old listeners can fire with new station state.

> **Related:** See ARCH-088 for the complementary stale closure bug in these same event handlers.

## Directive

1. **Add explicit cleanup before source change**:
   - Before setting a new `src` on the audio element, call `audio.pause()` and `audio.removeAttribute('src')` to abort the current connection.
   - Then call `audio.load()` to reset the element's internal state.

2. **Use an `AbortController` per station switch**:
   ```typescript
   const switchAbortRef = useRef<AbortController | null>(null);
   // On station change:
   switchAbortRef.current?.abort();
   switchAbortRef.current = new AbortController();
   ```
   Pass the signal to any fetch/setup operations so in-flight work from the previous station is cancelled.

3. **Gate event handlers with a generation counter**:
   ```typescript
   const expectedGen = audioGen;
   const onEnded = () => {
     if (audioGen !== expectedGen) return; // Stale listener, ignore
     // ... reconnect logic
   };
   ```

4. **Call `replaceAudio()` on station change** (not just on cleanup) to force a fresh audio element when the user explicitly switches stations.

**Boundaries:**
- Do NOT change the audio element pooling strategy — just add proper lifecycle management.
- Do NOT remove the `srcChangingRef` mechanism — supplement it with the generation gate.
- Test with rapid station switching (5+ switches in 2 seconds).

## Acceptance Criteria

- [ ] Audio element is properly reset between station switches (pause + removeAttribute + load).
- [ ] Event handlers gated by generation counter — stale listeners are no-ops.
- [ ] No silent stream stops on rapid station clicking.
- [ ] `npm run build` passes.
- [ ] Playwright test: rapidly switch 5 stations in 2 seconds, verify final station plays.
