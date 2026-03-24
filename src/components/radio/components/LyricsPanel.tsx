/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useMemo } from "react";
import { X, Mic2 } from "lucide-react";
import type { LyricsData } from "../types";
import { getEffectiveActiveLyricIndex } from "../lyricsUtils";
import type { RealtimeSyncStatus } from "../services/realtimeLyricsTypes";

type Props = {
  lyrics: LyricsData | null;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  currentTime?: number;
  activeLineOverride?: number;
  realtimeStatus?: RealtimeSyncStatus;
  realtimeConfidence?: number;
  onClose: () => void;
};

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "High";
  if (confidence >= 0.75) return "Medium";
  if (confidence > 0) return "Low";
  return "N/A";
}

export default function LyricsPanel({
  lyrics,
  loading,
  error,
  onRetry,
  currentTime,
  activeLineOverride,
  realtimeStatus,
  realtimeConfidence = 0,
  onClose,
}: Props) {
  const activeIdx = useMemo(
    () => getEffectiveActiveLyricIndex(lyrics, currentTime, activeLineOverride),
    [activeLineOverride, currentTime, lyrics],
  );
  const realtimeActive = realtimeStatus === "listening" || realtimeStatus === "recovering";

  return (
    <div className="flex flex-col h-full w-full bg-surface-1 bdr-l">
      {/* Header */}
      <div className="flex-between px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex-row-1.5">
          <Mic2 size={14} className="text-sys-orange" />
          <span className="text-[12px] font-semibold text-white">Lyrics</span>
          {realtimeActive && (
            <>
              <span className="px-1.5 py-0.5 rounded-full border border-sys-orange/40 bg-sys-orange/15 text-[9px] font-semibold uppercase tracking-wide text-sys-orange">
                Realtime Sync
              </span>
              <span className="px-1.5 py-0.5 rounded-full border border-white/15 bg-white/5 text-[9px] font-medium text-white/80">
                {confidenceLabel(realtimeConfidence)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} aria-label="Close lyrics" className="p-1 text-subtle-hover">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="app-body px-4 pb-4">
        {!loading && error && (
          <div className="flex-center-col py-16">
            <Mic2 size={28} className="text-red-400 mb-2" />
            <p className="text-[12px] text-secondary text-center mb-3">
              Failed to load lyrics.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 text-[11px] rounded-md bg-sys-orange/20 text-sys-orange hover:bg-sys-orange/30 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {!loading && !error && !lyrics && (
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
                        ? "text-white font-semibold border-l-2 border-sys-orange pl-2"
                        : i < activeIdx
                          ? "text-white/30 pl-2.5"
                          : "text-secondary pl-2.5"
                     }`}
                   >
                     {line.text || "♪"}
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
