/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
"use client";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Music, Heart, Trash2, Users, X, ChevronDown, Disc3 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { FavoriteSong, SongDetailData } from "../types";
import UiImage from "@/components/common/UiImage";
import { primaryArtist } from "../utils/formatUtils";
import SongCard from "./SongCard";
type Props = {
  songs: FavoriteSong[]; onRemove: (id: string) => void; onClear: () => void; onSelect?: (song: SongDetailData) => void;
};
type ContextMenuState = { x: number; y: number; songId: string } | null;
type FilterMode = "none" | "artist" | "album";
const filterBtnClass = (active: boolean) =>
  `flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
    active ? "bg-[#3478f6]/20 text-[#3478f6] border border-[#3478f6]/30" : "bg-white/5 text-white/40 border border-white/8 hover:text-white/60"
  }`;
// ── Context Menu ─────────────────────────────────────────────────────────────
function SongContextMenu({ menu, onRemove, onClose, }: {
  menu: ContextMenuState; onRemove: (id: string) => void; onClose: () => void;
}) { const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!menu) return;
    const onPointerDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }; const onScroll = () => onClose(); window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => { window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
    };
  }, [menu, onClose]); if (!menu) return null;
  // Clamp so menu doesn't overflow viewport
  const menuW = 200; const menuH = 48;
  const x = Math.min(menu.x, window.innerWidth - menuW - 8); const y = Math.min(menu.y, window.innerHeight - menuH - 8);
  return createPortal( <div
      ref={ref}
      style={{ top: y, left: x, width: menuW }}
      className="fixed z-[200] py-1 rounded-xl bg-surface-3 border border-border-default shadow-2xl backdrop-blur-sm">
      <button
        onClick={() => { onRemove(menu.songId); onClose(); }}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[12px] text-red-400 hover:bg-red-400/10 transition-colors rounded-lg"
      ><Trash2 size={13} />
        Borrar de favoritos</button>
    </div>, document.body,
  );
}
// ── Group Stack ───────────────────────────────────────────────────────────────
function GroupStack({ label, icon: Icon, songs, onRemove, onSelect, onContextMenu, }: {
  label: string; icon: React.ElementType; songs: FavoriteSong[]; onRemove: (id: string) => void;
  onSelect?: (song: SongDetailData) => void; onContextMenu: (e: React.MouseEvent, songId: string) => void;
}) { const [expanded, setExpanded] = useState(false); const VISIBLE_COUNT = 3;
  const hasMore = songs.length > VISIBLE_COUNT;
  const visibleSongs = useMemo(() => expanded ? songs : songs.slice(0, VISIBLE_COUNT), [expanded, songs]);
  return ( <div className="mb-6">
      {/* Group header */} <button
        onClick={() => hasMore && setExpanded(e => !e)}
        className={`flex items-center gap-2 mb-3 group ${hasMore ? "cursor-pointer" : "cursor-default"}`}>
        <Icon size={14} className="text-white/40" />
        <span className="text-[14px] font-semibold text-white/80">{label}</span>
        <span className="text-[11px] text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full">{songs.length}</span>
        {hasMore && ( <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} className="text-white/30" /></motion.span>)}</button>
      {/* Stacked/expanded cards */}
      {!expanded && hasMore ? ( <div
          className="relative cursor-pointer"
          onClick={() => setExpanded(true)}
          role="button"
          tabIndex={0}
          aria-label={`Expand ${label} songs`}
          style={{ height: `${250 + (Math.min(songs.length, VISIBLE_COUNT) - 1) * 16}px` }}>
          {songs.slice(0, VISIBLE_COUNT).map((song, i) => ( <div
              key={song.id}
              className="absolute left-0 right-0 transition-all duration-300"
              style={{ top: `${i * 16}px`, zIndex: VISIBLE_COUNT - i,
                transform: `scale(${1 - i * 0.03})`, opacity: 1 - i * 0.15, maxWidth: "200px",
              }}><div className="bg-surface-2 rounded-xl border border-border-default overflow-hidden">
                <div className="w-full aspect-square bg-surface-3 relative">
                  {song.artworkUrl ? (
                    <UiImage src={song.artworkUrl} alt="" className="object-cover" sizes="200px" loading="lazy" />
                  ) : (
                    <div className="size-full flex items-center justify-center"><Music size={28} className="text-dim" /></div>
                  )}</div>
                <div className="p-2.5"><p className="text-[12px] font-medium text-white line-clamp-1">{song.title}</p>
                  <p className="text-[11px] text-secondary line-clamp-1">{song.artist}</p></div></div></div>
          ))} <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
            style={{ maxWidth: "200px" }}>
            <span className="text-[11px] text-[#3478f6] font-medium bg-[#3478f6]/10 px-3 py-1 rounded-full border border-[#3478f6]/20">
              +{songs.length - VISIBLE_COUNT} more</span></div></div>
      ) : ( <AnimatePresence><div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {visibleSongs.map((song, i) => (
              <div key={song.id} onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, song.id); }}><SongCard
                  item={song}
                  onRemove={() => onRemove(song.id)}
                  onSelect={onSelect}
                  delay={i}
                  heart={null}
                  hideRemove /></div>))}</div></AnimatePresence>
      )}
      {expanded && hasMore && ( <button
          onClick={() => setExpanded(false)}
          className="mt-3 flex items-center gap-1 text-[11px] text-white/40 hover:text-white/60 transition-colors">
          <ChevronDown size={12} className="rotate-180" />
          Collapse</button>)}</div>
  );
}
// ── Main View ─────────────────────────────────────────────────────────────────
export default function FavoriteSongsView({ songs, onRemove, onClear, onSelect }: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("none");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const handleContextMenu = useCallback((e: React.MouseEvent, songId: string) => {
    e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, songId });
  }, []); const closeContextMenu = useCallback(() => setContextMenu(null), []);
  // Group by primary artist
  const artistGroups = useMemo(() => { const groups = new Map<string, FavoriteSong[]>();
    for (const song of songs) {
      const artist = primaryArtist(song.artist); const existing = groups.get(artist) ?? []; existing.push(song);
      groups.set(artist, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [songs]);
  // Group by album
  const albumGroups = useMemo(() => { const groups = new Map<string, FavoriteSong[]>();
    for (const song of songs) {
      const album = song.album || "Unknown Album"; const existing = groups.get(album) ?? []; existing.push(song);
      groups.set(album, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [songs]);
  if (songs.length === 0) { return (
      <div className="flex-center-col py-20 px-4"><Heart size={40} className="text-dim mb-3" />
        <p className="text-[14px] text-secondary">No favorite songs yet</p>
        <p className="text-[12px] text-dim mt-1">Tap the heart icon to save songs you love</p></div>
    );
  }
  const toggleFilter = (mode: FilterMode) => setFilterMode(prev => (prev === mode ? "none" : mode));
  return ( <div className="p-4"><SongContextMenu menu={contextMenu} onRemove={onRemove} onClose={closeContextMenu} />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><p className="text-[12px] text-dim">{songs.length} songs</p>
          {/* By Artist */}
          <button onClick={() => toggleFilter("artist")} className={filterBtnClass(filterMode === "artist")}>
            <Users size={10} />
            By Artist
            {filterMode === "artist" && <X size={8} className="ml-0.5" onClick={(e) => { e.stopPropagation(); setFilterMode("none"); }} />}
          </button> {/* By Album */}
          <button onClick={() => toggleFilter("album")} className={filterBtnClass(filterMode === "album")}>
            <Disc3 size={10} />
            By Album
            {filterMode === "album" && <X size={8} className="ml-0.5" onClick={(e) => { e.stopPropagation(); setFilterMode("none"); }} />}
          </button></div><button
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] text-dim hover:text-red-400 transition-colors">
          <Trash2 size={11} />
          Clear all</button></div>
      {filterMode === "artist" ? ( <div>
          {artistGroups.map(([artistName, artistSongs]) => ( <GroupStack
              key={artistName}
              label={artistName}
              icon={Users}
              songs={artistSongs}
              onRemove={onRemove}
              onSelect={onSelect}
              onContextMenu={handleContextMenu} />
          ))}</div>
      ) : filterMode === "album" ? ( <div>
          {albumGroups.map(([albumName, albumSongs]) => ( <GroupStack
              key={albumName}
              label={albumName}
              icon={Disc3}
              songs={albumSongs}
              onRemove={onRemove}
              onSelect={onSelect}
              onContextMenu={handleContextMenu} />
          ))}</div>
      ) : ( <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {songs.map((song, i) => (
            <div key={song.id} onContextMenu={(e) => { e.preventDefault(); handleContextMenu(e, song.id); }}><SongCard
                item={song}
                onRemove={() => onRemove(song.id)}
                onSelect={onSelect}
                delay={i}
                heart={null}
                hideRemove /></div>))}</div>)}</div>
  );
}
