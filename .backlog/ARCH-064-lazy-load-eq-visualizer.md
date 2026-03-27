---
task_id: ARCH-064
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Lazy-Load Equalizer Graph and Visualizer Canvas

## Context

RadioShell.tsx initializes the full Web Audio API equalizer graph (28+ audio nodes: 10 biquad filters, compressor, normalizer, stereo width, bass enhancement, noise reduction, limiter) on component mount, even if the user never opens audio settings. Similarly, the visualizer canvas (3 renderers: ferrofluid, spiral, circular) is always rendered and running a RAF loop even when not visible.

On mobile devices with limited RAM (1-2GB on budget phones), this creates unnecessary memory pressure:
- 28 Web Audio nodes = ~2-5MB of audio processing infrastructure.
- 3 canvas renderers with RAF loops = continuous CPU usage.
- Combined with the 10,935-line component, this can trigger garbage collection pauses that cause audio stuttering.

## Directive

1. **Defer equalizer graph creation**:
   - Do NOT create the Web Audio node graph until the user enables audio effects (`effectsEnabled === true`).
   - Currently, the graph is built in `useEqualizer()` on mount. Modify it to:
     - Return a no-op interface when effects are disabled.
     - Build the full graph only when `connectSource()` is first called with effects enabled.
     - Tear down the graph when effects are disabled (call `teardownGraph()`).

2. **Conditionally render visualizer canvas**:
   - The visualizer canvas should only mount when it's visible to the user (e.g., theater mode active or visualizer tab selected).
   - Use a simple `{showVisualizer && <VisualizerCanvas />}` guard.
   - When hidden, cancel the RAF loop and release the canvas.

3. **Add a `performance.memory` check** (Chrome only, behind a feature check):
   - If `jsHeapUsed / jsHeapSizeLimit > 0.85`, log a warning and skip non-essential features (visualizer, amplitude background).
   - This is defensive — not a critical path change.

**Boundaries:**
- Do NOT change the audio quality or EQ behavior when effects ARE enabled.
- Do NOT remove any visualizer features — only defer their initialization.
- The equalizer must still activate instantly when the user toggles effects on (no visible delay).
- Audio playback must work perfectly with effects disabled (direct source → output).
- Do NOT modify the useCanvasLoop or useAudioAnalyser hooks — only gate their usage.

## Acceptance Criteria

- [ ] Equalizer graph not created until effects are enabled.
- [ ] Equalizer graph torn down when effects are disabled.
- [ ] Visualizer canvas only rendered when visible.
- [ ] RAF loop stops when visualizer is hidden.
- [ ] Audio playback works correctly with effects disabled (no equalizer in chain).
- [ ] Toggling effects on immediately activates the equalizer (no delay).
- [ ] `npm run build` passes.
- [ ] All existing Playwright tests pass.
