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
  disablePassthrough: () => void;
  enablePassthrough: (audio: HTMLAudioElement) => void;
  reconnect: (audio: HTMLAudioElement) => void;
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
        // Create passthrough gain so audio reaches speakers even without EQ chain
        if (!passthroughRef.current) {
          const gain = ctx.createGain();
          gain.gain.value = 1;
          passthroughRef.current = gain;
        }
        source.connect(passthroughRef.current);
        passthroughRef.current.connect(ctx.destination);
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
  const disablePassthrough = useCallback(() => {
    try {
      passthroughRef.current?.disconnect();
    } catch {
      /* ok */
    }
  }, []);
  const enablePassthrough = useCallback((audio: HTMLAudioElement) => {
    try {
      const { ctx, source } = getOrCreateAudioSource(audio);
      if (!passthroughRef.current) {
        const gain = ctx.createGain();
        gain.gain.value = 1;
        passthroughRef.current = gain;
      }
      source.connect(passthroughRef.current);
      passthroughRef.current.connect(ctx.destination);
    } catch {
      /* ok */
    }
  }, []);
  const reconnect = useCallback((audio: HTMLAudioElement) => {
    try {
      const { source } = getOrCreateAudioSource(audio);
      if (analyserRef.current) source.connect(analyserRef.current);
      if (passthroughRef.current) source.connect(passthroughRef.current);
    } catch {
      /* ok */
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
    disablePassthrough,
    enablePassthrough,
    reconnect,
  };
}
