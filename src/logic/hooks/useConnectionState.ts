/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type EffectiveType = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

interface ConnectionState {
  isOnline: boolean;
  wasOffline: boolean;
  effectiveType: EffectiveType;
  lastOnlineAt: number | null;
  isSlowConnection: boolean;
}

type ReconnectCallback = () => void;

const reconnectCallbacks = new Set<ReconnectCallback>();

/** Register a callback to be invoked when connectivity is restored */
export function onReconnect(cb: ReconnectCallback): () => void {
  reconnectCallbacks.add(cb);
  return () => reconnectCallbacks.delete(cb);
}

function getEffectiveType(): EffectiveType {
  if (typeof navigator === 'undefined') return 'unknown';
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  if (!conn?.effectiveType) return 'unknown';
  const t = conn.effectiveType;
  if (t === '4g' || t === '3g' || t === '2g' || t === 'slow-2g') return t;
  return 'unknown';
}

export function useConnectionState(): ConnectionState {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [effectiveType, setEffectiveType] = useState<EffectiveType>(getEffectiveType);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOfflineRef = useRef(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastOnlineAt(Date.now());
    setWasOffline(true);
    wasOfflineRef.current = true;

    // Fire registered reconnect callbacks
    for (const cb of reconnectCallbacks) {
      try {
        cb();
      } catch {
        // ignore callback errors
      }
    }

    // Reset wasOffline after 5 seconds
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setWasOffline(false);
      wasOfflineRef.current = false;
    }, 5000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleConnectionChange = useCallback(() => {
    setEffectiveType(getEffectiveType());
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // navigator.connection change event (progressive enhancement)
    const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn && typeof conn.removeEventListener === 'function') {
        conn.removeEventListener('change', handleConnectionChange);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleOnline, handleOffline, handleConnectionChange]);

  return {
    isOnline,
    wasOffline,
    effectiveType,
    lastOnlineAt,
    isSlowConnection: effectiveType === '2g' || effectiveType === 'slow-2g',
  };
}
