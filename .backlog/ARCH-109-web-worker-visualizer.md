---
task_id: ARCH-109
target_agent: auto-feature-engineer-finite
target_module: src/lib/audio-visualizer/
priority: medium
status: pending
---

# ARCH-109: Offload Audio Visualizer FFT to Web Worker

## Context

The audio visualizer system (FerrofluidRenderer, SpiralRenderer, CircularRenderer) performs Fast Fourier Transform (FFT) analysis on the main thread via `AnalyserNode.getByteFrequencyData()`. The rendering pipeline runs in a `requestAnimationFrame` loop at 60fps, meaning:

- 60 FFT reads per second on the main thread
- 60 canvas draw operations per second
- Amplitude calculations for the audio-reactive background (also main thread)

On mid-range mobile devices (which are the primary target per AGENTS.md), this competes with React rendering, touch event handling, and layout calculations. During complex UI interactions (opening settings panel, scrolling station list while visualizer is active), users may experience dropped frames.

Web Workers can offload the FFT computation and amplitude calculations to a background thread, freeing the main thread for UI responsiveness.

## Directive

1. **Create `src/lib/audio-visualizer/visualizer.worker.ts`**:
   - Accept `Float32Array` or `Uint8Array` frequency data via `postMessage`.
   - Perform amplitude calculation (RMS, peak detection, band averaging).
   - Return processed visualization data (amplitude, dominant frequency, band energies) back to main thread.

2. **Modify `useAudioAnalyser.ts`**:
   - Read raw frequency data from `AnalyserNode` (this must stay on main thread — Web Audio API is not available in workers).
   - Transfer the raw `Uint8Array` buffer to the worker using `postMessage` with `Transferable` objects (zero-copy transfer).
   - Receive processed results from the worker and feed them to the renderers.

3. **Fallback**: If `Worker` is not supported (unlikely but possible in some embedded browsers), fall back to the current main-thread processing.

4. **Worker lifecycle**:
   - Create the worker when the visualizer is activated.
   - Terminate the worker when the visualizer is deactivated or the component unmounts.
   - Use a single shared worker instance — do NOT create a new worker per frame.

5. **OffscreenCanvas** (stretch goal): If `OffscreenCanvas` is supported, transfer the canvas element to the worker and perform rendering entirely off-thread. Gate behind feature detection.

## Acceptance Criteria

- [ ] `visualizer.worker.ts` exists and handles FFT post-processing
- [ ] Raw frequency data is transferred via `Transferable` (zero-copy)
- [ ] Visualizer renders correctly with worker-processed data
- [ ] Worker is terminated on unmount (no leaked workers)
- [ ] Fallback to main-thread processing when Workers are unavailable
- [ ] No visual regression in visualizer rendering
- [ ] Main thread frame budget improves (measure with Chrome DevTools Performance panel)
