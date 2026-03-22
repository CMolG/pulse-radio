/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React from "react";
import { Music, Radio, Heart, Trash2, ExternalLink, Clock } from "lucide-react";
import { motion } from "motion/react";
import type { FavoriteSong, SongDetailData } from "../types";
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
  songs: FavoriteSong[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelect?: (song: SongDetailData) => void;
};

export default function FavoriteSongsView({ songs, onRemove, onClear, onSelect }: Props) {
  if (songs.length === 0) {
    return (
      <div className="flex-center-col py-20 px-4">
        <Heart size={40} className="text-dim mb-3" />
        <p className="text-[14px] text-secondary">No favorite songs yet</p>
        <p className="text-[12px] text-dim mt-1">Tap the heart icon to save songs you love</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-dim">{songs.length} songs</p>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] text-dim hover:text-red-400 transition-colors"
        >
          <Trash2 size={11} />
          Clear all
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {songs.map((song, i) => (
          <motion.div
            key={song.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.5) }}
            className="group bg-surface-2 rounded-xl border border-border-default overflow-hidden hover:bg-surface-3 transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`${song.title} by ${song.artist}`}
            onClick={() => onSelect?.({
              title: song.title,
              artist: song.artist,
              album: song.album,
              artworkUrl: song.artworkUrl,
              itunesUrl: song.itunesUrl,
              durationMs: song.durationMs,
              genre: song.genre,
              releaseDate: song.releaseDate,
              trackNumber: song.trackNumber,
              trackCount: song.trackCount,
              stationName: song.stationName,
            })}
          >
            {/* Artwork */}
            <div className="w-full aspect-square bg-surface-3 relative">
              {song.artworkUrl ? (
                <img src={song.artworkUrl} alt="" loading="lazy" className="size-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="size-full flex items-center justify-center">
                  <Music size={32} className="text-dim" />
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(song.id); }}
                aria-label="Remove from favorites"
                className="absolute top-2 left-2 p-1.5 rounded-full bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 transition-all"
                title="Remove from favorites"
              >
                <Heart size={12} className="fill-pink-400" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(song.id); }}
                aria-label="Delete song"
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove"
              >
                <Trash2 size={12} />
              </button>
            </div>
            {/* Info */}
            <div className="p-3 space-y-0.5">
              <p className="text-[13px] font-medium text-white line-clamp-1">{song.title}</p>
              <p className="text-[12px] text-secondary line-clamp-1">{song.artist}</p>
              {song.album && (
                <p className="text-[11px] text-dim line-clamp-1">{song.album}</p>
              )}
              {(song.genre || song.durationMs) && (
                <p className="text-[10px] text-dim line-clamp-1 flex items-center gap-1">
                  {song.genre && <span>{song.genre}</span>}
                  {song.durationMs && (
                    <span className="inline-flex items-center gap-0.5">
                      <Clock size={8} className="opacity-60" />
                      {formatDuration(song.durationMs)}
                    </span>
                  )}
                </p>
              )}
            </div>
            {/* Apple Music + Footer */}
            <div className="px-3 pb-2.5 space-y-1.5">
              <a
                href={song.itunesUrl || itunesSearchUrl(song.title, song.artist)}
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
                <p className="text-[10px] text-dim truncate flex-1">{song.stationName}</p>
                <span className="text-[10px] text-dim">{formatTimeAgo(song.timestamp)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
