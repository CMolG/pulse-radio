/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React from "react";
import { Music, Radio, Clock, Trash2, Heart, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import type { HistoryEntry, SongDetailData } from "../types";
import { formatDuration } from "../utils/formatDuration";

function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const ITUNES_REFERRER = 'pt=pulse-radio&ct=www.pulse-radio.online';

function itunesSearchUrl(title: string, artist: string): string {
  const q = encodeURIComponent(`${artist} ${title}`.trim());
  return `https://music.apple.com/search?term=${q}&${ITUNES_REFERRER}`;
}

type Props = {
  history: HistoryEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onToggleFavSong?: (entry: HistoryEntry) => void;
  isSongFavorite?: (title: string, artist: string) => boolean;
  onSelect?: (song: SongDetailData) => void;
};

export default function HistoryGridView({ history, onRemove, onClear, onToggleFavSong, isSongFavorite, onSelect }: Props) {
  if (history.length === 0) {
    return (
      <div className="flex-center-col py-20 px-4">
        <Clock size={40} className="text-dim mb-3" />
        <p className="text-[14px] text-secondary">No listening history yet</p>
        <p className="text-[12px] text-dim mt-1">Songs you listen to will appear here</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-dim">{history.length} songs</p>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] text-dim hover:text-red-400 transition-colors"
        >
          <Trash2 size={11} />
          Clear all
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {history.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.5) }}
            className="group bg-surface-2 rounded-xl border border-border-default overflow-hidden hover:bg-surface-3 transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`${entry.title} by ${entry.artist}`}
            onClick={() => onSelect?.({
              title: entry.title,
              artist: entry.artist,
              album: entry.album,
              artworkUrl: entry.artworkUrl,
              itunesUrl: entry.itunesUrl,
              durationMs: entry.durationMs,
              genre: entry.genre,
              releaseDate: entry.releaseDate,
              trackNumber: entry.trackNumber,
              trackCount: entry.trackCount,
              stationName: entry.stationName,
            })}
          >
            {/* Artwork */}
            <div className="w-full aspect-square bg-surface-3 relative">
              {entry.artworkUrl ? (
                <img src={entry.artworkUrl} alt="" loading="lazy" className="size-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="size-full flex items-center justify-center">
                  <Music size={32} className="text-dim" />
                </div>
              )}
              {onToggleFavSong && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavSong(entry); }}
                  aria-label={isSongFavorite?.(entry.title, entry.artist) ? 'Unlike song' : 'Like song'}
                  aria-pressed={!!isSongFavorite?.(entry.title, entry.artist)}
                  className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-sm transition-all ${isSongFavorite?.(entry.title, entry.artist) ? "bg-pink-500/20 text-pink-400" : "bg-black/50 text-white/40 opacity-0 group-hover:opacity-100 hover:text-pink-400"}`}
                  title="Favorite song"
                >
                  <Heart size={12} className={isSongFavorite?.(entry.title, entry.artist) ? "fill-pink-400" : ""} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(entry.id); }}
                aria-label="Remove from history"
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
            {/* Info */}
            <div className="p-3 space-y-0.5">
              <p className="text-[13px] font-medium text-white line-clamp-1">{entry.title}</p>
              <p className="text-[12px] text-secondary line-clamp-1">{entry.artist}</p>
              {entry.album && (
                <p className="text-[11px] text-dim line-clamp-1">{entry.album}</p>
              )}
              {(entry.genre || entry.durationMs) && (
                <p className="text-[10px] text-dim line-clamp-1 flex items-center gap-1">
                  {entry.genre && <span>{entry.genre}</span>}
                  {entry.durationMs && (
                    <span className="inline-flex items-center gap-0.5">
                      <Clock size={8} className="opacity-60" />
                      {formatDuration(entry.durationMs)}
                    </span>
                  )}
                </p>
              )}
            </div>
            {/* Apple Music + Footer */}
            <div className="px-3 pb-2.5 space-y-1.5">
              <a
                href={entry.itunesUrl || itunesSearchUrl(entry.title, entry.artist)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[10px] font-medium text-white/60 hover:text-white/80 transition-colors"
              >
                <ExternalLink size={10} />
                Listen on Apple Music
              </a>
              <div className="flex items-center gap-1.5">
                <Radio size={9} className="text-dim flex-shrink-0" />
                <p className="text-[10px] text-dim truncate flex-1">{entry.stationName}</p>
                <span className="text-[10px] text-dim">{formatTimeAgo(entry.timestamp)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
