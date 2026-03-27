/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Pulse Radio] Uncaught rendering error:', error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-5 p-8 min-h-screen bg-[#0a0f1a] text-center select-none"
    >
      {/* Glass card */}
      <div className="flex flex-col items-center justify-center gap-5 max-w-sm w-full rounded-2xl p-8 bg-sys-glass backdrop-blur-xl [backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)] border border-white/10">
        {/* Error icon */}
        <div className="p-3.5 rounded-full bg-sys-red/10">
          <AlertTriangle size={32} className="text-sys-red" aria-hidden="true" />
        </div>

        {/* Messaging */}
        <div>
          <h2 className="text-[17px] font-semibold text-white mb-1.5">
            Something went wrong
          </h2>
          <p className="text-[14px] text-white/60 max-w-xs mx-auto leading-relaxed">
            An unexpected error occurred. Your playback may still be running in
            the background.
          </p>
        </div>

        {/* Error digest (non-sensitive) */}
        {error.digest && (
          <p className="text-[12px] text-white/55 bg-surface-2 rounded-lg px-4 py-2">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions – touch targets ≥ 44px */}
        <div className="flex flex-col items-center justify-center gap-3 w-full mt-1">
          <button
            onClick={reset}
            className="flex items-center gap-2 justify-center w-full min-h-11 px-5 py-3 rounded-xl bg-surface-3 text-[14px] font-medium text-white hover:bg-surface-4 active:scale-[0.97] transition-all"
          >
            <RotateCcw size={16} /> Try Again
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 justify-center w-full min-h-11 px-5 py-3 rounded-xl bg-surface-1 text-[14px] font-medium text-white/60 hover:text-white hover:bg-surface-2 active:scale-[0.97] transition-all"
          >
            <Home size={16} /> Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
