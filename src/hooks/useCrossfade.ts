/* eslint-disable react-hooks/refs */
import { useRef, useCallback } from 'react';

const CROSSFADE_DURATION = 1500; // ms
const STORAGE_KEY = 'radio-crossfade-enabled';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream
  );
}

/**
 * Crossfade audio transitions between stations.
 * Uses dual GainNodes for smooth volume ramping.
 * Falls back to instant switching on iOS (single audio element limitation).
 */
export function useCrossfade(audioContext: AudioContext | null) {
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iosRef = useRef(isIOS());

  const getEnabled = useCallback((): boolean => {
    if (iosRef.current) return false; // iOS can't play two audio elements
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== 'false'; // enabled by default
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    }
  }, []);

  /**
   * Perform a crossfade from outgoing to incoming gain node.
   * Returns a Promise that resolves when the crossfade completes.
   */
  const crossfade = useCallback(
    (outGain: GainNode | null, inGain: GainNode | null, targetVolume: number): Promise<void> => {
      if (!audioContext || !getEnabled() || !outGain || !inGain) {
        // Instant switch
        if (outGain) outGain.gain.value = 0;
        if (inGain) inGain.gain.value = targetVolume;
        return Promise.resolve();
      }

      // Cancel any in-progress fade
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }

      const now = audioContext.currentTime;
      const fadeEnd = now + CROSSFADE_DURATION / 1000;

      // Ramp out
      outGain.gain.cancelScheduledValues(now);
      outGain.gain.setValueAtTime(outGain.gain.value, now);
      outGain.gain.linearRampToValueAtTime(0, fadeEnd);

      // Ramp in
      inGain.gain.cancelScheduledValues(now);
      inGain.gain.setValueAtTime(0, now);
      inGain.gain.linearRampToValueAtTime(targetVolume, fadeEnd);

      return new Promise((resolve) => {
        fadeTimeoutRef.current = setTimeout(() => {
          fadeTimeoutRef.current = null;
          resolve();
        }, CROSSFADE_DURATION + 50);
      });
    },
    [audioContext, getEnabled],
  );

  /** Cancel an in-progress crossfade */
  const cancelFade = useCallback(
    (outGain: GainNode | null, inGain: GainNode | null) => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      if (audioContext) {
        const now = audioContext.currentTime;
        if (outGain) {
          outGain.gain.cancelScheduledValues(now);
          outGain.gain.setValueAtTime(outGain.gain.value, now);
        }
        if (inGain) {
          inGain.gain.cancelScheduledValues(now);
          inGain.gain.setValueAtTime(inGain.gain.value, now);
        }
      }
    },
    [audioContext],
  );

  return {
    crossfade,
    cancelFade,
    isEnabled: getEnabled,
    setEnabled,
    isIOS: iosRef.current,
    CROSSFADE_DURATION,
  };
}
