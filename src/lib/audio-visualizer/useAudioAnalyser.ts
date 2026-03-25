/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client'; import React, { useRef, useCallback, useEffect, useState } from 'react'; import { getOrCreateAudioSource } from './audioSourceCache';
type UseAudioAnalyserOptions = { fftSize?: number; smoothingTimeConstant?: number; }; interface UseAudioAnalyserReturn { connectAudio: (audio: HTMLAudioElement) => void;
  /** Stable ref whose .current is updated in-place every frame — zero allocations */
  frequencyDataRef: React.RefObject<Uint8Array<ArrayBuffer> | null>;
  /** Stable ref whose .current is updated in-place every frame — zero allocations */
  waveDataRef: React.RefObject<Uint8Array<ArrayBuffer> | null>;
  /** Audio metering: peak level 0-1, RMS level 0-1 (updated every frame) */
  meterRef: React.RefObject<{ peak: number; rms: number }>; isActive: boolean; disconnect: () => void; }
export function useAudioAnalyser(opts: UseAudioAnalyserOptions = {}): UseAudioAnalyserReturn {
  const { fftSize = 256, smoothingTimeConstant = 0.8 } = opts; const analyserRef = useRef<AnalyserNode | null>(null); const rafRef = useRef<number>(0); const connectedRef = useRef<HTMLAudioElement | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null); const waveDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const meterRef = useRef<{ peak: number; rms: number }>({ peak: 0, rms: 0 }); const [isActive, setIsActive] = useState(false); const connectAudio = useCallback((audio: HTMLAudioElement) => {
      if (connectedRef.current === audio && analyserRef.current) return; cancelAnimationFrame(rafRef.current); // Cancel any existing animation loop before starting a new one
      try { const { ctx, source } = getOrCreateAudioSource(audio); connectedRef.current = audio; if (!analyserRef.current) { const analyser = ctx.createAnalyser();
          analyser.fftSize = fftSize; analyser.smoothingTimeConstant = smoothingTimeConstant; source.connect(analyser); analyserRef.current = analyser;
        } else source.connect(analyserRef.current);
        // Allocate buffers once — reused across all frames (zero per-frame allocation)
        frequencyDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount); waveDataRef.current = new Uint8Array(analyserRef.current.fftSize); setIsActive(true); const tick = () => {
          if (!document.hidden) { // Skip expensive analyser reads when tab is hidden to save CPU
            if (frequencyDataRef.current) analyserRef.current?.getByteFrequencyData(frequencyDataRef.current); if (waveDataRef.current) { analyserRef.current?.getByteTimeDomainData(waveDataRef.current);
              // Compute peak and RMS in integer domain (0-255 unsigned, 128=silence)
              // to avoid 256 float divisions per frame — normalize once at the end
              const buf = waveDataRef.current; let sumSqInt = 0; let maxAbsInt = 0; for (let i = 0; i < buf.length; i++) {
                const s = buf[i] - 128; sumSqInt += s * s; const a = s < 0 ? -s : s; if (a > maxAbsInt) maxAbsInt = a; }
              meterRef.current.peak = maxAbsInt / 128; meterRef.current.rms = Math.sqrt(sumSqInt / buf.length) / 128; }
          } rafRef.current = requestAnimationFrame(tick);
        }; rafRef.current = requestAnimationFrame(tick);} catch {
        // Some mobile browsers (notably iOS in background paths) can reject
        // WebAudio graph connections for cross-origin streams. Keep playback
        cancelAnimationFrame(rafRef.current); setIsActive(false); // alive and just disable analyser updates.
        frequencyDataRef.current = null; waveDataRef.current = null; }
    }, [fftSize, smoothingTimeConstant],);
  const disconnect = useCallback(() => {
    cancelAnimationFrame(rafRef.current); connectedRef.current = null; setIsActive(false); frequencyDataRef.current = null; waveDataRef.current = null;
  }, []); useEffect(() => () => { cancelAnimationFrame(rafRef.current); }, [],); return { connectAudio, frequencyDataRef, waveDataRef, meterRef, isActive, disconnect }; }
