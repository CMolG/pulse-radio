/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import React, { useState, useEffect, useRef } from 'react';

type MeterRef = React.RefObject<{ peak: number; rms: number }>;

const ATTACK_MS = 80;
const RELEASE_MS = 350;
const MAX_AMPLITUDE = 0.35;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function useAudioReactiveBackground(
  meterRef: MeterRef,
  enabled: boolean,
  analyserActive?: boolean,
): { amplitude: number } {
  const [amplitude, setAmplitude] = useState(0);
  const valueRef = useRef(0);
  const lastPublishedRef = useRef(0);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  useEffect(() => {
    const loop = (ts: number) => {
      const lastTs = lastTsRef.current || ts;
      lastTsRef.current = ts;
      const dtSec = Math.max(0.001, (ts - lastTs) / 1000);
      const meter = meterRef.current;
      const hasRealData = analyserActive && meter && (meter.rms > 0 || meter.peak > 0);
      let target: number;
      if (enabled && hasRealData) {
        const rms = clamp01(meter.rms);
        const peak = clamp01(meter.peak);
        target = Math.min(MAX_AMPLITUDE, rms * 0.85 + peak * 0.15);
      } else if (enabled && !analyserActive) {
        // Synthesize a gentle ambient pulse when playing without analyser
        const pulse = 0.12 + 0.06 * Math.sin(ts / 800) + 0.03 * Math.sin(ts / 1300);
        target = Math.min(MAX_AMPLITUDE, pulse);
      } else {
        target = 0;
      }
      const attack = 1 - Math.exp(-dtSec / (ATTACK_MS / 1000));
      const release = 1 - Math.exp(-dtSec / (RELEASE_MS / 1000));
      const alpha = target > valueRef.current ? attack : release;
      valueRef.current += (target - valueRef.current) * alpha;
      if (Math.abs(valueRef.current - lastPublishedRef.current) >= 0.002) {
        lastPublishedRef.current = valueRef.current;
        setAmplitude(valueRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [enabled, meterRef, analyserActive]);
  return { amplitude };
}
