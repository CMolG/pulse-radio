/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setWasOffline(true);
    // Reset wasOffline after 5 seconds
    timerRef.current = setTimeout(() => setWasOffline(false), 5000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
}
