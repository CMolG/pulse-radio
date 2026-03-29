/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { ConcertEvent } from './types';
import { CONCERT_PANEL_STYLE, CONCERT_ITEM_STYLE } from './types';

const MOTION_FADE_IN = { opacity: 0 } as const;
const MOTION_FADE_VISIBLE = { opacity: 1 } as const;
const MOTION_FADE_OUT = { opacity: 0 } as const;

export function ConcertModal({
  concerts,
  artistName,
  onClose,
}: {
  concerts: ConcertEvent[];
  artistName?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <AnimatePresence>
      <motion.div
        key="concert-modal-backdrop"
        initial={MOTION_FADE_IN}
        animate={MOTION_FADE_VISIBLE}
        exit={MOTION_FADE_OUT}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          key="concert-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Upcoming shows"
          initial={{ y: 30, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="w-full max-w-[400px] mx-4 max-h-[80vh] overflow-hidden rounded-2xl"
          style={{ ...CONCERT_PANEL_STYLE }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-white/40">
                Upcoming Shows
              </p>
              {artistName && (
                <p className="text-[14px] font-bold text-white truncate mt-0.5">{artistName}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close upcoming shows"
              className="p-2 rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto px-2 pb-3 max-h-[calc(80vh-5rem)] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <ul className="m-0 p-0 list-none">
              {concerts.slice(0, 15).map((ev) => {
                const d = new Date(ev.date);
                const dateStr = isNaN(d.getTime())
                  ? ev.date
                  : d
                      .toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      .toUpperCase();
                return (
                  <li
                    key={ev.id}
                    className="w-full my-1.5 p-3 rounded-xl flex flex-col items-center justify-center"
                    style={CONCERT_ITEM_STYLE}
                  >
                    <div className="flex flex-row items-center justify-center gap-3 w-full">
                      <span className="text-sys-orange text-[0.95em] font-bold font-mono whitespace-nowrap">
                        {dateStr}
                      </span>
                      <span className="font-semibold text-[0.9em] text-white/80 text-center truncate">
                        {ev.venue}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 text-center truncate w-full mt-1">
                      {ev.city}
                      {ev.country ? `, ${ev.country}` : ''}
                    </p>
                    <div className="mt-2">
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
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
