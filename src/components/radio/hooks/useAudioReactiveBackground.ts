/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client'; import { useEffect, useRef, useState } from 'react'; type MeterRef = React.RefObject<{ peak: number; rms: number }>; const ATTACK_MS = 80; const RELEASE_MS = 350; const MAX_AMPLITUDE = 0.35; function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
/* Produces a smoothed audio-reactive amplitude suitable for background motion. Uses fast attack + slower release
 *  to track energy while avoiding jitter. */
export function useAudioReactiveBackground(meterRef: MeterRef, enabled: boolean): { amplitude: number } {
  const [amplitude, setAmplitude] = useState(0); const valueRef = useRef(0); const lastPublishedRef = useRef(0); const rafRef = useRef(0); const lastTsRef = useRef(0); useEffect(() => { const loop = (ts: number) => { const lastTs = lastTsRef.current || ts; lastTsRef.current = ts; const dtSec = Math.max(0.001, (ts - lastTs) / 1000); const meter = meterRef.current; const rms = enabled && meter ? clamp01(meter.rms) : 0; const peak = enabled && meter ? clamp01(meter.peak) : 0; const target = Math.min(MAX_AMPLITUDE, rms * 0.85 + peak * 0.15); const attack = 1 - Math.exp(-dtSec / (ATTACK_MS / 1000)); const release = 1 - Math.exp(-dtSec / (RELEASE_MS / 1000)); const alpha = target > valueRef.current ? attack : release; valueRef.current += (target - valueRef.current) * alpha; if (Math.abs(valueRef.current - lastPublishedRef.current) >= 0.002) {
        lastPublishedRef.current = valueRef.current; setAmplitude(valueRef.current); }
      rafRef.current = requestAnimationFrame(loop);
    }; rafRef.current = requestAnimationFrame(loop); return () => { cancelAnimationFrame(rafRef.current); lastTsRef.current = 0; };
  }, [enabled, meterRef]); return { amplitude }; }
