/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ 'use client';
import { useEffect } from 'react';
const _SW_OPTS: RegistrationOptions = { scope: '/', updateViaCache: 'none' };
const _NOOP = () => {};
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', _SW_OPTS).catch(_NOOP);
    }
  }, []);
  return null;
}
