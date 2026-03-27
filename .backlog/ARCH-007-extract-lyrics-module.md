---
task_id: ARCH-007
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Consolidate Lyrics Utilities into Dedicated Module

## Context

RadioShell contains 7+ lyrics-related functions scattered across ~600 lines: `parseLrc` (~line 2586), `useLyrics` hook (~line 2751, ~130 lines), `useRealtimeLyricsSync` (~line 2456, ~130 lines), plus realtime speech helpers (`isRealtimeEligible`, `getRecognitionCtor`, `isRealtimeSpeechSupported`, `createRealtimeSpeechEngine`), alignment functions (`alignHypothesis`, `tokenize`, `scoreLine`, `windowBounds`, `getCachedLineTokens`, `getCachedLineSets`, `mapLineToEffectiveTime`), and fetch helpers (`fetchWithCancel`, `isTransientError`, `transform`, `loadCache`, `saveCache`). This is a cohesive domain that should be a standalone module.

## Directive

1. Create `src/components/radio/hooks/useLyrics.ts` — move the `useLyrics` hook and its fetch/cache helpers (`fetchWithCancel`, `isTransientError`, `transform`, `loadCache`, `saveCache`, `CacheEntry` type).
2. Create `src/components/radio/hooks/useRealtimeLyricsSync.ts` — move `useRealtimeLyricsSync` and all realtime speech helpers (`createRealtimeSpeechEngine`, `isRealtimeSpeechSupported`, `getRecognitionCtor`, `isRealtimeEligible`, `defaultRealtimeDiagnostics`, `defaultRealtimeState`).
3. Create `src/lib/lyricsUtils.ts` — move pure functions: `parseLrc`, `alignHypothesis`, `tokenize`, `scoreLine`, `windowBounds`, `getCachedLineTokens`, `getCachedLineSets`, `mapLineToEffectiveTime`, and associated types (`LyricLine`, `AlignerStepInput`, `AlignerStepResult`, etc.).
4. Update imports in RadioShell and any other consumers.
5. **Pure extraction** — do not refactor logic.
6. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Three new files created with clean separation: hook, realtime hook, pure utilities
- [ ] `RadioShell.tsx` reduced by ~600+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Lyrics display and realtime sync work identically
- [ ] No circular dependencies
