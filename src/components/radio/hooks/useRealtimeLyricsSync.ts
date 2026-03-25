/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../constants';
import type { LyricsData } from '../types';
import { defaultRealtimeState, DEFAULT_REALTIME_ALIGN_POLICY, isRealtimeEligible, type RealtimeSyncResult } from '../services/realtimeLyricsTypes';
import { alignHypothesis, mapLineToEffectiveTime } from '../services/lyricsAligner';
import { createRealtimeSpeechEngine, isRealtimeSpeechSupported, type RealtimeSpeechEngine } from '../services/realtimeSpeechRecognition';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';

type Params = { lyrics: LyricsData | null; enabled: boolean; languageHint: 'en' | 'es' };

export function useRealtimeLyricsSync({ lyrics, enabled, languageHint, }: Params): RealtimeSyncResult {
  const initialEnabled = useMemo(() => loadFromStorage<boolean>(STORAGE_KEYS.REALTIME_LYRICS_ENABLED, false), []);
  const [manuallyEnabled, setManuallyEnabled] = useState<boolean>(initialEnabled);
  const [runtimeState, setRuntimeState] = useState(() => defaultRealtimeState(initialEnabled));
  const engineRef = useRef<RealtimeSpeechEngine | null>(null);
  const stableSamplesRef = useRef(0);
  const eligible = isRealtimeEligible(lyrics);
  const supported = isRealtimeSpeechSupported();
  const realtimeAllowed = enabled && manuallyEnabled;
  const realtimeActive = supported && eligible && realtimeAllowed;

  // Reset sync state during render when dependencies change, so stale
  // activeLineIndex from a previous song doesn't bleed into new lyrics.
  const [prevResetKey, setPrevResetKey] = useState('');
  const resetKey = `${realtimeActive}::${lyrics?.trackName ?? ''}::${languageHint}::${manuallyEnabled}`;
  if (resetKey !== prevResetKey) { setPrevResetKey(resetKey); setRuntimeState(defaultRealtimeState(manuallyEnabled)); }

  const toggle = useCallback(() => {
    setManuallyEnabled(prev => {
      const next = !prev;
      saveToStorage(STORAGE_KEYS.REALTIME_LYRICS_ENABLED, next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!realtimeActive) { engineRef.current?.stop(); return; }
    engineRef.current?.destroy();
    stableSamplesRef.current = 0;

    const engine = createRealtimeSpeechEngine({
      onHypothesis: (hypothesis) => {
        if (!lyrics || !isRealtimeEligible(lyrics)) return;
        setRuntimeState(prev => {
          const step = alignHypothesis({
            lyrics,
            hypothesisText: hypothesis.text,
            previousConfirmedIndex: prev.activeLineIndex,
            previousCandidateIndex: prev.candidateLineIndex,
            stableSamples: stableSamplesRef.current,
            policy: DEFAULT_REALTIME_ALIGN_POLICY,
          });
          stableSamplesRef.current = step.stableSamples;

          const effectiveCurrentTime = mapLineToEffectiveTime(lyrics, step.confirmedIndex);

          // Early bail — skip spread+setState when nothing observable changed
          if (
            prev.status === 'listening' &&
            prev.activeLineIndex === step.confirmedIndex &&
            prev.candidateLineIndex === step.candidateIndex &&
            prev.confidence === step.score &&
            !step.jumpRejected &&
            !step.relockTriggered
          ) {
            return prev;
          }

          return {
            ...prev,
            status: 'listening',
            activeLineIndex: step.confirmedIndex,
            candidateLineIndex: step.candidateIndex,
            confidence: step.score,
            effectiveCurrentTime,
            diagnostics: {
              ...prev.diagnostics,
              lastHypothesisMs: hypothesis.tsMs,
              hypothesesSeen: prev.diagnostics.hypothesesSeen + 1,
              confirmedTransitions: prev.diagnostics.confirmedTransitions + (step.confirmedIndex !== prev.activeLineIndex ? 1 : 0),
              rejectedJumps: prev.diagnostics.rejectedJumps + (step.jumpRejected ? 1 : 0),
              relockCount: prev.diagnostics.relockCount + (step.relockTriggered ? 1 : 0),
              errorMessage: null,
            },
          };
        });
      },
      onFatalError: (errorMessage) => {
        setRuntimeState(prev => ({
          ...prev,
          status: 'error',
          activeLineIndex: -1,
          candidateLineIndex: -1,
          confidence: 0,
          effectiveCurrentTime: undefined,
          diagnostics: { ...prev.diagnostics, errorMessage, },
        }));
      },
    });

    engineRef.current = engine;
    engine.start(languageHint);

    return () => { engine.stop(); };
  }, [lyrics, languageHint, realtimeActive]);

  useEffect(() => () => { engineRef.current?.destroy(); engineRef.current = null; }, []);

  const isSyncing = realtimeActive && (runtimeState.status === 'listening' || runtimeState.status === 'recovering');

  return {
    ...runtimeState,
    enabled: manuallyEnabled,
    supported,
    status: !supported
      ? 'unsupported'
      : !realtimeActive
        ? 'idle'
        : runtimeState.status === 'idle'
          ? 'ready'
          : runtimeState.status,
    activeLineIndex: isSyncing ? runtimeState.activeLineIndex : -1,
    candidateLineIndex: isSyncing ? runtimeState.candidateLineIndex : -1,
    confidence: isSyncing ? runtimeState.confidence : 0,
    effectiveCurrentTime: isSyncing ? runtimeState.effectiveCurrentTime : undefined,
    diagnostics: {
      ...runtimeState.diagnostics,
      errorMessage: !supported
        ? 'Realtime lyrics sync is not supported in this browser.'
        : runtimeState.diagnostics.errorMessage,
    },
    toggle,
  };
}
