---
task_id: ARCH-089
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Add AudioContext Recovery for Failed/Closed Contexts (Safari Fix)

## Context

The global `sharedCtx` (~line 450 in RadioShell.tsx) is a shared `AudioContext` used by the equalizer, audio analyzer, and reactive background. The `audioSourceCache` (~line 446) is a `WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>`.

**Problem**: Some Safari versions silently close the `AudioContext` when certain stream types fail. When this happens:

1. `ctx.state === 'closed'` is checked (~line 452), and a new context is created.
2. **But**: The `audioSourceCache` still holds references to `MediaElementAudioSourceNode` objects created from the **old, closed** context.
3. When the same `HTMLAudioElement` is reused, `getOrCreateAudioSource` (~line 460) returns the stale, closed-context source.
4. `createMediaElementSource` (~line 466) has **no error handling** — if it fails, the entire EQ/visualizer chain breaks silently.
5. A `MediaElementAudioSourceNode` can only be created **once** per audio element — calling it again on the same element throws `InvalidStateError`.

**Impact**: Safari users experience broken EQ/visualizer after a stream connection failure, with no recovery path until page reload.

## Directive

1. **Invalidate the cache when context is replaced**:
   ```typescript
   function getSharedCtx() {
     if (!sharedCtx || sharedCtx.state === 'closed') {
       sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
       // Clear the source cache — old sources are invalid
       audioSourceCache = new WeakMap();
     }
     return sharedCtx;
   }
   ```

2. **Wrap `createMediaElementSource` in try/catch**:
   ```typescript
   try {
     source = ctx.createMediaElementSource(audio);
   } catch (e) {
     // InvalidStateError: element already connected to a different context
     // Recovery: create a fresh audio element
     logger.warn('audio_source_creation_failed', { error: e });
     return null;
   }
   ```

3. **Add `webkitAudioContext` fallback** explicitly for older Safari:
   ```typescript
   const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
   ```

4. **Listen for context state changes**:
   ```typescript
   ctx.addEventListener('statechange', () => {
     if (ctx.state === 'closed') {
       audioSourceCache = new WeakMap();
     }
   });
   ```

**Boundaries:**
- Do NOT change the shared AudioContext pattern (single context is correct).
- Do NOT remove the WeakMap cache (it's needed to prevent duplicate source creation).
- Only add recovery logic — don't restructure the audio pipeline.

## Acceptance Criteria

- [ ] `audioSourceCache` is invalidated when AudioContext is replaced.
- [ ] `createMediaElementSource` wrapped in try/catch with graceful fallback.
- [ ] `webkitAudioContext` fallback present.
- [ ] Context state changes monitored for automatic cache invalidation.
- [ ] EQ/visualizer recovers after stream failure without page reload.
- [ ] `npm run build` passes.
