/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { getOrCreateAudioSource } from './audioSourceCache';

interface UseAudioAnalyserOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
}

interface UseAudioAnalyserReturn {
  connectAudio: (audio: HTMLAudioElement) => void;
  /** Stable ref whose .current is updated in-place every frame — zero allocations */
  frequencyDataRef: React.RefObject<Uint8Array | null>;
  /** Stable ref whose .current is updated in-place every frame — zero allocations */
  waveDataRef: React.RefObject<Uint8Array | null>;
  isActive: boolean;
  disconnect: () => void;
}

export function useAudioAnalyser(
  opts: UseAudioAnalyserOptions = {},
): UseAudioAnalyserReturn {
  const { fftSize = 256, smoothingTimeConstant = 0.8 } = opts;
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const connectedRef = useRef<HTMLAudioElement | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const waveDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const [isActive, setIsActive] = useState(false);

  const connectAudio = useCallback(
    (audio: HTMLAudioElement) => {
      if (connectedRef.current === audio && analyserRef.current) return;

      // Cancel any existing animation loop before starting a new one
      cancelAnimationFrame(rafRef.current);

      const { ctx, source } = getOrCreateAudioSource(audio);
      connectedRef.current = audio;

      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothingTimeConstant;
        source.connect(analyser);
        analyserRef.current = analyser;
      }

      // Allocate buffers once — reused across all frames (zero per-frame allocation)
      frequencyDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      waveDataRef.current = new Uint8Array(analyserRef.current.fftSize);
      setIsActive(true);

      const tick = () => {
        if (frequencyDataRef.current) {
          analyserRef.current?.getByteFrequencyData(frequencyDataRef.current);
        }
        if (waveDataRef.current) {
          analyserRef.current?.getByteTimeDomainData(waveDataRef.current);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [fftSize, smoothingTimeConstant],
  );

  const disconnect = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setIsActive(false);
    frequencyDataRef.current = null;
    waveDataRef.current = null;
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return { connectAudio, frequencyDataRef, waveDataRef, isActive, disconnect };
}
