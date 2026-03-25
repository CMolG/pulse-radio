/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker .register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
          // SW registration failure is non-critical; silently ignored
        });
    }
  }, []);
  return null;
}
