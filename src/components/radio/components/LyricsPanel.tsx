'use client';

import React, { useMemo } from 'react';
import { X, Mic2, Loader2 } from 'lucide-react';
import type { LyricsData } from '../types';

type Props = {
  lyrics: LyricsData | null;
  loading: boolean;
  currentTime?: number;
  onClose: () => void;
};

export default function LyricsPanel({ lyrics, loading, currentTime, onClose }: Props) {
  const activeIdx = useMemo(() => {
    if (currentTime == null || !lyrics?.synced || !lyrics.lines.length) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (lyrics.lines[i].time <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [lyrics, currentTime]);

  return (
    <div className="flex flex-col h-full w-full bg-surface-1 bdr-l">
      {/* Header */}
      <div className="flex-between px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex-row-1.5">
          <Mic2 size={14} className="text-sys-orange" />
          <span className="text-[12px] font-semibold text-white">Lyrics</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1 text-subtle-hover">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="app-body px-4 pb-4">
        {loading && (
          <div className="flex-center-row py-16">
            <Loader2 size={20} className="text-dim animate-spin" />
          </div>
        )}

        {!loading && !lyrics && (
          <div className="flex-center-col py-16">
            <Mic2 size={28} className="text-muted mb-2" />
            <p className="text-[12px] text-secondary text-center">
              No lyrics available.<br />Play a station with track detection.
            </p>
          </div>
        )}

        {!loading && lyrics && (
          <div className="space-y-0.5">
            {lyrics.trackName && (
              <div className="mb-4">
                <p className="text-[13px] font-medium text-white">{lyrics.trackName}</p>
                <p className="text-[11px] text-secondary">{lyrics.artistName}</p>
              </div>
            )}

            {lyrics.synced && lyrics.lines.length > 0 ? (
              lyrics.lines.map((line, i) => {
                const isActive = i === activeIdx;

                return (
                  <p
                    key={i}
                    className={`text-[13px] leading-relaxed transition-all duration-200 ${
                      isActive
                        ? 'text-white font-semibold border-l-2 border-sys-orange pl-2'
                        : i < activeIdx
                          ? 'text-white/30 pl-2.5'
                          : 'text-secondary pl-2.5'
                    }`}
                  >
                    {line.text || '♪'}
                  </p>
                );
              })
            ) : lyrics.plainText ? (
              <p className="text-[13px] text-secondary leading-relaxed whitespace-pre-wrap">
                {lyrics.plainText}
              </p>
            ) : (
              <p className="text-[12px] text-secondary">No lyrics text available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
