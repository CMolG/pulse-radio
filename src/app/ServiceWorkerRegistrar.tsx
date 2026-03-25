/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client'; import { useEffect } from 'react'; export function ServiceWorkerRegistrar() { useEffect(() => { if ('serviceWorker' in navigator) { navigator.serviceWorker .register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => { }); // SW registration failure is non-critical; silently ignored
    }
  }, []); return null; }
