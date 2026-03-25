/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
'use client';
import { useRef, useEffect, useCallback, useState } from 'react';
/**
 * Prevents the screen from dimming/locking while audio is playing.
 * Uses the Screen Wake Lock API (supported in Chrome, Edge, Safari 16.4+).
 * Automatically re-acquires the lock when the tab becomes visible again.
 */
export function useWakeLock(shouldLock: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null); const [isActive, setIsActive] = useState(false);
  const requestingRef = useRef(false); const wantReleaseRef = useRef(false);
  const request = useCallback(async () => {
    if (lockRef.current || requestingRef.current || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    requestingRef.current = true; wantReleaseRef.current = false;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (wantReleaseRef.current) {
        // release() was called while we were awaiting — honour it immediately
        try { await lock.release(); } catch { /* already released */ }
        setIsActive(false); return;
      }
      lockRef.current = lock; setIsActive(true);
      lock.addEventListener('release', () => { lockRef.current = null; setIsActive(false); });
    } catch {
      // Wake lock request failed (e.g., low battery, or permission denied)
    } finally { requestingRef.current = false; }
  }, []);
  const release = useCallback(async () => {
    if (requestingRef.current) {
      // request() is in-flight — flag so it releases on completion
      wantReleaseRef.current = true; return;
    }
    if (!lockRef.current) return;
    try { await lockRef.current.release(); } catch {
      // Already released
    }
    lockRef.current = null; setIsActive(false);
  }, []);
  // Auto-acquire/release based on shouldLock
  useEffect(() => { if (shouldLock) request(); else release(); }, [shouldLock, request, release]);
  // Re-acquire when tab becomes visible (browser releases lock on hide)
  useEffect(() => {
    const onVisibilityChange = () => { if (shouldLock && !document.hidden && !lockRef.current) request(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [shouldLock, request]);
  // Cleanup on unmount
  useEffect(() => () => { release(); }, [release]); return { isActive, request, release };
}
