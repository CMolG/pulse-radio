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
  frequencyDataRef: React.RefObject<Uint8Array<ArrayBuffer> | null>;
  /** Stable ref whose .current is updated in-place every frame — zero allocations */
  waveDataRef: React.RefObject<Uint8Array<ArrayBuffer> | null>;
  /** Audio metering: peak level 0-1, RMS level 0-1 (updated every frame) */
  meterRef: React.RefObject<{ peak: number; rms: number }>;
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
  const meterRef = useRef<{ peak: number; rms: number }>({ peak: 0, rms: 0 });
  const [isActive, setIsActive] = useState(false);

  const connectAudio = useCallback(
    (audio: HTMLAudioElement) => {
      if (connectedRef.current === audio && analyserRef.current) return;

      // Cancel any existing animation loop before starting a new one
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
        } else {
          source.connect(analyserRef.current);
        }

        // Allocate buffers once — reused across all frames (zero per-frame allocation)
        frequencyDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        waveDataRef.current = new Uint8Array(analyserRef.current.fftSize);
        setIsActive(true);

        const tick = () => {
          // Skip expensive analyser reads when tab is hidden to save CPU
          if (!document.hidden) {
            if (frequencyDataRef.current) {
              analyserRef.current?.getByteFrequencyData(frequencyDataRef.current);
            }
            if (waveDataRef.current) {
              analyserRef.current?.getByteTimeDomainData(waveDataRef.current);
              // Compute peak and RMS from waveform (0-255 range, 128 = silence)
              const buf = waveDataRef.current;
              let sumSq = 0;
              let maxAbs = 0;
              for (let i = 0; i < buf.length; i++) {
                const sample = (buf[i] - 128) / 128; // normalize to -1..1
                sumSq += sample * sample;
                const abs = Math.abs(sample);
                if (abs > maxAbs) maxAbs = abs;
              }
              meterRef.current.peak = maxAbs;
              meterRef.current.rms = Math.sqrt(sumSq / buf.length);
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Some mobile browsers (notably iOS in background paths) can reject
        // WebAudio graph connections for cross-origin streams. Keep playback
        // alive and just disable analyser updates.
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

  return { connectAudio, frequencyDataRef, waveDataRef, meterRef, isActive, disconnect };
}
