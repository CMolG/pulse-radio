import { useState, useEffect, useCallback, useRef } from 'react';

type Quality = 'auto' | 'high' | 'standard' | 'low';
type EffectiveType = '4g' | '3g' | '2g' | 'slow-2g';

interface QualityTier {
  maxBitrate: number;
  label: string;
}

const QUALITY_MAP: Record<EffectiveType, QualityTier> = {
  '4g': { maxBitrate: Infinity, label: 'High Quality' },
  '3g': { maxBitrate: 128, label: 'Standard' },
  '2g': { maxBitrate: 64, label: 'Low' },
  'slow-2g': { maxBitrate: 32, label: 'Minimal' },
};

const MANUAL_MAP: Record<Exclude<Quality, 'auto'>, QualityTier> = {
  high: { maxBitrate: Infinity, label: 'High Quality' },
  standard: { maxBitrate: 128, label: 'Standard' },
  low: { maxBitrate: 64, label: 'Low' },
};

const STORAGE_KEY = 'radio-stream-quality';

function getStoredQuality(): Quality {
  if (typeof window === 'undefined') return 'auto';
  return (localStorage.getItem(STORAGE_KEY) as Quality) || 'auto';
}

export function useBandwidthAware() {
  const [preference, setPreferenceState] = useState<Quality>(getStoredQuality);
  const [effectiveType, setEffectiveType] = useState<EffectiveType>('4g');
  const connRef = useRef<NetworkInformation | null>(null);

  useEffect(() => {
    const nav = navigator as NavigatorWithConnection;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (!conn) return;
    connRef.current = conn;

    const update = () => {
      const et = (conn.effectiveType as EffectiveType) || '4g';
      setEffectiveType(et);
    };
    update();
    conn.addEventListener('change', update);
    return () => conn.removeEventListener('change', update);
  }, []);

  const setPreference = useCallback((q: Quality) => {
    setPreferenceState(q);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, q);
    }
  }, []);

  const currentTier: QualityTier =
    preference === 'auto' ? QUALITY_MAP[effectiveType] : MANUAL_MAP[preference];

  const isBitrateOk = useCallback(
    (bitrate: number | undefined | null): boolean => {
      if (!bitrate || bitrate <= 0) return true;
      return bitrate <= currentTier.maxBitrate;
    },
    [currentTier.maxBitrate],
  );

  const networkAvailable = connRef.current !== null;

  return {
    preference,
    setPreference,
    effectiveType,
    currentTier,
    isBitrateOk,
    networkAvailable,
  };
}

interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}
