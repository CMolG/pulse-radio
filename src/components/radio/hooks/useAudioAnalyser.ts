/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getOrCreateAudioSource } from '@/logic/audio-context';

type UseAudioAnalyserOptions = { fftSize?: number; smoothingTimeConstant?: number };

interface UseAudioAnalyserReturn {
  connectAudio: (audio: HTMLAudioElement) => void;
  /** Stable ref whose .current is updated in-place every frame — zero allocations */
  frequencyDataRef: React.RefObject<Uint8Array<ArrayBuffer> | null>;
  /** Stable ref whose .current is updated in-place every frame — zero allocations */
  waveDataRef: React.RefObject<Uint8Array<ArrayBuffer> | null>;
  /** Audio metering: peak level 0-1, RMS level 0-1 (updated every frame) */
  meterRef: React.RefObject<{ peak: number; rms: number }>;
  isActive: boolean;
  disconnect: () => void;
  /** Set passthrough gain (0 = muted when EQ active, 1 = audible when EQ off). Never disconnects the node. */
  setPassthroughGain: (gain: number) => void;
  /** Re-connect source → analyser + passthrough after an external node has called source.disconnect(). */
  rewire: (audio: HTMLAudioElement) => void;
}

const _EMPTY_ANALYSER_OPTS: UseAudioAnalyserOptions = {};

export function useAudioAnalyser(
  opts: UseAudioAnalyserOptions = _EMPTY_ANALYSER_OPTS,
): UseAudioAnalyserReturn {
  const { fftSize = 256, smoothingTimeConstant = 0.8 } = opts;
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const connectedRef = useRef<HTMLAudioElement | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const waveDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const meterRef = useRef<{ peak: number; rms: number }>({ peak: 0, rms: 0 });
  const [isActive, setIsActive] = useState(false);
  const passthroughRef = useRef<GainNode | null>(null);
  const connectAudio = useCallback(
    (audio: HTMLAudioElement) => {
      if (connectedRef.current === audio && analyserRef.current) return;
      cancelAnimationFrame(rafRef.current);
      try {
        const { ctx, source } = getOrCreateAudioSource(audio);
        connectedRef.current = audio;
        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = fftSize;
          analyser.smoothingTimeConstant = smoothingTimeConstant;
          source.connect(analyser);
          analyserRef.current = analyser;
        } else source.connect(analyserRef.current);
        // Passthrough routes audio to speakers when EQ chain is not active.
        // It is never disconnected — only its gain value is toggled (0/1) to avoid timing gaps.
        if (!passthroughRef.current) {
          const gain = ctx.createGain();
          gain.gain.value = 1;
          passthroughRef.current = gain;
          passthroughRef.current.connect(ctx.destination);
        }
        source.connect(passthroughRef.current);
        const binCount = analyserRef.current.frequencyBinCount;
        const fftLen = analyserRef.current.fftSize;
        if (!frequencyDataRef.current || frequencyDataRef.current.length !== binCount)
          frequencyDataRef.current = new Uint8Array(binCount);
        if (!waveDataRef.current || waveDataRef.current.length !== fftLen)
          waveDataRef.current = new Uint8Array(fftLen);
        setIsActive(true);
        const tick = () => {
          if (!document.hidden) {
            if (frequencyDataRef.current)
              analyserRef.current?.getByteFrequencyData(frequencyDataRef.current);
            if (waveDataRef.current) {
              analyserRef.current?.getByteTimeDomainData(waveDataRef.current);
              const buf = waveDataRef.current;
              let sumSqInt = 0;
              let maxAbsInt = 0;
              for (let i = 0; i < buf.length; i++) {
                const s = buf[i] - 128;
                sumSqInt += s * s;
                const a = s < 0 ? -s : s;
                if (a > maxAbsInt) maxAbsInt = a;
              }
              meterRef.current.peak = maxAbsInt / 128;
              meterRef.current.rms = Math.sqrt(sumSqInt / buf.length) / 128;
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        cancelAnimationFrame(rafRef.current);
        setIsActive(false);
        frequencyDataRef.current = null;
        waveDataRef.current = null;
      }
    },
    [fftSize, smoothingTimeConstant],
  );
  const disconnect = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    connectedRef.current = null;
    setIsActive(false);
    frequencyDataRef.current = null;
    waveDataRef.current = null;
  }, []);
  const setPassthroughGain = useCallback((gain: number) => {
    if (passthroughRef.current) passthroughRef.current.gain.value = gain;
  }, []);
  const rewire = useCallback((audio: HTMLAudioElement) => {
    // Called after eq.disconnect() severs the shared MediaElementAudioSourceNode.
    // Re-connects source → analyser and source → passthrough without the early-exit guard.
    try {
      const { source } = getOrCreateAudioSource(audio);
      if (analyserRef.current) source.connect(analyserRef.current);
      if (passthroughRef.current) source.connect(passthroughRef.current);
    } catch {
      /* ok — duplicate connections are silently ignored by Web Audio */
    }
  }, []);
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );
  return {
    connectAudio,
    frequencyDataRef,
    waveDataRef,
    meterRef,
    isActive,
    disconnect,
    setPassthroughGain,
    rewire,
  };
}
