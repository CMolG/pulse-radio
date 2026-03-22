/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';
import { useRef, useCallback, useEffect, useState } from 'react';
import { getOrCreateAudioSource } from './audioSourceCache';

interface UseAudioAnalyserOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
}

interface UseAudioAnalyserReturn {
  connectAudio: (audio: HTMLAudioElement) => void;
  frequencyData: Uint8Array | null;
  waveData: Uint8Array | null;
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
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [waveData, setWaveData] = useState<Uint8Array | null>(null);
  const [isActive, setIsActive] = useState(false);

  const connectAudio = useCallback(
    (audio: HTMLAudioElement) => {
      if (connectedRef.current === audio && analyserRef.current) return;
      try {
        const { ctx, source } = getOrCreateAudioSource(audio);
        connectedRef.current = audio;

        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = fftSize;
          analyser.smoothingTimeConstant = smoothingTimeConstant;
          source.connect(analyser);
          analyserRef.current = analyser;
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const timeArray = new Uint8Array(analyserRef.current.fftSize);
        setIsActive(true);

        const tick = () => {
          analyserRef.current?.getByteFrequencyData(dataArray);
          analyserRef.current?.getByteTimeDomainData(timeArray);
          setFrequencyData(new Uint8Array(dataArray));
          setWaveData(new Uint8Array(timeArray));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Some mobile browsers (notably iOS in background paths) can reject
        // WebAudio graph connections for cross-origin streams. Keep playback
        // alive and just disable analyser updates.
        cancelAnimationFrame(rafRef.current);
        setIsActive(false);
        setFrequencyData(null);
        setWaveData(null);
      }
    },
    [fftSize, smoothingTimeConstant],
  );

  const disconnect = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setIsActive(false);
    setFrequencyData(null);
    setWaveData(null);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return { connectAudio, frequencyData, waveData, isActive, disconnect };
}
