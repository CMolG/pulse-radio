/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { ConcertEvent } from './types';
import { CONCERT_PANEL_STYLE, CONCERT_ITEM_STYLE } from './types';

export function ConcertSidePanel({ concerts }: { concerts: ConcertEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shadows, setShadows] = useState({ top: false, bottom: true });
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShadows({
      top: scrollTop > 0,
      bottom: Math.ceil(scrollTop + clientHeight) < scrollHeight,
    });
  }, []);
  useEffect(() => {
    handleScroll();
  }, [handleScroll]);
  return (
    <div
      className="relative rounded-2xl p-2 flex-none w-full max-w-[300px] overflow-hidden self-center"
      style={{ ...CONCERT_PANEL_STYLE, height: 'calc((2.5 * (90px + 0.5rem)) + 1rem)' }}
    >
      <div className="px-3 pt-1.5 pb-1">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-white/40 text-center">
          Upcoming Shows
        </p>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden snap-y snap-mandatory pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <ul className="m-0 p-0 list-none">
          {concerts.slice(0, 10).map((ev) => {
            const d = new Date(ev.date);
            const dateStr = isNaN(d.getTime())
              ? ev.date
              : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
            return (
              <li
                key={ev.id}
                className="w-full h-[90px] my-1 p-2 rounded-lg flex flex-col items-center justify-center snap-start box-border"
                style={CONCERT_ITEM_STYLE}
              >
                <div className="flex flex-row items-center justify-center gap-4 m-1.5 w-full box-border">
                  <span className="text-sys-orange text-[0.95em] font-bold font-mono whitespace-nowrap">
                    {dateStr}
                  </span>
                  <span className="font-semibold text-[0.9em] text-white/80 text-center truncate">
                    {ev.venue}
                  </span>
                </div>
                <p className="text-[11px] text-white/40 text-center truncate w-full mb-1">
                  {ev.city}
                  {ev.country ? `, ${ev.country}` : ''}
                </p>
                {ev.ticketUrl ? (
                  <a
                    href={ev.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-1.5 rounded-full text-[11px] font-bold text-white/70 hover:text-white transition-all hover:-translate-y-[1px]"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    Get Tickets
                  </a>
                ) : (
                  <span
                    className="px-5 py-1.5 rounded-full text-[11px] font-medium text-white/40"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    No tickets yet
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div
        className={`pointer-events-none absolute top-8 left-0 right-0 h-6 shadow-[0_1rem_1rem_-1rem_rgba(0,0,0,0.2)_inset] transition-opacity duration-200 ${shadows.top ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 h-6 shadow-[0_-1rem_1rem_-1rem_rgba(0,0,0,0.2)_inset] transition-opacity duration-200 ${shadows.bottom ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />
    </div>
  );
}
