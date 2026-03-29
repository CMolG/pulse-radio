---
task_id: ARCH-016
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Extract Audio Processing Hooks from RadioShell

## Context

RadioShell defines several audio processing hooks that form a coherent domain:
- `useEqualizer` (~line 8410, ~520 lines) — EQ state, presets, compressor, noise reduction, normalizer
- `useAudioAnalyser` (~line 8304, ~90 lines) — Web Audio FFT analysis
- `useAudioReactiveBackground` (~line 10, ~110 lines) — Audio-reactive background colors

These three hooks are tightly coupled — they all operate on the Web Audio API context and share AudioNode references. Together they represent ~720 lines that should move as a cohesive audio processing domain.

> **Note:** This card was narrowed from a 14-hook extraction to 3 audio-domain hooks to keep scope achievable in a single iteration. See ARCH-071 and ARCH-072 for the remaining hooks.

## Directive

1. Create audio processing hook files:
   - `src/components/radio/hooks/useEqualizer.ts` — useEqualizer + EQ types, presets, band definitions
   - `src/components/radio/hooks/useAudioAnalyser.ts` — useAudioAnalyser + useAudioReactiveBackground
2. Move related helper functions, types, and constants alongside each hook.
3. Import `EQ_BANDS`, `EQ_PRESETS` from `../constants.ts`.
4. Ensure AudioContext and AudioNode references are passed correctly between hooks.
5. **Pure extraction** — no hook logic changes.
6. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] 2 new hook files in `src/components/radio/hooks/`
- [ ] `RadioShell.tsx` reduced by ~720 lines
- [ ] `npm run build` passes with zero errors
- [ ] EQ, audio analysis, and reactive background work identically
