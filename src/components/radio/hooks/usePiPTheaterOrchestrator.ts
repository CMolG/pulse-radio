/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type PiPState = 'idle' | 'opening' | 'open' | 'closing' | 'fallback';

interface PiPOrchestratorOptions {
  isPlaying: boolean;
  isTheaterMode: boolean;
  isPiPEnabled: boolean;
  onFallback?: () => void;
}

interface PiPOrchestratorReturn {
  pipState: PiPState;
  pipWindow: Window | null;
  isSupported: boolean;
  enablePiP: () => void;
  disablePiP: () => void;
}

function checkSupported(): boolean {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

function copyStylesheets(source: Document, target: Document): void {
  for (const sheet of Array.from(source.styleSheets)) {
    try {
      if (sheet.href) {
        const link = target.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        target.head.appendChild(link);
      } else if (sheet.cssRules) {
        const style = target.createElement('style');
        for (const rule of Array.from(sheet.cssRules)) {
          style.appendChild(target.createTextNode(rule.cssText));
        }
        target.head.appendChild(style);
      }
    } catch {
      /* cross-origin sheets — skip */
    }
  }
}

/**
 * Document Picture-in-Picture lifecycle manager.
 *
 * State machine: idle → opening → open → closing → idle
 * Error paths:   opening → fallback, open → fallback
 *
 * Opens a compact PiP window when the tab becomes hidden (background)
 * while playback is active in theater mode. Closes it when the tab
 * becomes visible again.
 */
export function usePiPTheaterOrchestrator({
  isPlaying,
  isTheaterMode,
  isPiPEnabled,
  onFallback,
}: PiPOrchestratorOptions): PiPOrchestratorReturn {
  const [pipState, setPipState] = useState<PiPState>('idle');
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isSupported] = useState(checkSupported);

  const stateRef = useRef(pipState);
  useEffect(() => {
    stateRef.current = pipState;
  }, [pipState]);

  const pipWindowRef = useRef<Window | null>(null);
  useEffect(() => {
    pipWindowRef.current = pipWindow;
  }, [pipWindow]);

  const onFallbackRef = useRef(onFallback);
  useEffect(() => {
    onFallbackRef.current = onFallback;
  }, [onFallback]);

  const openPiP = useCallback(async () => {
    if (stateRef.current === 'opening' || stateRef.current === 'open') return;
    if (!checkSupported()) {
      setPipState('fallback');
      onFallbackRef.current?.();
      return;
    }

    setPipState('opening');

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dpip = (window as any).documentPictureInPicture;
      const win: Window = await dpip.requestWindow({ width: 400, height: 300 });

      copyStylesheets(document, win.document);

      win.document.body.style.margin = '0';
      win.document.body.style.padding = '0';
      win.document.body.style.overflow = 'hidden';
      win.document.body.style.background = '#0a0f1a';

      // Listen for the PiP window closing unexpectedly
      win.addEventListener('pagehide', () => {
        setPipState('idle');
        setPipWindow(null);
      });

      setPipWindow(win);
      setPipState('open');
    } catch {
      setPipState('fallback');
      onFallbackRef.current?.();
    }
  }, []);

  const closePiP = useCallback(() => {
    if (stateRef.current === 'closing' || stateRef.current === 'idle') return;

    setPipState('closing');

    try {
      pipWindowRef.current?.close();
    } catch {
      /* already closed */
    }

    setPipWindow(null);
    setPipState('idle');
  }, []);

  // Visibility-change listener: open PiP when tab hidden, close when visible
  useEffect(() => {
    if (!isSupported || !isPiPEnabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (isPlaying && isTheaterMode && isPiPEnabled && isSupported) {
          openPiP();
        }
      } else if (document.visibilityState === 'visible') {
        if (stateRef.current === 'open') {
          closePiP();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, isTheaterMode, isPiPEnabled, isSupported, openPiP, closePiP]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      try {
        pipWindowRef.current?.close();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return {
    pipState,
    pipWindow,
    isSupported,
    enablePiP: openPiP,
    disablePiP: closePiP,
  };
}
