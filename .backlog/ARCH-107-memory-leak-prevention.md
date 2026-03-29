---
task_id: ARCH-107
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# ARCH-107: Memory Leak Audit & Prevention for RadioShell

## Context

RadioShell.tsx is a 10,935-line component with **465 hook usages** (useState, useEffect, useCallback, useMemo, useRef). This is an extreme concentration of lifecycle hooks in a single component tree. Common memory leak vectors in this pattern include:

- `setInterval`/`setTimeout` not cleared on unmount
- `addEventListener` without corresponding `removeEventListener`
- `AudioContext` nodes not disconnected
- `requestAnimationFrame` loops not cancelled
- `EventSource`/`WebSocket` connections not closed
- Stale closures holding references to unmounted component state
- `MediaStream` tracks not stopped
- `IntersectionObserver`/`ResizeObserver` not disconnected

Given the app is designed for **long listening sessions** (hours), even small leaks compound into significant memory bloat, eventually causing tab crashes on mobile devices with limited memory.

## Directive

1. **Systematic audit** of every `useEffect` in RadioShell.tsx:
   - Verify each effect has a proper cleanup function that reverses its setup.
   - Flag any `setInterval`, `setTimeout`, `requestAnimationFrame`, `addEventListener`, or observer that lacks a corresponding cleanup.

2. **AudioContext cleanup**:
   - Ensure all `BiquadFilterNode`, `GainNode`, `AnalyserNode`, and `MediaElementSourceNode` instances are disconnected on unmount.
   - Verify `AudioContext.close()` is called when the component unmounts.
   - Check for duplicate `AudioContext` creation (each `new AudioContext()` allocates OS-level audio resources).

3. **Animation frame management**:
   - All `requestAnimationFrame` loops (visualizer, audio-reactive background) must store the frame ID in a ref and call `cancelAnimationFrame` on cleanup.
   - Verify the `useAudioReactiveBackground` hook cancels its RAF loop.

4. **Event listener audit**:
   - Search for all `window.addEventListener`, `document.addEventListener`, and element `.addEventListener` calls.
   - Verify each has a matching removal in the effect cleanup.
   - Use named function references (not inline arrows) for listeners that need removal.

5. **Fix all identified leaks**. For each fix:
   - Add a code comment: `// ARCH-107: cleanup to prevent memory leak`
   - Ensure the cleanup runs both on unmount AND when dependencies change (effect re-runs).

## Acceptance Criteria

- [ ] Every `useEffect` in RadioShell.tsx has a cleanup function (or is documented as intentionally cleanup-free)
- [ ] All `setInterval`/`setTimeout` calls have `clearInterval`/`clearTimeout` in cleanup
- [ ] All `requestAnimationFrame` loops are cancelled on cleanup
- [ ] All event listeners are removed on cleanup
- [ ] `AudioContext` and all audio nodes are properly disconnected/closed
- [ ] No duplicate `AudioContext` instances are created
- [ ] Long-session test: play a station for 10 minutes, switch stations 5 times, verify heap size stays stable (no monotonic growth)
