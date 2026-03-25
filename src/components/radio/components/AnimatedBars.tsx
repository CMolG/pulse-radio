/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
'use client';
import React from 'react';
export default React.memo(function AnimatedBars({ size = 'default' }: { size?: 'small' | 'default' }) {
  const h = size === 'small' ? 10 : 16; const w = size === 'small' ? 2 : 3;
  return (<span className="inline-flex items-end" style={{ height: h, gap: size === 'small' ? 1 : 1.5 }}>
      {[0, 1, 2].map(i => (
 <span key={i} className="bg-sys-orange rounded-full animate-eq-bar" style={{ width: w, height: h * 0.5, animationDelay: `${i * 0.15}s`, }} />
      ))} <style jsx>{`
        @keyframes eq-bar {
          0%, 100% { height: ${h * 0.2}px; }
          50% { height: ${h}px; }
        }
        .animate-eq-bar { animation: eq-bar 0.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-eq-bar { animation: none; height: ${h * 0.5}px; }
        }
      `}</style>
    </span>);
});
