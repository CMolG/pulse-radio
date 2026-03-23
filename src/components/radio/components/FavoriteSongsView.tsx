/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useState, useMemo } from "react";
import { Music, Radio, Heart, Trash2, ExternalLink, Clock, Users, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { FavoriteSong, SongDetailData } from "../types";
import { formatDuration } from "../utils/formatDuration";
import UiImage from "@/components/common/UiImage";

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

function primaryArtist(artist: string): string {
  return artist.split(/[,;&]|feat\.|ft\.|featuring|vs\.?/i)[0].trim();
}

type Props = {
  songs: FavoriteSong[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelect?: (song: SongDetailData) => void;
};

function SongCard({ song, onRemove, onSelect, delay }: { song: FavoriteSong; onRemove: (id: string) => void; onSelect?: (song: SongDetailData) => void; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(delay * 0.03, 0.5) }}
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
      <div className="w-full aspect-square bg-surface-3 relative">
        {song.artworkUrl ? (
          <UiImage src={song.artworkUrl} alt="" className="object-cover" sizes="300px" loading="lazy" />
        ) : (
          <div className="size-full flex items-center justify-center"><Music size={32} className="text-dim" /></div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(song.id); }}
          aria-label="Remove from favorites"
          className="absolute top-2 left-2 p-1.5 rounded-full bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 transition-all"
        >
          <Heart size={12} className="fill-pink-400" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(song.id); }}
          aria-label="Delete song"
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="p-3 space-y-0.5">
        <p className="text-[13px] font-medium text-white line-clamp-1">{song.title}</p>
        <p className="text-[12px] text-secondary line-clamp-1">{song.artist}</p>
        {song.album && <p className="text-[11px] text-dim line-clamp-1">{song.album}</p>}
        {(song.genre || song.durationMs) && (
          <p className="text-[10px] text-dim line-clamp-1 flex items-center gap-1">
            {song.genre && <span>{song.genre}</span>}
            {song.durationMs && (
              <span className="inline-flex items-center gap-0.5">
                <Clock size={8} className="opacity-60" />{formatDuration(song.durationMs)}
              </span>
            )}
          </p>
        )}
      </div>
      <div className="px-3 pb-2.5 space-y-1.5">
        <a
          href={song.itunesUrl || itunesSearchUrl(song.title, song.artist)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[10px] font-medium text-white/60 hover:text-white/80 transition-colors"
        >
          <ExternalLink size={10} />Listen on Apple Music
        </a>
        <div className="flex items-center gap-1.5">
          <Radio size={9} className="text-dim flex-shrink-0" />
          <p className="text-[10px] text-dim truncate flex-1">{song.stationName}</p>
          <span className="text-[10px] text-dim">{formatTimeAgo(song.timestamp)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function ArtistStack({ artistName, songs, onRemove, onSelect }: { artistName: string; songs: FavoriteSong[]; onRemove: (id: string) => void; onSelect?: (song: SongDetailData) => void }) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE_COUNT = 3;
  const hasMore = songs.length > VISIBLE_COUNT;
  const visibleSongs = expanded ? songs : songs.slice(0, VISIBLE_COUNT);

  return (
    <div className="mb-6">
      {/* Artist header */}
      <button
        onClick={() => hasMore && setExpanded(e => !e)}
        className={`flex items-center gap-2 mb-3 group ${hasMore ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <Users size={14} className="text-white/40" />
        <span className="text-[14px] font-semibold text-white/80">{artistName}</span>
        <span className="text-[11px] text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full">{songs.length}</span>
        {hasMore && (
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} className="text-white/30" />
          </motion.span>
        )}
      </button>

      {/* Stacked/expanded cards */}
      {!expanded && hasMore ? (
        // Stacked view — show 3 cards with offset, click to expand
        <div
          className="relative cursor-pointer"
          onClick={() => setExpanded(true)}
          role="button"
          tabIndex={0}
          aria-label={`Expand ${artistName} songs`}
          style={{ height: `${250 + (Math.min(songs.length, VISIBLE_COUNT) - 1) * 16}px` }}
        >
          {songs.slice(0, VISIBLE_COUNT).map((song, i) => (
            <div
              key={song.id}
              className="absolute left-0 right-0 transition-all duration-300"
              style={{
                top: `${i * 16}px`,
                zIndex: VISIBLE_COUNT - i,
                transform: `scale(${1 - i * 0.03})`,
                opacity: 1 - i * 0.15,
                maxWidth: '200px',
              }}
            >
              <div className="bg-surface-2 rounded-xl border border-border-default overflow-hidden">
                <div className="w-full aspect-square bg-surface-3 relative">
                  {song.artworkUrl ? (
                    <UiImage src={song.artworkUrl} alt="" className="object-cover" sizes="200px" loading="lazy" />
                  ) : (
                    <div className="size-full flex items-center justify-center"><Music size={28} className="text-dim" /></div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-[12px] font-medium text-white line-clamp-1">{song.title}</p>
                  <p className="text-[11px] text-secondary line-clamp-1">{song.artist}</p>
                </div>
              </div>
            </div>
          ))}
          {/* "Show all" badge */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
            style={{ maxWidth: '200px' }}
          >
            <span className="text-[11px] text-[#3478f6] font-medium bg-[#3478f6]/10 px-3 py-1 rounded-full border border-[#3478f6]/20">
              +{songs.length - VISIBLE_COUNT} more
            </span>
          </div>
        </div>
      ) : (
        // Grid view for expanded or small groups
        <AnimatePresence>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {visibleSongs.map((song, i) => (
              <SongCard key={song.id} song={song} onRemove={onRemove} onSelect={onSelect} delay={i} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {expanded && hasMore && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 flex items-center gap-1 text-[11px] text-white/40 hover:text-white/60 transition-colors"
        >
          <ChevronDown size={12} className="rotate-180" />
          Collapse
        </button>
      )}
    </div>
  );
}

export default function FavoriteSongsView({ songs, onRemove, onClear, onSelect }: Props) {
  const [filterByArtist, setFilterByArtist] = useState(false);

  // Group songs by primary artist
  const artistGroups = useMemo(() => {
    const groups = new Map<string, FavoriteSong[]>();
    for (const song of songs) {
      const artist = primaryArtist(song.artist);
      const existing = groups.get(artist) ?? [];
      existing.push(song);
      groups.set(artist, existing);
    }
    // Sort groups by number of songs (descending)
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [songs]);

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
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-dim">{songs.length} songs</p>
          <button
            onClick={() => setFilterByArtist(f => !f)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              filterByArtist
                ? "bg-[#3478f6]/20 text-[#3478f6] border border-[#3478f6]/30"
                : "bg-white/5 text-white/40 border border-white/8 hover:text-white/60"
            }`}
          >
            <Users size={10} />
            By Artist
            {filterByArtist && (
              <X size={8} className="ml-0.5" onClick={(e) => { e.stopPropagation(); setFilterByArtist(false); }} />
            )}
          </button>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] text-dim hover:text-red-400 transition-colors"
        >
          <Trash2 size={11} />
          Clear all
        </button>
      </div>

      {filterByArtist ? (
        <div>
          {artistGroups.map(([artistName, artistSongs]) => (
            <ArtistStack
              key={artistName}
              artistName={artistName}
              songs={artistSongs}
              onRemove={onRemove}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {songs.map((song, i) => (
            <SongCard key={song.id} song={song} onRemove={onRemove} onSelect={onSelect} delay={i} />
          ))}
        </div>
      )}
    </div>
  );
}
