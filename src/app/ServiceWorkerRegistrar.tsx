/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ 'use client';
import { useEffect, useState, useCallback } from 'react';
import { setupGlobalErrorHandlers } from '@/logic/logger';

const _SW_OPTS: RegistrationOptions = { scope: '/', updateViaCache: 'none' };
const _NOOP = () => {};
const UPDATE_CHECK_INTERVAL_MS = 60_000;

export function ServiceWorkerRegistrar() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [showPrompt, setShowPrompt] = useState(false);

  const handleUpdate = useCallback(() => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    setShowPrompt(false);
  }, [waitingWorker]);

  useEffect(() => {
    setupGlobalErrorHandlers();
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/sw.js', _SW_OPTS)
      .then((registration) => {
        // Check for waiting worker from a previous visit
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowPrompt(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(newWorker);
              setShowPrompt(true);
            }
          });
        });

        // Periodic update check every 60s
        const interval = setInterval(() => {
          registration.update().catch(_NOOP);
        }, UPDATE_CHECK_INTERVAL_MS);

        return () => clearInterval(interval);
      })
      .catch(_NOOP);
  }, []);

  if (!showPrompt) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
      }}
    >
      <button
        type="button"
        onClick={handleUpdate}
        className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[13px] font-medium shadow-lg cursor-pointer active:scale-95 transition-transform"
        style={{
          WebkitBackdropFilter: 'blur(12px)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span className="flex-shrink-0">🔄</span>
        <span>New version available. Tap to update.</span>
      </button>
    </div>
  );
}
