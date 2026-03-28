/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

'use client';

import type { ConcertEvent } from './types';

export function ConcertMobileBanner({
  concerts,
  onClick,
}: {
  concerts: ConcertEvent[];
  onClick?: () => void;
}) {
  if (concerts.length === 0) return null;
  return (
    <div
      className={`w-full overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      style={{ background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="relative overflow-hidden h-7 flex items-center">
        <span className="text-[9px] font-semibold tracking-widest uppercase text-white/30 pl-3 pr-2 shrink-0">
          LIVE
        </span>
        <div
          className="flex items-center gap-6 whitespace-nowrap"
          style={{ animation: `marquee ${Math.max(10, concerts.length * 5)}s linear infinite` }}
        >
          {[...concerts.slice(0, 5), ...concerts.slice(0, 5)].map((ev, idx) => {
            const d = new Date(ev.date);
            const dateStr = isNaN(d.getTime())
              ? ev.date
              : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const inner = (
              <span className="inline-flex items-center gap-1.5 text-[10px]">
                <span className="text-sys-orange font-mono font-bold">{dateStr}</span>
                <span className="text-white/50 font-medium">{ev.venue}</span>
                {(ev.city || ev.country) && (
                  <span className="text-white/30">
                    {ev.city}
                    {ev.country ? `, ${ev.country}` : ''}
                  </span>
                )}
              </span>
            );
            return (
              <span key={`${ev.id}-${idx}`} className="inline-flex items-center">
                {inner}
              </span>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
