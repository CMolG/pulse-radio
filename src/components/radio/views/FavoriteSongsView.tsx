/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Trash2, Music, Users, ChevronDown, Disc3, X } from 'lucide-react';
import type { FavoriteSong, SongDetailData } from '../constants';
import { primaryArtist } from '@/logic/format-utils';
import { UiImage } from '../components/UiImage';
import { SongCard } from '../components/cards/SongCard';

/* ── Local constants ─────────────────────────────────────────────── */

const _EVT_CAPTURE_PASSIVE: AddEventListenerOptions = { capture: true, passive: true };
const _MOTION_T_02 = { duration: 0.2 } as const;

/* ── Types ────────────────────────────────────────────────────────── */

type FavoriteSongsViewProps = {
  songs: FavoriteSong[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelect?: (song: SongDetailData) => void;
};
type ContextMenuState = { x: number; y: number; songId: string } | null;
type FilterMode = 'none' | 'artist' | 'album';

/* ── Helpers ──────────────────────────────────────────────────────── */

const filterBtnClass = (active: boolean) =>
  `flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${active ? 'bg-[#3478f6]/20 text-[#3478f6] border border-[#3478f6]/30' : 'bg-white/5 text-white/45 border border-white/8 hover:text-white/60'}`;

/* ── Sub-components ───────────────────────────────────────────────── */

function SongContextMenu({
  menu,
  onRemove,
  onClose,
}: {
  menu: ContextMenuState;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener('pointerdown', onPointerDown, _EVT_CAPTURE_PASSIVE);
    window.addEventListener('scroll', onScroll, _EVT_CAPTURE_PASSIVE);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, _EVT_CAPTURE_PASSIVE);
      window.removeEventListener('scroll', onScroll, _EVT_CAPTURE_PASSIVE);
    };
  }, [menu, onClose]);
  if (!menu) return null;
  const menuW = 200;
  const menuH = 48;
  const x = Math.min(menu.x, window.innerWidth - menuW - 8);
  const y = Math.min(menu.y, window.innerHeight - menuH - 8);
  return createPortal(
    <div
      ref={ref}
      style={{ top: y, left: x, width: menuW }}
      className="fixed z-[200] py-1 rounded-xl bg-surface-3 border border-border-default shadow-2xl backdrop-blur-sm"
    >
      {' '}
      <button
        onClick={() => {
          onRemove(menu.songId);
          onClose();
        }}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[12px] text-red-400 hover:bg-red-400/10 transition-colors rounded-lg"
      >
        <Trash2 size={13} /> Borrar de favoritos
      </button>{' '}
    </div>,
    document.body,
  );
}

function GroupStack({
  label,
  icon: Icon,
  songs,
  onRemove,
  onSelect,
  onContextMenu,
}: {
  label: string;
  icon: React.ElementType;
  songs: FavoriteSong[];
  onRemove: (id: string) => void;
  onSelect?: (song: SongDetailData) => void;
  onContextMenu: (e: React.MouseEvent, songId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE_COUNT = 6;
  const hasMore = songs.length > VISIBLE_COUNT;
  const visibleSongs = expanded ? songs : songs.slice(0, VISIBLE_COUNT);
  return (
    <div className="mb-6">
      {' '}
      {/* Group header */}{' '}
      <button
        onClick={() => hasMore && setExpanded((e) => !e)}
        className={`flex items-center gap-2 mb-3 group ${hasMore ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {' '}
        <Icon size={14} className="text-white/50" />{' '}
        <span className="text-[14px] font-semibold text-white/80">{label}</span>{' '}
        <span className="text-[12px] text-white/50 bg-white/[0.06] px-2 py-0.5 rounded-full">
          {songs.length}
        </span>{' '}
        {hasMore && (
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={_MOTION_T_02}>
            {' '}
            <ChevronDown size={14} className="text-white/45" />
          </motion.span>
        )}
      </button>{' '}
      {/* Horizontal thumbnail row when collapsed, grid when expanded */}{' '}
      {!expanded && hasMore ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {songs.slice(0, VISIBLE_COUNT).map((song) => (
            <button
              key={song.id}
              onClick={() =>
                onSelect?.({
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
                })
              }
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e, song.id);
              }}
              className="flex-shrink-0 w-20 group/thumb"
              aria-label={`${song.title} by ${song.artist}`}
            >
              <div className="w-20 h-20 rounded-lg bg-surface-3 overflow-hidden relative">
                {song.artworkUrl ? (
                  <UiImage
                    src={song.artworkUrl}
                    alt=""
                    className="object-cover"
                    sizes="80px"
                    loading="lazy"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center">
                    <Music size={20} className="text-white/50" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-white/60 line-clamp-1 mt-1 text-center">
                {song.title}
              </p>
            </button>
          ))}
          <button
            onClick={() => setExpanded(true)}
            className="flex-shrink-0 w-20 h-20 rounded-lg bg-surface-3 border border-white/10 flex items-center justify-center text-[12px] text-white/70 font-medium hover:bg-surface-4 transition-colors"
          >
            +{songs.length - VISIBLE_COUNT} more
          </button>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {' '}
            {visibleSongs.map((song, i) => (
              <div
                key={song.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, song.id);
                }}
              >
                <SongCard
                  item={song}
                  onRemove={() => onRemove(song.id)}
                  onSelect={onSelect}
                  delay={i}
                  heart={null}
                  hideRemove
                />
              </div>
            ))}
          </div>
        </AnimatePresence>
      )}{' '}
      {expanded && hasMore && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 flex items-center gap-1 text-[12px] text-white/50 hover:text-white/60 transition-colors"
        >
          {' '}
          <ChevronDown size={12} className="rotate-180" /> Collapse
        </button>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────── */

export function FavoriteSongsView({ songs, onRemove, onClear, onSelect }: FavoriteSongsViewProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('none');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const handleContextMenu = useCallback((e: React.MouseEvent, songId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, songId });
  }, []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const artistGroups = useMemo(() => {
    const groups = new Map<string, FavoriteSong[]>();
    for (const song of songs) {
      const artist = primaryArtist(song.artist);
      let arr = groups.get(artist);
      if (!arr) {
        arr = [];
        groups.set(artist, arr);
      }
      arr.push(song);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [songs]);
  const albumGroups = useMemo(() => {
    const groups = new Map<string, FavoriteSong[]>();
    for (const song of songs) {
      const album = song.album || 'Unknown Album';
      let arr = groups.get(album);
      if (!arr) {
        arr = [];
        groups.set(album, arr);
      }
      arr.push(song);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [songs]);
  if (songs.length === 0) {
    return (
      <div className="flex-center-col py-20 px-4">
        <Heart size={40} className="text-white/50 mb-3" />{' '}
        <p className="text-[14px] text-white/60">No favorite songs yet</p>{' '}
        <p className="text-[12px] text-white/50 mt-1">Tap the heart icon to save songs you love</p>
      </div>
    );
  }
  const toggleFilter = (mode: FilterMode) =>
    setFilterMode((prev) => (prev === mode ? 'none' : mode));
  return (
    <div className="p-4">
      <SongContextMenu menu={contextMenu} onRemove={onRemove} onClose={closeContextMenu} />{' '}
      <div className="flex items-center justify-between mb-4">
        {' '}
        <div className="flex items-center gap-2">
          <p className="text-[12px]text-white/50">{songs.length} songs</p> {/* By Artist */}{' '}
          <button
            onClick={() => toggleFilter('artist')}
            className={filterBtnClass(filterMode === 'artist')}
            aria-pressed={filterMode === 'artist'}
          >
            {' '}
            <Users size={10} /> By Artist{' '}
            {filterMode === 'artist' && (
              <X
                size={8}
                className="ml-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterMode('none');
                }}
              />
            )}{' '}
          </button>{' '}
          {/* By Album */}{' '}
          <button
            onClick={() => toggleFilter('album')}
            className={filterBtnClass(filterMode === 'album')}
            aria-pressed={filterMode === 'album'}
          >
            {' '}
            <Disc3 size={10} /> By Album{' '}
            {filterMode === 'album' && (
              <X
                size={8}
                className="ml-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterMode('none');
                }}
              />
            )}{' '}
          </button>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[12px] text-white/50 hover:text-red-400 transition-colors"
        >
          {' '}
          <Trash2 size={11} /> Clear all
        </button>
      </div>{' '}
      {filterMode === 'artist' ? (
        <div>
          {' '}
          {artistGroups.map(([artistName, artistSongs]) => (
            <GroupStack
              key={artistName}
              label={artistName}
              icon={Users}
              songs={artistSongs}
              onRemove={onRemove}
              onSelect={onSelect}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      ) : filterMode === 'album' ? (
        <div>
          {' '}
          {albumGroups.map(([albumName, albumSongs]) => (
            <GroupStack
              key={albumName}
              label={albumName}
              icon={Disc3}
              songs={albumSongs}
              onRemove={onRemove}
              onSelect={onSelect}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {' '}
          {songs.map((song, i) => (
            <div
              key={song.id}
              onContextMenu={(e) => {
                e.preventDefault();
                handleContextMenu(e, song.id);
              }}
            >
              <SongCard
                item={song}
                onRemove={() => onRemove(song.id)}
                onSelect={onSelect}
                delay={i}
                heart={null}
                hideRemove
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FavoriteSongsView;
